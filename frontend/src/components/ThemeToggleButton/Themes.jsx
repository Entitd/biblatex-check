import { createTheme } from '@mui/material/styles';

const fontFamily = 'Roboto, sans-serif';

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#007bff',
        },
        secondary: {
            main: '#28a745',
        },
        background: {
            default: '#ffffff',
            paper: '#f9f9f9',
        },
        text: {
            primary: '#333333',
            secondary: '#555555',
        },
    },
    typography: {
        fontFamily: fontFamily,
    },
    components: {
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundColor: '#ffffff', // Белый фон для Paper
              border: '1px solid #e1e4e8', // Светлая граница
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', // Более мягкая тень
            },
          },
        },
        MuiTable: {
          styleOverrides: {
            root: {
              backgroundColor: '#ffffff', // Белый фон для таблицы
              '& .MuiTableCell-root': {
                color: '#24292e', // Темный текст в ячейках
                borderBottom: '1px solid #e1e4e8', // Светлая граница между строками
                backgroundColor: '#ffffff', // Белый фон ячеек
              },
              '& .MuiTableHead-root .MuiTableCell-root': {
                color: '#24292e', // Темный текст в заголовке
                backgroundColor: '#f6f8fa', // Светло-серый фон заголовка
                fontWeight: 'bold',
                borderBottom: '1px solid #e1e4e8', // Светлая граница под заголовком
              },
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              backgroundColor: '#ffffff', // Белый фон для TextField
              '& .MuiInputBase-input': {
                color: '#24292e', // Темный текст ввода
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#e1e4e8', // Светлая граница
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#0366d6', // Синий при наведении
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#0366d6', // Синий при фокусе
              },
            },
          },
        },
      }
});

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#1f6feb',
        },
        secondary: {
            main: '#2ea043',
        },
        background: {
            default: '#0d1117', // Основной фон
            paper: '#161b22',   // Фон для Paper и других компонентов
        },
        text: {
            primary: '#c9d1d9',  // Основной текст
            secondary: '#8b949e', // Вторичный текст
        },
        error: {
            main: '#f85149',
        },
        warning: {
            main: '#d29922',
        },
        info: {
            main: '#58a6ff',
        },
        success: {
            main: '#3fb950',
        },
    },
    typography: {
        fontFamily: 'Roboto, sans-serif',
        h1: { fontSize: '2.5rem', fontWeight: 700 },
        h2: { fontSize: '2rem', fontWeight: 600 },
        h3: { fontSize: '1.75rem', fontWeight: 500 },
        h4: { fontSize: '1.5rem', fontWeight: 500 },
        h5: { fontSize: '1.25rem', fontWeight: 500 },
        h6: { fontSize: '1rem', fontWeight: 500 },
        body1: { fontSize: '1rem', color: '#c9d1d9' },
        body2: { fontSize: '0.875rem', color: '#8b949e' },
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: '#161b22', // Фон для Paper
                    border: '1px solid #30363d', // Граница для Paper
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                },
            },
        },
        MuiTable: {
            styleOverrides: {
                root: {
                    backgroundColor: '#161b22', // Фон для таблицы
                    '& .MuiTableCell-root': {
                        color: '#c9d1d9', // Цвет текста в ячейках
                        borderBottom: '1px solid #30363d', // Граница между строками
                        backgroundColor: '#161b22', // Фон ячеек
                    },
                    '& .MuiTableHead-root .MuiTableCell-root': {
                        color: '#c9d1d9', // Цвет текста в заголовке таблицы
                        backgroundColor: '#21262d', // Фон заголовка таблицы
                        fontWeight: 'bold',
                        borderBottom: '1px solid #30363d', // Граница под заголовком
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    backgroundColor: '#161b22', // Фон для TextField
                    '& .MuiInputBase-input': {
                        color: '#c9d1d9', // Цвет текста в поле ввода
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#30363d', // Цвет границы
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#58a6ff', // Цвет границы при наведении
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#58a6ff', // Цвет границы при фокусе
                    },
                },
            },
        },
    },
});