"use client";

import React, { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Search, Filter, FileCode, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { DependencyGraph } from "@/lib/types";

interface DependencyGraphProps {
  data: DependencyGraph;
  onSelectFile?: (filePath: string) => void;
}

export function DependencyGraphViewer({ data, onSelectFile }: DependencyGraphProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // Filter nodes based on search and language
  const filteredNodes = useMemo(() => {
    return data.nodes.filter((node) => {
      const matchesSearch = node.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLang = selectedLanguage === "all" || node.language === selectedLanguage;
      return matchesSearch && matchesLang;
    });
  }, [data.nodes, searchQuery, selectedLanguage]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Generate React Flow Nodes with circular or grid layout
  const flowNodes: Node[] = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(filteredNodes.length)) || 1;
    const spacingX = 260;
    const spacingY = 140;

    return filteredNodes.map((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const isSelected = selectedNode?.id === node.id;

      return {
        id: node.id,
        position: { x: col * spacingX + 50, y: row * spacingY + 50 },
        data: {
          label: (
            <div
              className={`p-3 rounded-xl bg-white border text-left shadow-xs transition-all cursor-pointer ${
                isSelected
                  ? "border-[#2563EB] ring-2 ring-[#BFDBFE]"
                  : "border-[#E2E8F0] hover:border-[#94A3B8]"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <FileCode className="w-3.5 h-3.5 text-[#2563EB]" />
                <span className="text-[12px] font-mono font-medium text-[#172033] truncate max-w-[180px]">
                  {node.path.split("/").pop()}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                <span className="capitalize">{node.language}</span>
                <span>{node.outbound_count} deps</span>
              </div>
            </div>
          ),
          rawNode: node,
        },
      };
    });
  }, [filteredNodes, selectedNode]);

  // Generate Flow Edges
  const flowEdges: Edge[] = useMemo(() => {
    return data.edges
      .filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: true,
        style: { stroke: "#94A3B8", strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#94A3B8",
        },
      }));
  }, [data.edges, filteredNodeIds]);

  return (
    <div className="h-full flex flex-col bg-white border border-[#E2E8F0] rounded-xl overflow-hidden relative">
      {/* Top Filter Bar */}
      <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files or modules..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#172033] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[#64748B]" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#172033] py-1.5 px-2.5 focus:border-[#2563EB]"
            >
              <option value="all">All Languages</option>
              {data.languages.map((l) => (
                <option key={l} value={l}>
                  {l.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-[12px] text-[#64748B] font-mono">
          {filteredNodes.length} nodes · {flowEdges.length} dependencies
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodeClick={(_, node) => setSelectedNode(node.data.rawNode)}
          fitView
        >
          <Background color="#E2E8F0" gap={16} />
          <Controls />
          <MiniMap
            nodeColor="#2563EB"
            maskColor="rgba(248, 250, 252, 0.7)"
            className="border border-[#E2E8F0] rounded-lg shadow-xs"
          />
        </ReactFlow>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="absolute right-4 top-4 bottom-4 w-80 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-5 flex flex-col z-20 overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
              <span className="text-[12px] font-semibold text-[#64748B] uppercase tracking-wider">
                Module Details
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#94A3B8] hover:text-[#172033] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <h4 className="font-mono text-[14px] font-semibold text-[#172033] break-all mb-1">
                {selectedNode.path}
              </h4>
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-[#F1F5F9] text-[#64748B] uppercase">
                {selectedNode.language}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mb-1">
                  <ArrowDownRight className="w-3.5 h-3.5 text-[#15803D]" />
                  <span>Inbound</span>
                </div>
                <span className="text-[16px] font-semibold text-[#172033]">
                  {selectedNode.inbound_count}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mb-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Outbound</span>
                </div>
                <span className="text-[16px] font-semibold text-[#172033]">
                  {selectedNode.outbound_count}
                </span>
              </div>
            </div>

            {onSelectFile && (
              <button
                onClick={() => onSelectFile(selectedNode.path)}
                className="w-full py-2 px-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium transition-colors"
              >
                Inspect Code & Ask Questions
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
