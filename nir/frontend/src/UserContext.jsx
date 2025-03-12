import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const authAxios = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
});

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await authAxios.get('/api/profile');
        setUser(response.data);
      } catch (error) {
        console.error("Failed to fetch user:", error.response?.data || error.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await authAxios.post('/api/login', { username, password });
      const profileResponse = await authAxios.get('/api/profile');
      setUser(profileResponse.data);
      navigate('/personalaccount');
      return response.data;
    } catch (error) {
      console.error("Login failed:", error.response?.data || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAxios.post('/api/logout');
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error.response?.data || error.message);
    }
  };

  const refreshToken = async () => {
    try {
      await authAxios.post('/api/refresh-token');
      const profileResponse = await authAxios.get('/api/profile');
      setUser(profileResponse.data);
    } catch (error) {
      console.error("Token refresh failed:", error.response?.data || error.message);
      setUser(null);
      navigate('/login');
    }
  };

  return (
    <UserContext.Provider value={{ user, login, logout, refreshToken, loading }}>
      {children}
    </UserContext.Provider>
  );
};