import React, { useContext, useState } from "react";
import {Modal, Box, Typography, Button, Stack} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { ThemeContext } from '../ThemeToggleButton/ThemeContext';

const HelpComponent = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onClick={handleOpen}
        sx={{
          cursor: 'pointer',
          padding: '6px 12px',
          borderRadius: '4px',
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0)' : 'rgba(255, 255, 255, 0)',
          color: isDarkMode ? '#ffffff' : '#1976d2',
          border: '1px solid transparent',
          '&:hover': {
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(25, 118, 210, 0.5)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <Typography variant="body1">Справка</Typography>
        <HelpOutlineIcon fontSize="small" />
      </Stack>


      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: '70%', md: '50%' },
            maxHeight: '90vh',
            overflowY: 'auto',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
          }}
        >
          <Typography variant="h2" gutterBottom>
            Справка по использованию BIBCHECK.RU
          </Typography>

          <Typography paragraph>
            Это веб-приложение предназначено для проверки и редактирования библиографических файлов формата BibLaTeX.
            Оно позволяет:
          </Typography>

          <ul>
            <li>Легко и удобно создавать новые .bib файлы с необходимыми полями.</li>
            <li>Загружать существующие .bib файлы для проверки на ошибки.</li>
            <li>Редактировать источники с подсветкой выявленных ошибок.</li>
            <li>Проверять соответствие данных требованиям ГОСТ, а также внутренним регламентам кафедры ИСКМ ВолГу.</li>
            <li>Скачивать исправленные и исходные версии файлов.</li>
          </ul>

          <Typography paragraph>
            У Гостей все данные сохраняются до конца сессиию, в то время как у Аутентифицированного пользователя сохраняются навсегда.
          </Typography>

          <Typography variant="h4" gutterBottom>
            Создание bib-файла
          </Typography>

          <Typography paragraph>
            Для создания bib-файла нажмите на кнопку "<Button
                  variant="contained"
                  size="medium"
                  sx={{
                    minWidth: '160px',
                    height: '50px',
                    px: 3,
                  }}
                >
                  Создать bib-файл
                </Button>" на данной странице, после появится модальное окно, в котором необходимо выбрать тип записи, после чего появятся 
                обязательные поля для заполнения атрибутов записи.    
          </Typography>

          <Typography paragraph>
            При нажатии на "<Button
                  variant="contained"
                  size="medium"
                  sx={{
                    minWidth: '160px',
                    height: '50px',
                    px: 3,
                  }}
                >
                  Добавить источник
                </Button>" можно выбрать еще один тип записи и так далее.
          </Typography>
          <Typography paragraph>
            Переходить между записями можно при помощи кнопок "<Button
                    variant="outlined"
                    size="medium"
                    sx={{
                      minWidth: '160px',
                      height: '50px',
                      px: 3,
                    }}
                  >
                    Предыдущий
                  </Button>" и "<Button
                    variant="outlined"
                    size="medium"
                    sx={{
                      minWidth: '160px',
                      height: '50px',
                      px: 3,
                    }}
                  >
                    Следующий
                  </Button>"
          </Typography>

          <Typography paragraph>
            После составления bib-файла обязательно нажмите на , "<Button
                    variant="outlined"
                    size="medium"
                    sx={{
                      minWidth: '160px',
                      height: '50px',
                      px: 3,
                    }}
                  >
                    Сохранить
                  </Button>"инчаче прогресс будет утерян.
          </Typography>

          <Typography variant="h4" gutterBottom>
            Загрузка bib-файла
          </Typography>

          <Typography paragraph>
            Для загрузки готового bib-файла есть два пути:
            <ul>
              <li>Загрузите перетащив файл, со своего рабочего стола, на зону сайта.</li>
              <li>Загрузите, нажав на кнопку "<Button
                    variant="outlined"
                    size="medium"
                    sx={{
                      minWidth: '160px',
                      height: '50px',
                      px: 3,
                    }}
                  >
                    Загрузить bib-файл
                  </Button>" и далее выбрать необходимый файл из стандартного проводника вашей системы.
              </li>
            </ul>           
          </Typography>

          <Typography variant="h4" gutterBottom>
            Редактирование bib-файла
          </Typography>

          <Typography paragraph>
            Модальной окно редактирования файла открывается при нажатии на кнопку "<Button
                              variant="outlined"
                              size="small"
                              startIcon={<EditIcon />}
                              sx={{
                                borderColor: 'primary.main',
                                color: 'primary.main'
                              }}
                            >
                              Редактировать
                            </Button>", для необходимой записи.
            Окно схоже с окном для создания bib-файла, однако найденные ошибки при проверке bib-файла выделены красным и объяснены причиной возникновения. 
          </Typography>

          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button variant="contained" onClick={handleClose}>Закрыть</Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default HelpComponent;