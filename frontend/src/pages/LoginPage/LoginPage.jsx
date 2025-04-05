import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Box, Typography, TextField, Button, Paper, Alert, CssBaseline } from "@mui/material";
import { UserContext } from '../../UserContext';
import { ThemeContext } from '../../components/ThemeToggleButton/ThemeContext';
import ThemeToggleButton from "../../components/ThemeToggleButton/ThemeToggleButton.jsx";

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useContext(UserContext);
    const { isDarkMode } = useContext(ThemeContext);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [passwordError, setPasswordError] = useState("");

    const validateUsername = (value) => {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        if (!value) {
            return "Логин обязателен";
        } else if (!usernameRegex.test(value)) {
            return "Логин должен быть от 3 до 20 символов, только буквы, цифры, _ или -";
        }
        return "";
    };

    const validatePassword = (value) => {
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,50}$/;
        if (!value) {
            return "Пароль обязателен";
        } else if (!passwordRegex.test(value)) {
            return "Пароль должен быть от 8 до 50 символов, содержать буквы и цифры";
        }
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const usernameValidation = validateUsername(username);
        const passwordValidation = validatePassword(password);

        setUsernameError(usernameValidation);
        setPasswordError(passwordValidation);

        if (usernameValidation || passwordValidation) {
            setError("Пожалуйста, исправьте ошибки в полях.");
            return;
        }

        setError(""); // Очищаем общую ошибку перед попыткой входа
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
        <>
            <CssBaseline />
            <Container maxWidth="sm">
                <ThemeToggleButton />
                <Paper
                    elevation={3}
                    sx={{
                        padding: 4,
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: 'background.paper',
                    }}
                >
                    <Typography component="h1" variant="h4">
                        Вход
                    </Typography>
                    <Typography variant="body2" color="textSecondary" align="center">
                        Ваши логин и пароль будут использоваться для входа в аккаунт
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setUsernameError(validateUsername(e.target.value));
                            }}
                            error={!!usernameError}
                            helperText={usernameError}
                            sx={{
                                backgroundColor: 'background.paper',
                                '& .MuiInputBase-input': { color: 'text.primary' },
                            }}
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
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setPasswordError(validatePassword(e.target.value));
                            }}
                            error={!!passwordError}
                            helperText={passwordError}
                            sx={{
                                backgroundColor: 'background.paper',
                                '& .MuiInputBase-input': { color: 'text.primary' },
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={!!usernameError || !!passwordError}
                        >
                            Войти
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </>
    );
};

export default LoginPage;