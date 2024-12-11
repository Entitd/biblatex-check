import React, { useContext } from "react";
import { IconButton } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { ThemeContext } from "./ThemeContext";

const ThemeToggleButton = () => {
    const { theme, toggleTheme } = useContext(ThemeContext);

    if (!theme || !toggleTheme) {
        return null; // Возвращаем null, если контекст не предоставлен
    }

    return (
        <IconButton onClick={toggleTheme} color="inherit">
            {theme === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
        </IconButton>
    );
};

export default ThemeToggleButton;
