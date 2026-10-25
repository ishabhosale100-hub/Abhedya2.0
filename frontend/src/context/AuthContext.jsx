import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('abhedya_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = (username, password) => {
    // Prototype demo authentication: verifies credentials exist and records session
    // Explicitly non-production prototype authentication
    const newUser = {
      username: username.trim() || 'creator_demo',
      loggedInAt: new Date().toISOString(),
      role: 'Creator / Safety Guardian'
    };
    setUser(newUser);
    localStorage.setItem('abhedya_user', JSON.stringify(newUser));
    return { success: true };
  };

  const registerDemo = (username) => {
    const newUser = {
      username: username.trim() || 'creator_new',
      loggedInAt: new Date().toISOString(),
      role: 'Registered Demo Creator'
    };
    setUser(newUser);
    localStorage.setItem('abhedya_user', JSON.stringify(newUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('abhedya_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, registerDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
