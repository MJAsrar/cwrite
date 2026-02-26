'use client';

import { Check, X, FileText, Loader2 } from 'lucide-react';

interface DiffViewerProps {
  fileName: string;
  startLine: number;
  endLine: number;
  originalText: string;
  proposedText: string;
  reasoning: string;
  confidence: number;
  onAccept: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

export default function DiffViewer({
  fileName, startLine, endLine, originalText, proposedText, reasoning, confidence,
  onAccept, onReject, isProcessing = false
}: DiffViewerProps) {
  const originalLines = originalText.split('\n');
  const proposedLines = proposedText.split('\n');

  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-sm">
      <div className="p-3 bg-stone-50 border-b border-stone-200">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-semibold text-stone-700">
              Edit: {fileName}:{startLine}-{endLine}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">{reasoning}</p>
      </div>

      <div className="p-3 max-h-48 overflow-y-auto space-y-2">
        <div>
          <div className="text-[10px] font-semibold text-red-500 mb-0.5 flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-red-50 text-[9px]">−</span>
            Original
          </div>
          <div className="text-xs bg-red-50 border border-red-100 rounded-lg p-2 font-mono text-red-600">
            {originalLines.map((line, i) => (
              <div key={`o-${i}`}>
                <span className="text-stone-400 mr-1.5 select-none">{startLine + i}</span>
                {line || ' '}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-green-600 mb-0.5 flex items-center gap-1">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-green-50 text-[9px]">+</span>
            Proposed
          </div>
          <div className="text-xs bg-green-50 border border-green-100 rounded-lg p-2 font-mono text-green-600">
            {proposedLines.map((line, i) => (
              <div key={`p-${i}`}>
                <span className="text-stone-400 mr-1.5 select-none">{startLine + i}</span>
                {line || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-2 flex gap-2 border-t border-stone-200 bg-stone-50">
        <button
          onClick={onAccept}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {isProcessing ? 'Applying…' : 'Accept'}
        </button>
        <button
          onClick={onReject}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 bg-white border border-stone-200 hover:bg-stone-50 transition disabled:opacity-50"
        >
          <X className="w-3.5 h-3.5" />
          Reject
        </button>
      </div>
    </div>
  );
}
