import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';

export const UserContext = React.createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const fetchProfile = async () => {
    console.log('Fetching profile with axios');
    try {
      const response = await axios.get('http://localhost:8000/api/profile', { withCredentials: true });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        console.log('Profile fetch failed with 401, attempting refresh');
        const refreshed = await refreshToken();
        if (refreshed) await fetchProfile(); // Повторяем запрос после успешного обновления
      }
    }
  };

  const refreshToken = async () => {
    console.log('Attempting to refresh token');
    try {
      const storedRefreshToken = localStorage.getItem('refresh_token_backup');
      if (storedRefreshToken && !document.cookie.includes('refresh_token')) {
        console.log('Restoring refresh_token from localStorage');
        document.cookie = `refresh_token=${storedRefreshToken}; path=/; max-age=2592000`;
      }
      const response = await axios.post('http://localhost:8000/api/refresh-token', {}, { withCredentials: true });
      console.log('Refresh successful:', response.data);
      const newRefreshToken = response.headers['set-cookie']
        ?.find(cookie => cookie.includes('refresh_token'))
        ?.split('=')[1]
        ?.split(';')[0];
      if (newRefreshToken) localStorage.setItem('refresh_token_backup', newRefreshToken);
      return true;
    } catch (error) {
      console.error('Refresh failed:', error.response?.data || error.message);
      setUser(null);
      return false;
    }
  };

  const checkAndRefreshToken = async () => {
    console.log('Checking tokens');
    const refreshTokenCookie = document.cookie.split('; ').find(row => row.startsWith('refresh_token='));
    const accessTokenCookie = document.cookie.split('; ').find(row => row.startsWith('access_token='));
    if (!accessTokenCookie && refreshTokenCookie) {
      console.log('No access_token, attempting refresh');
      return await refreshToken();
    }
    if (accessTokenCookie) {
      const token = accessTokenCookie.split('=')[1];
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      const now = Date.now();
      if (now > exp - 60000) {
        console.log('Access token expiring soon, refreshing');
        return await refreshToken();
      }
    }
    return true;
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      async (config) => {
        await checkAndRefreshToken();
        return config;
      },
      (error) => Promise.reject(error)
    );
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          console.log('Received 401, retrying with refresh');
          originalRequest._retry = true;
          const refreshed = await refreshToken();
          if (refreshed) {
            return axios(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:8000/api/login', { username, password }, { withCredentials: true });
      const refreshToken = response.headers['set-cookie']
        .find(cookie => cookie.includes('refresh_token'))
        .split('=')[1]
        .split(';')[0];
      localStorage.setItem('refresh_token_backup', refreshToken);
      await fetchProfile();
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:8000/api/logout', {}, { withCredentials: true });
      setUser(null);
      localStorage.removeItem('refresh_token_backup');
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

UserProvider.propTypes = {
  children: PropTypes.node.isRequired,
};