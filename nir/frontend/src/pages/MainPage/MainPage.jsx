import React, { useContext } from "react";
import {
  Container,
  Typography,
  Button,
  Grid,
  Box,
  IconButton,
  Link,
  CssBaseline,
  createTheme,
  ThemeProvider,
} from "@mui/material";
import Logo from "../../components/Logo/Logo";
import BibImage from "../../assets/images/iskm.png"; // Пример изображения BibTeX
import CheckImage from "../../assets/images/iskm.png"; // Пример изображения для проверки
import TelegramIcon from "@mui/icons-material/Telegram"; // Иконка Telegram
import WhatsAppIcon from "@mui/icons-material/WhatsApp"; // Иконка WhatsApp
import EmailIcon from "@mui/icons-material/Email"; // Иконка почты
import { ThemeContext } from "../../components/ThemeToggleButton/ThemeContext"; // Импортируем ThemeContext
import ThemeToggleButton from "../../components/ThemeToggleButton/ThemeToggleButton"; // Импортируем кнопку переключения темы

const MainPage = () => {
  const { isDarkMode } = useContext(ThemeContext); // Получаем состояние темы

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? "dark" : "light",
      background: {
        default: isDarkMode ? "#121212" : "#f5f5f5",
        paper: isDarkMode ? "#1e1e1e" : "#ffffff",
      },
      text: {
        primary: isDarkMode ? "#ffffff" : "#000000",
      },
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Применяем базовые стили MUI */}
      <Container
        maxWidth="lg"
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Кнопка переключения темы */}
        <Box sx={{ position: "absolute", top: 16, right: 16 }}>
          <ThemeToggleButton />
        </Box>

        {/* Первый блок: Логотип, заголовок и кнопки */}
        <Box
          sx={{
            my: 4,
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Grid container justifyContent="center" alignItems="center" spacing={4}>
            {/* Текст и кнопки */}
            <Grid item xs={12} md={6}>
              <Logo />
              <Typography variant="h3" component="h1" gutterBottom>
                Добро пожаловать в <strong>biblatexcheck</strong>
              </Typography>
              <Typography variant="h5" component="h2" gutterBottom>
                Проверяйте BibTeX-файлы на соответствие ГОСТ и требованиям кафедры ИСКМ ВолГУ.
              </Typography>

              {/* Кнопки для входа и регистрации */}
              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ mr: 2 }}
                  href="/login" // Ссылка на страницу входа
                >
                  Войти
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  size="large"
                  href="/register" // Ссылка на страницу регистрации
                >
                  Зарегистрироваться
                </Button>
              </Box>
            </Grid>

            {/* Изображение */}
            <Grid item xs={12} md={6}>
              <img
                src={BibImage}
                alt="BibTeX Example"
                style={{ width: "100%", borderRadius: "15px" }}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Второй блок: Что мы предлагаем? */}
        <Box
          sx={{
            my: 4,
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Grid container justifyContent="center" alignItems="center" spacing={4}>
            {/* Изображение */}
            <Grid item xs={12} md={6} order={{ xs: 2, md: 1 }}>
              <img
                src={CheckImage}
                alt="Check BibTeX"
                style={{ width: "100%", borderRadius: "15px" }}
              />
            </Grid>

            {/* Текст */}
            <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }}>
              <Typography variant="h4" component="h3" gutterBottom>
                Что мы предлагаем?
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>biblatexcheck</strong> — это современный инструмент для проверки BibTeX-файлов,
                разработанный специально для студентов, преподавателей и исследователей. Наш сервис
                поможет вам:
              </Typography>
              <ul style={{ textAlign: "left", paddingLeft: "20px" }}>
                <li>
                  <strong>Проверить файл на соответствие ГОСТ.</strong> Мы учитываем все требования
                  ГОСТ к оформлению библиографических данных, чтобы ваши работы соответствовали
                  стандартам.
                </li>
                <li>
                  <strong>Убедиться, что файл подходит для кафедры ИСКМ ВолГУ.</strong> Наш сервис
                  адаптирован под требования кафедры, чтобы вы могли быть уверены в правильности
                  оформления.
                </li>
                <li>
                  <strong>Найти и исправить ошибки в BibTeX-файлах.</strong> Мы автоматически
                  проверяем файлы на наличие ошибок и предоставляем подробный отчет.
                </li>
                <li>
                  <strong>Сэкономить время.</strong> Вместо ручной проверки вы можете загрузить файл
                  и получить результат за несколько секунд.
                </li>
              </ul>
              <Typography variant="body1" paragraph sx={{ mt: 2 }}>
                Наш сервис прост в использовании и доступен каждому. Просто загрузите ваш BibTeX-файл,
                и мы сделаем всю работу за вас!
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Футер с кнопками для связи */}
        <Box
          sx={{
            py: 4,
            textAlign: "center",
            backgroundColor: "background.paper",
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Typography variant="body1" paragraph>
            Свяжитесь с нами:
          </Typography>
          <Box>
            {/* Кнопка Telegram */}
            <IconButton
              color="primary"
              href="https://t.me/example" // Ссылка на Telegram
              target="_blank"
              rel="noopener noreferrer"
            >
              <TelegramIcon fontSize="large" />
            </IconButton>

            {/* Кнопка WhatsApp */}
            <IconButton
              color="primary"
              href="https://wa.me/1234567890" // Ссылка на WhatsApp
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon fontSize="large" />
            </IconButton>

            {/* Кнопка Email */}
            <IconButton
              color="primary"
              href="mailto:example@gmail.com" // Ссылка на почту
            >
              <EmailIcon fontSize="large" />
            </IconButton>
          </Box>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Email:{" "}
            <Link href="mailto:example@gmail.com" color="inherit">
              example@gmail.com
            </Link>
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default MainPage;
