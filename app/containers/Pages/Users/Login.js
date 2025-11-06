import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from 'dan-components';
import useStyles from 'dan-components/Forms/user-jss';
import dummyContents from 'dan-api/dummy/dummyContents';
import { setStoredUser } from '../../../utils/userStorage';

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

      const token = data.accessToken;
      localStorage.setItem('token', token);
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);

      const decodedToken = decodeJwt(token) || {};
      const perfilDescricao = data.perfilDescricao || decodedToken.perfil || 'USUARIO';
      const permissoes = data.permissoes || decodedToken.permissoes || [];

      const fallbackAvatar = data.image || decodedToken?.image || decodedToken?.avatar || null;

      const userData = {
        name: data.name || 'Usuário',
        id: data.id || 'user',
        perfilId: data.perfilId || null,
        perfil: perfilDescricao,
        permissoes,
        consultorId: data.consultorId || decodedToken.consultorId || null,
        title: 'Usuário Autenticado',
        avatar: fallbackAvatar || 'default-avatar.png',
        image: fallbackAvatar || null,
        status: 'online'
      };

      setStoredUser(userData);
      dummyContents.user = userData;

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
