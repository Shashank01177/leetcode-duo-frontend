'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const [session, setSession] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/submit/session').then(r => setHasSession(r.data.data.hasSession)).catch(() => {});
    }
  }, [user]);

  const handleSave = async () => {
    if (!session.trim()) return;
    setLoading(true);
    try {
      await api.put('/submit/session', { leetcodeSession: session.trim() });
      setHasSession(true);
      setSession('');
      setMessage('✅ LeetCode session saved! You can now submit code to LeetCode from sessions.');
    } catch (e: any) {
      setMessage('❌ ' + (e.response?.data?.message || 'Failed to save'));
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <Link href="/dashboard" className="text-slate-400 hover:text-white text-sm">← Back to Dashboard</Link>
        </div>

        {/* User Info */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-accent">Account Info</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-slate-400">Name:</span> <span className="text-white ml-2">{user.name}</span></div>
            <div><span className="text-slate-400">LeetCode ID:</span> <span className="text-white ml-2">{user.leetcodeId}</span></div>
            <div><span className="text-slate-400">Role:</span> <span className="text-white ml-2 capitalize">{user.role}</span></div>
          </div>
        </div>

        {/* LeetCode Session Cookie */}
        <div className="bg-card border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold text-yellow-400">🔑 LeetCode Session Cookie</h2>
            {hasSession && <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded px-2 py-0.5">Saved ✅</span>}
          </div>
          <p className="text-slate-400 text-sm mb-4">
            This allows our platform to submit your code directly to LeetCode when you click <strong className="text-white">"Submit to LeetCode"</strong> in a session.
            LeetCode will run it against all hidden test cases and return the real verdict.
          </p>

          {message && (
            <div className={`mb-4 p-3 rounded text-sm border ${message.startsWith('✅') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {message}
            </div>
          )}

          <div className="flex gap-3 mb-4">
            <input
              type="password"
              value={session}
              onChange={e => setSession(e.target.value)}
              placeholder={hasSession ? 'Paste new session to update...' : 'Paste your LEETCODE_SESSION cookie...'}
              className="flex-1 bg-background border border-border rounded p-2 text-white text-sm focus:outline-none focus:border-yellow-400 font-mono"
            />
            <button
              onClick={handleSave}
              disabled={loading || !session.trim()}
              className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-bold rounded text-sm"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>

          <button onClick={() => setShowHow(!showHow)} className="text-sm text-yellow-400 hover:text-yellow-300 underline">
            {showHow ? 'Hide' : 'How to get my LEETCODE_SESSION cookie?'}
          </button>

          {showHow && (
            <div className="mt-4 bg-background border border-border rounded-lg p-4 text-sm space-y-2">
              <p className="text-white font-semibold">Steps (takes 30 seconds):</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                <li>Open <a href="https://leetcode.com" target="_blank" className="text-yellow-400 underline">leetcode.com</a> and log in</li>
                <li>Press <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">F12</kbd> to open DevTools</li>
                <li>Go to <strong className="text-white">Application</strong> tab (or Storage tab on Firefox)</li>
                <li>Click <strong className="text-white">Cookies → https://leetcode.com</strong></li>
                <li>Find <code className="bg-slate-700 px-1 rounded text-yellow-300">LEETCODE_SESSION</code> in the list</li>
                <li>Double-click its value → Copy it</li>
                <li>Paste it above and click Save</li>
              </ol>
              <p className="text-slate-500 text-xs mt-2">⚠️ This cookie expires periodically. If submissions stop working, update it here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
