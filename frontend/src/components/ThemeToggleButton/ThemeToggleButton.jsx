import React, { useContext } from "react";
import { IconButton } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { ThemeContext } from "./ThemeContext";

const ThemeToggleButton = () => {
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);

    return (
        <IconButton onClick={toggleTheme} color="inherit">
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
    );
};

export default ThemeToggleButton;