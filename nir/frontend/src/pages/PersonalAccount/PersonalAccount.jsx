import React, { useContext, useState, useEffect, useRef } from "react";
import {
    Container, Box, Typography, TextField, Button, IconButton, Table, TableHead, TableBody, TableRow, TableCell,
    Select, MenuItem, InputLabel, FormControl, Modal, Paper, InputAdornment, TablePagination, Menu, Fade, Backdrop,
    useMediaQuery, useTheme, CssBaseline
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { UserContext } from '../../UserContext';
import { ThemeContext } from '../../components/ThemeToggleButton/ThemeContext';
import ThemeToggleButton from "../../components/ThemeToggleButton/ThemeToggleButton.jsx";

const PersonalAccount = () => {
    const { user, logout } = useContext(UserContext); // Убрали token
    const { isDarkMode } = useContext(ThemeContext);
    const [files, setFiles] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [editFileId, setEditFileId] = useState(null);
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
        let isMounted = true;

        const fetchFiles = () => {
            console.log('Fetching files for user:', user?.id_user);
            fetch(`http://localhost:8000/api/files?user_id=${user.id_user}`, {
                method: 'GET',
                credentials: 'include',
            })
                .then(response => {
                    if (!response.ok) throw new Error('Ошибка при получении данных');
                    return response.json();
                })
                .then(data => {
                    if (isMounted) setFiles(data);
                })
                .catch(error => console.error("Error fetching data:", error));
        };

        if (user) {
            fetchFiles();
        }

        return () => {
            isMounted = false;
        };
    }, [user]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return isNaN(date) ? "Некорректная дата" : date.toLocaleDateString('ru-RU');
    };

    const getFieldsForType = (type) => {
        switch (type) {
            case "article": return ["author", "title", "journal", "year", "volume", "number", "pages"];
            case "book": return ["author", "title", "year", "address", "publisher", "pages"];
            case "conference": return ["author", "title", "booktitle", "year", "pages", "organization"];
            case "techReport": return ["author", "title", "institution", "year"];
            case "inProceedings": return ["author", "title", "booktitle", "year", "pages", "publisher", "address"];
            case "online": return ["author", "title", "url", "urldate"];
            case "manual": return ["title", "organization", "year"];
            default: return [];
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
        if (index === currentSourceIndex) setCurrentFields(getFieldsForType(type));
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

        fetch("http://localhost:8000/api/save-bib", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify(formattedSources),
        })
            .then(response => {
                if (!response.ok) throw new Error('Ошибка при сохранении');
                return response.json();
            })
            .then(() => {
                setModalOpen(false);
                setSources([]);
                setCurrentSourceIndex(0);
                setHasSource(false);
                fetchFiles();
            })
            .catch(error => console.error("Ошибка при сохранении bib файла:", error));
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
        setModalOpen(true);
        setSources([{ type: '', fields: {} }]);
        setCurrentSourceIndex(0);
        setHasSource(true);
    };

    const handleEditFile = (file) => {
        fetch(`http://localhost:8000/api/get-bib-content?file_id=${file.id}`, {
            method: 'GET',
            credentials: 'include',
        })
            .then(response => {
                if (!response.ok) throw new Error('Ошибка при получении содержимого файла');
                return response.json();
            })
            .then(data => {
                setEditContent(data.content);
                setEditFileId(file.id);
                setEditModalOpen(true);
            })
            .catch(error => console.error("Ошибка при загрузке содержимого:", error));
    };

    const handleSaveEditedFile = () => {
        fetch("http://localhost:8000/api/save-bib", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({ content: editContent, file_id: editFileId }),
        })
            .then(response => {
                if (!response.ok) throw new Error('Ошибка при сохранении');
                return response.json();
            })
            .then(() => {
                setEditModalOpen(false);
                fetchFiles();
            })
            .catch(error => console.error("Ошибка при сохранении изменений:", error));
    };

    const uploadBibFiles = (files) => {
        Array.from(files).forEach((file) => {
            const formData = new FormData();
            formData.append('file', file);
            fetch('http://localhost:8000/api/upload-bib', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })
                .then(response => {
                    if (!response.ok) throw new Error('Ошибка при загрузке файла');
                    return response.json();
                })
                .then(() => fetchFiles())
                .catch(error => console.error('Ошибка при загрузке файла:', error));
        });
    };

    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);
    const handleLogout = () => { logout(); handleMenuClose(); };
    const handleClearSearch = () => setSearchText("");
    const handleDragOver = (event) => { event.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (event) => {
        if (!dropRef.current.contains(event.relatedTarget)) setIsDragging(false);
    };
    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        const files = event.dataTransfer.files;
        if (files.length > 0) uploadBibFiles(files);
    };

    const filteredFiles = files.filter((file) =>
        file.name_file.toLowerCase().includes(searchText.toLowerCase())
    );

    const downloadFile = async (fileUrl, fileName) => {
        if (!fileUrl) return;
        try {
            const response = await fetch(`http://localhost:8000/download/${fileUrl}`, {
                method: 'GET',
                credentials: 'include',
            });
            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Ошибка при скачивании файла:", error);
            alert("Не удалось скачать файл: " + error.message);
        }
    };

    return (
        <>
            <CssBaseline />
            <Container
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                ref={dropRef}
                sx={{ position: 'relative', padding: '20px', height: '100vh', overflow: 'hidden', backgroundColor: 'background.default' }}
            >
                {isDragging && (
                    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff', background: 'rgba(255, 255, 255, 0.1)', padding: '15px 25px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)' }}>
                            Перетащите файл сюда, чтобы загрузить
                        </Typography>
                    </Box>
                )}

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '2rem', color: 'text.primary' }}>BIBTEXCHECK</Typography>
                    <Typography variant="h6" sx={{ fontSize: '1.2rem', color: 'text.secondary' }}>ID пользователя: {user ? user.id_user : 'Неизвестно'}</Typography>
                    <Box display="flex" alignItems="center">
                        <ThemeToggleButton />
                        <IconButton aria-label="account" onClick={handleMenuOpen} sx={{ color: 'text.primary' }}>
                            <AccountCircleIcon fontSize="large" />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleMenuClose}
                            PaperProps={{ elevation: 3, sx: { borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' } }}
                        >
                            <MenuItem onClick={handleLogout}>Выйти</MenuItem>
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
                                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
                                endAdornment: searchText && <InputAdornment position="end"><IconButton onClick={handleClearSearch}><ClearIcon sx={{ color: 'text.secondary' }} /></IconButton></InputAdornment>,
                            }}
                            sx={{ backgroundColor: 'background.paper', '& .MuiInputBase-input': { color: 'text.primary' } }}
                        />
                    </Box>
                    <Button variant="contained" onClick={handleCreateBibFile} sx={{ backgroundColor: 'primary.main', color: '#fff', '&:hover': { backgroundColor: 'primary.dark' } }}>
                        Создать bib-файл
                    </Button>
                    <Button variant="outlined" onClick={() => document.getElementById('upload-bib-file').click()} sx={{ borderColor: 'primary.main', color: 'primary.main', '&:hover': { backgroundColor: 'primary.light' } }}>
                        Загрузить bib-файл
                    </Button>
                    <input id="upload-bib-file" type="file" style={{ display: 'none' }} onChange={uploadBibFiles} />
                </Box>

                <Paper sx={{ borderRadius: '15px', boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)', overflow: 'hidden', background: 'background.paper', height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>Название файла</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>Дата загрузки</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>Количество ошибок</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>Соответствие курсу</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>Ссылки на скачивание</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>Ошибки</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', background: 'background.paper' }}>Действия</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredFiles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((file) => (
                                    <TableRow key={file.id}>
                                        <TableCell align="center">{file.name_file}</TableCell>
                                        <TableCell align="center">{formatDate(file.loading_at)}</TableCell>
                                        <TableCell align="center">{file.number_of_errors}</TableCell>
                                        <TableCell align="center">{file.course_compliance}</TableCell>
                                        <TableCell align="center">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={() => downloadFile(file.download_link_source, `${file.name_file}_source.bib`)}
                                                sx={{ mr: 1, backgroundColor: 'secondary.main', '&:hover': { backgroundColor: 'secondary.dark' } }}
                                            >
                                                Исходный
                                            </Button>
                                            {file.download_link_edited && (
                                                <Button
                                                    variant="contained"
                                                    size="small"
                                                    onClick={() => downloadFile(file.download_link_edited, `${file.name_file}_edited.bib`)}
                                                    sx={{ backgroundColor: 'secondary.main', '&:hover': { backgroundColor: 'secondary.dark' } }}
                                                >
                                                    Отредактированный
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell align="center">{file.errors}</TableCell>
                                        <TableCell align="center">
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => handleEditFile(file)}
                                                sx={{ borderColor: 'primary.main', color: 'primary.main', '&:hover': { backgroundColor: 'primary.light' } }}
                                            >
                                                Редактировать
                                            </Button>
                                        </TableCell>
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
                    />
                </Paper>

                {/* Модальное окно для создания нового файла */}
                <Modal
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    closeAfterTransition
                    slots={{ backdrop: Backdrop }}
                    slotProps={{
                        backdrop: {
                            timeout: 500,
                            sx: {
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                backdropFilter: 'blur(10px)',
                                zIndex: -1, // Помещаем backdrop под модальное окно
                            },
                        },
                    }}
                >
                    <Fade in={modalOpen}>
                        <Paper sx={{
                            width: { xs: 300, sm: 400, md: 500 },
                            p: 3,
                            mx: "auto",
                            mt: 5,
                            borderRadius: '15px',
                            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                            background: 'background.paper',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            zIndex: 1300, // Убеждаемся, что модалка выше backdrop
                        }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>Создать bib-файл</Typography>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="type-label">Тип записи</InputLabel>
                                <Select
                                    labelId="type-label"
                                    value={sources[currentSourceIndex]?.type || ''}
                                    onChange={(e) => handleTypeChange(currentSourceIndex, e.target.value)}
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
                                    <Typography variant="subtitle1">Источник {currentSourceIndex + 1}</Typography>
                                    {currentFields.map((field) => (
                                        <TextField
                                            key={field}
                                            fullWidth
                                            margin="dense"
                                            label={field}
                                            value={sources[currentSourceIndex].fields[field] || ''}
                                            onChange={(e) => handleSourceChange(currentSourceIndex, field, e.target.value)}
                                        />
                                    ))}
                                </Box>
                            )}
                            <Box display="flex" justifyContent="space-between" mt={2}>
                                <Button variant="outlined" onClick={() => navigateSource('prev')} disabled={currentSourceIndex === 0}>Предыдущий</Button>
                                <Button variant="outlined" onClick={() => navigateSource('next')} disabled={currentSourceIndex === sources.length - 1}>Следующий</Button>
                            </Box>
                            <Button fullWidth variant="contained" onClick={addSource} sx={{ mt: 2 }}>Добавить источник</Button>
                            {hasSource && <Button fullWidth variant="outlined" onClick={saveBibFiles} sx={{ mt: 2 }}>Сохранить</Button>}
                        </Paper>
                    </Fade>
                </Modal>

                {/* Модальное окно для редактирования файла */}
                <Modal
                    open={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    closeAfterTransition
                    slots={{ backdrop: Backdrop }}
                    slotProps={{
                        backdrop: {
                            timeout: 500,
                            sx: {
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                backdropFilter: 'blur(10px)',
                                zIndex: -1, // Помещаем backdrop под модальное окно
                            },
                        },
                    }}
                >
                    <Fade in={editModalOpen}>
                        <Paper
                            sx={{
                                width: { xs: '90vw', sm: 600, md: 800 },
                                p: 3,
                                mx: "auto",
                                mt: 5,
                                borderRadius: '15px',
                                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                                background: 'background.paper',
                                height: 'auto',
                                maxHeight: '80vh',
                                display: 'flex',
                                flexDirection: 'column',
                                zIndex: 1300, // Убеждаемся, что модалка выше backdrop
                            }}
                        >
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
                                Редактировать bib-файл
                            </Typography>
                            <Box sx={{ flex: 1, overflowY: 'auto', mb: 2 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    sx={{
                                        '& .MuiInputBase-root': { fontFamily: 'monospace' },
                                        '& .MuiInputBase-input': { height: 'calc(80vh - 150px)', overflowY: 'auto' },
                                    }}
                                    inputProps={{ style: { resize: 'none' } }}
                                />
                            </Box>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleSaveEditedFile}
                                sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
                            >
                                Сохранить изменения
                            </Button>
                        </Paper>
                    </Fade>
                </Modal>
            </Container>
        </>
    );
};

export default PersonalAccount;