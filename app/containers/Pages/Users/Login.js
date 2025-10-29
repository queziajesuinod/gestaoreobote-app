import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from 'dan-components';
import useStyles from 'dan-components/Forms/user-jss';
import dummyContents from 'dan-api/dummy/dummyContents';

function decodeJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Erro ao decodificar JWT:', e);
    return null;
  }
}

function Login({ setIsAuthenticated = () => {} }) {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';

  const submitForm = async (values) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (!response.ok) throw new Error('Falha na autenticação');

      const data = await response.json();

      console.log( 'Resposta da API de login:', data);
      const token = data.accessToken;
      localStorage.setItem('token', token);
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);

      // 🔹 Mock de perfil e permissões (substitua futuramente pela API real)
      const perfilMock = 'ADMIN';
      const permissoesMock = [
        'GESTAO',
        'DASHBOARD'
      ];

      // 🔹 Armazena o usuário e as permissões mockadas
      const userData = {
        name: data.name || 'Usuário',
        id: data.id || 'user',
        perfilId: data.perfilId || perfilMock,
        permissoes: permissoesMock,
        title: 'Usuário Autenticado',
        avatar: data.image || 'default-avatar.png',
        status: 'online'
      };

      localStorage.setItem('user', JSON.stringify(userData));
      dummyContents.user = userData;

      console.log('Usuário autenticado (mock de perfil):', dummyContents.user);

      // 🔄 Redireciona após login
      navigate('/app', { replace: true });
    } catch (error) {
      console.error('Erro ao fazer login:', error);
    }
  };

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        <div className={classes.userFormWrap}>
          <LoginForm onSubmit={submitForm} />
        </div>
      </div>
    </div>
  );
}

Login.propTypes = {
  setIsAuthenticated: PropTypes.func
};

export default Login;
