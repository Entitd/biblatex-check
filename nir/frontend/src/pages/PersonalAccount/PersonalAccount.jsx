import React, { useContext, useState, useEffect, useRef } from "react";
import axios from 'axios';
import {
  Container, Box, Typography, TextField, Button, IconButton, Table, TableHead, TableBody, TableRow, TableCell,
  Select, MenuItem, InputLabel, FormControl, Modal, Paper, InputAdornment, TablePagination, Menu, Fade, Backdrop,
  useMediaQuery, useTheme, CssBaseline, Alert, Tooltip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import DownloadIcon from '@mui/icons-material/Download';
import ErrorIcon from '@mui/icons-material/Error';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import { UserContext } from '../../UserContext';
import { ThemeContext } from '../../components/ThemeToggleButton/ThemeContext';
import ThemeToggleButton from "../../components/ThemeToggleButton/ThemeToggleButton.jsx";
import { useNavigate } from "react-router-dom";

const guestAxios = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: false,
});

const authAxios = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
});

const PersonalAccount = () => {
  const { user, logout, refreshToken } = useContext(UserContext);
  const { isDarkMode } = useContext(ThemeContext);
  const [files, setFiles] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editFileId, setEditFileId] = useState(null);
  const [errorFileId, setErrorFileId] = useState(null);
  const [sources, setSources] = useState([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [currentFields, setCurrentFields] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [hasSource, setHasSource] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [editedLines, setEditedLines] = useState({});

  const isGuest = !user;
  const [sessionId] = useState(() => {
    if (!isGuest) return null;
    const existingSessionId = sessionStorage.getItem('guestSessionId');
    if (existingSessionId) return existingSessionId;
    const newSessionId = `guest_${Math.random().toString(36).substring(2)}`;
    sessionStorage.setItem('guestSessionId', newSessionId);
    return newSessionId;
  });

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dropRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchFiles = async () => {
      try {
        const endpoint = isGuest
          ? `/api/guest/files?sessionId=${sessionId}`
          : `/api/files?user_id=${user.id_user}`;
        const response = await (isGuest ? guestAxios : authAxios).get(endpoint);
        if (isMounted) setFiles(response.data);
        setError(null);
      } catch (error) {
        if (error.response?.status === 401 && !isGuest) {
          await refreshToken();
          fetchFiles();
        } else {
          console.error("Error fetching files:", error.response?.data || error.message);
          setError("Не удалось загрузить файлы: " + (error.response?.data?.detail || error.message));
        }
      }
    };

    fetchFiles();

    return () => {
      isMounted = false;
    };
  }, [user, isGuest, sessionId, refreshToken]);

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
      case "misc": return ["author", "title", "urldate", "url"];
      default: return [];
    }
  };

  const parseBibFile = (content) => {
    const lines = content ? content.split('\n') : [];
    const sources = [];
    const sourceLines = [];
    let currentSource = { type: '', fields: {} };
    let inEntry = false;
  
    lines.forEach((line, idx) => {
      line = line.trim();
      if (line.startsWith('@')) {
        if (inEntry && currentSource.type) {
          sources.push({ ...currentSource });
        }
        const match = line.match(/@(\w+)\s*{([^,]+),/);
        if (match) {
          currentSource = { type: match[1].toLowerCase(), fields: {} };
          inEntry = true;
          sourceLines.push(idx);
        }
      } else if (inEntry && line.includes('=')) {
        const [key, value] = line.split('=').map(s => s.trim());
        if (key && value) {
          let cleanedValue = value.replace(/^\{/, '').replace(/[,}].*$/, '').trim();
          currentSource.fields[key] = cleanedValue;
        }
      } else if (line.includes('}') && inEntry) {
        if (currentSource.type) {
          sources.push({ ...currentSource });
        }
        inEntry = false;
      }
    });
    if (inEntry && currentSource.type) {
      sources.push({ ...currentSource });
    }
  
    // Если sourceLines пуст, добавляем 0 как запасной вариант
    if (sourceLines.length === 0 && sources.length > 0) {
      sourceLines.push(0);
    }
  
    console.log("Parsed sources:", sources);
    console.log("Source lines:", sourceLines);
    return { sources: sources.length > 0 ? sources : [{ type: '', fields: {} }], sourceLines };
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
    updatedSources[index] = {
      ...updatedSources[index],
      fields: {
        ...updatedSources[index].fields,
        [field]: value,
      },
    };
    setSources(updatedSources);
  };

  const saveBibFiles = async () => {
    const formattedSources = sources.map((source, index) => ({
      ...source.fields,
      ID: `source${index + 1}`,
      type: source.type,
    }));
    try {
      if (isGuest) {
        await guestAxios.post("/api/guest/save-bib", { sessionId, files: formattedSources });
      } else {
        await authAxios.post("/api/save-bib", { files: formattedSources });
      }
      setModalOpen(false);
      setSources([]);
      setCurrentSourceIndex(0);
      setHasSource(false);
      fetchFiles();
    } catch (error) {
      if (error.response?.status === 401 && !isGuest) {
        await refreshToken();
        saveBibFiles();
      } else {
        const errorDetail = error.response?.data?.detail || error.message;
        console.error("Error saving bib files:", error.response?.data || error);
        setError(`Не удалось сохранить файл: ${typeof errorDetail === 'object' ? JSON.stringify(errorDetail) : errorDetail}`);
      }
    }
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

  const handleEditFile = async (file) => {
    try {
      const endpoint = isGuest
        ? `/api/guest/get-bib-content?file_id=${file.id}&sessionId=${sessionId}`
        : `/api/get-bib-content?file_id=${file.id}`;
      const response = await (isGuest ? guestAxios : authAxios).get(endpoint);
      const content = response.data.content;
      const { sources: parsedSources, sourceLines } = parseBibFile(content);
      let errorLines = {};
  
      console.log("file.errors:", file.errors);
      console.log("Content:", content);
      console.log("Source lines:", sourceLines);
  
      if (!sourceLines || sourceLines.length === 0) {
        console.warn("No source lines detected, using default mapping.");
        // Если sourceLines пуст, предполагаем, что все ошибки относятся к первому источнику
        if (file.errors && typeof file.errors === 'string') {
          const errorLinesArray = file.errors.split('\n').filter(line => line.trim());
          errorLinesArray.forEach(error => {
            const match = error.match(/\(строка (\d+)\)$/);
            if (match) {
              errorLines[0] = error.trim(); // Присваиваем ошибку первому источнику
            }
          });
        }
      } else if (file.errors && typeof file.errors === 'string') {
        const errorLinesArray = file.errors.split('\n').filter(line => line.trim());
        errorLinesArray.forEach(error => {
          const match = error.match(/\(строка (\d+)\)$/);
          if (match) {
            const lineNumber = parseInt(match[1], 10) - 1;
            let sourceIndex = -1;
            if (sourceLines && sourceLines.length > 0) {
              sourceIndex = sourceLines.findIndex((startLine, idx) => {
                const nextStartLine = sourceLines[idx + 1] || content.split('\n').length;
                return lineNumber >= startLine && lineNumber < nextStartLine;
              });
            }
            if (sourceIndex === -1 && parsedSources.length > 0) sourceIndex = 0; // По умолчанию первый источник
            if (sourceIndex !== -1 && sourceIndex < parsedSources.length) {
              errorLines[sourceIndex] = error.trim();
            }
          }
        });
      }
  
      setSources(parsedSources);
      setCurrentSourceIndex(0);
      setCurrentFields(getFieldsForType(parsedSources[0]?.type || ''));
      setEditContent(content);
      setEditFileId(file.id);
      setEditedLines(errorLines);
      setEditModalOpen(true);
      setHasSource(true);
    } catch (error) {
      if (error.response?.status === 401 && !isGuest) {
        await refreshToken();
        handleEditFile(file);
      } else {
        console.error("Error fetching file content:", error.response?.data || error.message);
        setError("Не удалось загрузить содержимое файла: " + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleSaveEditedFile = async () => {
    const formattedSources = sources.map((source, index) => ({
      ...source.fields,
      ID: `source${index + 1}`,
      type: source.type || 'misc',
    }));
    const content = formattedSources
      .map(source => `@${source.type}{${source.ID},\n` +
        Object.entries(source)
          .filter(([key]) => key !== 'ID' && key !== 'type')
          .map(([key, value]) => `  ${key} = {${value || ''}},`)
          .join('\n') + '\n}')
      .join('\n');
  
    try {
      if (!editFileId) {
        setError("Ошибка: ID файла не определён.");
        return;
      }
      const endpoint = isGuest
        ? `/api/guest/save-bib?file_id=${editFileId}&sessionId=${sessionId}`
        : `/api/save-bib?file_id=${editFileId}`;
      const response = await (isGuest ? guestAxios : authAxios).post(endpoint, { content }, { withCredentials: true });
  
      console.log("Save response:", response.data);
      if (response.data.errors) {
        const { sourceLines } = parseBibFile(content);
        const errorLines = {};
        const errorLinesArray = response.data.errors.split('\n').filter(line => line.trim());
        if (!sourceLines || sourceLines.length === 0) {
          console.warn("No source lines detected after save.");
          errorLines[0] = response.data.errors; // По умолчанию первая ошибка
        } else {
          errorLinesArray.forEach(error => {
            const match = error.match(/\(строка (\d+)\)$/);
            if (match) {
              const lineNumber = parseInt(match[1], 10) - 1;
              let sourceIndex = -1;
              if (sourceLines && sourceLines.length > 0) {
                sourceIndex = sourceLines.findIndex((startLine, idx) => {
                  const nextStartLine = sourceLines[idx + 1] || content.split('\n').length;
                  return lineNumber >= startLine && lineNumber < nextStartLine;
                });
              }
              if (sourceIndex === -1 && sources.length > 0) sourceIndex = 0;
              if (sourceIndex !== -1 && sourceIndex < sources.length) {
                errorLines[sourceIndex] = error.trim();
              }
            }
          });
        }
        setEditedLines(errorLines);
        setError(null);
        setEditModalOpen(true);
      } else {
        setEditedLines({});
        setError(null);
        setEditModalOpen(false);
        fetchFiles();
      }
    } catch (error) {
      if (error.response?.status === 401 && !isGuest) {
        await refreshToken();
        handleSaveEditedFile();
      } else {
        console.error("Error saving edited file:", error.response?.data || error.message);
        setError("Не удалось сохранить изменения: " + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleShowErrors = async (file) => {
    try {
      const endpoint = isGuest
        ? `/api/guest/get-bib-content?file_id=${file.id}&sessionId=${sessionId}`
        : `/api/get-bib-content?file_id=${file.id}`;
      const response = await (isGuest ? guestAxios : authAxios).get(endpoint);
      const content = response.data.content;
      const lines = content.split('\n');
      let errors = {};
      if (file.errors && typeof file.errors === 'string') {
        const errorLinesArray = file.errors.split('\n').filter(line => line.trim());
        errorLinesArray.forEach(error => {
          const match = error.match(/\(строка (\d+)\)$/);
          if (match) {
            const lineNumber = parseInt(match[1], 10) - 1;
            errors[lineNumber] = error.trim();
          }
        });
      }
      setEditedLines(errors);
      setEditContent(lines.join('\n'));
      setErrorFileId(file.id);
      setErrorModalOpen(true);
    } catch (error) {
      if (error.response?.status === 401 && !isGuest) {
        await refreshToken();
        handleShowErrors(file);
      } else {
        console.error("Error fetching file content:", error.response?.data || error.message);
        setError("Не удалось загрузить содержимое файла: " + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setEditContent(newContent);
    const parsedSources = parseBibFile(newContent);
    setSources(parsedSources);
    setCurrentSourceIndex(0);
    setCurrentFields(getFieldsForType(parsedSources[0]?.type || ''));
  };

  const uploadBibFiles = (event) => {
    const uploadedFiles = event.target.files || event.dataTransfer.files;
    Array.from(uploadedFiles).forEach(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      if (isGuest) formData.append('sessionId', sessionId);
      try {
        if (isGuest) {
          await guestAxios.post('/api/guest/upload-bib', formData);
        } else {
          await authAxios.post('/api/upload-bib', formData);
        }
        fetchFiles();
      } catch (error) {
        if (error.response?.status === 401 && !isGuest) {
          await refreshToken();
          uploadBibFiles(event);
        } else {
          console.error('Error uploading file:', error.response?.data || error.message);
          setError("Не удалось загрузить файл: " + (error.response?.data?.detail || error.message));
        }
      }
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
    uploadBibFiles(event);
  };

  const filteredFiles = files.filter((file) =>
    file.name_file.toLowerCase().includes(searchText.toLowerCase())
  );

  const downloadFile = async (fileUrl, fileName) => {
    if (!fileUrl) return;
    try {
      const response = await (isGuest ? guestAxios : authAxios).get(
        `/download/${fileUrl}${isGuest ? `?sessionId=${sessionId}` : ''}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (error.response?.status === 401 && !isGuest) {
        await refreshToken();
        downloadFile(fileUrl, fileName);
      } else {
        console.error("Error downloading file:", error.response?.data || error.message);
        setError("Не удалось скачать файл: " + (error.response?.data?.detail || error.message));
      }
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
        maxWidth={false}
        sx={{ position: 'relative', padding: '20px', height: '100vh', overflow: 'hidden', backgroundColor: 'background.default', width: '80%', margin: '0 auto' }}
      >
        {isDragging && (
          <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff', background: 'rgba(255, 255, 255, 0.1)', padding: '15px 25px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)' }}>
              Перетащите файл сюда, чтобы загрузить
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, width: '100%' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {isGuest && (
          <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
            Вы в гостевом режиме. Все ваши данные будут удалены после завершения сессии.
          </Alert>
        )}

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} sx={{ width: '100%' }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', fontSize: '2rem', color: 'text.primary' }}>BIBTEXCHECK</Typography>
          <Typography variant="h6" sx={{ fontSize: '1.2rem', color: 'text.secondary' }}>
            {isGuest ? "Гостевой режим" : `ID пользователя: ${user ? user.id_user : 'Неизвестно'}`}
          </Typography>
          <Box display="flex" alignItems="center" gap={1} sx={{ width: 'auto' }}>
            <ThemeToggleButton />
            {isGuest ? (
              <>
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => navigate("/login")}
                  sx={{ width: 'auto' }}
                >
                  Вход
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => navigate("/register")}
                  sx={{ width: 'auto' }}
                >
                  Регистрация
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </Box>
        </Box>

        <Box display="flex" gap={2} mb={4} flexWrap="wrap" sx={{ width: '100%' }}>
          <Box flex={1} display="flex" alignItems="center" sx={{ width: '100%' }}>
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
              sx={{ backgroundColor: 'background.paper', '& .MuiInputBase-input': { color: 'text.primary' }, width: '100%' }}
            />
          </Box>
          <Button variant="contained" onClick={handleCreateBibFile} sx={{ backgroundColor: 'primary.main', color: '#fff', '&:hover': { backgroundColor: 'primary.dark' }, width: 'auto' }}>
            Создать bib-файл
          </Button>
          <Button variant="outlined" onClick={() => document.getElementById('upload-bib-file').click()} sx={{ borderColor: 'primary.main', color: 'primary.main', '&:hover': { backgroundColor: 'primary.light' }, width: 'auto' }}>
            Загрузить bib-файл
          </Button>
          <input id="upload-bib-file" type="file" style={{ display: 'none' }} onChange={uploadBibFiles} />
        </Box>

        <Paper sx={{ borderRadius: '15px', boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)', overflow: 'hidden', background: 'background.paper', height: 'calc(100vh - 200px)', width: '100%', marginBottom: '20px', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flex: 1, overflowX: 'auto', width: '100%' }}>
            <Table stickyHeader sx={{ tableLayout: 'fixed', minWidth: 1400, width: '100%' }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', py: 2, fontSize: '1rem', color: 'text.primary', width: '30%' }}>
                    Название файла
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', py: 2, fontSize: '1rem', color: 'text.primary', width: '15%' }}>
                    Дата загрузки
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', py: 2, fontSize: '1rem', color: 'text.primary', width: '10%' }}>
                    Количество ошибок
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', py: 2, fontSize: '1rem', color: 'text.primary', width: '10%' }}>
                    Соответствие курсу
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', py: 2, fontSize: '1rem', color: 'text.primary', width: '15%' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <DownloadIcon fontSize="small" />
                      Ссылки на скачивание
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', py: 2, fontSize: '1rem', color: 'text.primary', width: '10%' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <ErrorIcon fontSize="small" />
                      Ошибки
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', backgroundColor: 'grey.100', py: 2, fontSize: '1rem', color: 'text.primary', width: '10%' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <EditIcon fontSize="small" />
                      Действия
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredFiles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((file, index) => (
                  <TableRow
                    key={file.id}
                    sx={{
                      backgroundColor: index % 2 === 0 ? 'background.paper' : 'grey.50',
                      '&:hover': { backgroundColor: 'grey.200' },
                    }}
                  >
                    <TableCell align="center" sx={{ py: 1.5, fontSize: '0.9rem', color: 'text.secondary', maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={file.name_file} arrow enterDelay={100} placement="top-start" disableInteractive>
                        <span>{file.name_file}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5, fontSize: '0.9rem', color: 'text.secondary' }}>{formatDate(file.loading_at)}</TableCell>
                    <TableCell align="center" sx={{ py: 1.5, fontSize: '0.9rem', color: file.number_of_errors > 0 ? 'error.main' : 'success.main' }}>{file.number_of_errors}</TableCell>
                    <TableCell align="center" sx={{ py: 1.5, fontSize: '0.9rem', color: 'text.secondary' }}>{file.course_compliance}</TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => downloadFile(file.download_link_source, `${file.name_file}_source.bib`)}
                        sx={{ mr: 1, fontSize: '0.8rem', backgroundColor: 'secondary.main', '&:hover': { backgroundColor: 'secondary.dark' } }}
                      >
                        Исходный
                      </Button>
                      {file.download_link_edited && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => downloadFile(file.download_link_edited, `${file.name_file}_edited.bib`)}
                          sx={{ fontSize: '0.8rem', backgroundColor: 'secondary.main', '&:hover': { backgroundColor: 'secondary.dark' } }}
                        >
                          Отредактированный
                        </Button>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      {file.number_of_errors > 0 && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleShowErrors(file)}
                          sx={{ fontSize: '0.8rem', borderColor: 'error.main', color: 'error.main', '&:hover': { backgroundColor: 'error.light' } }}
                        >
                          Просмотреть
                        </Button>
                      )}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleEditFile(file)}
                        sx={{ fontSize: '0.8rem', borderColor: 'primary.main', color: 'primary.main', '&:hover': { backgroundColor: 'primary.light' } }}
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

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
              sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(10px)', zIndex: -1 },
            },
          }}
        >
          <Fade in={modalOpen}>
            <Paper sx={{
              width: { xs: '80%', sm: '80%', md: '80%' },
              p: 3,
              mx: "auto",
              mt: 5,
              borderRadius: '15px',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
              background: 'background.paper',
              maxHeight: '80vh',
              overflowY: 'auto',
              zIndex: 1300,
            }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>Создать bib-файл</Typography>
              <FormControl fullWidth margin="normal" sx={{ width: '100%' }}>
                <InputLabel id="type-label">Тип записи</InputLabel>
                <Select
                  labelId="type-label"
                  value={sources[currentSourceIndex]?.type || ''}
                  onChange={(e) => handleTypeChange(currentSourceIndex, e.target.value)}
                  sx={{ width: '100%' }}
                >
                  <MenuItem value="article">Article</MenuItem>
                  <MenuItem value="book">Book</MenuItem>
                  <MenuItem value="conference">Conference</MenuItem>
                  <MenuItem value="techReport">Tech Report</MenuItem>
                  <MenuItem value="inProceedings">In Proceedings</MenuItem>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="misc">Misc</MenuItem>
                </Select>
              </FormControl>
              {sources.length > 0 && (
                <Box my={2} sx={{ width: '100%' }}>
                  <Typography variant="subtitle1">Источник {currentSourceIndex + 1}</Typography>
                  {currentFields.map((field) => (
                    <TextField
                      key={field}
                      fullWidth
                      margin="dense"
                      label={field}
                      value={sources[currentSourceIndex].fields[field] || ''}
                      onChange={(e) => handleSourceChange(currentSourceIndex, field, e.target.value)}
                      sx={{ width: '100%' }}
                    />
                  ))}
                </Box>
              )}
              <Box display="flex" justifyContent="space-between" mt={2} sx={{ width: '100%' }}>
                <Button variant="outlined" onClick={() => navigateSource('prev')} disabled={currentSourceIndex === 0} sx={{ width: '48%' }}>Предыдущий</Button>
                <Button variant="outlined" onClick={() => navigateSource('next')} disabled={currentSourceIndex === sources.length - 1} sx={{ width: '48%' }}>Следующий</Button>
              </Box>
              <Button fullWidth variant="contained" onClick={addSource} sx={{ mt: 2, width: '100%' }}>Добавить источник</Button>
              {hasSource && <Button fullWidth variant="outlined" onClick={saveBibFiles} sx={{ mt: 2, width: '100%' }}>Сохранить</Button>}
            </Paper>
          </Fade>
        </Modal>

        <Modal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
              sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(10px)', zIndex: -1 },
            },
          }}
        >
          <Fade in={editModalOpen}>
            <Paper
              sx={{
                width: { xs: '80%', sm: '80%', md: '80%' },
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
                zIndex: 1300,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
                Редактировать bib-файл
              </Typography>
              {sources.length > 0 && (
  <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, width: '100%' }}>
    {sources.map((source, index) => {
      const hasError = editedLines[index] !== undefined;
      const errorMessage = hasError ? editedLines[index] : '';
      console.log(`Source ${index}: hasError=${hasError}, errorMessage=${errorMessage}`);
      return (
        <Box key={index} mb={2} sx={{ width: '100%', border: hasError ? '2px solid red' : 'none', borderRadius: '4px', padding: '8px' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: hasError ? 'error.main' : 'text.primary' }}>
            Источник {index + 1} {hasError && '(Содержит ошибки)'}
          </Typography>
                        <FormControl fullWidth margin="normal" sx={{ width: '100%' }}>
                          <InputLabel id={`type-label-${index}`}>Тип записи</InputLabel>
                          <Select
                            labelId={`type-label-${index}`}
                            value={source.type || ''}
                            onChange={(e) => handleTypeChange(index, e.target.value)}
                            sx={{ width: '100%', ...(hasError && { borderColor: 'error.main' }) }}
                          >
                            <MenuItem value="article">Article</MenuItem>
                            <MenuItem value="book">Book</MenuItem>
                            <MenuItem value="conference">Conference</MenuItem>
                            <MenuItem value="techReport">Tech Report</MenuItem>
                            <MenuItem value="inProceedings">In Proceedings</MenuItem>
                            <MenuItem value="online">Online</MenuItem>
                            <MenuItem value="manual">Manual</MenuItem>
                            <MenuItem value="misc">Misc</MenuItem>
                          </Select>
                        </FormControl>
                        {getFieldsForType(source.type || '').map((field) => (
                          <TextField
                            key={field}
                            fullWidth
                            margin="dense"
                            label={field}
                            value={source.fields[field] || ''}
                            onChange={(e) => handleSourceChange(index, field, e.target.value)}
                            sx={{
                              width: '100%',
                              ...(hasError && { '& .MuiInputBase-input': { color: 'error.main', borderBottom: '2px solid red' } }),
                            }}
                            error={hasError}
                            helperText={hasError ? errorMessage : ''}
                          />
                        ))}
                      </Box>
                    );
                  })}
                </Box>
              )}
              <Box display="flex" justifyContent="space-between" mt={2} sx={{ width: '100%' }}>
                <Button variant="outlined" onClick={() => navigateSource('prev')} disabled={currentSourceIndex === 0} sx={{ width: '48%' }}>Предыдущий</Button>
                <Button variant="outlined" onClick={() => navigateSource('next')} disabled={currentSourceIndex === sources.length - 1} sx={{ width: '48%' }}>Следующий</Button>
              </Box>
              <Button fullWidth variant="contained" onClick={addSource} sx={{ mt: 2, width: '100%' }}>Добавить источник</Button>
              <Button fullWidth variant="outlined" onClick={handleSaveEditedFile} sx={{ mt: 2, width: '100%' }}>Сохранить</Button>
            </Paper>
          </Fade>
        </Modal>

        <Modal
          open={errorModalOpen}
          onClose={() => setErrorModalOpen(false)}
          closeAfterTransition
          slots={{ backdrop: Backdrop }}
          slotProps={{
            backdrop: {
              timeout: 500,
              sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(10px)', zIndex: -1 },
            },
          }}
        >
          <Fade in={errorModalOpen}>
            <Paper
              sx={{
                width: { xs: '80%', sm: '80%', md: '80%' },
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
                zIndex: 1300,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
                Просмотр ошибок
              </Typography>
              <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, width: '100%' }}>
                {editContent.split('\n').map((line, index) => (
                  <Typography
                    key={index}
                    sx={{
                      mb: 1,
                      textDecoration: editedLines[index] ? 'underline red' : 'none',
                      color: editedLines[index] ? 'error.main' : 'text.primary',
                    }}
                  >
                    {line} {editedLines[index] ? `- ${editedLines[index]}` : ''}
                  </Typography>
                ))}
              </Box>
              <Button
                fullWidth
                variant="contained"
                onClick={() => setErrorModalOpen(false)}
                sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' }, width: '100%' }}
              >
                Закрыть
              </Button>
            </Paper>
          </Fade>
        </Modal>
      </Container>
    </>
  );
};

export default PersonalAccount;