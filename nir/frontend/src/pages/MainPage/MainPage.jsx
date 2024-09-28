import React, { useState, useEffect } from "react";
import './main-page.css';
import Logo from "../../components/Logo/Logo";
import Button from "../../components/Button/Button";

import Icon_profile from "../../assets/icons/icon_profile.svg";
import Search_icon from "../../assets/icons/search_icon.svg";
import X_icon from "../../assets/icons/x_icon.svg";

const MainPage = () => {
    const [files, setFiles] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [sources, setSources] = useState([]);
    const [selectedType, setSelectedType] = useState('');
    const [currentFields, setCurrentFields] = useState([]);

    useEffect(() => {
        const userId = 1; // Пример: здесь нужно установить реальный ID пользователя
        fetch(`http://localhost:8000/api/files?user_id=${userId}`)
            .then((response) => response.json())
            .then((data) => {
                console.log("Полученные данные:", data);
                setFiles(data);
            })
            .catch((error) => console.error("Error fetching data:", error));
    }, []);
    
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

    const handleTypeChange = (type) => {
        setSelectedType(type);
        setCurrentFields(getFieldsForType(type));
    };

    const addSource = () => {
        if (sources.length < 100) {
            const newSource = {
                type: selectedType,
            };

            currentFields.forEach(field => {
                newSource[field] = '';
            });

            setSources((prevSources) => [...prevSources, newSource]);
        } else {
            alert("Достигнуто максимальное количество источников (100)");
        }
    };

    const handleSourceChange = (index, field, value) => {
        setSources((prevSources) => {
            const newSources = [...prevSources];
            newSources[index] = newSources[index] || { type: selectedType };
            newSources[index][field] = value;

            return newSources;
        });
    };

    const saveBibFiles = () => {
        const sourcesWithId = sources.map((source, index) => {
            const cleanedSource = {
                ...source,
                ID: `source${index + 1}`,
            };

            Object.keys(cleanedSource).forEach(key => {
                if (cleanedSource[key] === '') {
                    delete cleanedSource[key];
                }
            });

            return cleanedSource;
        });

        console.log("Отправляемые данные:", sourcesWithId);

        fetch("http://localhost:8000/api/save-bib", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(sourcesWithId),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при сохранении');
            }
            return response.json();
        })
        .then(data => {
            console.log("Bib файл сохранен", data);
            setModalOpen(false);
            setSources([]);
            setCurrentFields([]);
            setSelectedType('');
        })
        .catch(error => console.error("Ошибка при сохранении bib файла:", error));
    };

    return (
        <>
            <div className="container">
                <div className="logo_main_page">
                    <Logo />
                </div>

                <div className="up_bar">
                    <div className="search_bar inline_blocks">
                        <img className="search_icon" src={Search_icon} alt="search_icon" />
                        <input type="text" />
                        <img className="x_icon" src={X_icon} alt="x_icon" />
                    </div>
                    <div className="top__button inline_blocks">
                        <Button onClick={() => setModalOpen(true)}>создать bib-файл</Button>
                        <Button>загрузить bib-файл</Button>
                    </div>
                    <img className="icon inline_blocks" src={Icon_profile} alt="Icon_profile" />
                </div>

                <div className="file-table-container">
                    <h1>Files List</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>Название файла</th>
                                <th>Дата загрузки</th>
                                <th>Количество ошибок</th>
                                <th>Курс</th>
                                <th>Ссылка на скачивание</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file, index) => (
                                <tr key={index}>
                                    <td>{file.name_file}</td>
                                    <td>
                                        {file.uploadDate 
                                            ? (() => {
                                                const date = new Date(file.loading_a); // Парсинг даты
                                                return date.toLocaleDateString('ru-RU'); // Форматирование в нужный вид
                                            })() 
                                            : "Дата не указана"}
                                    </td>
                                    <td>{file.number_of_errors}</td>
                                    <td>{file.course_compliance}</td>
                                    <td>
                                        <a href={file.download_link_edited}>Скачать</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="under__button">
                    <Button>скачать исход. bib-файлы</Button>
                    <Button>скачать редактир.bib-файлы</Button>
                </div>
            </div>

            {/* Модальное окно для создания bib-файла */}
            {modalOpen && (
                <div className="modal">
                    <h2>Создать bib-файл</h2>

                    <select value={selectedType} onChange={(e) => handleTypeChange(e.target.value)}>
                        <option value="">Выберите тип записи</option>
                        <option value="article">Article</option>
                        <option value="book">Book</option>
                        <option value="conference">Conference</option>
                        <option value="techReport">Tech Report</option>
                        <option value="inProceedings">In Proceedings</option>
                        <option value="online">Online</option>
                        <option value="manual">Manual</option>
                    </select>

                    {sources.map((source, sourceIndex) => (
                        <div key={sourceIndex}>
                            <h3>Источник {sourceIndex + 1}</h3>
                            {currentFields.map((field, fieldIndex) => (
                                <input 
                                    key={`${sourceIndex}-${fieldIndex}`}
                                    type="text"
                                    placeholder={field}
                                    value={source[field] || ''}
                                    onChange={(e) => handleSourceChange(sourceIndex, field, e.target.value)}
                                />
                            ))}
                        </div>
                    ))}

                    <button onClick={addSource}>Добавить источник</button>
                    <button onClick={saveBibFiles}>Сохранить</button>
                    <button onClick={() => setModalOpen(false)}>Закрыть</button>
                </div>
            )}
        </>
    );
};

export default MainPage;
