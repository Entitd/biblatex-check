import React, { useContext, useState, useEffect, useRef } from "react";
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    IconButton,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Modal,
    Paper,
    InputAdornment,
    TablePagination,
    Menu,
    Fade,
    Backdrop,
    useMediaQuery,
    useTheme,
    CssBaseline
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { UserContext } from '../../UserContext';
import { ThemeContext } from '../../components/ThemeToggleButton/ThemeContext'; // Импортируем ThemeContext
import ThemeToggleButton from "../../components/ThemeToggleButton/ThemeToggleButton.jsx";
import { darkTheme, lightTheme } from '../../components/ThemeToggleButton/Themes';

const PersonalAccount = () => {
    const { user, token, setUser, setToken, logout } = useContext(UserContext);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext); // Получаем состояние темы
    const [files, setFiles] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [sources, setSources] = useState([]);
    const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
    const [currentFields, setCurrentFields] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [hasSource, setHasSource] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(6);
    const [anchorEl, setAnchorEl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const dropRef = useRef(null);

    useEffect(() => {
        if (user) {
            fetch(`http://localhost:8000/api/files?user_id=${user.id_user}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Ошибка при получении данных');
                    }
                    return response.json();
                })
                .then((data) => {
                    setFiles(data);
                })
                .catch((error) => console.error("Error fetching data:", error));
        }
    }, [user, token]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date)) {
            return "Некорректная дата";
        }
        return date.toLocaleDateString('ru-RU');
    };

    const getFieldsForType = (type) => {
        switch (type) {
            case "article":
                return ["author", "title", "journal", "year", "volume", "number", "pages"];
            case "book":
                return ["author", "title", "year", "address", "publisher", "pages"];
            case "conference":
                return ["author", "title", "booktitle", "year", "pages", "organization"];
            case "techReport":
                return ["author", "title", "institution", "year"];
            case "inProceedings":
                return ["author", "title", "booktitle", "year", "pages", "publisher", "address"];
            case "online":
                return ["author", "title", "url", "urldate"];
            case "manual":
                return ["title", "organization", "year"];
            default:
                return [];
        }
    };

    const handleTypeChange = (index, type) => {
        const updatedSources = [...sources];
        updatedSources[index].type = type;
        updatedSources[index].fields = getFieldsForType(type).reduce((acc, field) => {
            acc[field] = updatedSources[index].fields[field] || '';
            return acc;
        }, {});
        setSources(updatedSources);
        if (index === currentSourceIndex) {
            setCurrentFields(getFieldsForType(type));
        }
    };

    const addSource = () => {
        const newSource = { type: '', fields: {} };
        setSources([...sources, newSource]);
        setCurrentSourceIndex(sources.length);
        setHasSource(true);
    };

    const handleSourceChange = (index, field, value) => {
        const updatedSources = [...sources];
        updatedSources[index].fields[field] = value;
        setSources(updatedSources);
    };

    const saveBibFiles = () => {
        const formattedSources = sources.map((source, index) => ({
            ...source.fields,
            ID: `source${index + 1}`,
            type: source.type,
        }));
        console.log("Отправляемые данные:", formattedSources);

        fetch("http://localhost:8000/api/save-bib", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify(formattedSources),
        })
            .then((response) => {
                if (!response.ok) throw new Error('Ошибка при сохранении');
                return response.json();
            })
            .then(() => {
                setModalOpen(false);
                setSources([]);
                setCurrentSourceIndex(0);
                setHasSource(false);
            })
            .catch((error) => console.error("Ошибка при сохранении bib файла:", error));
    };

    const navigateSource = (direction) => {
        if (direction === 'next' && currentSourceIndex < sources.length - 1) {
            setCurrentSourceIndex(currentSourceIndex + 1);
            setCurrentFields(getFieldsForType(sources[currentSourceIndex + 1].type));
        } else if (direction === 'prev' && currentSourceIndex > 0) {
            setCurrentSourceIndex(currentSourceIndex - 1);
            setCurrentFields(getFieldsForType(sources[currentSourceIndex - 1].type));
        }
    };

    const handleCreateBibFile = () => {
        console.log("Открытие модального окна");
        setModalOpen(true);
        setSources([{ type: '', fields: {} }]);
        setCurrentSourceIndex(0);
        setHasSource(true);
    };

    useEffect(() => {
        if (sources.length > 0) {
            setCurrentFields(getFieldsForType(sources[currentSourceIndex].type));
        }
    }, [sources, currentSourceIndex]);

    const handleClearSearch = () => {
        setSearchText("");
    };

    const uploadBibFile = (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            uploadBibFiles(files);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        handleMenuClose();
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        if (!isDragging) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (event) => {
        const relatedTarget = event.relatedTarget;
        if (!dropRef.current.contains(relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            uploadBibFiles(files);
        }
    };

    const uploadBibFiles = (files) => {
        Array.from(files).forEach((file) => {
            const formData = new FormData();
            formData.append('file', file);
            fetch('http://localhost:8000/api/upload-bib', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Ошибка при загрузке файла');
                    }
                    return response.json();
                })
                .then((data) => {
                    console.log('Файл успешно загружен:', data);
                })
                .catch((error) => console.error('Ошибка при загрузке файла:', error));
        });
    };

    

    const filteredFiles = files.filter((file) =>
        file.name_file.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <>
            <CssBaseline />
            <Container
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                ref={dropRef}
                sx={{
                    position: 'relative',
                    padding: '20px',
                    height: '100vh',
                    overflow: 'hidden',
                    backgroundColor: 'background.default',
                }}
            >
                {/* Затемнение и блюр при перетаскивании */}
                {isDragging && (
                    <Box
                        sx={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(20px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            animation: 'fadeIn 0.3s ease-in-out',
                        }}
                    >
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 'bold',
                                color: '#fff',
                                background: 'rgba(255, 255, 255, 0.1)',
                                padding: '15px 25px',
                                borderRadius: '10px',
                                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                            }}
                        >
                            Перетащите файл сюда, чтобы загрузить
                        </Typography>
                    </Box>
                )}

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '2rem', color: 'text.primary' }}>
                        BIBTEXCHECK
                    </Typography>
                    <Typography variant="h6" sx={{ fontSize: '1.2rem', color: 'text.secondary' }}>
                        ID пользователя: {user ? user.id_user : 'Неизвестно'}
                    </Typography>
                    <Box display="flex" alignItems="center">
                        {/* Добавляем ThemeToggleButton */}
                        <ThemeToggleButton />

                        {/* Кнопка пользователя */}
                        <IconButton
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            color="inherit"
                            onClick={handleMenuOpen}
                            sx={{ color: 'text.primary' }}
                        >
                            <AccountCircleIcon fontSize="large" />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorEl}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                            PaperProps={{
                                elevation: 3,
                                sx: {
                                    borderRadius: '10px',
                                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                },
                            }}
                        >
                            <MenuItem onClick={handleLogout} sx={{ fontFamily: 'Roboto, sans-serif' }}>
                                Выйти
                            </MenuItem>
                        </Menu>
                    </Box>
                </Box>

                <Box display="flex" gap={2} mb={4} flexWrap="wrap">
                    <Box flex={1} display="flex" alignItems="center">
                        <TextField
                            fullWidth
                            placeholder="Поиск"
                            variant="outlined"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchText && (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleClearSearch} size="small">
                                            <ClearIcon sx={{ color: 'text.secondary' }} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                backgroundColor: 'background.paper',
                                '& .MuiInputBase-input': { color: 'text.primary' },
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'text.secondary' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                                '& .MuiInputLabel-root': { color: 'text.secondary' },
                                '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
                            }}
                        />
                    </Box>
                    <Button
                        variant="contained"
                        onClick={handleCreateBibFile}
                        sx={{
                            backgroundColor: 'primary.main',
                            color: '#fff',
                            borderRadius: '5px',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                            transition: 'background-color 0.3s, box-shadow 0.3s',
                            '&:hover': {
                                backgroundColor: 'primary.dark',
                                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                            },
                        }}
                    >
                        Создать bib-файл
                    </Button>
                    <Button
                        variant="outlined"
                        as="span"
                        onClick={() => document.getElementById('upload-bib-file').click()}
                        sx={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            userSelect: 'none',
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            borderRadius: '5px',
                            transition: 'background-color 0.3s, box-shadow 0.3s',
                            '&:hover': {
                                backgroundColor: 'primary.light',
                                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                            },
                        }}
                    >
                        Загрузить bib-файл
                    </Button>
                    <input
                        id="upload-bib-file"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={uploadBibFile}
                    />
                </Box>

                <Paper
                    sx={{
                        borderRadius: '15px',
                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                        background: 'background.paper',
                        height: 'calc(100vh - 250px)',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <Box sx={{ flex: 1, overflow: 'auto', '&::-webkit-scrollbar': { width: '8px' }, '&::-webkit-scrollbar-thumb': { backgroundColor: 'text.secondary', borderRadius: '10px' }, '&::-webkit-scrollbar-thumb:hover': { backgroundColor: 'primary.main' } }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>
                                        Название файла
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>
                                        Дата загрузки
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>
                                        Количество ошибок
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>
                                        Соответствие курсу
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>
                                        Ссылки на скачивание исход. ред.
                                    </TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>
                                        Ошибки
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredFiles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((file, index) => (
                                    <TableRow key={index} sx={{ '&:nth-of-type(odd)': { backgroundColor: 'background.paper' } }}>
                                        <TableCell align="center">{file.name_file}</TableCell>
                                        <TableCell align="center">{formatDate(file.loading_at)}</TableCell>
                                        <TableCell align="center">{file.number_of_errors}</TableCell>
                                        <TableCell align="center">{file.course_compliance}</TableCell>
                                        <TableCell align="center">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                href={file.download_link_edited}
                                                sx={{
                                                    marginRight: 1,
                                                    backgroundColor: 'secondary.main',
                                                    color: '#fff',
                                                    borderRadius: '5px',
                                                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                                    transition: 'background-color 0.3s, box-shadow 0.3s',
                                                    '&:hover': {
                                                        backgroundColor: 'secondary.dark',
                                                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                                                    },
                                                }}
                                            >
                                                Скачать
                                            </Button>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                href={file.download_link_edited}
                                                sx={{
                                                    marginLeft: 1,
                                                    backgroundColor: 'secondary.main',
                                                    color: '#fff',
                                                    borderRadius: '5px',
                                                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                                    transition: 'background-color 0.3s, box-shadow 0.3s',
                                                    '&:hover': {
                                                        backgroundColor: 'secondary.dark',
                                                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                                                    },
                                                }}
                                            >
                                                Скачать
                                            </Button>
                                        </TableCell>
                                        <TableCell align="center">{file.errors}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={filteredFiles.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{
                            '& .MuiTablePagination-root': {
                                borderRadius: '5px',
                            },
                        }}
                    />
                </Paper>

                <Modal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    closeAfterTransition
                    BackdropComponent={Backdrop}
                    BackdropProps={{
                        timeout: 500,
                        sx: {
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            backdropFilter: 'blur(10px)',
                        },
                    }}
                >
                    <Fade in={modalOpen}>
                        <Paper
                            sx={{
                                width: { xs: 300, sm: 400, md: 500 },
                                p: 3,
                                mx: "auto",
                                mt: 5,
                                borderRadius: '15px',
                                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                                background: 'background.paper',
                                position: 'relative',
                                zIndex: 1001,
                                maxHeight: '80vh',
                                overflowY: 'auto',
                                '&::-webkit-scrollbar': {
                                    width: '8px',
                                },
                                '&::-webkit-scrollbar-thumb': {
                                    backgroundColor: 'text.secondary',
                                    borderRadius: '10px',
                                },
                                '&::-webkit-scrollbar-thumb:hover': {
                                    backgroundColor: 'primary.main',
                                },
                            }}
                        >
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
                                Создать bib-файл
                            </Typography>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="type-label" sx={{ fontWeight: 'bold' }}>
                                    Тип записи
                                </InputLabel>
                                <Select
                                    labelId="type-label"
                                    value={sources[currentSourceIndex]?.type || ''}
                                    onChange={(e) => handleTypeChange(currentSourceIndex, e.target.value)}
                                    sx={{
                                        borderRadius: '5px',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'primary.main',
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'primary.dark',
                                        },
                                    }}
                                >
                                    <MenuItem value="article">Article</MenuItem>
                                    <MenuItem value="book">Book</MenuItem>
                                    <MenuItem value="conference">Conference</MenuItem>
                                    <MenuItem value="techReport">Tech Report</MenuItem>
                                    <MenuItem value="inProceedings">In Proceedings</MenuItem>
                                    <MenuItem value="online">Online</MenuItem>
                                    <MenuItem value="manual">Manual</MenuItem>
                                </Select>
                            </FormControl>

                            {sources.length > 0 && (
                                <Box my={2}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                        Источник {currentSourceIndex + 1}
                                    </Typography>
                                    {currentFields.map((field, idx) => (
                                        <TextField
                                            key={idx}
                                            fullWidth
                                            margin="dense"
                                            label={field}
                                            value={sources[currentSourceIndex].fields[field] || ''}
                                            onChange={(e) => handleSourceChange(currentSourceIndex, field, e.target.value)}
                                            sx={{
                                                borderRadius: '5px',
                                                '& .MuiOutlinedInput-root': {
                                                    '& fieldset': {
                                                        borderColor: 'primary.main',
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: 'primary.dark',
                                                    },
                                                },
                                            }}
                                        />
                                    ))}
                                </Box>
                            )}

                            <Box display="flex" justifyContent="space-between" mt={2}>
                                <Button
                                    variant="outlined"
                                    onClick={() => navigateSource('prev')}
                                    disabled={currentSourceIndex === 0}
                                    sx={{
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        borderRadius: '5px',
                                        transition: 'background-color 0.3s, box-shadow 0.3s',
                                        '&:hover': {
                                            backgroundColor: 'primary.light',
                                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                        },
                                    }}
                                >
                                    Предыдущий
                                </Button>
                                <Button
                                    variant="outlined"
                                    onClick={() => navigateSource('next')}
                                    disabled={currentSourceIndex === sources.length - 1}
                                    sx={{
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        borderRadius: '5px',
                                        transition: 'background-color 0.3s, box-shadow 0.3s',
                                        '&:hover': {
                                            backgroundColor: 'primary.light',
                                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                        },
                                    }}
                                >
                                    Следующий
                                </Button>
                            </Box>

                            <Button
                                fullWidth
                                variant="contained"
                                onClick={addSource}
                                sx={{
                                    mt: 2,
                                    backgroundColor: 'primary.main',
                                    color: '#fff',
                                    borderRadius: '5px',
                                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                    transition: 'background-color 0.3s, box-shadow 0.3s',
                                    '&:hover': {
                                        backgroundColor: 'primary.dark',
                                        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                                    },
                                }}
                            >
                                Добавить источник
                            </Button>
                            {hasSource && (
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    onClick={saveBibFiles}
                                    sx={{
                                        mt: 2,
                                        borderColor: 'primary.main',
                                        color: 'primary.main',
                                        borderRadius: '5px',
                                        transition: 'background-color 0.3s, box-shadow 0.3s',
                                        '&:hover': {
                                            backgroundColor: 'primary.light',
                                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                                        },
                                    }}
                                >
                                    Сохранить
                                </Button>
                            )}
                        </Paper>
                    </Fade>
                </Modal>
            </Container>
        </>
    );
};

export default PersonalAccount;