import React from 'react';
import PropTypes from 'prop-types';
import Login from '../Users/Login';

function LoginDedicated({ setIsAuthenticated }) {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <h2>Página de Login</h2>
      <Login setIsAuthenticated={setIsAuthenticated} />
    </div>
  );
}

LoginDedicated.propTypes = {
  setIsAuthenticated: PropTypes.func.isRequired
};

export default LoginDedicated;