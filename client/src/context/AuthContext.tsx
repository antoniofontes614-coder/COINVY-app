import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  hideBalances: boolean;
  theme: 'light' | 'dark';
  toggleHideBalances: () => void;
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  updateAvatar: (avatarUrl: string | null) => Promise<void>;
  login: (credentials: { email: string; password?: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  demoLogin: () => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('coinvy_user') || localStorage.getItem('nexo_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem('coinvy_token') || localStorage.getItem('nexo_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [hideBalances, setHideBalances] = useState<boolean>(() => {
    return (localStorage.getItem('coinvy_hide_balances') || localStorage.getItem('nexo_hide_balances')) === 'true';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = (localStorage.getItem('coinvy_theme') || localStorage.getItem('nexo_theme')) as 'light' | 'dark' | null;
    return savedTheme || 'dark';
  });

  // Apply theme to html root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('coinvy_theme', theme);
  }, [theme]);

  // Initial authentication verify
  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await api.auth.me();
          setUser(res.user);
          localStorage.setItem('coinvy_user', JSON.stringify(res.user));
          if (res.user.hide_balances !== undefined) {
            setHideBalances(Boolean(res.user.hide_balances));
          }
        } catch {
          // Token invalid or expired
          logout();
        }
      }
      setIsLoading(false);
    }

    checkAuth();

    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [token]);

  const toggleHideBalances = () => {
    const nextVal = !hideBalances;
    setHideBalances(nextVal);
    localStorage.setItem('coinvy_hide_balances', String(nextVal));
    if (user) {
      api.auth.updateProfile({ hide_balances: nextVal ? 1 : 0 }).catch(() => {});
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (user) {
      api.auth.updateProfile({ theme: nextTheme }).catch(() => {});
    }
  };

  const setThemeMode = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('coinvy_theme', newTheme);
    if (user) {
      api.auth.updateProfile({ theme: newTheme }).catch(() => {});
    }
  };

  const updateAvatar = async (avatarUrl: string | null) => {
    if (!user) return;
    const updated = { ...user, avatar_url: avatarUrl };
    setUser(updated);
    localStorage.setItem('coinvy_user', JSON.stringify(updated));
    try {
      await api.auth.updateProfile({ avatar_url: avatarUrl });
    } catch {}
  };

  const login = async (credentials: { email: string; password?: string }) => {
    const res = await api.auth.login(credentials);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('coinvy_token', res.token);
    localStorage.setItem('coinvy_user', JSON.stringify(res.user));
  };

  const register = async (data: { name: string; email: string; password: string }) => {
    const res = await api.auth.register(data);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('coinvy_token', res.token);
    localStorage.setItem('coinvy_user', JSON.stringify(res.user));
  };

  const resetPassword = async (email: string) => {
    return await api.auth.resetPassword(email);
  };

  const demoLogin = async () => {
    const res = await api.auth.demo();
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('coinvy_token', res.token);
    localStorage.setItem('coinvy_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('coinvy_token');
    localStorage.removeItem('coinvy_user');
    localStorage.removeItem('nexo_token');
    localStorage.removeItem('nexo_user');
  };

  const updateUser = async (data: Partial<User>) => {
    try {
      const res = await api.auth.updateProfile(data);
      const nextAvatar = data.avatar_url !== undefined 
        ? data.avatar_url 
        : (res.user?.avatar_url !== undefined ? res.user.avatar_url : (user?.avatar_url || null));
      const updated = {
        ...user,
        ...res.user,
        ...data,
        avatar_url: nextAvatar,
      };
      setUser(updated);
      localStorage.setItem('coinvy_user', JSON.stringify(updated));
    } catch {
      if (user) {
        const updated = { ...user, ...data };
        setUser(updated);
        localStorage.setItem('coinvy_user', JSON.stringify(updated));
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        hideBalances,
        theme,
        toggleHideBalances,
        toggleTheme,
        setThemeMode,
        updateAvatar,
        login,
        register,
        resetPassword,
        demoLogin,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
