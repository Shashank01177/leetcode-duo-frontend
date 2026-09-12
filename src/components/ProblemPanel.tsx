'use client';
import { Problem, ProblemExample } from '@/lib/types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export function ProblemPanel({ problem }: { problem: Problem | null }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!problem) {
    return (
      <div className="bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col h-full items-center justify-center">
        <div className="text-slate-500 text-sm">No problem assigned yet</div>
      </div>
    );
  }

  // Normalize examples — backend stores as array, but handle string fallback
  const examplesArr: ProblemExample[] = Array.isArray(problem.examples)
    ? (problem.examples as ProblemExample[])
    : [{ input: '', output: problem.examples as string }];

  // Normalize constraints — backend stores as array, handle string fallback
  const constraintsArr: string[] = Array.isArray(problem.constraints)
    ? (problem.constraints as string[])
    : (problem.constraints as string).split(/\\n|\n/).filter(Boolean);

  const diffColor =
    problem.difficulty === 'Easy'
      ? 'bg-green-500/20 text-green-400'
      : problem.difficulty === 'Medium'
      ? 'bg-yellow-500/20 text-yellow-400'
      : 'bg-red-500/20 text-red-400';

  return (
    <div className="bg-card border-b lg:border-b-0 lg:border-r border-border flex flex-col h-full max-h-full overflow-hidden">
      {/* Header */}
      <div
        className="p-4 border-b border-border flex justify-between items-center cursor-pointer hover:bg-slate-800/60 transition select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="font-bold text-white text-base truncate">{problem.title}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${diffColor}`}>
            {problem.difficulty}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded hidden sm:inline">
            {problem.dataStructure}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* Description */}
          <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{problem.description}</p>

          {/* Examples */}
          {examplesArr.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-2">Examples</h3>
              <div className="space-y-3">
                {examplesArr.map((ex, i) => (
                  <div key={i} className="bg-[#1e1e1e] rounded-lg border border-border p-3 font-mono text-xs text-slate-300 space-y-1">
                    {ex.input  && <div><span className="text-slate-500">Input:  </span>{ex.input}</div>}
                    {ex.output && <div><span className="text-slate-500">Output: </span>{ex.output}</div>}
                    {ex.explanation && (
                      <div className="text-slate-400 italic text-[11px]">
                        <span className="not-italic text-slate-500">Explanation: </span>{ex.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Constraints */}
          {constraintsArr.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-2">Constraints</h3>
              <ul className="space-y-1">
                {constraintsArr.map((c, i) => (
                  <li key={i} className="font-mono text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded inline-block mr-1 mb-1">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
