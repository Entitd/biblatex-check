// src/pages/LoginPage/LoginPage.js
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import './login-page.css';
import Logo from "../../components/Logo/Logo";
import Button from "../../components/Button/Button";
import UpTable from "../../assets/elements_table/up_table.svg";
import DownTable from "../../assets/elements_table/down_table.svg";
import { UserContext } from '../../UserContext';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useContext(UserContext);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");  // Для отображения ошибок

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            setError("Пожалуйста, заполните все поля.");
            return;
        }

        try {
            const response = await fetch("http://localhost:8000/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error("Ошибка авторизации.");
            }

            // Автоматически логиним пользователя после успешной авторизации
            await login(username, password);
            navigate("/personalaccount");
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="container">
            <Logo />
            <div className="form_login">
                <form onSubmit={handleSubmit}>
                    <img className="" src={UpTable} alt="UpTable" />
                    <h2>Вход</h2>
                    <p>Ваши логин и пароль будут использоваться для входа в аккаунт</p>

                    {error && <p className="error-message">{error}</p>}

                    <input
                        type="text"
                        placeholder="Логин"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Введите пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="submit">Войти</Button>
                    <img className="" src={DownTable} alt="DownTable" />
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
