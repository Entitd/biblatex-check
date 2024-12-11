// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './UserContext.jsx';
import LoginPage from './pages/LoginPage/LoginPage';
import MainPage from './pages/MainPage/MainPage';
import RegistrationPage from './pages/RegistrationPage/RegistrationPage';
import PersonalAccount from './pages/PersonalAccount/PersonalAccount';
import { ThemeProvider } from "./components/ThemeToggleButton/ThemeContext";
import './style.css';

function App() {
    return (
        <ThemeProvider>
            <UserProvider>
                <Router>
                    <Routes>
                        <Route path='/' element={<PersonalAccount />} />
                        <Route path='/main' element={<MainPage />} />
                        <Route path='/personalaccount' element={<PersonalAccount />} />
                        <Route path='/login' element={<LoginPage />} />
                        <Route path='/register' element={<RegistrationPage />} />
                    </Routes>
                </Router>
            </UserProvider>
        </ThemeProvider>
    );
}

export default App;
