import { useState } from 'react';

export function MatchQueue({ users, onMatch }: { users: any[], onMatch: (a: string, b: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(x => x !== id));
    } else if (selected.length < 2) {
      setSelected([...selected, id]);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button 
          disabled={selected.length !== 2}
          onClick={() => { onMatch(selected[0], selected[1]); setSelected([]); }}
          className="px-4 py-2 bg-accent disabled:bg-slate-700 disabled:text-slate-500 text-white rounded font-semibold"
        >
          Match Selected Users
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <div 
            key={u.id} 
            onClick={() => toggleSelect(u.id)}
            className={`p-4 rounded border cursor-pointer transition ${selected.includes(u.id) ? 'border-accent bg-accent/10' : 'border-border bg-card hover:border-slate-500'}`}
          >
            <div className="font-bold text-white">{u.name}</div>
            <div className="text-sm text-slate-400">LC: {u.leetcodeId}</div>
            <div className="text-sm text-slate-400">Phone: {u.phone}</div>
          </div>
        ))}
        {users.length === 0 && <div className="text-slate-400 col-span-full">Queue is empty</div>}
      </div>
    </div>
  );
}
