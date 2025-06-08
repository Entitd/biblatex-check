import React, { useContext, useState, useEffect, useRef } from "react";
import axios from 'axios';
import {
  Container, Box, Typography, TextField, Button, IconButton, Table, TableHead, TableBody, TableRow, TableCell,
  Select, MenuItem, InputLabel, FormControl, Modal, Paper, InputAdornment, TablePagination, Menu, Fade, Backdrop,
  useMediaQuery, useTheme, CssBaseline, Alert, Tooltip, Card, Chip, Accordion, AccordionSummary, AccordionDetails, Snackbar,
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
import HelpComponent from '../../components/HelpComponent/HelpComponent';

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



  // Функция для склонения слова "ошибка"
  const declineErrors = (count) => {
    if (count % 10 === 1 && count % 100 !== 11) {
      return "ошибка";
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
      return "ошибки";
    } else {
      return "ошибок";
    }
  };

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

  const getBaseFieldsForType = (type) => {
    switch (type) {
      case "article": return ["author", "title", "journal", "year", "volume", "number", "issue", "pages"];
      case "book": return ["author", "title", "year", "address", "publisher", "pagetotal"];
      case "conference": return ["author", "title", "booktitle", "year", "pages", "organization"];
      case "techReport": return ["author", "title", "institution", "year"];
      case "inProceedings": return ["author", "title", "booktitle", "year", "pages", "publisher", "address"];
      case "online": return ["author", "title", "url", "urldate"];
      case "manual": return ["title", "organization", "year"];
      case "misc": return ["author", "title", "urldate", "url"];
      default: return [];
    }
  };

  const getFieldsForType = (type, title = '') => {
    const baseFields = getBaseFieldsForType(type);
    const hasCyrillic = /[\u0400-\u04FF]/.test(title);
    return hasCyrillic || !title ? baseFields : [...baseFields, "hyphenation"];
  };

  const [createModalState, setCreateModalState] = useState(() => {
  const initialType = 'article';
  const initialFields = getBaseFieldsForType(initialType).reduce((acc, field) => {
    acc[field] = '';
    return acc;
  }, {});
  return {
    sources: [{ type: initialType, fields: initialFields }],
    currentSourceIndex: 0,
    currentFields: getBaseFieldsForType(initialType),
    hasSource: true,
  };
});

  const getRequiredFieldsForType = (type, title = '') => {
    const baseRequiredFields = (() => {
      switch (type) {
        case "article": return ["author", "title", "journal", "year", "pages"];
        case "book": return ["author", "title", "year", "address", "publisher", "pagetotal"];
        case "conference": return ["author", "title", "booktitle", "year", "pages", "organization"];
        case "techReport": return ["author", "title", "institution", "year"];
        case "inProceedings": return ["author", "title", "booktitle", "year", "pages", "publisher", "address"];
        case "online": return ["author", "title", "url", "urldate"];
        case "manual": return ["title", "organization", "year"];
        case "misc": return ["author", "title", "urldate", "url"];
        default: return [];
      }
    })();
    
    const hasCyrillic = /[\u0400-\u04FF]/.test(title);
    return hasCyrillic || !title ? baseRequiredFields : [...baseRequiredFields, "hyphenation"];
  };

  const getAllFieldsFromSource = (source, type) => {
    const standardFields = getFieldsForType(type, source.fields.title || '');
    const requiredFields = getRequiredFieldsForType(type, source.fields.title || '');
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
          `${fileUrl}${isGuest ? `?sessionId=${sessionId}` : ''}`,
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

  const parseBibFile = (content) => {
    const lines = content ? content.split('\n') : [];
    const sources = [];
    const sourceLines = [];
    let currentSource = { type: '', fields: {}, lineStart: 0 };

    console.log("Parsing BibTeX content:", content); // Отладка

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
                console.log(`Found entry: type=${match[1]}, id=${match[2]}`); // Отладка
            }
        } else if (currentSource.type && line.includes('=')) {
            const match = line.match(/^\s*(\w+)\s*=\s*\{([^}]*)\}/);
            if (match) {
                const key = match[1].trim();
                const value = match[2].trim();
                currentSource.fields[key] = value;
                console.log(`Parsed field: ${key} = ${value}`); // Отладка
            } else {
                // Обработка случаев без фигурных скобок (для совместимости)
                const [key, value] = line.split('=').map(s => s.trim());
                if (key && value) {
                    currentSource.fields[key] = value.replace(/[,;]?\s*$/, '').trim();
                    console.log(`Parsed non-braced field: ${key} = ${value}`); // Отладка
                }
            }
        } else if (line.includes('}') && currentSource.type) {
            sources.push({ ...currentSource, lineEnd: idx });
            currentSource = { type: '', fields: {}, lineStart: 0 };
            console.log("Closed entry:", currentSource); // Отладка
        }
    });

    // Добавляем последнюю запись, если она не закрыта
    if (currentSource.type) {
        sources.push({ ...currentSource, lineEnd: lines.length - 1 });
        console.log("Added final entry:", currentSource); // Отладка
    }

    console.log("Parsed sources:", sources); // Отладка
    return { sources, sourceLines };
};

