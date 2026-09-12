'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import Link from 'next/link';
import { MatchQueue } from '@/components/MatchQueue';

export default function AdminDashboard() {
  const { user } = useAuth(true);
  const [stats, setStats] = useState({ users: 0, sessions: 0, queue: 0 });
  const [autoMatch, setAutoMatch] = useState(false);
  const [queue, setQueue] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [u, q, s, a] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/queue'),
        api.get('/admin/sessions'),
        api.get('/admin/automatch'),
      ]);
      const users = u.data.data ?? u.data ?? [];
      const queueData = q.data.data ?? q.data ?? [];
      const sessionsData = s.data.data ?? s.data ?? [];
      const autoMatchData = a.data.data ?? a.data ?? {};

      setStats({ users: users.length, sessions: sessionsData.filter((s: any) => s.status === 'active').length, queue: queueData.length });
      setQueue(queueData);
      setSessions(sessionsData);
      setAutoMatch(autoMatchData.enabled ?? false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleToggleAuto = async () => {
    try {
      await api.put('/admin/automatch', { enabled: !autoMatch });
      setAutoMatch(!autoMatch);
    } catch (e) { console.error(e); }
  };

  const handleMatch = async (userAId: string, userBId: string) => {
    try {
      await api.post('/admin/match', { userAId, userBId });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await api.post(`/session/${sessionId}/end`);
      fetchData();
    } catch (e) { console.error(e); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-56 bg-card border-r border-border p-6 flex flex-col space-y-3 shrink-0">
        <h2 className="text-lg font-bold text-white mb-2">Admin Panel</h2>
        <Link href="/admin" className="text-accent font-medium text-sm">Dashboard</Link>
        <Link href="/admin/problems" className="text-slate-400 hover:text-white text-sm">Problems</Link>
        <div className="mt-auto pt-4 border-t border-border">
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300">← Exit Admin</Link>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          {/* Auto-match toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-sm text-slate-300">Auto-Match</span>
            <div className="relative" onClick={handleToggleAuto}>
              <div className={`w-12 h-6 rounded-full transition-colors ${autoMatch ? 'bg-accent' : 'bg-slate-600'}`} />
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoMatch ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
            <span className={`text-xs font-medium ${autoMatch ? 'text-green-400' : 'text-slate-500'}`}>
              {autoMatch ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Total Users', value: stats.users },
            { label: 'Active Sessions', value: stats.sessions },
            { label: 'In Queue', value: stats.queue },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card p-6 rounded-xl border border-border">
              <div className="text-sm text-slate-400">{label}</div>
              <div className="text-3xl font-bold text-white mt-1">{loading ? '—' : value}</div>
            </div>
          ))}
        </div>

        {/* Ready Queue */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">
            Ready Queue <span className="text-slate-500 font-normal text-base">({queue.length})</span>
          </h2>
          {queue.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center text-slate-500">
              No users in queue right now.
            </div>
          ) : (
            <MatchQueue users={queue} onMatch={handleMatch} />
          )}
        </div>

        {/* Active Sessions */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Sessions</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-slate-400">
                  <th className="px-4 py-3">User A</th>
                  <th className="px-4 py-3">User B</th>
                  <th className="px-4 py-3">Problem</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">No sessions yet.</td></tr>
                ) : sessions.map((s: any) => (
                  <tr key={s._id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-white">{s.userA?.name || s.userA?._id || '—'}</td>
                    <td className="px-4 py-3 text-white">{s.userB?.name || s.userB?._id || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{s.problem?.title || 'No problem'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'active' && (
                        <button onClick={() => handleEndSession(s._id)} className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-1 rounded">
                          End
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
