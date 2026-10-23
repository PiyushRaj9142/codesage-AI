/**
 * Server-Sent Events (SSE) streaming client for grounded AI chat.
 */
import { getAuthToken } from "./auth";
import { Citation } from "./types";

export interface StreamCallbacks {
  onStatus?: (status: string, data: any) => void;
  onDelta?: (token: string) => void;
  onComplete?: (data: {
    message_id: string;
    conversation_id: string;
    insufficient_evidence: boolean;
    citations: Citation[];
  }) => void;
  onError?: (error: string) => void;
}

export async function streamChatResponse(
  repositoryId: string,
  question: string,
  conversationId: string | null,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const token = getAuthToken();
  const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/chat`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      repository_id: repositoryId,
      question,
      conversation_id: conversationId,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    let errorDetail = `Chat request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // Fallback
    }
    callbacks.onError?.(errorDetail);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.("ReadableStream not supported by browser.");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const eventType = parsed.event;
            const data = parsed.data;

            if (eventType === "status") {
              callbacks.onStatus?.(data.status, data);
            } else if (eventType === "delta") {
              callbacks.onDelta?.(data.token);
            } else if (eventType === "complete") {
              callbacks.onComplete?.(data);
            } else if (eventType === "error") {
              callbacks.onError?.(data.detail || "Stream error occurred");
            }
          } catch {
            // Ignore malformed chunks
          }
        }
      }
    }
  } catch (err: any) {
    if (err.name !== "AbortError") {
      callbacks.onError?.(err.message || "Streaming interrupted");
    }
  } finally {
    reader.releaseLock();
  }
}
