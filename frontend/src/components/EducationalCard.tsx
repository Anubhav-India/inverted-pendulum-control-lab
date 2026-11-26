import React, { useState } from 'react';
import { Lightbulb, GraduationCap, ChevronDown, ChevronRight } from 'lucide-react';

interface EducationalCardProps {
  title: string;
  laymanExplanation: string;
  engineeringExplanation: string;
  symbols?: { symbol: string; meaning: string; unit?: string }[];
  numericalExample?: React.ReactNode;
  defaultExpanded?: boolean;
}

export const EducationalCard: React.FC<EducationalCardProps> = ({
  title,
  laymanExplanation,
  engineeringExplanation,
  symbols,
  numericalExample,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F8FAFC] hover:bg-[#F1F5F9] border-b border-[#E2E8F0] text-left transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-[#3B82F6]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#64748B]" />
          )}
          <span className="font-bold text-xs sm:text-sm text-[#1E293B]">{title}</span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#DBEAFE] text-[#3B82F6]">
          Intuition &amp; Theory
        </span>
      </button>

      {expanded && (
        <div className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-lg p-3">
              <div className="flex items-center gap-1.5 font-bold text-[#B45309] mb-1">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Plain-Language Intuition</span>
              </div>
              <p className="text-[#78350F] leading-relaxed">{laymanExplanation}</p>
            </div>

            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-3">
              <div className="flex items-center gap-1.5 font-bold text-[#1D4ED8] mb-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Control Engineering Theory</span>
              </div>
              <p className="text-[#1E3A8A] leading-relaxed">{engineeringExplanation}</p>
            </div>
          </div>

          {symbols && symbols.length > 0 && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
              <span className="font-bold text-[11px] text-[#1E293B] block mb-2">Symbol Reference</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {symbols.map((s, idx) => (
                  <div key={idx} className="flex items-baseline gap-2 bg-white border border-[#E2E8F0] rounded px-2.5 py-1.5">
                    <span className="font-mono font-bold text-[#3B82F6] shrink-0">{s.symbol}</span>
                    <span className="text-[11px] text-[#475569] flex-1">{s.meaning}</span>
                    {s.unit && (
                      <span className="text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] px-1 rounded">
                        {s.unit}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {numericalExample && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3">
              <span className="font-bold text-[11px] text-[#16A34A] block mb-1.5">
                Live Numerical Example (Current Parameters)
              </span>
              {numericalExample}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
