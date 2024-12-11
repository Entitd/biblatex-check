import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Box, Typography, TextField, Button, Paper, Alert } from "@mui/material";
import { UserContext } from '../../UserContext';
import ThemeToggleButton from "../../components/ThemeToggleButton/ThemeToggleButton.jsx";

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useContext(UserContext);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            setError("Пожалуйста, заполните все поля.");
            return;
        }

        try {
            await login(username, password);
            navigate("/personalaccount");
        } catch (error) {
            if (error.response && error.response.status === 401) {
                setError("Неверный логин или пароль.");
            } else {
                setError("Ошибка авторизации. Попробуйте снова.");
            }
        }
    };

    return (
        <Container maxWidth="sm">
            <ThemeToggleButton />
            <Paper elevation={3} sx={{ padding: 4, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h4">
                    Вход
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
                        label="Пароль"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Войти
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default LoginPage;
