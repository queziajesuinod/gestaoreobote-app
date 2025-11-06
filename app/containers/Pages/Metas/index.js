import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import brand from 'dan-api/dummy/brand';
import { getStoredUser } from '../../../utils/userStorage';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const getToken = () => localStorage.getItem('token');

const formatCurrency = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 'R$ 0,00';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseDateOnly = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? null : data;
};

const formatDate = (value) => {
  const data = parseDateOnly(value);
  if (!data) return '—';
  return data.toLocaleDateString('pt-BR');
};

const formatDateForInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const data = parseDateOnly(value);
  return data ? data.toISOString().slice(0, 10) : '';
};

function Metas() {
  const title = `${brand.name} - Metas`;
  const description = 'Gestão das metas de vendas.';

  const [storedUser] = useState(() => getStoredUser());
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoMeta, setEditandoMeta] = useState(null);
  const [formMeta, setFormMeta] = useState({
    descricao: '',
    valor: '',
    dataInicio: '',
    dataFim: ''
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const permissoes = storedUser?.permissoes || [];
  const podeGerenciarMetas = permissoes.includes('GESTAO') || permissoes.includes('CLIENTES_ALL') || storedUser?.perfil?.toUpperCase() === 'ADMIN';

  const exibirSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const fecharSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const carregarMetas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/metas`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = await response.json();
      if (!response.ok || data.sucesso === false) {
        throw new Error(data?.mensagem || 'Erro ao carregar metas');
      }

      setMetas(Array.isArray(data.dados) ? data.dados : []);
    } catch (error) {
      console.error('❌ Erro ao carregar metas:', error);
      exibirSnackbar(error.message || 'Falha ao carregar metas', 'error');
      setMetas([]);
    } finally {
      setLoading(false);
    }
  }, [exibirSnackbar]);

  useEffect(() => {
    carregarMetas();
  }, [carregarMetas]);

  const metasPaginadas = useMemo(() => {
    if (rowsPerPage === -1) return metas;
    const inicio = page * rowsPerPage;
    return metas.slice(inicio, inicio + rowsPerPage);
  }, [metas, page, rowsPerPage]);

  const abrirDialogNovaMeta = () => {
    setEditandoMeta(null);
    setFormMeta({
      descricao: '',
      valor: '',
      dataInicio: '',
      dataFim: ''
    });
    setDialogOpen(true);
  };

  const abrirDialogEditar = (meta) => {
    setEditandoMeta(meta);
    setFormMeta({
      descricao: meta.descricao || '',
      valor: meta.valor || '',
      dataInicio: formatDateForInput(meta.dataInicio),
      dataFim: formatDateForInput(meta.dataFim)
    });
    setDialogOpen(true);
  };

  const fecharDialog = () => {
    setDialogOpen(false);
    setEditandoMeta(null);
  };

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFormChange = (field) => (event) => {
    setFormMeta(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const salvarMeta = async (event) => {
    event.preventDefault();
    if (!podeGerenciarMetas) {
      exibirSnackbar('Você não tem permissão para gerenciar metas.', 'error');
      return;
    }

    const payload = {
      descricao: formMeta.descricao?.trim() || null,
      valor: formMeta.valor,
      dataInicio: formMeta.dataInicio || null,
      dataFim: formMeta.dataFim || null
    };

    const endpoint = editandoMeta ? `${API_URL}/metas/${editandoMeta.id}` : `${API_URL}/metas`;
    const method = editandoMeta ? 'PUT' : 'POST';

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
      if (!response.ok || data.sucesso === false) {
        throw new Error(data?.mensagem || 'Erro ao salvar meta');
      }

      exibirSnackbar(editandoMeta ? 'Meta atualizada com sucesso.' : 'Meta criada com sucesso.');
      fecharDialog();
      carregarMetas();
    } catch (error) {
      console.error('❌ Erro ao salvar meta:', error);
      exibirSnackbar(error.message || 'Falha ao salvar meta', 'error');
    }
  };

  const deletarMeta = async (meta) => {
    if (!podeGerenciarMetas) {
      exibirSnackbar('Você não tem permissão para gerenciar metas.', 'error');
      return;
    }

    const confirmar = window.confirm(`Deseja remover a meta iniciada em ${formatDate(meta.dataInicio)}?`);
    if (!confirmar) return;

    try {
      const response = await fetch(`${API_URL}/metas/${meta.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = await response.json();
      if (!response.ok || data.sucesso === false) {
        throw new Error(data?.mensagem || 'Erro ao remover meta');
      }

      exibirSnackbar('Meta removida com sucesso.');
      carregarMetas();
    } catch (error) {
      console.error('❌ Erro ao remover meta:', error);
      exibirSnackbar(error.message || 'Falha ao remover meta', 'error');
    }
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock title="Metas de Vendas" icon="ion-ios-flag" desc="Cadastre e acompanhe as metas de vendas para o dashboard.">
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={2} gap={2}>
          <Typography variant="h6">Metas Registradas</Typography>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={carregarMetas}
              disabled={loading}
            >
              Atualizar
            </Button>
            {podeGerenciarMetas && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={abrirDialogNovaMeta}
              >
                Nova Meta
              </Button>
            )}
          </Box>
        </Box>

        <Paper elevation={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Data Início</TableCell>
                  <TableCell>Data Fim</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && metas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Nenhuma meta registrada.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && metasPaginadas.map(meta => (
                  <TableRow key={meta.id} hover>
                    <TableCell>{meta.descricao || '—'}</TableCell>
                    <TableCell>{formatCurrency(meta.valor)}</TableCell>
                    <TableCell>{formatDate(meta.dataInicio)}</TableCell>
                    <TableCell>{formatDate(meta.dataFim)}</TableCell>
                    <TableCell align="right">
                      {podeGerenciarMetas && (
                        <>
                          <IconButton color="primary" onClick={() => abrirDialogEditar(meta)} size="large">
                            <EditIcon />
                          </IconButton>
                          <IconButton color="error" onClick={() => deletarMeta(meta)} size="large">
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={metas.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage === -1 ? metas.length || 1 : rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, { label: 'Todos', value: -1 }]}
            labelRowsPerPage="Registros por página"
          />
        </Paper>
      </PapperBlock>

      <Dialog open={dialogOpen} onClose={fecharDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editandoMeta ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
        <form onSubmit={salvarMeta}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Descrição"
                  fullWidth
                  value={formMeta.descricao}
                  onChange={handleFormChange('descricao')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Valor (R$)"
                  type="number"
                  inputProps={{ step: '0.01', min: '0' }}
                  fullWidth
                  required
                  value={formMeta.valor}
                  onChange={handleFormChange('valor')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Data Início"
                  type="date"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={formMeta.dataInicio}
                  onChange={handleFormChange('dataInicio')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Data Fim"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={formMeta.dataFim}
                  onChange={handleFormChange('dataFim')}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={fecharDialog}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Salvar</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={fecharSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={fecharSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default Metas;
