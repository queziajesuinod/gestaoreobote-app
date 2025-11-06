import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import { getStoredUser, setStoredUser } from '../../../utils/userStorage';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const getToken = () => localStorage.getItem('token');

const defaultUserForm = {
  id: null,
  name: '',
  email: '',
  username: '',
  perfilId: '',
  password: '',
  confirmPassword: '',
  active: true,
  consultorId: ''
};

function UsersManagement() {
  const title = 'Gestão de Usuários';
  const description = 'Administração de usuários do sistema';

  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  useEffect(() => {
    const handleUserUpdated = (event) => {
      const payload = event?.detail;
      if (payload) {
        setCurrentUser(payload);
      } else {
        setCurrentUser(getStoredUser());
      }
    };

    window.addEventListener('app:user-updated', handleUserUpdated);
    return () => window.removeEventListener('app:user-updated', handleUserUpdated);
  }, []);

  const permissoes = currentUser?.permissoes || [];
  const podeGerenciarUsuarios = permissoes.includes('USERS_MANAGE') || permissoes.includes('GESTAO');

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [perfis, setPerfis] = useState([]);
  const [loadingPerfis, setLoadingPerfis] = useState(false);
  const [consultores, setConsultores] = useState([]);
  const [loadingConsultores, setLoadingConsultores] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const resetForm = () => {
    setUserForm(defaultUserForm);
    setDialogMode('create');
  };

  const refreshCurrentUser = async () => {
    if (!currentUser?.id) return;
    try {
      const response = await fetch(`${API_URL}/users/${currentUser.id}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const permissoesAtualizadas = data?.Perfil?.permissoes
        ?.map((permissao) => (permissao.nome || '').trim().toUpperCase())
        .filter(Boolean) || [];

      const updatedUser = {
        ...currentUser,
        name: data?.name || currentUser.name,
        email: data?.email || currentUser.email,
        username: data?.username || currentUser.username,
        perfilId: data?.perfilId || currentUser.perfilId,
        consultorId: data?.consultorId || currentUser.consultorId || null,
        permissoes: permissoesAtualizadas
      };

      setStoredUser(updatedUser);
      setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Erro ao atualizar usuário autenticado:', error);
    }
  };

  const loadUsers = async () => {
    if (!podeGerenciarUsuarios) return;
    setLoadingUsers(true);
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar usuários');
      }
      const data = await response.json();
      const normalizados = (Array.isArray(data) ? data : []).map((usuario) => ({
        ...usuario,
        perfilDescricao: usuario.Perfil?.descricao || '—',
        permissoesPerfil: usuario.Perfil?.permissoes
          ?.map((permissao) => (permissao.nome || '').trim().toUpperCase())
          .filter(Boolean) || [],
        consultorDescricao: usuario.consultor?.nome || '—'
      }));
      setUsers(normalizados);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      showSnackbar('Não foi possível carregar a lista de usuários.', 'error');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadPerfis = async () => {
    if (!podeGerenciarUsuarios) return;
    setLoadingPerfis(true);
    try {
      const response = await fetch(`${API_URL}/perfil`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar perfis');
      }
      const data = await response.json();
      setPerfis(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      showSnackbar('Não foi possível carregar os perfis.', 'error');
      setPerfis([]);
    } finally {
      setLoadingPerfis(false);
    }
  };

  async function loadConsultores() {
    setLoadingConsultores(true);
    try {
      const response = await fetch(`${API_URL}/consultor`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar consultores');
      }
      const data = await response.json();
      setConsultores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      setConsultores([]);
    } finally {
      setLoadingConsultores(false);
    }
  }

  useEffect(() => {
    if (podeGerenciarUsuarios) {
      loadPerfis();
      loadConsultores();
      loadUsers();
    }
  }, [podeGerenciarUsuarios]);

  const handleOpenCreate = () => {
    resetForm();
    setDialogMode('create');
    setOpenDialog(true);
  };

  const handleOpenEdit = (usuario) => {
    setUserForm({
      id: usuario.id,
      name: usuario.name || '',
      email: usuario.email || '',
      username: usuario.username || '',
      perfilId: usuario.perfilId || '',
      password: '',
      confirmPassword: '',
      active: Boolean(usuario.active),
      consultorId: usuario.consultorId ? String(usuario.consultorId) : ''
    });
    setDialogMode('edit');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const handleFormChange = (field, value) => {
    setUserForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!podeGerenciarUsuarios) {
      showSnackbar('Você não tem permissão para alterar usuários.', 'error');
      return;
    }

    if (dialogMode === 'create') {
      if (!userForm.password || userForm.password.length < 6) {
        showSnackbar('A senha deve conter ao menos 6 caracteres.', 'warning');
        return;
      }
      if (userForm.password !== userForm.confirmPassword) {
        showSnackbar('As senhas não coincidem.', 'warning');
        return;
      }
    }

    if (!userForm.perfilId) {
      showSnackbar('Selecione um perfil.', 'warning');
      return;
    }

    const payload = {
      name: userForm.name,
      email: userForm.email,
      username: userForm.username,
      perfilId: userForm.perfilId,
      active: userForm.active
    };

    if (podeGerenciarUsuarios) {
      payload.consultorId = userForm.consultorId ? Number(userForm.consultorId) : null;
    }

    const endpoint = dialogMode === 'create'
      ? `${API_URL}/users`
      : `${API_URL}/users/${userForm.id}`;

    const method = dialogMode === 'create' ? 'POST' : 'PUT';

    if (dialogMode === 'create') {
      payload.password = userForm.password;
    }

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao salvar usuário.');
      }

      showSnackbar(dialogMode === 'create'
        ? 'Usuário criado com sucesso.'
        : 'Usuário atualizado com sucesso.'
      );
      handleCloseDialog();
      await loadUsers();
      await loadPerfis();
      if (dialogMode === 'edit' && currentUser?.id && userForm.id === currentUser.id) {
        await refreshCurrentUser();
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      showSnackbar(error.message || 'Falha ao salvar usuário.', 'error');
    }
  };

  const handleToggleActive = async (usuario) => {
    if (!podeGerenciarUsuarios) {
      showSnackbar('Você não tem permissão para alterar usuários.', 'error');
      return;
    }

    setActionLoadingId(usuario.id);
    try {
      const response = await fetch(`${API_URL}/users/${usuario.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          active: !usuario.active
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao atualizar usuário.');
      }

      showSnackbar('Status atualizado com sucesso.');
      await loadUsers();
      if (currentUser?.id && usuario.id === currentUser.id) {
        await refreshCurrentUser();
      }
    } catch (error) {
      console.error('Erro ao atualizar status do usuário:', error);
      showSnackbar(error.message || 'Falha ao atualizar status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderContent = () => {
    if (!podeGerenciarUsuarios) {
      return (
        <PapperBlock title="Gestão de Usuários" icon="ion-ios-person" desc="Acesso restrito">
          <Typography variant="body1">
            Você não possui permissão para visualizar esta página.
          </Typography>
        </PapperBlock>
      );
    }

    return (
      <PapperBlock title="Gestão de Usuários" icon="ion-ios-person" desc="Administrar usuários cadastrados">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
          <Typography variant="h6">Usuários do Sistema</Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={loadUsers}
              disabled={loadingUsers}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Novo Usuário
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell>Perfil</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingUsers ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map(usuario => (
                  <TableRow key={usuario.id} hover>
                    <TableCell>{usuario.name}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>{usuario.username || '—'}</TableCell>
                    <TableCell>{usuario.perfilDescricao}</TableCell>
                    <TableCell>
                      <Chip
                        label={usuario.active ? 'Ativo' : 'Inativo'}
                        color={usuario.active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
                        <Tooltip title={usuario.active ? 'Desativar usuário' : 'Ativar usuário'}>
                          <span>
                            <Switch
                              size="small"
                              checked={Boolean(usuario.active)}
                              onChange={() => handleToggleActive(usuario)}
                              disabled={actionLoadingId === usuario.id}
                            />
                          </span>
                        </Tooltip>
                        <IconButton color="primary" onClick={() => handleOpenEdit(usuario)}>
                          <EditIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <form onSubmit={handleSubmit}>
            <DialogTitle>{dialogMode === 'create' ? 'Novo Usuário' : 'Editar Usuário'}</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Nome"
                    value={userForm.name}
                    onChange={e => handleFormChange('name', e.target.value)}
                    required
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    type="email"
                    value={userForm.email}
                    onChange={e => handleFormChange('email', e.target.value)}
                    required
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Usuário (login)"
                    value={userForm.username}
                    onChange={e => handleFormChange('username', e.target.value)}
                    required
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Perfil</InputLabel>
                    <Select
                      value={userForm.perfilId}
                      label="Perfil"
                      onChange={e => handleFormChange('perfilId', e.target.value)}
                      disabled={loadingPerfis}
                    >
                      <MenuItem value="">
                        <em>Selecione</em>
                      </MenuItem>
                      {perfis.map(perfil => (
                        <MenuItem key={perfil.id} value={perfil.id}>
                          {perfil.descricao}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {podeGerenciarUsuarios && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Consultor (opcional)</InputLabel>
                      <Select
                        value={userForm.consultorId}
                        label="Consultor (opcional)"
                        onChange={e => handleFormChange('consultorId', e.target.value)}
                        disabled={loadingConsultores}
                      >
                        <MenuItem value="">
                          <em>Nenhum</em>
                        </MenuItem>
                        {consultores.map((consultor) => (
                          <MenuItem key={consultor.id} value={String(consultor.id)}>
                            {consultor.nome}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                {dialogMode === 'create' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Senha"
                        type="password"
                        value={userForm.password}
                        onChange={e => handleFormChange('password', e.target.value)}
                        required
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        label="Confirmar Senha"
                        type="password"
                        value={userForm.confirmPassword}
                        onChange={e => handleFormChange('confirmPassword', e.target.value)}
                        required
                        fullWidth
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={Boolean(userForm.active)}
                        onChange={e => handleFormChange('active', e.target.checked)}
                      />
                    )}
                    label="Usuário ativo"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancelar</Button>
              <Button type="submit" variant="contained" color="primary">
                {dialogMode === 'create' ? 'Cadastrar' : 'Salvar Alterações'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </PapperBlock>
    );
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>
      {renderContent()}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={closeSnackbar} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default UsersManagement;
