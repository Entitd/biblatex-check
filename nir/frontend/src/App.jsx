import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import LoginPage from './pages/LoginPage/LoginPage';
import MainPage from './pages/MainPage/MainPage';
// import RegistrationPage from './pages/RegistrationPage/RegistrationPage';
// import PersonalAccount from './pages/PersonalAccount/PersonalAccount';

function App() {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<MainPage />} />
        
        <Route path='/profile' element={<MainPage />} />
        {/* <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegistrationPage />} /> */}
      </Routes>
    </Router>
  );
}

export default App;
