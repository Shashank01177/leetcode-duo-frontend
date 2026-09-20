import React from 'react';
import dynamic from 'next/dynamic';
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Props {
  value: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  language?: string;
  onCopy?: () => void;
}

export function CodeEditor({ value, onChange, readOnly, language = 'javascript', onCopy }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border border-border rounded-lg overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 bg-card border-b border-border shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-300 uppercase">{language}</span>
          {readOnly && <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded">Read Only</span>}
        </div>
        {readOnly && onCopy && (
          <button onClick={onCopy} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition">
            Copy to My Editor
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden" style={{ minHeight: '300px' }}>
        <MonacoEditor
          height="100%"
          language={language}
          theme="vs-dark"
          value={value}
          onChange={(val) => onChange && val !== undefined && onChange(val)}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            padding: { top: 16 },
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
