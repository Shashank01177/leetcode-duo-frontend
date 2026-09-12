'use client';
import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { AuthContext } from '@/contexts/AuthContext';
import { LeetCodeProfile } from '@/lib/types';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<LeetCodeProfile | null>(null);
  const [inQueue, setInQueue] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user?.leetcodeId) {
      api.get(`/leetcode/${user.leetcodeId}`)
        .then(res => setProfile(res.data.data ?? res.data))
        .catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    socket.connect();
    
    socket.emit('authenticate', { token: localStorage.getItem('token') });
    
    socket.on('match-found', ({ session }) => {
      // backend sends the session object; extract its _id
      const id = session?._id ?? session?.id ?? session;
      router.push(`/session/${id}`);
    });

    return () => {
      socket.off('match-found');
    };
  }, [user, router]);

  const toggleQueue = async () => {
    try {
      if (inQueue) {
        await api.delete('/session/queue/leave');
      } else {
        await api.post('/session/queue/join');
      }
      setInQueue(!inQueue);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Lobby</h1>
        <button onClick={logout} className="text-sm text-slate-400 hover:text-white">Logout</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Your Profile</h2>
          {profile ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <img src={profile.userAvatar} alt="Avatar" className="w-16 h-16 rounded-full border border-border" />
                <div>
                  <div className="font-bold text-lg text-white">{profile.realName || profile.username}</div>
                  <div className="text-sm text-slate-400">@{profile.username} • {profile.countryName}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-4 border-t border-border">
                <div>
                  <div className="text-2xl font-bold text-green-500">{profile.easySolved}</div>
                  <div className="text-xs text-slate-400">Easy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{profile.mediumSolved}</div>
                  <div className="text-xs text-slate-400">Medium</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{profile.hardSolved}</div>
                  <div className="text-xs text-slate-400">Hard</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-pulse flex space-x-4">
              <div className="rounded-full bg-slate-700 h-16 w-16"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                <div className="h-4 bg-slate-700 rounded w-1/2"></div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6 flex flex-col items-center justify-center min-h-[300px]">
          {inQueue ? (
            <div className="text-center space-y-6">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-accent mx-auto"></div>
              <div className="text-lg text-white">Waiting for match...</div>
              <button onClick={toggleQueue} className="px-6 py-2 bg-red-500/20 text-red-500 border border-red-500/50 rounded hover:bg-red-500/30 transition">
                Leave Queue
              </button>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="text-lg text-slate-300">Ready to code with a partner?</div>
              <button onClick={toggleQueue} className="px-8 py-3 bg-accent hover:bg-green-600 text-white font-bold rounded-lg shadow-lg shadow-accent/20 transition transform hover:scale-105">
                Join Queue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
