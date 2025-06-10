// UserContext.jsx
import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import CookieBanner from "./components/CookieBanner/CookieBanner";

export const UserContext = createContext();

const authAxios = axios.create({
  // Убираем baseURL, чтобы использовать относительные пути
  withCredentials: true,
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
  try {
    const response = await authAxios.post('/api/login', { username, password });

    if (response.status === 200) {
      const userData = await fetchProfile(); // Ждём данные пользователя
      return { message: "Успешный вход", user: userData };
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

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
    const userData = response.data;
    setUser(userData);
    return userData; // ✅ Возвращаем данные
  } catch (error) {
    if (error.response?.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const userData = await fetchProfile();
        return userData;
      } else {
        setUser(null);
        return null;
      }
    } else {
      console.error("Error fetching profile:", error.response?.data || error.message);
      setUser(null);
      return null;
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
    <UserContext.Provider value={{ user, login, refreshToken, logout }}>
      {children}
      <CookieBanner />
    </UserContext.Provider>
  );
};