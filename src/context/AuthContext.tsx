import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Teacher, SchoolClass, SchoolSettings } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  teacher: Teacher | null;
  assignedClass: SchoolClass | null;
  settings: SchoolSettings | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateSettingsState: (s: SchoolSettings) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [assignedClass, setAssignedClass] = useState<SchoolClass | null>(null);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('piket_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user session on mount
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('piket_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const [meRes, settingsRes] = await Promise.all([
          api.getMe(),
          api.getSettings().catch(() => ({ settings: null })),
        ]);

        if (meRes?.user) {
          setUser(meRes.user);
          setTeacher(meRes.user.teacher || null);
          setAssignedClass(meRes.user.assigned_class || null);
        }
        if (settingsRes?.settings) {
          setSettings(settingsRes.settings);
        }
      } catch (err) {
        console.warn('Session expired or invalid, logging out', err);
        localStorage.removeItem('piket_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      localStorage.setItem('piket_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setTeacher(res.teacher || null);
      setAssignedClass(res.assigned_class || null);

      // Fetch settings
      const settingsRes = await api.getSettings().catch(() => ({ settings: null }));
      if (settingsRes?.settings) {
        setSettings(settingsRes.settings);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    } finally {
      localStorage.removeItem('piket_token');
      setToken(null);
      setUser(null);
      setTeacher(null);
      setAssignedClass(null);
    }
  };

  const refreshUser = async () => {
    try {
      const meRes = await api.getMe();
      if (meRes?.user) {
        setUser(meRes.user);
        setTeacher(meRes.user.teacher || null);
        setAssignedClass(meRes.user.assigned_class || null);
      }
      const setRes = await api.getSettings();
      if (setRes?.settings) {
        setSettings(setRes.settings);
      }
    } catch (e) {
      // ignore
    }
  };

  const updateSettingsState = (s: SchoolSettings) => {
    setSettings(s);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        teacher,
        assignedClass,
        settings,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        updateSettingsState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
