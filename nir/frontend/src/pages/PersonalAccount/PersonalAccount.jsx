import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

const PersonalAccount = () => {
    const [files, setFiles] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [sources, setSources] = useState([]);
    const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
    const [currentFields, setCurrentFields] = useState([]);
    const [searchText, setSearchText] = useState("");
    const [hasSource, setHasSource] = useState(false); // Новое состояние для отслеживания наличия источников

    useEffect(() => {
        const userId = 1; // Пример: здесь нужно установить реальный ID пользователя
        fetch(`http://localhost:8000/api/files?user_id=${userId}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Ошибка при получении данных');
                }
                return response.json();
            })
            .then((data) => {
                console.log("Полученные данные:", data);
                setFiles(data);
            })
            .catch((error) => console.error("Error fetching data:", error));
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date)) {
            console.error("Ошибка парсинга даты:", dateString);
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
        if (sources.length < 100) {
            const newSource = { type: '', fields: {} };
            setSources([...sources, newSource]);
            setCurrentSourceIndex(sources.length);
            setHasSource(true); // Устанавливаем состояние, что источник добавлен
        } else {
            alert("Достигнуто максимальное количество источников (100)");
        }
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
            headers: { "Content-Type": "application/json" },
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
                setHasSource(false); // Сбрасываем состояние после сохранения
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
        setModalOpen(true);
        setSources([{ type: '', fields: {} }]);
        setCurrentSourceIndex(0);
        setHasSource(false); // Сбрасываем состояние при открытии модального окна
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
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            fetch('http://localhost:8000/api/upload-bib', {
                method: 'POST',
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
                    // Обновите список файлов или выполните другие действия
                })
                .catch((error) => console.error('Ошибка при загрузке файла:', error));
        }
    };

    return (
        <Container>
            <Box display="flex" justifyContent="space-between" alignItems="center" my={2}>
                <Typography variant="h4">Личный кабинет</Typography>
                <AccountCircleIcon fontSize="large" />
            </Box>

            <Box display="flex" gap={2} mb={2}>
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
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            endAdornment: searchText && (
                                <InputAdornment position="end">
                                    <IconButton onClick={handleClearSearch}>
                                        <ClearIcon />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
                <Button variant="contained" onClick={handleCreateBibFile}>
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
                        userSelect: 'none', // Отключаем выделение текста
                    }}
                >
                    Загрузить bib-файл
                </Button>
                <input
                    id="upload-bib-file"
                    type="file"
                    style={{ display: 'none' }} // Скрываем поле
                    onChange={uploadBibFile} // Обрабатываем изменение
                />
            </Box>

            <Paper>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell align="center">Название файла</TableCell>
                            <TableCell align="center">Дата загрузки</TableCell>
                            <TableCell align="center">Количество ошибок</TableCell>
                            <TableCell align="center">Соответствие курсу</TableCell>
                            <TableCell align="center">Ссылки на скачивание исход. ред.</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {files.map((file, index) => (
                            <TableRow key={index}>
                                <TableCell align="center">{file.name_file}</TableCell>
                                <TableCell align="center">{formatDate(file.loading_at)}</TableCell>
                                <TableCell align="center">{file.number_of_errors}</TableCell>
                                <TableCell align="center">{file.course_compliance}</TableCell>
                                <TableCell align="center">
                                    <Button variant="contained" size="small" href={file.download_link_edited} sx={{ marginRight: 1 }}>
                                        Скачать
                                    </Button>

                                    <Button variant="contained" size="small" href={file.download_link_edited} sx={{ marginLeft: 1 }}>
                                        Скачать
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
                <Paper sx={{ width: 500, p: 3, mx: "auto", mt: 5 }}>
                    <Typography variant="h6">Создать bib-файл</Typography>
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
                            {currentFields.map((field, idx) => (
                                <TextField
                                    key={idx}
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
                        <Button variant="outlined" onClick={() => navigateSource('prev')} disabled={currentSourceIndex === 0}>
                            Предыдущий
                        </Button>
                        <Button variant="outlined" onClick={() => navigateSource('next')} disabled={currentSourceIndex === sources.length - 1}>
                            Следующий
                        </Button>
                    </Box>

                    <Button fullWidth variant="contained" onClick={addSource} sx={{ mt: 2 }}>
                        Добавить источник
                    </Button>
                    {hasSource && (
                        <Button fullWidth variant="outlined" onClick={saveBibFiles} sx={{ mt: 2 }}>
                            Сохранить
                        </Button>
                    )}
                </Paper>
            </Modal>
        </Container>
    );
};

export default PersonalAccount;
