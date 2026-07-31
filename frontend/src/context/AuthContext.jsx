import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('investiq_token') || null);
  const [email, setEmail] = useState(() => localStorage.getItem('investiq_email') || null);

  const saveAuth = (jwtToken, userEmail) => {
    setToken(jwtToken);
    setEmail(userEmail);
    if (jwtToken) {
      localStorage.setItem('investiq_token', jwtToken);
    } else {
      localStorage.removeItem('investiq_token');
    }
    if (userEmail) {
      localStorage.setItem('investiq_email', userEmail);
    } else {
      localStorage.removeItem('investiq_email');
    }
  };

  const login = async (inputEmail, password) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputEmail, password })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }

      saveAuth(data.token, data.email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signup = async (inputEmail, password) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputEmail, password })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Signup failed');
      }

      saveAuth(data.token, data.email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Used by OAuthCallback page — sets auth state directly from URL params
  const loginWithToken = (jwtToken, userEmail) => {
    saveAuth(jwtToken, userEmail);
  };

  const logout = () => {
    saveAuth(null, null);
  };

  return (
    <AuthContext.Provider value={{ token, email, login, signup, loginWithToken, logout }}>
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
export default AuthContext;
