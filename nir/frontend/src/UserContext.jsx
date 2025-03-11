import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/profile', { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        setUser(null);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          console.log('Received 401, attempting to refresh token...');
          try {
            const refreshResponse = await axios.post('http://localhost:8000/api/refresh-token', {}, { withCredentials: true });
            console.log('Refresh successful:', refreshResponse.data);
            console.log('Retrying original request:', originalRequest.url);
            return axios(originalRequest);
          } catch (refreshError) {
            console.error('Refresh failed:', refreshError.response?.data || refreshError.message);
            setUser(null);
            return Promise.reject(refreshError);
          }
        }
        console.log('Non-401 error or retry failed:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(
        'http://localhost:8000/api/login',
        { username, password },
        { withCredentials: true }
      );
      console.log('Login successful:', response.data);
      await fetchProfile();
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:8000/api/logout', {}, { withCredentials: true });
      setUser(null);
      console.log('Logout successful');
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error.response?.data || error.message);
    }
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};