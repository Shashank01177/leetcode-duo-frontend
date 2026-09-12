'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function Register() {
  const [formData, setFormData] = useState({ name: '', phone: '', leetcodeId: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    
    try {
      await api.post('/auth/register', formData);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card p-8 rounded-xl border border-border shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Create an Account</h2>
        
        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input type="text" required
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full bg-background border border-border rounded p-2 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input type="text" required
              value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
              className="w-full bg-background border border-border rounded p-2 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">LeetCode Username</label>
            <input type="text" required
              value={formData.leetcodeId} onChange={e => setFormData({...formData, leetcodeId: e.target.value})}
              className="w-full bg-background border border-border rounded p-2 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" required
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full bg-background border border-border rounded p-2 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input type="password" required
              value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
              className="w-full bg-background border border-border rounded p-2 text-white focus:outline-none focus:border-accent"
            />
          </div>
          <button type="submit" className="w-full bg-accent hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors mt-2">
            Register
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-slate-400">Already have an account? </span>
          <Link href="/" className="text-accent hover:underline">Login</Link>
        </div>
      </div>
    </div>
  );
}
