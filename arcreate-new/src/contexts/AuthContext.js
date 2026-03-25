import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const foundUser = users.find(u => u.username === username);
      
      if (foundUser && foundUser.password === password) {
        const userData = { ...foundUser };
        delete userData.password;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true, user: userData };
      }
      
      if (username === 'admin' && password === 'admin123') {
        const adminUser = {
          user_id: 1,
          username: 'admin',
          role: 'admin',
          full_name: 'System Administrator',
          email: 'admin@arcreate.com'
        };
        setUser(adminUser);
        localStorage.setItem('user', JSON.stringify(adminUser));
        return { success: true, user: adminUser };
      }
      
      if (username === 'foreman' && password === 'foreman123') {
        const foremanUser = {
          user_id: 2,
          username: 'foreman',
          role: 'foreman',
          full_name: 'Site Foreman',
          email: 'foreman@arcreate.com'
        };
        setUser(foremanUser);
        localStorage.setItem('user', JSON.stringify(foremanUser));
        return { success: true, user: foremanUser };
      }
      
      if (username === 'client' && password === 'client123') {
        const clientUser = {
          user_id: 3,
          username: 'client',
          role: 'client',
          full_name: 'Test Client',
          email: 'client@arcreate.com'
        };
        setUser(clientUser);
        localStorage.setItem('user', JSON.stringify(clientUser));
        return { success: true, user: clientUser };
      }
      
      return { success: false, message: 'Invalid credentials' };
    } catch (error) {
      return { success: false, message: 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      
      if (users.some(u => u.username === userData.username)) {
        return { success: false, message: 'Username already exists' };
      }
      
      const newUser = {
        user_id: users.length + 4,
        ...userData,
        role: 'client',
        created_at: new Date().toISOString()
      };
      
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      
      return { success: true, message: 'Registration successful' };
    } catch (error) {
      return { success: false, message: 'Registration failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};