const handleTypeChange = (index, type, isEditing = false) => {
  const updatedSources = [...createModalState.sources];
  const currentFields = updatedSources[index].fields;
  const title = currentFields.title || '';

  const standardFields = getFieldsForType(type, title);
  const requiredFields = getRequiredFieldsForType(type, title);
  const validFields = [...new Set([...standardFields, ...requiredFields])];

  const newFields = {};
  validFields.forEach(field => {
    newFields[field] = currentFields[field] || '';
  });

  updatedSources[index].type = type;
  updatedSources[index].fields = newFields;

  setCreateModalState({
    ...createModalState,
    sources: updatedSources,
    currentFields: standardFields,
  });
};

  const currentYear = new Date().getFullYear();

const addSource = () => {
  const newSource = { type: 'article', fields: getBaseFieldsForType('article').reduce((acc, field) => ({ ...acc, [field]: '' }), {}) };
  setCreateModalState({
    ...createModalState,
    sources: [...createModalState.sources, newSource],
    currentSourceIndex: createModalState.sources.length,
    currentFields: getBaseFieldsForType('article'),
    hasSource: true,
  });
};

const handleSourceChange = (index, field, value) => {
  const singleNumericFields = ['year', 'volume', 'number', 'issue'];
  const pageRangeField = ['page', 'pages'];
  
  const updatedSources = [...createModalState.sources];

  if (singleNumericFields.includes(field)) {
    if (value === '' || /^\d+$/.test(value)) {
      updatedSources[index] = {
        ...updatedSources[index],
        fields: {
          ...updatedSources[index].fields,
          [field]: value,
        },
      };
    }
  } else if (pageRangeField.includes(field)) {
    updatedSources[index] = {
      ...updatedSources[index],
      fields: {
        ...updatedSources[index].fields,
        [field]: value,
      },
    };
  } else if (field === 'title') {
    const hasCyrillic = /[\u0400-\u04FF]/.test(value);
    updatedSources[index] = {
      ...updatedSources[index],
      fields: {
        ...updatedSources[index].fields,
        [field]: value,
      },
    };
    if (hasCyrillic && updatedSources[index].fields.hyphenation) {
      delete updatedSources[index].fields.hyphenation;
    } else if (!hasCyrillic && value && !updatedSources[index].fields.hyphenation) {
      updatedSources[index].fields.hyphenation = '';
    }
    setCreateModalState({
      ...createModalState,
      sources: updatedSources,
      currentFields: getFieldsForType(updatedSources[index].type || 'misc', value),
    });
    return;
  } else {
    updatedSources[index] = {
      ...updatedSources[index],
      fields: {
        ...updatedSources[index].fields,
        [field]: value,
      },
    };
  }

  setCreateModalState({
    ...createModalState,
    sources: updatedSources,
  });
};

