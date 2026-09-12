'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useContext, useEffect } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export default function Home() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, user, loading } = useContext(AuthContext);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { phone, password });
      const token = res.data.data?.token ?? res.data.token;
      if (!token) throw new Error('No token received');
      login(token);

      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));

      if (decoded.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card p-8 rounded-xl border border-border shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">LeetCode Duo</h1>
          <p className="text-slate-400">Collaborate. Code. Conquer.</p>
        </div>
        
        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input 
              type="text" 
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-background border border-border rounded p-2 text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-background border border-border rounded p-2 text-white focus:outline-none focus:border-accent"
              required
            />
          </div>
          <button type="submit" className="w-full bg-accent hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors">
            Login
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-slate-400">Don't have an account? </span>
          <Link href="/register" className="text-accent hover:underline">Register</Link>
        </div>
      </div>
    </div>
  );
}
