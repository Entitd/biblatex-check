import React, { useContext, useState, useEffect, useRef } from "react";
import axios from 'axios';
import {
  Container, Box, Typography, TextField, Button, IconButton, Table, TableHead, TableBody, TableRow, TableCell,
  Select, MenuItem, InputLabel, FormControl, Modal, Paper, InputAdornment, TablePagination, Menu, Fade, Backdrop,
  useMediaQuery, useTheme, CssBaseline, Alert, Tooltip, Card,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
import LoginIcon from '@mui/icons-material/Login';
import HowToRegIcon from '@mui/icons-material/HowToReg';
const guestAxios = axios.create({
  withCredentials: false,
});

const authAxios = axios.create({
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

  const fetchFiles = async () => {
    try {
      const endpoint = isGuest
        ? `/api/guest/files?sessionId=${sessionId}`
        : `/api/files?user_id=${user.id_user}`;
      const response = await (isGuest ? guestAxios : authAxios).get(endpoint);
      setFiles(response.data);
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

  useEffect(() => {
    let isMounted = true;

    if (isMounted) {
      fetchFiles();
    }

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

  const getRequiredFieldsForType = (type) => {
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

  const getAllFieldsFromSource = (source, type) => {
    const standardFields = getFieldsForType(type);
    const requiredFields = getRequiredFieldsForType(type);
    const allFieldsInSource = Object.keys(source.fields);

    const standard = standardFields.filter(field => allFieldsInSource.includes(field));
    const required = requiredFields.filter(field => allFieldsInSource.includes(field));
    const optional = allFieldsInSource.filter(field => !standardFields.includes(field));

    return { standard, required, optional };
  };



  const DownloadMenu = ({ file }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    const { isGuest } = useContext(UserContext);
    const [sessionId] = useState(() => sessionStorage.getItem('guestSessionId'));
    const { refreshToken } = useContext(UserContext);
  
    const handleClick = (event) => {
      setAnchorEl(event.currentTarget);
    };
  
    const handleClose = () => {
      setAnchorEl(null);
    };
  
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
        }
      }
      handleClose();
    };
  
    return (
      <>
        <Tooltip title="Скачать файл">
          <IconButton
            onClick={handleClick}
            color="primary"
            sx={{
              '&:hover': {
                backgroundColor: 'primary.light',
              },
            }}
          >
            <DownloadIcon />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          PaperProps={{
            elevation: 3,
            sx: {
              borderRadius: '10px',
              mt: 1,
            }
          }}
        >
          <MenuItem 
            onClick={() => downloadFile(file.download_link_source, `${file.name_file}_source.bib`)}
            sx={{ minWidth: '180px' }}
          >
            Исходный файл
          </MenuItem>
          {file.download_link_edited && (
            <MenuItem 
              onClick={() => downloadFile(file.download_link_edited, `${file.name_file}_edited.bib`)}
              sx={{ minWidth: '180px' }}
            >
              Исправленный файл
            </MenuItem>
          )}
        </Menu>
      </>
    );
  };

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // И компонент где-то в рендере:
  <Snackbar
    open={snackbar.open}
    autoHideDuration={6000}
    onClose={() => setSnackbar({...snackbar, open: false})}
  >
    <Alert 
      severity={snackbar.severity}
      onClose={() => setSnackbar({...snackbar, open: false})}
    >
      {snackbar.message}
    </Alert>
  </Snackbar>
  
  const parseBibFile = (content) => {
    const lines = content ? content.split('\n') : [];
    const sources = [];
    const sourceLines = [];
    let currentSource = { type: '', fields: {}, lineStart: 0 };
  
    lines.forEach((line, idx) => {
      line = line.trim();
      if (line.startsWith('@')) {
        if (currentSource.type) {
          sources.push({ ...currentSource, lineEnd: idx - 1 });
        }
        const match = line.match(/@(\w+)\s*{([^,]+),?/);
        if (match) {
          currentSource = { 
            type: match[1].toLowerCase(), 
            fields: {},
            lineStart: idx,
            id: match[2].trim()
          };
          sourceLines.push(idx);
        }
      } else if (currentSource.type && line.includes('=')) {
        const [key, value] = line.split('=').map(s => s.trim());
        if (key && value) {
          currentSource.fields[key] = value.replace(/^\{/, '').replace(/[,}].*$/, '').trim();
        }
      } else if (line.includes('}') && currentSource.type) {
        sources.push({ ...currentSource, lineEnd: idx });
        currentSource = { type: '', fields: {} };
      }
    });
  
    return { sources, sourceLines };
  };

  const handleTypeChange = (index, type, isEditing = false) => {
    const updatedSources = [...sources];
    const currentFields = updatedSources[index].fields;

    updatedSources[index].type = type;

    if (isEditing) {
      const standardFields = getFieldsForType(type);
      updatedSources[index].fields = {
        ...currentFields,
        ...standardFields.reduce((acc, field) => {
          acc[field] = currentFields[field] || '';
          return acc;
        }, {}),
      };
    } else {
      const standardFields = getFieldsForType(type);
      updatedSources[index].fields = standardFields.reduce((acc, field) => {
        acc[field] = currentFields[field] || '';
        return acc;
      }, {});
    }

    setSources(updatedSources);
    setCurrentFields(getFieldsForType(type));
  };

  const currentYear = new Date().getFullYear();

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
    // Фильтруем пустые записи
    const nonEmptySources = sources.filter(source => 
      Object.values(source.fields).some(value => value.trim() !== '')
    );
  
    if (nonEmptySources.length === 0) {
      setError("Создаваемый файл не может быть пустым");
      return;
    }
  
    // Проверка года (но не блокируем сохранение)
    const yearErrors = nonEmptySources.filter(source => 
      source.fields.year && (isNaN(source.fields.year) || parseInt(source.fields.year) > currentYear
    ));
  
    // Проверка обязательных полей (только для предупреждения)
    const missingFieldsWarnings = nonEmptySources.map((source, idx) => {
      const requiredFields = getRequiredFieldsForType(source.type || 'misc');
      const missing = requiredFields.filter(field => !source.fields[field] || source.fields[field].trim() === '');
      return missing.length > 0 
        ? `Источник ${idx + 1}: отсутствуют обязательные поля (${missing.join(', ')})`
        : null;
    }).filter(Boolean);
  
    try {
      // Форматируем источники
      const formattedSources = nonEmptySources.map((source, index) => ({
        ...source.fields,
        ID: `source${index + 1}`,
        type: source.type,
      }));
  
      // Сохраняем файл
      const response = await (isGuest ? guestAxios : authAxios).post(
        isGuest ? '/api/guest/save-bib' : '/api/save-bib',
        isGuest ? { sessionId, files: formattedSources } : { files: formattedSources }
      );
  
      // Обработка результата
      if (response.data?.errors || yearErrors.length > 0 || missingFieldsWarnings.length > 0) {
        const allWarnings = [
          ...(response.data?.errors || []),
          ...yearErrors.map(() => `Проверьте год публикации (не может быть больше ${currentYear})`),
          ...missingFieldsWarnings
        ];
  
        setSnackbar({
          open: true,
          message: "Файл сохранён, но содержит предупреждения",
          severity: "warning"
        });
  
        // Парсим ошибки для подсветки
        const errorLines = {};
        (response.data?.errors || []).forEach(error => {
          const match = error.match(/\(строка (\d+)\)$/);
          if (match) errorLines[parseInt(match[1]) - 1] = error;
        });
  
        setEditedLines(errorLines);
      } else {
        setSnackbar({
          open: true,
          message: "Файл успешно сохранён",
          severity: "success"
        });
      }
  
      // Закрываем модалку и обновляем список
      setModalOpen(false);
      setSources([]);
      fetchFiles();
  
    } catch (error) {
      console.error("Ошибка сохранения:", error);
      setError(`Ошибка сохранения: ${error.response?.data?.detail || error.message}`);
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
    const initialType = 'article';
    const initialFields = getFieldsForType(initialType).reduce((acc, field) => {
      acc[field] = '';
      return acc;
    }, {});
    setModalOpen(true);
    setSources([{ type: initialType, fields: initialFields }]);
    setCurrentSourceIndex(0);
    setCurrentFields(getFieldsForType(initialType));
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
    if (file.errors) {
      // Обрабатываем ошибки как массив
      const errorsArray = Array.isArray(file.errors) ? file.errors : [file.errors];
      
      errorsArray.forEach(error => {
        if (typeof error === 'string') {
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
            
            if (sourceIndex === -1 && parsedSources.length > 0) sourceIndex = 0;
            if (sourceIndex !== -1 && sourceIndex < parsedSources.length) {
              errorLines[sourceIndex] = error.trim();
            }
          }
        }
      });
    }
  
      // Добавляем обязательные поля для каждого источника
      const sourcesWithRequiredFields = parsedSources.map((source, index) => {
        const requiredFields = getRequiredFieldsForType(source.type || 'misc');
        const fieldsWithRequired = { ...source.fields };
        
        // Добавляем обязательные поля, если их нет
        requiredFields.forEach(field => {
          if (!fieldsWithRequired[field]) {
            fieldsWithRequired[field] = '';
          }
        });
  
        return {
          ...source,
          fields: fieldsWithRequired,
          // Сохраняем ошибки для этого источника
          errors: errorLines[index] || []
        };
      });
  
      setSources(sourcesWithRequiredFields);
      setCurrentSourceIndex(0);
      setCurrentFields(getFieldsForType(sourcesWithRequiredFields[0]?.type || ''));
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


  const revalidateFile = async (fileId) => {
    try {
      const endpoint = isGuest ? "/api/guest/revalidate-file" : "/api/revalidate-file";
      
      const params = new URLSearchParams();
      params.append('file_id', fileId.toString());
      if (isGuest) params.append('sessionId', sessionId);
  
      const response = await (isGuest ? guestAxios : authAxios).post(
        endpoint,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
  
      return response.data;
    } catch (error) {
      if (error.response?.status === 401 && !isGuest) {
        await refreshToken();
        return revalidateFile(fileId);
      }
      throw error;
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({...snackbar, open: false});
  };
  
  const handleSaveEditedFile = async () => {
    // Фильтруем пустые записи (где все поля пустые)
    const nonEmptySources = sources.filter(source => {
      return Object.values(source.fields).some(value => value.trim() !== '');
    });
  
    // Если все записи пустые
    if (nonEmptySources.length === 0) {
      setError("Файл не может быть пустым");
      return;
    }
  
    // Форматируем источники в bibtex-формат
    const formattedSources = nonEmptySources.map((source, index) => {
      // Удаляем пустые обязательные поля, которые были добавлены автоматически
      const cleanedFields = { ...source.fields };
      const requiredFields = getRequiredFieldsForType(source.type || 'misc');
      
      requiredFields.forEach(field => {
        if (cleanedFields[field] === '') {
          delete cleanedFields[field];
        }
      });
  
      return {
        ...cleanedFields,
        ID: `source${index + 1}`,
        type: source.type || 'misc',
      };
    });
  
    // Генерируем содержимое файла
    const content = formattedSources
      .map(source => `@${source.type}{${source.ID},\n` +
        Object.entries(source)
          .filter(([key]) => key !== 'ID' && key !== 'type')
          .map(([key, value]) => `  ${key} = {${value || ''}}`)
          .join(',\n') + '\n}')
      .join('\n\n');
  
    try {
      if (!editFileId) {
        setError("Ошибка: ID файла не определён");
        return;
      }
  
      const endpoint = isGuest ? "/api/guest/save-bib" : "/api/save-bib";
      const payload = isGuest
        ? { sessionId, file_id: editFileId, content }
        : { file_id: editFileId, content };
      
      // Сохраняем файл в любом случае
      const saveResponse = await (isGuest ? guestAxios : authAxios).post(endpoint, payload, { withCredentials: true });
  
      // Проверяем год только для показа предупреждения
      const yearErrors = sources.filter(source => {
        const yearValue = source.fields.year;
        return yearValue && (isNaN(yearValue) || parseInt(yearValue) > currentYear);
      });
  
      // Запускаем повторную проверку файла, но не блокируем сохранение при ошибках
      try {
        const revalidateResponse = await revalidateFile(editFileId);
        
        // Формируем список всех предупреждений (включая год)
        const allWarnings = [];
        
        if (yearErrors.length > 0) {
          allWarnings.push(`Проверьте год публикации (не может быть больше ${currentYear})`);
        }
  
        if (revalidateResponse.errors) {
          // Добавляем ошибки валидации
          if (typeof revalidateResponse.errors === 'string') {
            allWarnings.push(...revalidateResponse.errors.split('\n').filter(line => line.trim()));
          } else if (Array.isArray(revalidateResponse.errors)) {
            allWarnings.push(...revalidateResponse.errors);
          } else if (typeof revalidateResponse.errors === 'object') {
            allWarnings.push(...Object.values(revalidateResponse.errors));
          }
  
          // Парсим ошибки для подсветки
          const { sourceLines } = parseBibFile(content);
          const errorLines = {};
          
          allWarnings.forEach(error => {
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
  
          setEditedLines(errorLines);
        }
  
        if (allWarnings.length > 0) {
          setSnackbar({
            open: true,
            message: "Файл сохранён, но содержит предупреждения",
            severity: "warning"
          });
        } else {
          setEditedLines({});
          setSnackbar({
            open: true,
            message: "Файл успешно проверен и сохранён",
            severity: "success"
          });
        }
      } catch (revalidateError) {
        console.error("Ошибка при повторной проверке файла:", revalidateError);
        setSnackbar({
          open: true,
          message: "Файл сохранён, но не удалось проверить ошибки",
          severity: "warning"
        });
      }
  
      // В любом случае закрываем модальное окно и обновляем список файлов
      setEditModalOpen(false);
      fetchFiles();
      
    } catch (error) {
      console.error("Ошибка при сохранении файла:", error);
      let errorMessage = "Не удалось сохранить изменения";
      if (error.response) {
        errorMessage += `: ${error.response.data?.detail || error.response.statusText}`;
      } else if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      setError(errorMessage);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error"
      });
    }
  };

  const handleShowErrors = async (file) => {
    try {
      const endpoint = isGuest
        ? `/api/guest/get-bib-content?file_id=${file.id}&sessionId=${sessionId}`
        : `/api/get-bib-content?file_id=${file.id}`;
      const response = await (isGuest ? guestAxios : authAxios).get(endpoint);
      const content = response.data.content;
      const { sources } = parseBibFile(content);
      
      let errors = {};
      let modifiedContent = content.split('\n');
  
      if (file.errors && typeof file.errors === 'string') {
        file.errors.split('\n').filter(line => line.trim()).forEach(error => {
          // Сопоставляем ошибки с конкретными записями
          const sourceMatch = error.match(/записи '([^']+)'/);
          if (sourceMatch) {
            const sourceId = sourceMatch[1];
            const source = sources.find(s => s.id === sourceId);
            if (source) {
              // Добавляем ошибку в начало записи
              const errorLine = source.lineStart;
              modifiedContent[errorLine] = modifiedContent[errorLine].replace(
                /(@\w+\{[^,]+,?)/,
                `$1 ${error.trim()}`
              );
              errors[errorLine] = error.trim();
            }
          }
        });
      }
  
      setEditedLines(errors);
      setEditContent(modifiedContent.join('\n'));
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
        let errorMessage = "Не удалось скачать файл";
        if (error.response?.data?.detail) {
          errorMessage += `: ${error.response.data.detail}`;
        } else if (error.message) {
          errorMessage += `: ${error.message}`;
        }
        setError(errorMessage);
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
    sx={{
      position: 'relative',
      padding: '20px',
      height: '100vh',
      overflow: 'auto',
      backgroundColor: 'background.default',
      width: '100%',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column'
    }}
  >
       <Box>
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

      <Box display="flex" flexDirection="column" gap={2} sx={{ width: '100%' }}>
          {/* Первая строка: Название и кнопки авторизации */}
          <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
            {/* Название сайта */}
            <Typography variant="h4" sx={{
              fontWeight: 'bold',
              fontSize: { xs: '1rem', sm: '2rem' },
              color: 'text.primary',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flexShrink: 1
            }}>
              BIBCHECK.RUu
            </Typography>

            {/* Блок с кнопками */}
            <Box display="flex" alignItems="center" gap={1} sx={{
              flexShrink: 0,
              ml: 2 // Добавляем отступ слева
            }}>
              <ThemeToggleButton />
              {isGuest ? (
                <>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={() => navigate("/login")}
                    sx={{
                      whiteSpace: 'nowrap',
                      minWidth: 'max-content',
                      fontSize: { xs: '0.7rem', sm: '0.875rem' }
                    }}
                  >
                    Вход
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => navigate("/register")}
                    sx={{
                      whiteSpace: 'nowrap',
                      minWidth: 'max-content',
                      fontSize: { xs: '0.7rem', sm: '0.875rem' }
                    }}
                  >
                    Регистрация
                  </Button>
                </>
              ) : (
                <>
                  <IconButton
                    aria-label="account"
                    onClick={handleMenuOpen}
                    sx={{ color: 'text.primary' }}
                  >
                    <AccountCircleIcon fontSize={isMobile ? "medium" : "large"} />
                  </IconButton>
                  <Menu
                    id="menu-appbar"
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    PaperProps={{
                      elevation: 3,
                      sx: {
                        borderRadius: '10px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                  >
                    <MenuItem onClick={handleLogout}>Выйти</MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </Box>

     {/* Вторая строка: Поле поиска и кнопки */}
<Box 
  display="flex" 
  gap={2}
  flexWrap="wrap"
  sx={{ 
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between'
  }}
>
  {/* Поле поиска - левая часть */}
  <Box 
    sx={{
      flexGrow: 1,
      minWidth: '250px',
      maxWidth: { xs: '100%', md: '800px' },
    }}
  >
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
            <IconButton onClick={handleClearSearch} size="small">
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          height: '50px' // Фиксированная высота для поля поиска
        }
      }}
    />
  </Box>

  {/* Группа кнопок - правая часть */}
  <Box 
    display="flex" 
    gap={2}
    sx={{
      flexShrink: 0,
      width: { xs: '100%', sm: 'auto' },
      justifyContent: { xs: 'center'},
      marginTop: { xs: 0, sm: 0 },
    }}
  >
    <Box>
    <Button
      variant="contained"
      size="medium"
      onClick={handleCreateBibFile}
      sx={{
        minWidth: '160px',
        height: '50px', // Такая же высота как у поля поиска
        px: 3,
      }}
    >
      Создать bib-файл
    </Button>
    </Box>
    <Box>
    <Button
      variant="outlined"
      size="medium"
      onClick={() => document.getElementById('upload-bib-file').click()}
      sx={{
        minWidth: '160px',
        height: '50px', // Такая же высота как у поля поиска
        px: 3,
      }}
    >
      Загрузить bib-файл
    </Button>
    </Box>
  </Box>
</Box>
        </Box>
        </Box>

        <Paper sx={{
      borderRadius: '15px',
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
      background: 'background.paper',
      flex: '1 1 auto', // Гибкое заполнение доступного пространства
      marginTop: '20px',
      minHeight: '300px', // Минимальная высота
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
          {/* Версия для средних и больших экранов */}
          {!isMobile ? (
            <>
              <Box sx={{
                flex: 1,
                overflowX: 'auto',
                width: '100%',
                '&::-webkit-scrollbar': {
                  height: '6px'
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: isDarkMode ? '#555' : '#ccc',
                  borderRadius: '3px'
                }
              }}>
                <Table stickyHeader sx={{
                  minWidth: '100%',
                  tableLayout: 'auto' // Автоматическое распределение ширины
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{
                        fontWeight: 'bold',
                        backgroundColor: 'grey.100',
                        py: 2,
                        minWidth: '220px',
                        width: '25%'
                      }}>
                        Название файла
                      </TableCell>
                      <TableCell sx={{
                        fontWeight: 'bold',
                        backgroundColor: 'grey.100',
                        py: 2,
                        minWidth: '120px',
                        width: '15%'
                      }}>
                        Дата загрузки
                      </TableCell>
                      <TableCell align="center" sx={{
                        fontWeight: 'bold',
                        backgroundColor: 'grey.100',
                        py: 2,
                        minWidth: '80px',
                        width: '10%'
                      }}>
                        Ошибки
                      </TableCell>
                      <TableCell align="center" sx={{
                        fontWeight: 'bold',
                        backgroundColor: 'grey.100',
                        py: 2,
                        minWidth: '120px',
                        width: '15%'
                      }}>
                        Соответствие
                      </TableCell>
                      <TableCell align="center" sx={{
                        fontWeight: 'bold',
                        backgroundColor: 'grey.100',
                        py: 2,
                        minWidth: '200px',
                        width: '20%'
                      }}>
                        Действия
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
                        <TableCell sx={{
                          py: 1.5,
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          <Tooltip title={file.name_file} arrow>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography noWrap sx={{ fontWeight: 500 }}>
                                {file.name_file}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(file.loading_at)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={file.number_of_errors}
                            size="small"
                            color={file.number_of_errors > 0 ? "error" : "success"}
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {file.course_compliance}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>


                       
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleShowErrors(file)}
                              startIcon={<ErrorIcon />}
                              sx={{
                                borderColor: file.number_of_errors > 0 ? 'error.main' : 'primary.main',
                                color: file.number_of_errors > 0 ? 'error.main' : 'primary.main',
                              }}
                            >
                              Ошибки
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleEditFile(file)}
                              startIcon={<EditIcon />}
                              sx={{
                                borderColor: 'primary.main',
                                color: 'primary.main'
                              }}
                            >
                              Редактировать
                            </Button>
                            <DownloadMenu file={file} />
                          </Box>
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
            </>
          ) : (
            /* Мобильная версия (карточки) */
            <Box sx={{
              flex: 1,
              overflowY: 'auto',
              p: 1
            }}>
              {filteredFiles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((file, index) => (
                <Card key={file.id} sx={{
                  mb: 2,
                  p: 2,
                  backgroundColor: index % 2 === 0 ? 'background.paper' : 'grey.50'
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ flex: 1, overflow: 'hidden' }}>
                      <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
                        {file.name_file}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(file.loading_at)}
                      </Typography>
                    </Box>
                    <Chip
                      label={file.number_of_errors}
                      size="small"
                      color={file.number_of_errors > 0 ? "error" : "success"}
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2">
                      <Box component="span" sx={{ fontWeight: 500 }}>Соответствие:</Box> {file.course_compliance}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <DownloadMenu file={file} />
              
                    
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={() => handleShowErrors(file)}
                      startIcon={<ErrorIcon />}
                      sx={{
                        borderColor: file.number_of_errors > 0 ? 'error.main' : 'primary.main',
                        color: file.number_of_errors > 0 ? 'error.main' : 'primary.main',
                      }}
                    >
                      Ошибки
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={() => handleEditFile(file)}
                      startIcon={<EditIcon />}
                      sx={{
                        borderColor: 'primary.main',
                        color: 'primary.main'
                      }}
                    >
                      Редактировать
                    </Button>
                  </Box>
                </Card>
              ))}

              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={filteredFiles.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    fontSize: '0.8rem'
                  }
                }}
              />
            </Box>
          )}
        </Paper>

        <Modal
  open={modalOpen}
  onClose={() => {
    setModalOpen(false);
    setError(null); // Сбрасываем ошибку при закрытии
  }}
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
  <Paper
  sx={{
    width: { xs: '90%', sm: '80%', md: '70%' }, // Немного уменьшаем ширину на больших экранах
    p: 3,
    position: 'fixed', // Фиксированное позиционирование
    top: '50%',       // Центрирование по вертикали
    left: '50%',      // Центрирование по горизонтали
    transform: 'translate(-50%, -50%)', // Точное центрирование
    borderRadius: '15px',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    background: 'background.paper',
    height: '90vh',   // Занимаем 90% высоты viewport
    maxHeight: 'none', // Убираем ограничение максимальной высоты
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1300,
    overflowY: 'auto', // Добавляем скролл при необходимости
  }}
>
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>Создать bib-файл</Typography>
      
      {/* Добавленный Alert для отображения ошибок */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
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
    width: { xs: '90%', sm: '80%', md: '70%' }, // Немного уменьшаем ширину на больших экранах
    p: 3,
    position: 'fixed', // Фиксированное позиционирование
    top: '50%',       // Центрирование по вертикали
    left: '50%',      // Центрирование по горизонтали
    transform: 'translate(-50%, -50%)', // Точное центрирование
    borderRadius: '15px',
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    background: 'background.paper',
    height: '90vh',   // Занимаем 90% высоты viewport
    maxHeight: 'none', // Убираем ограничение максимальной высоты
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1300,
    overflowY: 'auto', // Добавляем скролл при необходимости
  }}
>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
                Редактировать bib-файл
              </Typography>
              {sources.length > 0 && (
                <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, width: '100%' }}>
                  {sources.map((source, index) => {
                    const { standard, required, optional } = getAllFieldsFromSource(source, source.type || 'misc');
                    const missingFields = required.filter(field => !source.fields[field]);

                    const updatedFields = { ...source.fields };
                    missingFields.forEach(field => {
                      if (!updatedFields[field]) {
                        updatedFields[field] = '';
                      }
                    });

                    const hasError = editedLines[index] !== undefined || missingFields.length > 0;
                    const errorMessage = editedLines[index] || (missingFields.length > 0 ? `Отсутствуют обязательные поля: ${missingFields.join(', ')}` : '');

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
                            onChange={(e) => handleTypeChange(index, e.target.value, true)}
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

                        {required.concat(optional).map((field) => {
  const isYearField = field === 'year';
  const fieldValue = updatedFields[field] || '';
  const isInvalidYear = isYearField && fieldValue && 
                      (isNaN(fieldValue) || parseInt(fieldValue) > currentYear);
  const isMissingField = missingFields.includes(field);

  return (
    <TextField
      key={field}
      fullWidth
      margin="dense"
      label={field}
      value={fieldValue}
      onChange={(e) => {
        if (isYearField) {
          const value = e.target.value;
          if (value === '' || /^\d+$/.test(value)) {
            handleSourceChange(index, field, value);
          }
        } else {
          handleSourceChange(index, field, e.target.value);
        }
      }}
      sx={{
        width: '100%',
        '& .MuiInputBase-input': {
          textDecoration: isMissingField ? 'underline red' : 'none',
          color: isMissingField || isInvalidYear ? 'error.main' : 'text.primary'
        },
      }}
      error={isMissingField || isInvalidYear}
      helperText={
        isMissingField 
          ? 'Обязательное поле, добавлено автоматически' 
          : isInvalidYear
            ? isNaN(fieldValue) 
              ? 'Год должен быть числом' 
              : `Год не может быть больше текущего (${currentYear})`
            : ''
      }
    />
  );
})}

                        {optional.map((field) => (
                          <Box key={field} display="flex" alignItems="center" sx={{ width: '100%' }}>
                            <TextField
                              fullWidth
                              margin="dense"
                              label={`${field} (необязательное)`}
                              value={updatedFields[field] || ''}
                              onChange={(e) => handleSourceChange(index, field, e.target.value)}
                              sx={{
                                width: '100%',
                                '& .MuiInputBase-input': {
                                  color: 'text.secondary',
                                },
                              }}
                              helperText="Это поле не является стандартным для данного типа"
                            />
                            <IconButton
                              onClick={() => {
                                const updatedSources = [...sources];
                                delete updatedSources[index].fields[field];
                                setSources(updatedSources);
                              }}
                              sx={{ ml: 1 }}
                            >
                              <ClearIcon />
                            </IconButton>
                          </Box>
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

        <Modal open={errorModalOpen} onClose={() => setErrorModalOpen(false)}>
  <Box sx={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxHeight: '80vh',
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
    overflow: 'auto'
  }}>
    <Typography variant="h6" gutterBottom>
      Ошибки в файле: {files.find(f => f.id === errorFileId)?.name_file}
    </Typography>
    
    {Object.keys(editedLines).length > 0 && (
      <>
        <Typography variant="subtitle1" color="error" gutterBottom>
          Обнаруженные ошибки:
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          {Object.values(editedLines).map((error, i) => (
            <Typography key={i} component="li" color="error">
              {error}
            </Typography>
          ))}
        </Box>
      </>
    )}

    <Typography variant="subtitle1" gutterBottom>
      Содержимое файла:
    </Typography>
    <Paper sx={{ 
      p: 2, 
      backgroundColor: isDarkMode ? 'grey.900' : 'grey.50',
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap'
    }}>
      {editContent.split('\n').map((line, i) => (
        <Typography 
          key={i} 
          component="div"
          sx={{ 
            color: editedLines[i] ? 'error.main' : 'text.primary',
            fontWeight: editedLines[i] ? 'bold' : 'normal'
          }}
        >
          {line}
        </Typography>
      ))}
    </Paper>

    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
      <Button 
        variant="contained" 
        onClick={() => setErrorModalOpen(false)}
      >
        Закрыть
      </Button>
    </Box>
  </Box>
</Modal>
      </Container>
      <input
  id="upload-bib-file"
  type="file"
  accept=".bib"
  style={{ display: 'none' }}
  onChange={uploadBibFiles}
  multiple
/>
    </>
  );
};

export default PersonalAccount;