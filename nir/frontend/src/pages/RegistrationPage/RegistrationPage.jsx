import React, { useState } from "react";
import {useNavigate} from "react-router-dom"
import './registration-page.css';
import Logo from "../../components/Logo/Logo";
import Button from "../../components/Button/Button";
import UpTable from "../../assets/elements_table/up_table.svg";
import DownTable from "../../assets/elements_table/down_table.svg";

const RegistrationPage = () => {
    // Состояния для логина и пароля
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");  // Для отображения ошибок

    const handleSubmit = async (e) => {
        e.preventDefault();  // Предотвращаем перезагрузку страницы

        if (!username || !password || !confirmPassword) {
            setError("Пожалуйста, заполните все поля.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Пароли не совпадают.");
            return;
        }

        try {
            const response = await fetch("http://localhost:8000/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error("Ошибка регистрации.");
            }

            navigate("/profile");
            // Здесь можно перенаправить пользователя или показать сообщение об успехе
            console.log("Регистрация успешна!");
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="container">
            <Logo />
            <div className="form_register">
                <form onSubmit={handleSubmit}>
                    <img className="" src={UpTable} alt="UpTable" />
                    <h2>Регистрация</h2>
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
                        placeholder="Придумайте пароль" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                    />
                    <input 
                        type="password" 
                        placeholder="Повторите пароль" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                    />
                    <Button type="submit">Зарегистрироваться</Button>
                    <img className="" src={DownTable} alt="DownTable" />
                </form>
            </div>
        </div>
    );
};

export default RegistrationPage;
