# CodeSage AI: An Intelligent Repository-Aware Software Engineering Assistant Using Hybrid Retrieval-Augmented Generation

[![Tests](https://img.shields.io/badge/pytest-12%20passed-success)](backend/tests)
[![Next.js](https://img.shields.io/badge/Next.js-16%20App%20Router-black)](frontend)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](backend)
[![Tree--sitter](https://img.shields.io/badge/Tree--sitter-AST%20Parsing-blue)](backend/app/parsing)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 1. Executive Summary & Major Project Abstract

Understanding a large, unfamiliar enterprise codebase is one of the most cognitively demanding challenges in modern software engineering. Traditional code navigation relies either on naive lexical search (e.g. `grep`) which produces overwhelming false positives without semantic comprehension, or generic LLM chatbots that hallucinate file paths, non-existent function signatures, and inaccurate line numbers.

**CodeSage AI** is a complete, production-grade repository-aware software engineering assistant built using **Hybrid Retrieval-Augmented Generation (Hybrid RAG)**. It ingests software repositories (via public Git URLs or secure ZIP archives), analyzes structural AST grammar using **Tree-sitter**, extracts symbol hierarchies and import graphs, and executes parallel dense vector and lexical retrieval fused via **Reciprocal Rank Fusion (RRF)**. Answers are streamed incrementally via **Server-Sent Events (SSE)** and strictly audited by an independent backend citation validator that binds claims to verifiable source line ranges.

---

## 2. System Architecture

```mermaid
graph TD
    subgraph Frontend [Next.js 16 Client - Light Design System]
        UI[App Shell & Navigation]
        ChatUI[Grounded AI Chat & Composer]
        Viewer[Line-Highlighted Code Viewer]
        GraphUI[React Flow Architecture Explorer]
        EvalUI[RAG Evaluation Dashboard]
    end

    subgraph API [FastAPI Backend Service /api]
        AuthRouter[/api/auth]
        RepoRouter[/api/repositories]
        ChatRouter[/api/chat - SSE Stream]
        AnalysisRouter[/api/analysis]
        EvalRouter[/api/evaluations]
        OverviewRouter[/api/overview]
    end

    subgraph Ingestion [Repository Ingestion Pipeline]
        Cloner[SSRF-Safe Git Cloner / Zip Extractor]
        Filter[Secret Scanner & File Filter]
        TreeSitter[Tree-sitter AST Multi-Language Parser]
        Chunker[Structure-Aware Code Chunker]
    end

    subgraph Retrieval [Hybrid RAG Retrieval Engine]
        Dense[Dense Vector Store - Qdrant / Local Index]
        Sparse[Lexical & Exact Symbol Search]
        RRF[Reciprocal Rank Fusion k=60]
        Context[Context Builder & Range Merging]
    end

    subgraph Grounding [Verification & AI Providers]
        Provider[AI Provider - Deterministic Mock / OpenAI / Gemini / Ollama]
        Validator[Backend Citation Validator]
    end

    subgraph Storage [Databases & Persistence]
        PG[(PostgreSQL / SQLite fallback)]
        QD[(Qdrant Vector Database)]
    end

    UI -->|REST API & Bearer JWT| API
    ChatUI -->|SSE Stream Connection| ChatRouter
    RepoRouter -->|Trigger Indexing| Ingestion
    Ingestion --> TreeSitter --> Chunker
    Chunker -->|Store Chunks & Symbols| PG
    Chunker -->|Upsert Vectors & Filters| QD
    ChatRouter --> Retrieval
    Retrieval --> Dense & Sparse
    Dense --> RRF
    Sparse --> RRF
    RRF --> Context --> Provider
    Provider --> Validator
    Validator -->|Verified Tokens & Citations| ChatUI
    Viewer <-->|Click Citation Jump to Line| ChatUI
    GraphUI <-->|Fetch Dependency Nodes & Edges| RepoRouter
```

---

## 3. Key Engineering Contributions

1. **Structure-Aware Tree-sitter Code Chunking**: Unlike naive chunkers that slice text by fixed character windows—frequently truncating functions in half—CodeSage AI utilizes language grammar parsers (Python, TypeScript, JavaScript, Java, Go) to bind chunks to genuine function, method, class, and route AST boundaries with exact 1-indexed source line ranges.
2. **Hybrid Retrieval with Reciprocal Rank Fusion (RRF)**: Executes dense vector retrieval (capturing conceptual similarity) and sparse lexical search (capturing exact identifiers, camelCase, snake_case tokens, and file paths) in parallel, fusing candidates mathematically:
   $$\text{RRF\_score}(d) = \sum_{r \in \text{retrievers}} \frac{1}{k + \text{rank}_r(d)} \quad (k=60)$$
3. **Backend Citation Validation & Hallucination Prevention**: The system does not trust the LLM to police its own citations. The backend parser extracts all cited evidence blocks (`[E1]`, `[E2]`), verifies that the chunk exists within the authorized repository, confirms that cited line numbers are within real chunk boundaries, and enforces `insufficient_evidence=true` when source backing is absent.
4. **Developer Intelligence Suite**:
   - **Architecture Explorer**: Interactive dependency graph powered by `@xyflow/react` showing inbound and outbound module relationships.
   - **Bug Investigation Assistant**: Stack trace parser that correlates runtime crash frames with indexed chunks, pinpointing probable root causes and recommending regression tests.
   - **Change Impact Analysis**: Reverse dependency traversal calculating the blast radius of modifying a target file up to 5 hops deep.
   - **Documentation Generator**: Automated synthesis of README, API, and Architecture guides with inline code citations.
5. **Empirical RAG Evaluation Benchmarking**: Real metric calculations (Recall@5, Mean Reciprocal Rank, Citation Accuracy, and Latency) over a standardized multi-category benchmark dataset.

---

## 4. Light-Theme Design System Tokens

The user interface adheres to a light-first design system with restrained shadows, clean cards, and monospace typography for technical identifiers:

| Token Name | Hex Code | Visual Application |
| :--- | :--- | :--- |
| **Main Background** | `#F8FAFC` | Application canvas and page background |
| **Primary Surface** | `#FFFFFF` | Cards, sidebars, modals, and code viewer container |
| **Subtle Surface** | `#F1F5F9` | Table headers, chip backgrounds, inactive tabs |
| **Main Text** | `#172033` | Primary headings, code symbols, body text |
| **Secondary Text** | `#64748B` | Labels, timestamps, file paths, subtitles |
| **Primary Action** | `#2563EB` | Active buttons, selected links, primary indicators |
| **Secondary Accent** | `#0F766E` | Graph nodes, secondary badges, metrics |
| **Borders** | `#E2E8F0` | Structural card borders and dividers |
| **Success** | `#15803D` | Ready badges, test hit indicators, valid citations |
| **Warning** | `#B45309` | In-progress indexing badges, limitation notices |
| **Error** | `#B91C1C` | Failed states, secret redactors, security violations |

---

## 5. Repository Directory Layout

```text
Codesage/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint & lifecycle
│   │   ├── core/                    # Security, JWT tokens, config, dependencies
│   │   ├── db/                      # Base models, async SQLAlchemy session
│   │   ├── models/                  # User, Workspace, Repo, File, Chunk, Message...
│   │   ├── schemas/                 # Pydantic v2 validation models
│   │   ├── services/                # Auth, Workspace, Repo, Chat, Analysis, Eval
│   │   ├── ingestion/               # Cloner (SSRF-safe), ZIP extractor, secret scanner
│   │   ├── parsing/                 # Tree-sitter AST parsers, structure chunker
│   │   ├── retrieval/               # Qdrant adapter, lexical search, RRF fusion
│   │   ├── llm/                     # Provider abstraction, prompts, citation validator
│   │   └── evaluation/              # Benchmark dataset and metric calculators
│   ├── tests/                       # 12 automated Pytest unit and E2E suites
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Root Next.js layout
│   │   ├── page.tsx                 # Root redirection to dashboard
│   │   ├── dashboard/page.tsx       # Overview Dashboard
│   │   ├── login/page.tsx           # Authentication login
│   │   ├── register/page.tsx        # Authentication registration
│   │   ├── workspaces/page.tsx      # Workspace management
│   │   ├── repositories/            # Repository manager & import modal
│   │   │   └── [id]/
│   │   │       ├── chat/page.tsx    # Grounded AI Chat with split Code Viewer
│   │   │       ├── graph/page.tsx   # React Flow Architecture Explorer
│   │   │       ├── investigations/  # Bug Investigation Assistant
│   │   │       ├── impact/page.tsx  # Change Impact Analysis
│   │   │       ├── documentation/   # Documentation Generator
│   │   │       └── evaluations/     # RAG Evaluation Benchmark Dashboard
│   │   └── settings/page.tsx        # System & Provider Settings
│   ├── components/
│   │   ├── layout/                  # Sidebar, TopNav, AppShell
│   │   ├── chat/                    # CodeViewer, CitationChip, ChatComposer
│   │   └── graph/                   # DependencyGraphViewer (React Flow)
│   ├── lib/                         # API client, auth helpers, SSE streamer, types
│   ├── Dockerfile
│   └── package.json
├── fixtures/
│   ├── sample_repo/                 # Test Python microservice codebase
│   └── sample_repo.zip              # Pre-packaged archive for instant UI testing
├── docker-compose.yml               # Multi-container local orchestration
├── .env.example                     # Environment template
└── README.md
```

---

## 6. Local Quickstart Guide

### Option A: Zero-Setup Local Standalone Mode (Recommended for Evaluation)

You can run CodeSage AI immediately without needing Docker or external PostgreSQL/Redis installed, thanks to its built-in SQLite async fallback and embedded vector index:

#### 1. Start the Backend API

```bash
cd backend
source venv/bin/activate
# Run migrations/startup
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend starts at `http://127.0.0.1:8000`. You can inspect the interactive OpenAPI documentation at `http://127.0.0.1:8000/api/docs`.

#### 2. Start the Frontend Application

In a separate terminal window:

```bash
cd frontend
npm run dev
```

Open your browser to **`http://localhost:3000`**.

#### 3. Log in or Register an Account

- Navigate to `http://localhost:3000/register`.
- Create an account (e.g. `alice@codesage.dev` / `StrongPassword123!`).
- You will be redirected to the **Overview Dashboard**.

---

### Option B: Docker Compose Deployment

For containerized deployment with PostgreSQL 16, Qdrant Vector DB, and Redis:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start all services
docker compose up --build -d

# 3. Check container health
docker compose ps
```

Services will be accessible at:
- Frontend: `http://localhost:3000`
- FastAPI Backend: `http://localhost:8000`
- Qdrant Dashboard: `http://localhost:6333/dashboard`

---

## 7. Running Automated Tests

Execute the comprehensive test suite covering RRF scoring, AST parsing, secret redaction, citation validation, SSRF URL security, and full lifecycle E2E ingestion:

```bash
source backend/venv/bin/activate
PYTHONPATH=backend pytest backend/tests -v
```

Expected output:
```text
backend/tests/test_api_auth.py::test_password_hashing PASSED
backend/tests/test_api_auth.py::test_auth_registration_and_login_flow PASSED
backend/tests/test_chunker.py::test_python_parsing_and_chunking PASSED
backend/tests/test_citations.py::test_valid_citation_extraction PASSED
backend/tests/test_citations.py::test_insufficient_evidence_flagging PASSED
backend/tests/test_cloner_security.py::test_allowed_https_urls PASSED
backend/tests/test_cloner_security.py::test_blocked_schemes PASSED
backend/tests/test_cloner_security.py::test_blocked_unauthorized_host PASSED
backend/tests/test_e2e_ingestion_and_rag.py::test_full_codesage_pipeline_lifecycle PASSED
backend/tests/test_rrf.py::test_rrf_scoring_order PASSED
backend/tests/test_secrets.py::test_secret_file_detection PASSED
backend/tests/test_secrets.py::test_secret_pattern_redaction PASSED

============================== 12 passed in 1.44s ==============================
```

---

## 8. College Major Project Demonstration Script

Follow this step-by-step walkthrough to present the project to academic evaluators:

1. **Authentication & Workspaces**:
   - Register a new account at `http://localhost:3000/register`. Notice the automatic creation of a default Personal Workspace.
2. **Repository Ingestion**:
   - Navigate to **Repositories**.
   - Click **Connect Repository**.
   - Select **ZIP Archive Upload**.
   - Choose `fixtures/sample_repo.zip` and click **Start Ingestion**.
   - Observe real-time progress transitions: `Cloning` $\to$ `Filtering` $\to$ `Parsing AST` $\to$ `Generating Embeddings` $\to$ `Indexed & Ready`.
3. **Grounded AI Chat & Verified Citations**:
   - Open the repository chat.
   - Ask: *"Where is calculate_order_total implemented?"*
   - Observe incremental token streaming via Server-Sent Events.
   - Notice the citation chip: `services/billing.py · L5–L9 [E1]`.
   - Click the citation chip. The right-hand **Source Code Viewer** smoothly navigates to `services/billing.py`, centers on line 5, and illuminates the exact cited range with line numbers and commit SHA.
4. **Hallucination Prevention**:
   - Ask an out-of-scope question: *"Explain the Stripe recurring billing webhook."*
   - Observe that CodeSage AI abstains honestly, returns an **Insufficient Source Evidence** notice, and refuses to fabricate fake citations.
5. **Architecture Explorer**:
   - Navigate to **Architecture Explorer**.
   - View the interactive node-link graph showing `main.py` importing `auth/jwt.py` and `services/billing.py`. Filter by language or search for symbols.
6. **Bug Investigation**:
   - Navigate to **Bug Investigation**.
   - Paste a traceback:
     ```python
     Traceback (most recent call last):
       File "auth/jwt.py", line 22, in verify_jwt_token
         payload, sig = parts[1], parts[2]
     IndexError: list index out of range
     ```
   - Click **Investigate Cause**. CodeSage maps the crash frame to line 22 of `auth/jwt.py`, highlights the code, and recommends unit tests.
7. **Change Impact Analysis**:
   - Navigate to **Change Impact Analysis**. Select `services/billing.py`.
   - The reverse dependency engine reveals that `main.py` directly imports this module, identifying public API risk.
8. **RAG Evaluation Benchmark**:
   - Navigate to **RAG Evaluation**.
   - Select the **CodeSage Standard Benchmark** dataset and click **Run Evaluation**.
   - View empirical measurements of Recall@5, MRR, citation accuracy, and end-to-end latency calculated across test questions.

---

## 9. License

This project is licensed under the MIT License.
