import React, { useContext, useState, useEffect } from "react";
import { Box, Typography, Button, useTheme } from "@mui/material";
import { ThemeContext } from "../ThemeToggleButton/ThemeContext";

const CookieBanner = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = useTheme();
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
        bottom: theme.spacing(2),
        left: { xs: theme.spacing(1), sm: theme.spacing(2) },
        right: { xs: theme.spacing(1), sm: theme.spacing(2) },
        maxWidth: { xs: "90%", sm: 400 },
        bgcolor: isDarkMode
          ? theme.palette.background.paper
          : theme.palette.background.paper,
        color: theme.palette.text.primary,
        p: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.shadows[3],
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(2),
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontSize: "0.875rem",
          color: theme.palette.text.secondary,
        }}
      >
        Мы используем cookies для обеспечения удобства работы с сайтом.
      </Typography>
      <Box display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleAccept}
          sx={{
            minWidth: "100px",
            py: 1,
            fontSize: "0.875rem",
            fontWeight: 500,
            "&:hover": {
              bgcolor: theme.palette.primary.dark,
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