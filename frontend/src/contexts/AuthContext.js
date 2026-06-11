import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/auth.service';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Tracks whether we have a valid session so the interceptor redirect
  // doesn't fire during the initial unauthenticated fetchMe() on page load.
  const hasSession = useRef(false);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await authService.getMe();
      setUser(data.data.user);
      hasSession.current = true;
    } catch {
      setUser(null);
      hasSession.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (credentials) => {
    const { data } = await authService.login(credentials);
    // Set user immediately from the login response — do NOT wait for
    // a second fetchMe() round-trip. The HttpOnly cookie is now set.
    setUser(data.data.user);
    hasSession.current = true;

    // Verify the cookie is working by refreshing user data in the background.
    // Use the access token from the login response as a Bearer header so this
    // request succeeds even if the browser hasn't flushed the cookie yet.
    const accessToken = data.data.accessToken;
    if (accessToken) {
      api.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(({ data: meData }) => {
        setUser(meData.data.user);
      }).catch(() => {
        // Cookie verification failed — keep the user from the login response.
      });
    }

    return data.data;
  };

  const logout = async () => {
    try { await authService.logout(); } catch {}
    setUser(null);
    hasSession.current = false;
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
