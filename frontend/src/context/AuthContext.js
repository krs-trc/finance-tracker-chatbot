// src/context/AuthContext.js
// Manages authentication state globally across the app
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // Check localStorage on mount

  // On app load, restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('ft_token');
    const savedUser = localStorage.getItem('ft_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Call after successful sign in or sign up
  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('ft_token', tokenData);
    localStorage.setItem('ft_user', JSON.stringify(userData));
  };

  // Clear session
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ft_token');
    localStorage.removeItem('ft_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for easy access
export function useAuth() {
  return useContext(AuthContext);
}