'use client';

import { Check, X, FileText } from 'lucide-react';

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
  fileName,
  startLine,
  endLine,
  originalText,
  proposedText,
  reasoning,
  confidence,
  onAccept,
  onReject,
  isProcessing = false
}: DiffViewerProps) {
  // Simple line-by-line diff
  const originalLines = originalText.split('\n');
  const proposedLines = proposedText.split('\n');
  
  return (
    <div className="border-4 border-[#0A0A0A] bg-white">
      {/* Header */}
      <div className="border-b-4 border-[#0A0A0A] p-3 bg-[#39FF14]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#0A0A0A]" />
            <span className="font-mono text-xs font-bold text-[#0A0A0A] uppercase">
              PROPOSED EDIT: {fileName}:{startLine}-{endLine}
            </span>
          </div>
          <div className="font-mono text-xs text-[#0A0A0A] uppercase">
            CONFIDENCE: {Math.round(confidence * 100)}%
          </div>
        </div>
        <p className="font-mono text-xs text-[#0A0A0A]">
          {reasoning}
        </p>
      </div>

      {/* Diff Display */}
      <div className="p-3 max-h-64 overflow-y-auto">
        {/* Original Text */}
        <div className="mb-3">
          <div className="font-mono text-xs font-bold text-[#FF073A] uppercase mb-1 flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-[#FF073A] text-white text-center leading-4">−</span>
            ORIGINAL
          </div>
          <div className="font-mono text-xs bg-[#FF073A]/10 border-2 border-[#FF073A] p-2">
            {originalLines.map((line, i) => (
              <div key={`orig-${i}`} className="text-[#FF073A]">
                <span className="text-gray-500 mr-2">{startLine + i}</span>
                {line || ' '}
              </div>
            ))}
          </div>
        </div>

        {/* Proposed Text */}
        <div>
          <div className="font-mono text-xs font-bold text-[#39FF14] uppercase mb-1 flex items-center gap-1">
            <span className="inline-block w-4 h-4 bg-[#39FF14] text-[#0A0A0A] text-center leading-4">+</span>
            PROPOSED
          </div>
          <div className="font-mono text-xs bg-[#39FF14]/10 border-2 border-[#39FF14] p-2">
            {proposedLines.map((line, i) => (
              <div key={`prop-${i}`} className="text-[#39FF14]">
                <span className="text-gray-500 mr-2">{startLine + i}</span>
                {line || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t-4 border-[#0A0A0A] p-3 flex gap-2">
        <button
          onClick={onAccept}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#39FF14] border-4 border-[#0A0A0A] font-mono text-xs font-bold text-[#0A0A0A] uppercase hover:bg-[#2DE00F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
        >
          <Check className="w-4 h-4" />
          {isProcessing ? 'APPLYING...' : 'ACCEPT EDIT'}
        </button>
        <button
          onClick={onReject}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-4 border-[#0A0A0A] font-mono text-xs font-bold text-[#0A0A0A] uppercase hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ boxShadow: '4px 4px 0 0 #0A0A0A' }}
        >
          <X className="w-4 h-4" />
          REJECT
        </button>
      </div>
    </div>
  );
}
