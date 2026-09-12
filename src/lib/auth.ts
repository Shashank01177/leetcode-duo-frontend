export const saveToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

export const getCurrentUser = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
};

export const isAuthenticated = () => {
  return !!getToken() && !!getCurrentUser();
};

export const isAdmin = () => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};
