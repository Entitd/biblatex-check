import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Box, Typography, TextField, Button, Paper, Alert } from "@mui/material";
import { UserContext } from '../../UserContext';
import ThemeToggleButton from "../../components/ThemeToggleButton/ThemeToggleButton.jsx";

const RegistrationPage = () => {
    const navigate = useNavigate();
    const { login } = useContext(UserContext);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

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

            await login(username, password);
            navigate("/personalaccount");
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <Container maxWidth="sm">
            <ThemeToggleButton />
            <Paper elevation={3} sx={{ padding: 4, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h4">
                    Регистрация
                </Typography>
                <Typography variant="body2" color="textSecondary" align="center">
                    Ваши логин и пароль будут использоваться для входа в аккаунт
                </Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Логин"
                        name="username"
                        autoComplete="username"
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Придумайте пароль"
                        type="password"
                        id="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="confirmPassword"
                        label="Повторите пароль"
                        type="password"
                        id="confirmPassword"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Зарегистрироваться
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default RegistrationPage;
