import React, { useContext } from 'react';
import PropTypes from 'prop-types';

import {
  Routes, Route, Navigate, useNavigate
} from 'react-router-dom';
import dummyContents from 'dan-api/dummy/dummyContents';
import Dashboard from '../Templates/Dashboard';
import { ThemeContext } from './ThemeWrapper';
import ProtectedRoute from '../../routes/ProtectedRoute';
import DashboardReobote from '../Pages/Dashboard';
import {
  BlankPage,
  Gestao,
  ProfilePage
} from '../pageListAsync';

function Application({ isAuthenticated }) {
  const changeMode = useContext(ThemeContext);
  const navigate = useNavigate();

  // ✅ cria um objeto "history" compatível com versões antigas
  const history = {
    push: (path) => navigate(path),
    replace: (path) => navigate(path, { replace: true }),
  };

  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    dummyContents.user = JSON.parse(storedUser);
  }

  return (
    <Dashboard history={history} changeMode={changeMode}>
      <Routes>
        <Route index element={<Navigate to="blank-page" replace />} />
        <Route
          path="blank-page"
          element={<ProtectedRoute element={<BlankPage />} isAuthenticated={isAuthenticated} />}
        />
        <Route
          path="profile"
          element={<ProtectedRoute element={<ProfilePage />} isAuthenticated={isAuthenticated} />}
        />
        <Route
          path="dashvisitas"
          element={<ProtectedRoute element={<DashboardReobote />} isAuthenticated={isAuthenticated} />}
        />

           <Route
          path="gestao"
          element={<ProtectedRoute element={<Gestao />} isAuthenticated={isAuthenticated} />}
        />

      </Routes>
    </Dashboard>
  );
}

Application.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired
};

export default Application;
