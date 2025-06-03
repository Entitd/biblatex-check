import React, { useContext, useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import { ThemeContext } from "../ThemeToggleButton/ThemeContext";

const CookieBanner = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [isVisible, setIsVisible] = useState(false);

  // Проверяем, было ли согласие уже дано (хранится в localStorage)
  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setIsVisible(true); // Показываем баннер, если согласие не было дано
    }
  }, []);

  // Обработчик нажатия на кнопку "Понял"
  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        left: { xs: 8, sm: 16 },
        right: { xs: 8, sm: 16 },
        maxWidth: { xs: "90%", sm: 400 },
        bgcolor: isDarkMode ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.9)",
        color: isDarkMode ? "#ffffff" : "#000000",
        p: 2,
        borderRadius: 2,
        boxShadow: 3,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="body2">
        Мы используем cookies только для авторизации, чтобы обеспечить удобство работы с сайтом.
      </Typography>
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          onClick={handleAccept}
          sx={{
            minWidth: "100px",
            bgcolor: isDarkMode ? "#1976d2" : "#1976d2",
            color: "#ffffff",
            "&:hover": {
              bgcolor: isDarkMode ? "#1565c0" : "#1565c0",
            },
          }}
        >
          Понял
        </Button>
      </Box>
    </Box>
  );
};

export default CookieBanner;