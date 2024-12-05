// src/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    // Получаем токен из localStorage только при монтировании
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            setToken(savedToken);
        }
    }, []);

    // Добавляем интерсептор для автоматической подстановки токена в запросы
    useEffect(() => {
        const interceptor = axios.interceptors.request.use((config) => {
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
        });
        return () => {
            axios.interceptors.request.eject(interceptor);
        };
    }, [token]);

    // Получение профиля пользователя
    const fetchProfile = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/profile');
            console.log('Fetched profile data:', response.data); // Добавьте эту строку для проверки
            setUser(response.data);
        } catch (error) {
            console.error('Failed to fetch profile', error);
        }
    };



    useEffect(() => {
        if (token) {
            fetchProfile();
        }
    }, [token]);

    const login = async (username, password) => {
        try {
            const response = await axios.post('http://localhost:8000/api/login', { username, password });
            const accessToken = response.data.access_token;
            if (!accessToken) {
                throw new Error('No access token received');
            }
            localStorage.setItem('token', accessToken); // Сохраняем токен
            setToken(accessToken);
            setUser({ username }); // Простая установка пользователя
        } catch (error) {
            console.error('Login failed', error);
        }
    };

    const logout = async () => {
        try {
            await axios.post('http://localhost:8000/api/logout');
            setUser(null);
            setToken(null);
            localStorage.removeItem('token');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <UserContext.Provider value={{ user, token, login, logout }}>
            {children}
        </UserContext.Provider>
    );
};
