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
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Chip
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import { getStoredUser, setStoredUser } from '../../../utils/userStorage';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const getToken = () => localStorage.getItem('token');

const defaultPerfilForm = {
  descricao: ''
};

function PerfisManagement() {
  const title = 'Gestão de Perfis';
  const description = 'Administração de perfis de acesso';

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
  const podeGerenciarPerfis = permissoes.includes('USERS_MANAGE');

  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [perfilForm, setPerfilForm] = useState(defaultPerfilForm);
  const [permissoesDisponiveis, setPermissoesDisponiveis] = useState([]);
  const [openPermissoesDialog, setOpenPermissoesDialog] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState(null);
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState([]);
  const [novaPermissao, setNovaPermissao] = useState('');
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
    setPerfilForm(defaultPerfilForm);
  };

  const normalizarNomePermissao = (nome) => (nome || '').trim().toUpperCase();

  const atualizarPermissoesEstado = (nomes = []) => {
    setPermissoesDisponiveis((prev) => {
      const conjunto = new Set(prev.map(normalizarNomePermissao));
      nomes.forEach((nome) => {
        const normalizado = normalizarNomePermissao(nome);
        if (normalizado) {
          conjunto.add(normalizado);
        }
      });
      return Array.from(conjunto);
    });
  };

  const loadPerfis = async () => {
    if (!podeGerenciarPerfis) return;
    setLoading(true);
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
      const listaPerfis = Array.isArray(data) ? data : [];
      setPerfis(listaPerfis);
      const nomes = [];
      listaPerfis.forEach((perfil) => {
        (perfil.permissoes || []).forEach((permissao) => {
          nomes.push(permissao?.nome);
        });
      });
      atualizarPermissoesEstado(nomes);
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      showSnackbar('Não foi possível carregar os perfis.', 'error');
      setPerfis([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPermissoesCatalogo = async () => {
    if (!podeGerenciarPerfis) return;
    try {
      const response = await fetch(`${API_URL}/perfil/permissoes/disponiveis`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar catálogo de permissões');
      }

      const data = await response.json();
      const nomes = (Array.isArray(data?.dados) ? data.dados : data)
        .map((item) => item?.nome)
        .filter(Boolean);
      atualizarPermissoesEstado(nomes);
    } catch (error) {
      console.error('Erro ao carregar catálogo de permissões:', error);
    }
  };

  useEffect(() => {
    if (podeGerenciarPerfis) {
      loadPerfis();
      loadPermissoesCatalogo();
    }
  }, [podeGerenciarPerfis]);

  const handleOpenDialog = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!podeGerenciarPerfis) {
      showSnackbar('Você não tem permissão para cadastrar perfis.', 'error');
      return;
    }

    if (!perfilForm.descricao.trim()) {
      showSnackbar('A descrição é obrigatória.', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/perfil`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          descricao: perfilForm.descricao.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao criar perfil.');
      }

      showSnackbar('Perfil criado com sucesso.');
      handleCloseDialog();
      loadPerfis();
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      showSnackbar(error.message || 'Falha ao criar perfil.', 'error');
    }
  };

  const handleOpenPermissoesDialog = (perfil) => {
    setPerfilSelecionado(perfil);
    const selecionadas = (perfil?.permissoes || [])
      .map((permissao) => normalizarNomePermissao(permissao?.nome))
      .filter(Boolean);
    setPermissoesSelecionadas(selecionadas);
    setNovaPermissao('');
    setOpenPermissoesDialog(true);
  };

  const handleClosePermissoesDialog = () => {
    setOpenPermissoesDialog(false);
    setPerfilSelecionado(null);
    setPermissoesSelecionadas([]);
    setNovaPermissao('');
  };

  const handleTogglePermissao = (nome) => {
    const normalizado = normalizarNomePermissao(nome);
    if (!normalizado) return;
    setPermissoesSelecionadas((prev) => (
      prev.includes(normalizado)
        ? prev.filter((item) => item !== normalizado)
        : [...prev, normalizado]
    ));
  };

  const handleAdicionarPermissao = () => {
    const normalizado = normalizarNomePermissao(novaPermissao);
    if (!normalizado) return;
    setPermissoesSelecionadas((prev) => (
      prev.includes(normalizado) ? prev : [...prev, normalizado]
    ));
    atualizarPermissoesEstado([normalizado]);
    setNovaPermissao('');
  };

  const handleSalvarPermissoes = async () => {
    if (!perfilSelecionado) return;
    try {
      const response = await fetch(`${API_URL}/perfil/${perfilSelecionado.id}/permissoes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          permissoes: permissoesSelecionadas.map((nome) => ({ nome }))
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Erro ao atualizar permissões.');
      }

      showSnackbar('Permissões atualizadas com sucesso.');
      handleClosePermissoesDialog();
      await loadPerfis();
      await loadPermissoesCatalogo();

      if (currentUser?.perfilId === perfilSelecionado.id) {
        const atualizado = {
          ...currentUser,
          permissoes: [...permissoesSelecionadas]
        };
        setStoredUser(atualizado);
        setCurrentUser(atualizado);
      }
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      showSnackbar(error.message || 'Falha ao salvar permissões.', 'error');
    }
  };

  const renderContent = () => {
    if (!podeGerenciarPerfis) {
      return (
        <PapperBlock title="Gestão de Perfis" icon="ion-ios-briefcase" desc="Acesso restrito">
          <Typography variant="body1">
            Você não possui permissão para visualizar esta página.
          </Typography>
        </PapperBlock>
      );
    }

    return (
      <PapperBlock title="Gestão de Perfis" icon="ion-ios-briefcase" desc="Administrar funções e perfis de acesso">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
          <Typography variant="h6">Perfis cadastrados</Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={loadPerfis}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              Novo Perfil
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Descrição</TableCell>
                <TableCell>Identificador</TableCell>
                <TableCell>Criado em</TableCell>
                <TableCell>Permissões</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : perfis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Nenhum perfil cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                perfis.map(perfil => (
                  <TableRow key={perfil.id}>
                    <TableCell>{perfil.descricao}</TableCell>
                    <TableCell>{perfil.id}</TableCell>
                    <TableCell>
                      {perfil.createdAt
                        ? new Date(perfil.createdAt).toLocaleString('pt-BR')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {perfil.permissoes && perfil.permissoes.length > 0 ? (
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {perfil.permissoes.map((permissao) => (
                            <Chip key={`${perfil.id}-${permissao.id || permissao.nome}`} label={normalizarNomePermissao(permissao.nome)} size="small" />
                          ))}
                        </Box>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleOpenPermissoesDialog(perfil)}
                      >
                        Editar Permissões
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <form onSubmit={handleSubmit}>
            <DialogTitle>Novo Perfil</DialogTitle>
            <DialogContent dividers>
              <TextField
                label="Descrição do Perfil"
                value={perfilForm.descricao}
                onChange={e => setPerfilForm({ descricao: e.target.value })}
                fullWidth
                required
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancelar</Button>
              <Button type="submit" variant="contained" color="primary">
                Cadastrar
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        <Dialog open={openPermissoesDialog} onClose={handleClosePermissoesDialog} fullWidth maxWidth="sm">
          <DialogTitle>Permissões do Perfil</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" gutterBottom>
              Selecione as permissões que serão aplicadas ao perfil <strong>{perfilSelecionado?.descricao}</strong>.
            </Typography>
            <FormGroup>
              {[...permissoesDisponiveis].sort().map((nome) => (
                <FormControlLabel
                  key={nome}
                  control={(
                    <Checkbox
                      checked={permissoesSelecionadas.includes(nome)}
                      onChange={() => handleTogglePermissao(nome)}
                    />
                  )}
                  label={nome}
                />
              ))}
            </FormGroup>
            <Box display="flex" gap={1} alignItems="center" mt={2}>
              <TextField
                label="Adicionar nova permissão"
                value={novaPermissao}
                onChange={(e) => setNovaPermissao(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdicionarPermissao();
                  }
                }}
                fullWidth
              />
              <Button variant="contained" onClick={handleAdicionarPermissao}>Adicionar</Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePermissoesDialog}>Cancelar</Button>
            <Button variant="contained" color="primary" onClick={handleSalvarPermissoes}>
              Salvar Permissões
            </Button>
          </DialogActions>
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

export default PerfisManagement;
