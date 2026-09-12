import { useContext, useEffect } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { isAdmin } from '@/lib/auth';

export const useAuth = (requireAdmin = false) => {
  const context = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (!context.loading) {
      if (!context.user) {
        router.push('/');
      } else if (requireAdmin && !isAdmin()) {
        router.push('/dashboard');
      }
    }
  }, [context.loading, context.user, requireAdmin, router]);

  return context;
};
