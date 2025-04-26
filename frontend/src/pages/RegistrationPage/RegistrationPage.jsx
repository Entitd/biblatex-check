import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CssBaseline,
  useTheme
} from "@mui/material";
import { UserContext } from '../../UserContext';
import { ThemeContext } from '../../components/ThemeToggleButton/ThemeContext';
import ThemeToggleButton from "../../components/ThemeToggleButton/ThemeToggleButton.jsx";

const RegistrationPage = () => {
    const navigate = useNavigate();
    const { login } = useContext(UserContext);
    const { isDarkMode } = useContext(ThemeContext);
    const theme = useTheme();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [usernameError, setUsernameError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");

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

    const validateConfirmPassword = (value, password) => {
        if (!value) {
            return "Подтверждение пароля обязательно";
        } else if (value !== password) {
            return "Пароли не совпадают";
        }
        return "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const usernameValidation = validateUsername(username);
        const passwordValidation = validatePassword(password);
        const confirmPasswordValidation = validateConfirmPassword(confirmPassword, password);

        setUsernameError(usernameValidation);
        setPasswordError(passwordValidation);
        setConfirmPasswordError(confirmPasswordValidation);

        if (usernameValidation || passwordValidation || confirmPasswordValidation) {
            setError("Пожалуйста, исправьте ошибки в полях.");
            return;
        }

        setError("");
        try {
            console.log("Sending registration request:", { username, password });
            const registerResponse = await axios.post("/api/register", {
                username,
                password
            }, { withCredentials: true });
            console.log("Registration response:", registerResponse.status, registerResponse.data);

            console.log("Attempting login...");
            const loginResponse = await login(username, password);
            console.log("Login response:", loginResponse);

            console.log("Navigating to /personalaccount");
            navigate("/personalaccount");
        } catch (error) {
            console.error("Error during registration or login:", {
                message: error.message,
                response: error.response ? {
                    status: error.response.status,
                    data: error.response.data
                } : "No response",
                config: error.config
            });
            if (error.response && error.response.status === 400) {
                setError("Пользователь с таким логином уже существует.");
            } else {
                setError("Произошла ошибка при регистрации или входе.");
            }
        }
    };

    return (
        <>
            <CssBaseline />
            <Container
                maxWidth="sm"
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    py: 4
                }}
            >
                <Box sx={{
                    position: 'absolute',
                    top: theme.spacing(2),
                    right: theme.spacing(2)
                }}>
                    <ThemeToggleButton />
                </Box>

                <Paper
                    elevation={3}
                    sx={{
                        width: '100%',
                        maxWidth: 500,
                        p: theme.spacing(4),
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: 'background.paper',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: theme.shape.borderRadius,
                        boxShadow: theme.shadows[3]
                    }}
                >
                    <Typography
                        component="h1"
                        variant="h5"
                        sx={{
                            mb: 2,
                            color: 'text.primary',
                            fontWeight: 500,
                            fontSize: '1.5rem'
                        }}
                    >
                        Регистрация
                    </Typography>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        align="center"
                        sx={{
                            mb: 3,
                            fontSize: '0.875rem'
                        }}
                    >
                        Ваши логин и пароль будут использоваться для входа в аккаунт
                    </Typography>

                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{
                            width: '100%',
                            mt: 1
                        }}
                    >
                        {error && (
                            <Alert
                                severity="error"
                                sx={{
                                    mb: 2,
                                    '& .MuiAlert-message': {
                                        fontSize: '0.875rem'
                                    }
                                }}
                            >
                                {error}
                            </Alert>
                        )}

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
                            FormHelperTextProps={{
                                sx: { fontSize: '0.75rem' }
                            }}
                            InputLabelProps={{
                                sx: {
                                    fontSize: '0.875rem',
                                    color: 'text.secondary'
                                }
                            }}
                            InputProps={{
                                sx: {
                                    fontSize: '0.875rem',
                                    color: 'text.primary'
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'divider'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main'
                                    }
                                }
                            }}
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
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setPasswordError(validatePassword(e.target.value));
                                setConfirmPasswordError(validateConfirmPassword(confirmPassword, e.target.value));
                            }}
                            error={!!passwordError}
                            helperText={passwordError}
                            FormHelperTextProps={{
                                sx: { fontSize: '0.75rem' }
                            }}
                            InputLabelProps={{
                                sx: {
                                    fontSize: '0.875rem',
                                    color: 'text.secondary'
                                }
                            }}
                            InputProps={{
                                sx: {
                                    fontSize: '0.875rem',
                                    color: 'text.primary'
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'divider'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main'
                                    }
                                }
                            }}
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
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setConfirmPasswordError(validateConfirmPassword(e.target.value, password));
                            }}
                            error={!!confirmPasswordError}
                            helperText={confirmPasswordError}
                            FormHelperTextProps={{
                                sx: { fontSize: '0.75rem' }
                            }}
                            InputLabelProps={{
                                sx: {
                                    fontSize: '0.875rem',
                                    color: 'text.secondary'
                                }
                            }}
                            InputProps={{
                                sx: {
                                    fontSize: '0.875rem',
                                    color: 'text.primary'
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    '& fieldset': {
                                        borderColor: 'divider'
                                    },
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main'
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main'
                                    }
                                }
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            sx={{
                                mt: 3,
                                mb: 2,
                                py: 1.5,
                                fontSize: '0.875rem',
                                fontWeight: 500
                            }}
                            disabled={!!usernameError || !!passwordError || !!confirmPasswordError}
                        >
                            Зарегистрироваться
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </>
    );
};

export default RegistrationPage;
