// UserContext.jsx
import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const UserContext = createContext();

const authAxios = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const refreshToken = async () => {
    try {
      const response = await authAxios.post('/api/refresh-token');
      setUser(response.data.user);
      return true;
    } catch (error) {
      console.error("Error refreshing token:", error.response?.data || error.message);
      setUser(null);
      return false;
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await authAxios.get('/api/profile');
      setUser(response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          fetchProfile(); // Повторяем запрос после успешного обновления токена
        } else {
          setUser(null);
        }
      } else {
        console.error("Error fetching profile:", error.response?.data || error.message);
        setUser(null);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const logout = () => {
    setUser(null);
    authAxios.post('/api/logout');
  };

  return (
    <UserContext.Provider value={{ user, refreshToken, logout }}>
      {children}
    </UserContext.Provider>
  );
};