const saveBibFiles = async () => {
  const nonEmptySources = createModalState.sources.filter(source => 
    Object.values(source.fields).some(value => value.trim() !== '')
  );
  
  if (nonEmptySources.length === 0) {
    setError("Создаваемый файл не может быть пустым");
    return;
  }
  
  const yearErrors = nonEmptySources.filter(source => 
    source.fields.year && (isNaN(source.fields.year) || parseInt(source.fields.year) > currentYear)
  );

  const numericFieldErrors = nonEmptySources.map((source, idx) => {
    const errors = [];
    if (source.fields.volume && !/^\d+$/.test(source.fields.volume)) {
      errors.push(`volume в источнике ${idx + 1} должно быть числом`);
    }
    if (source.fields.number && !/^\d+$/.test(source.fields.number)) {
      errors.push(`number в источнике ${idx + 1} должно быть числом`);
    }
    if (source.fields.issue && !/^\d+$/.test(source.fields.issue)) {
      errors.push(`issue в источнике ${idx + 1} должно быть числом`);
    }
    return errors.length > 0 ? errors.join(', ') : null;
  }).filter(Boolean);

  const missingFieldsWarnings = nonEmptySources.map((source, idx) => {
    const requiredFields = getRequiredFieldsForType(source.type || 'misc', source.fields.title || '');
    const missing = requiredFields.filter(field => !source.fields[field] || source.fields[field].trim() === '');
    return missing.length > 0 
      ? `Источник ${idx + 1}: отсутствуют обязательные поля (${missing.join(', ')})`
      : null;
  }).filter(Boolean);
  
  const allWarnings = [...numericFieldErrors, ...missingFieldsWarnings];
  
  try {
    const formattedSources = nonEmptySources.map((source, index) => ({
      ...source.fields,
      ID: `source${index + 1}`,
      type: source.type,
    }));
  
    const response = await (isGuest ? guestAxios : authAxios).post(
      isGuest ? '/api/guest/save-bib' : '/api/save-bib',
      isGuest ? { sessionId, files: formattedSources } : { files: formattedSources }
    );
  
    if (response.data?.errors || yearErrors.length > 0 || allWarnings.length > 0) {
      const allMessages = [
        ...(response.data?.errors || []),
        ...yearErrors.map(() => `Проверьте год публикации (не может быть больше ${currentYear})`),
        ...allWarnings
      ];
  
      setSnackbar({
        open: true,
        message: "Файл сохранён, но содержит предупреждения",
        severity: "warning"
      });
  
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
  
    // Reset to default article fields
    const initialType = 'article';
    const initialFields = getBaseFieldsForType(initialType).reduce((acc, field) => {
      acc[field] = '';
      return acc;
    }, {});
    setCreateModalState({
      sources: [{ type: initialType, fields: initialFields }],
      currentSourceIndex: 0,
      currentFields: getBaseFieldsForType(initialType),
      hasSource: true,
    });
    setModalOpen(false);
    fetchFiles();
  
  } catch (error) {
    console.error("Ошибка сохранения:", error);
    setError(`Ошибка сохранения: ${error.response?.data?.detail || error.message}`);
  }
};

const navigateSource = (direction) => {
  if (direction === 'next' && createModalState.currentSourceIndex < createModalState.sources.length - 1) {
    setCreateModalState({
      ...createModalState,
      currentSourceIndex: createModalState.currentSourceIndex + 1,
      currentFields: getFieldsForType(
        createModalState.sources[createModalState.currentSourceIndex + 1].type,
        createModalState.sources[createModalState.currentSourceIndex + 1].fields.title || ''
      ),
    });
  } else if (direction === 'prev' && createModalState.currentSourceIndex > 0) {
    setCreateModalState({
      ...createModalState,
      currentSourceIndex: createModalState.currentSourceIndex - 1,
      currentFields: getFieldsForType(
        createModalState.sources[createModalState.currentSourceIndex - 1].type,
        createModalState.sources[createModalState.currentSourceIndex - 1].fields.title || ''
      ),
    });
  }
};

  const handleCreateBibFile = () => {
    setModalOpen(true);
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
      console.log("File errors (raw):", file.errors);

      let errorMessages = [];
      if (Array.isArray(file.errors)) {
        errorMessages = file.errors.map(msg => msg.trim()).filter(msg => msg);
      } else if (typeof file.errors === 'string') {
        errorMessages = file.errors.split('\n').map(msg => msg.trim()).filter(msg => msg);
      } else {
        console.warn("Unexpected file.errors format:", file.errors);
      }

      errorMessages.forEach((error, idx) => {
        console.log(`Parsing error ${idx}:`, error);

        // Извлечение поля из ошибки
        let field = null;
        // Проверяем, содержит ли ошибка 'author' или 'автора'
        if (error.toLowerCase().includes("'author'") || error.toLowerCase().includes("автора")) {
          field = "author";
        } else {
          const fieldMatch = error.match(/поле '([^']+)'/i);
          if (fieldMatch) {
            field = fieldMatch[1].toLowerCase();
          }
        }

        const idMatch = error.match(/записи '([^']+)'/i);
        const lineMatch = error.match(/\(строка (\d+)\)/i);
        const recordId = idMatch ? idMatch[1] : null;
        const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) - 1 : null;

        if (!field) {
          console.warn(`No field found in error: ${error}`);
          if (!errorLines["general"]) errorLines["general"] = [];
          errorLines["general"].push(error.trim());
          return;
        }

        let sourceIndex = -1;
        if (lineNumber !== null && sourceLines && sourceLines.length > 0) {
          sourceIndex = sourceLines.findIndex((startLine, idx) => {
            const nextStartLine = sourceLines[idx + 1] || content.split('\n').length;
            return lineNumber >= startLine && lineNumber < nextStartLine;
          });
        }
        if (sourceIndex === -1 && recordId) {
          sourceIndex = parsedSources.findIndex(source => source.id === recordId);
        }
        if (sourceIndex === -1 && parsedSources.length > 0) {
          sourceIndex = 0; // Fallback
        }

        if (sourceIndex !== -1 && sourceIndex < parsedSources.length) {
          if (!errorLines[sourceIndex]) errorLines[sourceIndex] = {};
          errorLines[sourceIndex][field] = error.trim();
        } else {
          if (!errorLines["general"]) errorLines["general"] = [];
          errorLines["general"].push(error.trim());
        }
      });
    }

    const sourcesWithRequiredFields = parsedSources.map((source, index) => {
      const requiredFields = getRequiredFieldsForType(source.type || 'misc', source.fields.title || '');
      const fieldsWithRequired = { ...source.fields };

      requiredFields.forEach(field => {
        if (!fieldsWithRequired[field]) {
          fieldsWithRequired[field] = '';
        }
      });

      return {
        ...source,
        fields: fieldsWithRequired,
        errors: errorLines[index] || {}
      };
    });

    console.log("Sources with errors:", sourcesWithRequiredFields);
    console.log("Error lines:", errorLines);

    setSources(sourcesWithRequiredFields);
    setCurrentSourceIndex(0);
    setCurrentFields(getFieldsForType(sourcesWithRequiredFields[0]?.type || '', sourcesWithRequiredFields[0]?.fields.title || ''));
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
    const nonEmptySources = sources.filter(source => {
      return Object.values(source.fields).some(value => value.trim() !== '');
    });
  
    if (nonEmptySources.length === 0) {
      setError("Файл не может быть пустым");
      return;
    }
  
    const numericFieldErrors = nonEmptySources.map((source, idx) => {
      const errors = [];
      if (source.fields.volume && !/^\d+$/.test(source.fields.volume)) {
        errors.push(`volume в источнике ${idx + 1} должно быть числом`);
      }
      if (source.fields.number && !/^\d+$/.test(source.fields.number)) {
        errors.push(`number в источнике ${idx + 1} должно быть числом`);
      }
      if (source.fields.issue && !/^\d+$/.test(source.fields.issue)) {
        errors.push(`issue в источнике ${idx + 1} должно быть числом`);
      }
      return errors.length > 0 ? errors.join(', ') : null;
    }).filter(Boolean);
  
    const missingFieldsWarnings = nonEmptySources.map((source, idx) => {
      const requiredFields = getRequiredFieldsForType(source.type || 'misc', source.fields.title || '');
      const missing = requiredFields.filter(field => !source.fields[field] || source.fields[field].trim() === '');
      return missing.length > 0 
        ? `Источник ${idx + 1}: отсутствуют обязательные поля (${missing.join(', ')})`
        : null;
    }).filter(Boolean);
  
    const allWarnings = [...numericFieldErrors, ...missingFieldsWarnings];
  
    const formattedSources = nonEmptySources.map((source, index) => {
      const cleanedFields = { ...source.fields };
      const requiredFields = getRequiredFieldsForType(source.type || 'misc', source.fields.title || '');
      
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
      
      const saveResponse = await (isGuest ? guestAxios : authAxios).post(endpoint, payload, { withCredentials: true });
  
      const yearErrors = sources.filter(source => {
        const yearValue = source.fields.year;
        return yearValue && (isNaN(yearValue) || parseInt(yearValue) > currentYear);
      });
  
      try {
        const revalidateResponse = await revalidateFile(editFileId);
        
        const allMessages = [];
        
        if (yearErrors.length > 0) {
          allMessages.push(`Проверьте год публикации (не может быть больше ${currentYear})`);
        }
  
        if (revalidateResponse.errors) {
          if (typeof revalidateResponse.errors === 'string') {
            allMessages.push(...revalidateResponse.errors.split('\n').filter(line => line.trim()));
          } else if (Array.isArray(revalidateResponse.errors)) {
            allMessages.push(...revalidateResponse.errors);
          } else if (typeof revalidateResponse.errors === 'object') {
            allMessages.push(...Object.values(revalidateResponse.errors));
          }
  
          const { sourceLines } = parseBibFile(content);
          const errorLines = {};
          
          allMessages.forEach(error => {
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
  
        if (allMessages.length > 0 || allWarnings.length > 0) {
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
        const { sources, sourceLines } = parseBibFile(content);

        console.log("File errors:", file.errors); // Отладка
        console.log("Parsed content:", content);
        console.log("Source lines:", sourceLines);

        let errors = {};
        let modifiedContent = content.split('\n');

        if (file.errors) {
            const errorsArray = Array.isArray(file.errors) ? file.errors : [file.errors];
            errorsArray.forEach((error, idx) => {
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
                        if (sourceIndex === -1 && sources.length > 0) sourceIndex = 0;
                        if (sourceIndex !== -1 && sourceIndex < sources.length) {
                            errors[sourceIndex] = error.trim();
                        }
                    } else {
                        // Добавляем ошибки без номера строки
                        errors[`general_${idx}`] = error.trim();
                    }
                }
            });
        }

        console.log("Edited lines:", errors); // Отладка
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
    setCurrentFields(getFieldsForType(parsedSources[0]?.type || '', parsedSources[0]?.fields.title || ''));
  };

  const uploadBibFiles = async (event) => {
  const uploadedFiles = event.target.files || event.dataTransfer.files;
  if (!uploadedFiles || uploadedFiles.length === 0) {
    console.error('No files selected for upload');
    setError('Не выбран файл для загрузки');
    return;
  }

  Array.from(uploadedFiles).forEach(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    if (isGuest) {
      if (!sessionId) {
        console.error('Session ID is missing');
        setError('Отсутствует идентификатор сессии');
        return;
      }
      formData.append('sessionId', sessionId);
    }
    console.log('FormData entries:', [...formData.entries()]); // Логирование содержимого FormData
    try {
      if (isGuest) {
        const response = await guestAxios.post('/api/guest/upload-bib', formData, {
          headers: {
            'Content-Type': 'multipart/form-data', // Явно указываем для ясности
          },
        });
        console.log('Upload response:', response.data);
      } else {
        await authAxios.post('/api/upload-bib', formData);
      }
      fetchFiles();
    } catch (error) {
      console.error('Ошибка загрузки файла:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });
      setError(
        `Не удалось загрузить файл: ${
          error.response?.data?.detail || error.message || 'Неизвестная ошибка'
        }`
      );
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
        `${fileUrl}${isGuest ? `?sessionId=${sessionId}` : ''}`,
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
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
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
                BIBCHECK.RU
              </Typography>

              <Box display="flex" alignItems="center" gap={1} sx={{
                flexShrink: 0,
                ml: 2
              }}>
                <HelpComponent />
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
                      height: '50px'
                    }
                  }}
                />
              </Box>

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
                      height: '50px',
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
                      height: '50px',
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
          flex: '1 1 auto',
          marginTop: '20px',
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}>
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
                  tableLayout: 'auto'
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
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleShowErrors(file)}
            startIcon={<ErrorIcon />}
            sx={{
              borderColor: file.number_of_errors > 0 ? 'error.main' : 'primary.main',
              color: file.number_of_errors > 0 ? 'error.main' : 'primary.main',
              mt: 1,
            }}
          >
            {file.number_of_errors} {declineErrors(file.number_of_errors)}
          </Button>
        </Box>
      </TableCell>
      <TableCell align="center">
        <Tooltip
          title={
            file.next_course_requirements ? (
              file.next_course_requirements.message ? (
                file.next_course_requirements.message
              ) : (
                <Box>
                  <Typography variant="body2">
                    Для достижения курса {file.next_course_requirements.next_course} необходимо:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {file.next_course_requirements.additional_total > 0 && (
                      <li>Добавить {file.next_course_requirements.additional_total} записей</li>
                    )}
                    {file.next_course_requirements.additional_foreign > 0 && (
                      <li>Добавить {file.next_course_requirements.additional_foreign} записей на иностранном языке</li>
                    )}
                    {file.next_course_requirements.additional_articles_after_2015 > 0 && (
                      <li>Добавить {file.next_course_requirements.additional_articles_after_2015} статей после 2015 года</li>
                    )}
                    {file.next_course_requirements.additional_21st_century > 0 && (
                      <li>Добавить {file.next_course_requirements.additional_21st_century} записей 21-го века</li>
                    )}
                    {file.next_course_requirements.additional_total === 0 &&
                     file.next_course_requirements.additional_foreign === 0 &&
                     file.next_course_requirements.additional_articles_after_2015 === 0 &&
                     file.next_course_requirements.additional_21st_century === 0 && (
                      <li>Все требования выполнены</li>
                    )}
                  </ul>
                </Box>
              )
            ) : (
              'Нет данных о следующем курсе'
            )
          }
          arrow
        >
          <Typography variant="body2">
            {file.course_compliance}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell align="center">
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
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
      </Box>
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            {file.number_of_errors} {declineErrors(file.number_of_errors)}
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 1 }}>
          <Box component="span" sx={{ fontWeight: 500 }}>Соответствие:</Box>{' '}
          <Tooltip
            title={
              file.next_course_requirements ? (
                file.next_course_requirements.message ? (
                  file.next_course_requirements.message
                ) : (
                  <Box>
                    <Typography variant="body2">
                      Для достижения курса {file.next_course_requirements.next_course} необходимо:
                    </Typography>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {file.next_course_requirements.additional_total > 0 && (
                        <li>Добавить {file.next_course_requirements.additional_total} записей</li>
                      )}
                      {file.next_course_requirements.additional_foreign > 0 && (
                        <li>Добавить {file.next_course_requirements.additional_foreign} записей на иностранном языке</li>
                      )}
                      {file.next_course_requirements.additional_articles_after_2015 > 0 && (
                        <li>Добавить {file.next_course_requirements.additional_articles_after_2015} статей после 2015 года</li>
                      )}
                      {file.next_course_requirements.additional_21st_century > 0 && (
                        <li>Добавить {file.next_course_requirements.additional_21st_century} записей 21-го века</li>
                      )}
                      {file.next_course_requirements.additional_total === 0 &&
                       file.next_course_requirements.additional_foreign === 0 &&
                       file.next_course_requirements.additional_articles_after_2015 === 0 &&
                       file.next_course_requirements.additional_21st_century === 0 && (
                        <li>Все требования выполнены</li>
                      )}
                    </ul>
                  </Box>
                )
              ) : (
                'Нет данных о следующем курсе'
              )
            }
            arrow
          >
            <span>{file.course_compliance}</span>
          </Tooltip>
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
    <Paper
      sx={{
        width: { xs: '95%', sm: '85%', md: '75%' },
        maxWidth: '800px',
        p: { xs: 2, sm: 3 },
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        borderRadius: '16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        background: 'background.paper',
        maxHeight: '85vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1300,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: '600', color: 'text.primary' }}>
          Создание BibTeX файла
        </Typography>
        <IconButton onClick={() => setModalOpen(false)} sx={{ color: 'text.secondary' }}>
          <ClearIcon />
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {createModalState.hasSource && (
        <Box sx={{ mb: 3 }}>
          <Accordion defaultExpanded sx={{ borderRadius: '8px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ bgcolor: isDarkMode ? 'grey.800' : 'grey.100', borderRadius: '8px 8px 0 0' }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: '500' }}>
                Источник {createModalState.currentSourceIndex + 1} из {createModalState.sources.length}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="type-label">Тип записи</InputLabel>
                <Select
                  labelId="type-label"
                  value={createModalState.sources[createModalState.currentSourceIndex]?.type || ''}
                  onChange={(e) => handleTypeChange(createModalState.currentSourceIndex, e.target.value)}
                  sx={{
                    borderRadius: '8px',
                    '& .MuiSelect-select': { py: 1.5 },
                  }}
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

              {createModalState.currentFields
                .filter(field => !['volume', 'number', 'issue'].includes(field))
                .map((field) => {
                  const isYearField = field === 'year';
                  const isNumericField = ['year'].includes(field);
                  const isPageField = field === 'pages';
                  const fieldValue = createModalState.sources[createModalState.currentSourceIndex].fields[field] || '';
                  const isInvalidYear = isYearField && fieldValue && 
                    (isNaN(fieldValue) || parseInt(fieldValue) > currentYear);
                  const isInvalidPage = isPageField && fieldValue && 
                    !(/^\d+$/.test(fieldValue) || /^\d+[-]{1,2}\d+$/.test(fieldValue));
                  const requiredFields = getRequiredFieldsForType(
                    createModalState.sources[createModalState.currentSourceIndex].type || 'misc',
                    createModalState.sources[createModalState.currentSourceIndex].fields.title || ''
                  );
                  const isMissingField = requiredFields.includes(field) && !fieldValue;

                  return (
                    <TextField
                      key={field}
                      fullWidth
                      margin="normal"
                      label={field.charAt(0).toUpperCase() + field.slice(1) + (requiredFields.includes(field) ? ' *' : '')}
                      value={fieldValue}
                      onChange={(e) => handleSourceChange(createModalState.currentSourceIndex, field, e.target.value)}
                      sx={{
                        '& .MuiInputBase-root': {
                          borderRadius: '8px',
                        },
                        '& .MuiInputBase-input': {
                          textDecoration: isMissingField ? 'underline red wavy' : 'none',
                          color: isMissingField || isInvalidYear || isInvalidPage ? 'error.main' : 'text.primary',
                        },
                      }}
                      error={isMissingField || isInvalidYear || isInvalidPage}
                      helperText={
                        isMissingField 
                          ? 'Обязательное поле' 
                          : isInvalidYear
                            ? isNaN(fieldValue) 
                              ? 'Год должен быть числом' 
                              : `Год не может быть больше текущего (${currentYear})`
                            : isInvalidPage
                              ? 'Страницы должны быть числом или диапазоном (например, 20-30 или 20--30)'
                              : ''
                      }
                      inputProps={{
                        ...(isNumericField ? { inputMode: 'numeric', pattern: '[0-9]*', type: 'text' } : {}),
                        ...(isPageField ? { pattern: '\\d+--?\\d+|\\d+' } : {}),
                      }}
                    />
                  );
                })}

              {createModalState.sources[createModalState.currentSourceIndex].type === 'article' && (
                <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
                  {['volume', 'number', 'issue'].map((field) => {
                    const fieldValue = createModalState.sources[createModalState.currentSourceIndex].fields[field] || '';
                    const isInvalidNumeric = fieldValue && !/^\d+$/.test(fieldValue);
                    const hasPublicationFields = ['volume', 'number', 'issue'].some(f => 
                      createModalState.sources[createModalState.currentSourceIndex].fields[f] && 
                      createModalState.sources[createModalState.currentSourceIndex].fields[f].trim() !== ''
                    );

                    return (
                      <TextField
                        key={field}
                        margin="normal"
                        label={field.charAt(0).toUpperCase() + field.slice(1)}
                        value={fieldValue}
                        onChange={(e) => handleSourceChange(createModalState.currentSourceIndex, field, e.target.value)}
                        sx={{
                          flex: '1 1 30%',
                          minWidth: '120px',
                          '& .MuiInputBase-root': { borderRadius: '8px' },
                          '& .MuiInputBase-input': {
                            color: isInvalidNumeric || (!hasPublicationFields && !fieldValue) ? 'error.main' : 'text.primary',
                          },
                        }}
                        error={isInvalidNumeric || (!hasPublicationFields && !fieldValue)}
                        helperText={
                          isInvalidNumeric
                            ? 'Поле должно содержать только число'
                            : (!hasPublicationFields && !fieldValue)
                              ? 'Заполните хотя бы одно из этих полей'
                              : ''
                        }
                        inputProps={{
                          inputMode: 'numeric',
                          pattern: '[0-9]*',
                          type: 'text',
                        }}
                      />
                    );
                  })}
                  <Typography variant="caption" sx={{ width: '100%', color: 'text.secondary', mt: 1 }}>
                    Возможно, у вашего источника могут отсутствовать некоторые из этих полей.
                  </Typography>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Источников: {createModalState.sources.length}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => navigateSource('prev')}
            disabled={createModalState.currentSourceIndex === 0}
            sx={{ borderRadius: '8px', px: 3 }}
          >
            Назад
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigateSource('next')}
            disabled={createModalState.currentSourceIndex === createModalState.sources.length - 1}
            sx={{ borderRadius: '8px', px: 3 }}
          >
            Вперед
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={addSource}
          sx={{ borderRadius: '8px', py: 1.2 }}
        >
          Добавить источник
        </Button>
      </Box>

      <Box
        sx={{
          position: 'sticky',
          bottom: 0,
          bgcolor: 'background.paper',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
          pt: 2,
          pb: 1,
          zIndex: 2,
          display: 'flex',
          gap: 2,
          justifyContent: 'space-between',
        }}
      >
        <Button
          variant="outlined"
          color="error"
          onClick={() => {
            const initialType = 'article';
            const initialFields = getBaseFieldsForType(initialType).reduce((acc, field) => ({ ...acc, [field]: '' }), {});
            setCreateModalState({
              sources: [{ type: initialType, fields: initialFields }],
              currentSourceIndex: 0,
              currentFields: getBaseFieldsForType(initialType),
              hasSource: true,
            });
          }}
          sx={{ flex: 1, borderRadius: '8px', py: 1.2 }}
        >
          Сбросить
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircleIcon />}
          onClick={saveBibFiles}
          sx={{ flex: 1, borderRadius: '8px', py: 1.2 }}
        >
          Сохранить
        </Button>
      </Box>
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
        width: { xs: '95%', sm: '85%', md: '75%' },
        p: 2,
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        borderRadius: '15px',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
        background: 'background.paper',
        maxHeight: '90vh', // ограничение высоты
        overflowY: 'auto', // вертикальная прокрутка
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
            const { standard, required, optional } = getAllFieldsFromSource(source, source.type || 'misc');
            const missingFields = required.filter(field => !source.fields[field] || source.fields[field].trim() === '');
            const sourceErrors = source.errors || {};
            const hasError = Object.keys(sourceErrors).length > 0 || missingFields.length > 0;
            const generalErrors = editedLines["general"] || [];

            return (
              <Box
                key={index}
                mb={2}
                sx={{
                  width: '100%',
                  border: hasError ? '2px solid red' : 'none',
                  borderRadius: '4px',
                  padding: '8px'
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 'bold',
                    color: hasError ? 'error.main' : 'text.primary'
                  }}
                >
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

                {standard
                  .filter(field => !['volume', 'number', 'issue'].includes(field))
                  .concat(required.filter(field => !standard.includes(field) && !['volume', 'number', 'issue'].includes(field)))
                  .map((field) => {
                    const isYearField = field === 'year';
                    const isNumericField = ['year'].includes(field);
                    const isPageField = field === 'pages';
                    const fieldValue = source.fields[field] || '';
                    const isInvalidYear = isYearField && fieldValue &&
                      (isNaN(fieldValue) || parseInt(fieldValue) > currentYear);
                    const isInvalidPage = isPageField && fieldValue &&
                      !(/^\d+$/.test(fieldValue) || /^\d+--?\d+$/.test(fieldValue));
                    const isMissingField = missingFields.includes(field);
                    const fieldError = sourceErrors[field];

                    return (
                      <TextField
                        key={field}
                        fullWidth
                        margin="dense"
                        label={field}
                        value={fieldValue}
                        onChange={(e) => handleSourceChange(index, field, e.target.value)}
                        sx={{
                          width: '100%',
                          '& .MuiInputBase-input': {
                            textDecoration: isMissingField || fieldError ? 'underline red wavy' : 'none',
                            color: isMissingField || isInvalidYear || isInvalidPage || fieldError
                              ? 'error.main'
                              : 'text.primary'
                          },
                        }}
                        error={isMissingField || isInvalidYear || isInvalidPage || !!fieldError}
                        helperText={
                          fieldError
                            ? fieldError.includes('author')
                              ? 'Ожидается формат: surname, name [patronymic] или surname, name [patronymic] and surname, name [patronymic]'
                              : fieldError.replace(/^(Неверный формат поля '[^']+'|Отсутствует обязательное поле '[^']+').*?(?=:|$)(\:.*)?$/, (match, p1, p2) => p2 ? p2.substring(1).trim() : 'Ошибка в поле')
                            : isMissingField
                              ? 'Обязательное поле, добавлено автоматически'
                              : isInvalidYear
                                ? (isNaN(fieldValue) ? 'Год должен быть числом' : `Год не может быть больше текущего (${currentYear})`)
                                : isInvalidPage
                                  ? 'Страницы должны быть числом или диапазоном (например, 20-30 или 20--30)'
                                  : ''
                        }
                        inputProps={{
                          ...(isNumericField ? { inputMode: 'numeric', pattern: '[0-9]*', type: 'text' } : {}),
                          ...(isPageField ? { pattern: '\\d+--?\\d+|\\d+' } : {})
                        }}
                      />
                    );
                  })}

         {source.type === 'article' && (
  <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
    {['volume', 'number', 'issue'].map((field) => {
      const fieldValue = source.fields[field] || '';
      const isInvalidNumeric = fieldValue && !/^\d+$/.test(fieldValue);
      const hasPublicationFields = ['volume', 'number', 'issue'].some(
        (f) => source.fields[f] && source.fields[f].trim() !== ''
      );
      const fieldError = sourceErrors[field];

      // Извлекаем сообщение об ошибке без префикса
      const extractErrorMessage = (error) => {
        if (!error) return '';
        const match = error.match(/^(Неверный формат поля '[^']+'|Отсутствует обязательное поле '[^']+').*?(?=:|$)(\:.*)?$/);
        if (match && match[2]) return match[2].substring(1).trim();
        return error;
      };

      const errorMessage = extractErrorMessage(fieldError);

      // Определяем, есть ли реальная ошибка
      const hasError = !!errorMessage || isInvalidNumeric || (!hasPublicationFields && !fieldValue);

      return (
        <TextField
          key={field}
          margin="dense"
          label={field}
          value={fieldValue}
          onChange={(e) => handleSourceChange(index, field, e.target.value)}
          sx={{
            flex: '1 1 30%',
            minWidth: '100px',
            '& .MuiInputBase-input': {
              textDecoration: hasError ? 'underline red wavy' : 'none',
              color: hasError ? 'error.main' : 'text.primary'
            },
          }}
          error={hasError}
          helperText={
            hasError
              ? errorMessage ||
                (isInvalidNumeric
                  ? 'Поле должно содержать только число'
                  : 'Заполните хотя бы одно из этих полей')
              : ''
          }
          inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9]*',
            type: 'text'
          }}
        />
      );
    })}
    <Typography variant="caption" sx={{ width: '100%', color: 'text.secondary', mt: -1 }}>
      Возможно, у вашего источника могут отсутствовать некоторые из этих полей.
    </Typography>
  </Box>
)}

                {optional.map((field) => (
                  <Box key={field} display="flex" alignItems="center" sx={{ width: '100%' }}>
                    <TextField
                      fullWidth
                      margin="dense"
                      label={`${field} (необязательное)`}
                      value={source.fields[field] || ''}
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

                {/* {generalErrors.length > 0 && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    Общие ошибки: {generalErrors.join('; ')}
                  </Typography>
                )} */}
              </Box>
            );
          })}
        </Box>
      )}
      <Button fullWidth variant="contained" onClick={addSource} sx={{ mt: 2, width: '100%' }}>
        Добавить источник
      </Button>
      <Button fullWidth variant="outlined" onClick={handleSaveEditedFile} sx={{ mt: 2, width: '100%' }}>
        Сохранить
      </Button>
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
        
        {Object.keys(editedLines).length > 0 ? (
            <>
                <Typography variant="subtitle1" color="error" gutterBottom>
                    Обнаруженные ошибки:
                </Typography>
                <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                    {Object.entries(editedLines).map(([key, error], i) => (
                        <Typography key={i} component="li" color="error">
                            {error}
                        </Typography>
                    ))}
                </Box>
            </>
        ) : (
            <Typography variant="subtitle1" color="warning" gutterBottom>
                Ошибки не удалось разобрать. Количество ошибок: {files.find(f => f.id === errorFileId)?.number_of_errors || 0}.
            </Typography>
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

        <input
          id="upload-bib-file"
          type="file"
          accept=".bib"
          style={{ display: 'none' }}
          onChange={uploadBibFiles}
          multiple
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
        >
          <Alert 
            severity={snackbar.severity}
            onClose={handleSnackbarClose}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </>
  );
};

export default PersonalAccount;