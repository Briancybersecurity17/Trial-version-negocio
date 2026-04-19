import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

const isElectron = typeof window !== 'undefined' && !!window.electronAuth;
const isHttp     = typeof window !== 'undefined' && !isElectron && window.location.protocol === 'http:';

// ─── API de auth según entorno ────────────────────────────────────────────────

async function apiLogin(username, password) {
  if (isElectron) return window.electronAuth.login(username, password);
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return r.json();
}

async function apiLogout(token) {
  if (isElectron) return window.electronAuth.logout();
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
}

async function apiCheck(token) {
  if (isElectron) return window.electronAuth.check();
  if (!token) return null;
  const r = await fetch('/api/auth/me', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.success ? data.user : null;
}

async function apiChangePassword(token, currentPassword, newPassword) {
  if (isElectron) return window.electronAuth.changePassword(currentPassword, newPassword);
  const r = await fetch('/api/auth/changePassword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return r.json();
}

async function apiGetUsers(token) {
  if (isElectron) return window.electronAuth.getUsers();
  const r = await fetch('/api/auth/getUsers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  return r.json();
}

async function apiCreateUser(token, data) {
  if (isElectron) return window.electronAuth.createUser(data);
  const r = await fetch('/api/auth/createUser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return r.json();
}

async function apiDeleteUser(token, userId) {
  if (isElectron) return window.electronAuth.deleteUser(userId);
  const r = await fetch('/api/auth/deleteUser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId }),
  });
  return r.json();
}

async function apiResetUserPassword(token, userId, newPassword) {
  if (isElectron) return window.electronAuth.resetUserPassword(userId, newPassword);
  const r = await fetch('/api/auth/resetUserPassword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ userId, newPassword }),
  });
  return r.json();
}

async function apiResetApp(token) {
  if (isElectron) return window.electronAuth.resetApp();
  const r = await fetch('/api/auth/resetApp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  return r.json();
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [token, setToken]             = useState(() => isHttp ? localStorage.getItem('auth_token') : null);
  const [isLoadingAuth, setIsLoading] = useState(true);

  // Verificar sesión al arrancar
  useEffect(() => {
    async function checkSession() {
      try {
        const session = await apiCheck(token);
        if (session) {
          setUser({ id: session.userId || session.id, username: session.username, name: session.name, role: session.role, mustChangePassword: session.mustChangePassword });
        } else {
          setUser(null);
          if (isHttp) localStorage.removeItem('auth_token');
          setToken(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await apiLogin(username, password);
    if (result.success) {
      setUser(result.user);
      if (isHttp) { localStorage.setItem('auth_token', result.token); setToken(result.token); }
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout(token);
    setUser(null);
    if (isHttp) { localStorage.removeItem('auth_token'); setToken(null); }
  }, [token]);

  const changePassword = useCallback((currentPassword, newPassword) => apiChangePassword(token, currentPassword, newPassword), [token]);
  const getUsers       = useCallback(() => apiGetUsers(token), [token]);
  const createUser     = useCallback((data) => apiCreateUser(token, data), [token]);
  const deleteUser     = useCallback((userId) => apiDeleteUser(token, userId), [token]);
  const resetUserPassword = useCallback((userId, newPassword) => apiResetUserPassword(token, userId, newPassword), [token]);
  const resetApp       = useCallback(async () => {
    const result = await apiResetApp(token);
    if (result.success) {
      // Limpiar sesión local
      setUser(null);
      if (isHttp) { localStorage.removeItem('auth_token'); setToken(null); }
      // Limpiar preferencias locales del navegador
      localStorage.removeItem('hiddenDefaultCategories');
    }
    return result;
  }, [token]);

  // Permisos por rol
  const can = {
    editProducts:  user?.role === 'admin',
    deleteRecords: user?.role === 'admin',
    exportData:    user?.role === 'admin',
    manageUsers:   user?.role === 'admin',
    viewOpciones:  user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={{
      user, token, isLoadingAuth,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      can,
      login, logout,
      changePassword, getUsers, createUser, deleteUser, resetUserPassword, resetApp,
      // Compatibilidad con código existente
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      navigateToLogin: () => {},
      checkAppState: async () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};
