'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RoleName, PermissionKey } from '@/lib/auth/permissions';

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role: RoleName;
  storeId?: string | null;
  store?: {
    name: string;
    code: string;
    address?: any;
    phone?: string;
  } | null;
  permissions: PermissionKey[];
  phone?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  activeStoreId: string | null;
  setActiveStoreId: (storeId: string | null) => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: PermissionKey) => boolean;
  hasRole: (roles: RoleName | RoleName[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data.user) {
          const newUser = json.data.user;
          setUser((prev) => {
            if (
              prev &&
              prev.userId === newUser.userId &&
              prev.role === newUser.role &&
              prev.storeId === newUser.storeId &&
              prev.name === newUser.name
            ) {
              return prev;
            }
            return newUser;
          });
          setActiveStoreId((prevStoreId) => {
            if (!prevStoreId && newUser.storeId) {
              return newUser.storeId;
            }
            return prevStoreId;
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Login failed' };
      }

      await refreshUser();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const hasPermission = (permission: PermissionKey): boolean => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return user.permissions?.includes(permission) ?? false;
  };

  const hasRole = (roles: RoleName | RoleName[]): boolean => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeStoreId,
        setActiveStoreId,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
