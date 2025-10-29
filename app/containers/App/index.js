import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import dummyContents from 'dan-api/dummy/dummyContents';
import { NotFound } from '../pageListAsync';
import Application from './Application';
import LoginDedicated from '../Pages/Standalone/LoginDedicated';
import ThemeWrapper from './ThemeWrapper';
import { setupAuthInterceptor, isTokenExpired } from '../../utils/authInterceptor';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const storedAuth = localStorage.getItem('isAuthenticated');
    return storedAuth === 'true';
  });

  // Configura interceptor de autenticação na inicialização
  useEffect(() => {
    setupAuthInterceptor();
  }, []);

  // Carrega dados do usuário do localStorage na inicialização
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      dummyContents.user = JSON.parse(storedUser);
    }
    
    // Verifica se o token está expirado ao carregar
    if (isAuthenticated && isTokenExpired()) {
      console.warn('Token expirado detectado ao inicializar. Fazendo logout...');
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
    }
  }, [isAuthenticated]);

  // Sincroniza o estado com o localStorage
  useEffect(() => {
    localStorage.setItem('isAuthenticated', isAuthenticated);
  }, [isAuthenticated]);

  return (
    <Router>
      <ThemeWrapper>
        <Routes>
          <Route path="/" element={<Navigate to={isAuthenticated ? "/app" : "/login"} />} />
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to="/app" replace />
              ) : (
                <LoginDedicated setIsAuthenticated={setIsAuthenticated} />
              )
            } 
          />
          <Route 
            path="/app/*" 
            element={
              isAuthenticated ? (
                <Application isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ThemeWrapper>
    </Router>
  );
}

export default App;
