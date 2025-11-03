import React, { useEffect, useMemo, useState } from 'react';
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
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TablePagination,
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
  TableSortLabel,
  InputAdornment
} from '@mui/material';
import { Add as AddIcon, Visibility as VisibilityIcon, Refresh as RefreshIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT',
  'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const getToken = () => localStorage.getItem('token');

function Clientes() {
  const title = `${brand.name} - Clientes`;
  const description = 'Gestão de clientes e suas cotas';

  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('totalCotas');
  const [order, setOrder] = useState('desc');
  const [openClienteDialog, setOpenClienteDialog] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [clienteForm, setClienteForm] = useState({
    nome: '',
    cpf: '',
    cidade: '',
    estado: '',
    dtnascimento: '',
    profissao: '',
    celular: '',
    email: ''
  });

  const [openDetalhes, setOpenDetalhes] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [cotas, setCotas] = useState([]);
  const [loadingCotas, setLoadingCotas] = useState(false);
  const [cotasPage, setCotasPage] = useState(0);
  const [cotasRowsPerPage, setCotasRowsPerPage] = useState(5);

  const [consultores, setConsultores] = useState([]);
  const [openCotaDialog, setOpenCotaDialog] = useState(false);
  const [cotaEditando, setCotaEditando] = useState(null);
  const [cotaForm, setCotaForm] = useState({
    grupo: '',
    cota: '',
    valor: '',
    valorTotal: '',
    dtaquisicao: '',
    administradora: '',
    consultorId: '',
    idagendor: ''
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const resetClienteForm = () => {
    setClienteForm({
      nome: '',
      cpf: '',
      cidade: '',
      estado: '',
      dtnascimento: '',
      profissao: '',
      celular: '',
      email: ''
    });
  };

  const resetCotaForm = () => {
    setCotaForm({
      grupo: '',
      cota: '',
      valor: '',
      valorTotal: '',
      dtaquisicao: '',
      administradora: '',
      consultorId: '',
      idagendor: ''
    });
  };

  const formatDateForInput = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  };

  const toNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    if (typeof value === 'number') {
      return Number.isNaN(value) ? null : value;
    }
    const digits = sanitizeDigits(value);
    if (!digits) return null;
    const number = Number(digits) / 100;
    return Number.isNaN(number) ? null : number;
  };

  const sanitizeDigits = (value = '') => {
    if (value === null || value === undefined) return '';
    return value.toString().replace(/\D/g, '');
  };

  const formatCpf = (value = '') => {
    const digits = sanitizeDigits(value).slice(0, 11);
    if (!digits) return '';
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (value = '') => {
    const digits = sanitizeDigits(value).slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const formatCurrencyDisplay = (digits = '') => {
    const sanitized = sanitizeDigits(digits);
    if (!sanitized) return '';
    const number = Number(sanitized) / 100;
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const toCurrencyDigits = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const number = Number(value);
    if (Number.isNaN(number)) return '';
    return Math.round(number * 100).toString();
  };

  useEffect(() => {
    loadClientes();
    loadConsultores();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, clientes, orderBy, order]);

  useEffect(() => {
    setCotasPage(0);
  }, [cotas]);

  const loadClientes = async () => {
    setLoadingClientes(true);
    let normalizados = [];
    try {
      const response = await fetch(`${API_URL}/clientes`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) throw new Error('Erro ao carregar clientes');
      const data = await response.json();
      normalizados = (data?.dados || []).map(cliente => ({
        ...cliente,
        totalCotas: Number(cliente.totalCotas ?? 0)
      }));
      setClientes(normalizados);
    } catch (error) {
      showSnackbar('Não foi possível carregar os clientes', 'error');
    } finally {
      setLoadingClientes(false);
    }
    return normalizados;
  };

  const loadConsultores = async () => {
    try {
      const response = await fetch(`${API_URL}/consultor`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) throw new Error('Erro ao carregar consultores');
      const data = await response.json();
      setConsultores(data || []);
    } catch (error) {
      showSnackbar('Falha ao carregar consultores', 'error');
    }
  };

  const loadCotas = async (clienteId) => {
    setLoadingCotas(true);
    let lista = [];
    try {
      const response = await fetch(`${API_URL}/cotas/cliente/${clienteId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) throw new Error('Erro ao carregar cotas');
      const data = await response.json();
      lista = Array.isArray(data) ? data : [];
      setCotas(lista);
      setSelectedCliente(prev => (prev ? { ...prev, totalCotas: lista.length } : prev));
    } catch (error) {
      showSnackbar('Não foi possível carregar as cotas do cliente', 'error');
      setCotas([]);
      setSelectedCliente(prev => (prev ? { ...prev, totalCotas: 0 } : prev));
    } finally {
      setLoadingCotas(false);
    }
    return lista;
  };

  const handleOpenClienteDialog = () => {
    resetClienteForm();
    setClienteEditando(null);
    setOpenClienteDialog(true);
  };

  const handleEditCliente = (cliente) => {
    setClienteEditando(cliente);
    setClienteForm({
      nome: cliente.nome || '',
      cpf: formatCpf(cliente.cpf),
      cidade: cliente.cidade || '',
      estado: cliente.estado || '',
      dtnascimento: formatDateForInput(cliente.dtnascimento),
      profissao: cliente.profissao || '',
      celular: formatPhone(cliente.celular),
      email: cliente.email || ''
    });
    setOpenClienteDialog(true);
  };

  const handleCloseClienteDialog = () => {
    setOpenClienteDialog(false);
    setClienteEditando(null);
    resetClienteForm();
  };

  const handleOpenDetalhes = (cliente) => {
    const atualizado = clientes.find(c => c.id === cliente.id) || cliente;
    setSelectedCliente(atualizado);
    setOpenDetalhes(true);
    loadCotas(atualizado.id);
  };

  const handleCloseDetalhes = () => {
    setOpenDetalhes(false);
    setSelectedCliente(null);
    setCotas([]);
    setCotaEditando(null);
    setOpenCotaDialog(false);
    resetCotaForm();
  };

  const handleSubmitCliente = async (event) => {
    event.preventDefault();
    const emEdicao = Boolean(clienteEditando);
    const endpoint = emEdicao ? `${API_URL}/clientes/${clienteEditando.id}` : `${API_URL}/clientes`;
    const metodo = emEdicao ? 'PUT' : 'POST';
    const mensagemSucesso = emEdicao ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso';

    try {
      const payload = {
        ...clienteForm,
        cpf: sanitizeDigits(clienteForm.cpf),
        celular: sanitizeDigits(clienteForm.celular),
        dtnascimento: clienteForm.dtnascimento ? new Date(`${clienteForm.dtnascimento}T00:00:00`).toISOString() : null
      };

      const response = await fetch(endpoint, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.erro || data?.mensagem || 'Erro ao salvar cliente');
      }

      const listaAtualizada = await loadClientes();
      setSelectedCliente(prev => {
        if (!prev) return prev;
        const encontrado = listaAtualizada.find(c => c.id === prev.id);
        return encontrado || prev;
      });

      showSnackbar(mensagemSucesso);
      handleCloseClienteDialog();
    } catch (error) {
      console.error('❌ Erro ao salvar cliente:', error);
      showSnackbar(error.message || 'Falha ao salvar cliente', 'error');
    }
  };

  const handleDeleteCliente = async (cliente) => {
    const confirmar = window.confirm(`Deseja remover o cliente ${cliente.nome}?`);
    if (!confirmar) return;

    try {
      const response = await fetch(`${API_URL}/clientes/${cliente.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.erro || data?.mensagem || 'Erro ao remover cliente');
      }

      await loadClientes();
      if (selectedCliente?.id === cliente.id) {
        handleCloseDetalhes();
      }
      showSnackbar('Cliente removido com sucesso');
    } catch (error) {
      console.error('❌ Erro ao remover cliente:', error);
      showSnackbar(error.message || 'Falha ao remover cliente', 'error');
    }
  };

  const handleConsultorChange = (valorSelecionado) => {
    const consultor = consultores.find(c => String(c.id) === String(valorSelecionado));
    setCotaForm(prev => ({
      ...prev,
      consultorId: valorSelecionado,
      idagendor: consultor?.id_agendor || ''
    }));
  };

  const handleOpenNovaCota = () => {
    resetCotaForm();
    setCotaEditando(null);
    setOpenCotaDialog(true);
  };

  const handleEditCota = (cota) => {
    setCotaEditando(cota);
    setCotaForm({
      grupo: cota.grupo || '',
      cota: cota.cota || '',
      valor: toCurrencyDigits(cota.valor),
      valorTotal: toCurrencyDigits(cota.valorTotal),
      dtaquisicao: formatDateForInput(cota.dtaquisicao),
      administradora: cota.administradora || '',
      consultorId: cota.consultorId ? String(cota.consultorId) : '',
      idagendor: cota.idagendor || ''
    });
    setOpenCotaDialog(true);
  };

  const handleCloseCotaDialog = () => {
    setOpenCotaDialog(false);
    setCotaEditando(null);
    resetCotaForm();
  };

  const handleSubmitCota = async (event) => {
    event.preventDefault();
    if (!selectedCliente) return;

    const emEdicao = Boolean(cotaEditando);
    const endpoint = emEdicao ? `${API_URL}/cotas/${cotaEditando.id}` : `${API_URL}/cotas`;
    const metodo = emEdicao ? 'PUT' : 'POST';
    const mensagemSucesso = emEdicao ? 'Cota atualizada com sucesso' : 'Cota cadastrada com sucesso';

    try {
      const consultorId = cotaForm.consultorId ? Number(cotaForm.consultorId) : null;
      const payload = {
        grupo: cotaForm.grupo,
        cota: cotaForm.cota || null,
        valor: toNumberOrNull(cotaForm.valor),
        valorTotal: toNumberOrNull(cotaForm.valorTotal),
        dtaquisicao: cotaForm.dtaquisicao ? new Date(`${cotaForm.dtaquisicao}T00:00:00`).toISOString() : null,
        administradora: cotaForm.administradora,
        consultorId,
        idagendor: cotaForm.idagendor,
        clienteId: selectedCliente.id
      };

      const response = await fetch(endpoint, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.erro || data?.message || 'Erro ao salvar cota');
      }

      await loadCotas(selectedCliente.id);
      const listaAtualizada = await loadClientes();
      setSelectedCliente(prev => {
        if (!prev) return prev;
        const encontrado = listaAtualizada.find(c => c.id === prev.id);
        return encontrado || prev;
      });

      showSnackbar(mensagemSucesso);
      handleCloseCotaDialog();
    } catch (error) {
      console.error('❌ Erro ao salvar cota:', error);
      showSnackbar(error.message || 'Falha ao salvar cota', 'error');
    }
  };

  const handleDeleteCota = async (cota) => {
    if (!selectedCliente) return;
    const confirmar = window.confirm(`Deseja remover a cota ${cota.grupo}${cota.cota ? `/${cota.cota}` : ''}?`);
    if (!confirmar) return;

    try {
      const response = await fetch(`${API_URL}/cotas/${cota.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.erro || data?.message || 'Erro ao remover cota');
      }

      await loadCotas(selectedCliente.id);
      const listaAtualizada = await loadClientes();
      setSelectedCliente(prev => {
        if (!prev) return prev;
        const encontrado = listaAtualizada.find(c => c.id === prev.id);
        return encontrado || prev;
      });

      showSnackbar('Cota removida com sucesso');
    } catch (error) {
      console.error('❌ Erro ao remover cota:', error);
      showSnackbar(error.message || 'Falha ao remover cota', 'error');
    }
  };

  const clientesFiltradosOrdenados = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    const filtrados = termo
      ? clientes.filter(cliente => {
          const campos = [
            cliente.nome,
            cliente.email,
            cliente.celular,
            cliente.cpf,
            cliente.cidade,
            cliente.estado,
            cliente.totalCotas !== undefined && cliente.totalCotas !== null ? cliente.totalCotas.toString() : ''
          ].map(valor => (valor || '').toString().toLowerCase());
          return campos.some(valor => valor.includes(termo));
        })
      : clientes;
    const sorted = [...filtrados].sort((a, b) => {
      const normalizeString = (value) => (value || '').toString().toLowerCase();
      let valorA;
      let valorB;

      switch (orderBy) {
        case 'email':
          valorA = normalizeString(a.email);
          valorB = normalizeString(b.email);
          break;
        case 'celular':
          valorA = normalizeString(a.celular);
          valorB = normalizeString(b.celular);
          break;
        case 'cidade':
          valorA = normalizeString(a.cidade);
          valorB = normalizeString(b.cidade);
          break;
        case 'estado':
          valorA = normalizeString(a.estado);
          valorB = normalizeString(b.estado);
          break;
        case 'totalCotas':
          valorA = Number.isFinite(Number(a.totalCotas)) ? Number(a.totalCotas) : 0;
          valorB = Number.isFinite(Number(b.totalCotas)) ? Number(b.totalCotas) : 0;
          break;
        case 'nome':
        default:
          valorA = normalizeString(a.nome);
          valorB = normalizeString(b.nome);
          break;
      }

      let resultado;
      if (typeof valorA === 'number' && typeof valorB === 'number') {
        resultado = valorA - valorB;
      } else {
        resultado = valorA.localeCompare(valorB);
      }

      return order === 'asc' ? resultado : -resultado;
    });
    return sorted;
  }, [clientes, searchTerm, orderBy, order]);

  const clientesPaginados = useMemo(() => {
    const inicio = page * rowsPerPage;
    return clientesFiltradosOrdenados.slice(inicio, inicio + rowsPerPage);
  }, [clientesFiltradosOrdenados, page, rowsPerPage]);

  const cotasPaginadas = useMemo(() => {
    const inicio = cotasPage * cotasRowsPerPage;
    return cotas.slice(inicio, inicio + cotasRowsPerPage);
  }, [cotas, cotasPage, cotasRowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleCotasPageChange = (event, newPage) => {
    setCotasPage(newPage);
  };

  const handleCotasRowsPerPageChange = (event) => {
    setCotasRowsPerPage(parseInt(event.target.value, 10));
    setCotasPage(0);
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock title="Clientes" icon="ion-ios-people" desc="Gerencie clientes e suas cotas">
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={2} gap={2}>
          <Typography variant="h6">Lista de Clientes</Typography>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <TextField
              label="Pesquisar cliente"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              size="small"
            />
            <Button
              variant="outlined"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={loadClientes}
              disabled={loadingClientes}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenClienteDialog}
            >
              Novo Cliente
            </Button>
          </Box>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sortDirection={orderBy === 'nome' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'nome'}
                    direction={orderBy === 'nome' ? order : 'asc'}
                    onClick={() => handleRequestSort('nome')}
                  >
                    Nome
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'email' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'email'}
                    direction={orderBy === 'email' ? order : 'asc'}
                    onClick={() => handleRequestSort('email')}
                  >
                    Email
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'celular' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'celular'}
                    direction={orderBy === 'celular' ? order : 'asc'}
                    onClick={() => handleRequestSort('celular')}
                  >
                    Celular
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'cidade' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'cidade'}
                    direction={orderBy === 'cidade' ? order : 'asc'}
                    onClick={() => handleRequestSort('cidade')}
                  >
                    Cidade/UF
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center" sortDirection={orderBy === 'totalCotas' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'totalCotas'}
                    direction={orderBy === 'totalCotas' ? order : 'asc'}
                    onClick={() => handleRequestSort('totalCotas')}
                  >
                    Cotas
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingClientes ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : clientesFiltradosOrdenados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {searchTerm ? 'Nenhum cliente encontrado para a pesquisa atual.' : 'Nenhum cliente cadastrado.'}
                  </TableCell>
                </TableRow>
              ) : (
                clientesPaginados.map(cliente => (
                  <TableRow key={cliente.id} hover>
                    <TableCell>{cliente.nome}</TableCell>
                    <TableCell>{cliente.email}</TableCell>
                    <TableCell>{formatPhone(cliente.celular)}</TableCell>
                    <TableCell>
                      {cliente.cidade ? `${cliente.cidade}/${cliente.estado || '--'}` : '--'}
                    </TableCell>
                    <TableCell align="center">
                      {cliente.totalCotas ?? 0}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={1}>
                        <IconButton size="small" color="primary" onClick={() => handleOpenDetalhes(cliente)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="primary" onClick={() => handleEditCliente(cliente)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteCliente(cliente)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={clientesFiltradosOrdenados.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Linhas por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
          />
        </TableContainer>
      </PapperBlock>

      <Dialog
        open={openClienteDialog}
        onClose={handleCloseClienteDialog}
        fullWidth
        maxWidth="md"
      >
        <form onSubmit={handleSubmitCliente}>
          <DialogTitle>{clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nome"
                  value={clienteForm.nome}
                  onChange={e => setClienteForm(prev => ({ ...prev, nome: e.target.value }))}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="CPF"
                  value={clienteForm.cpf}
                  onChange={e => setClienteForm(prev => ({ ...prev, cpf: formatCpf(e.target.value) }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Celular"
                  value={clienteForm.celular}
                  onChange={e => setClienteForm(prev => ({ ...prev, celular: formatPhone(e.target.value) }))}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  type="email"
                  value={clienteForm.email}
                  onChange={e => setClienteForm(prev => ({ ...prev, email: e.target.value }))}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Cidade"
                  value={clienteForm.cidade}
                  onChange={e => setClienteForm(prev => ({ ...prev, cidade: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={clienteForm.estado}
                    label="Estado"
                    onChange={e => setClienteForm(prev => ({ ...prev, estado: e.target.value }))}
                  >
                    <MenuItem value="">
                      <em>Selecione</em>
                    </MenuItem>
                    {ESTADOS.map(estado => (
                      <MenuItem key={estado} value={estado}>{estado}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Data de Nascimento"
                  type="date"
                  value={clienteForm.dtnascimento}
                  onChange={e => setClienteForm(prev => ({ ...prev, dtnascimento: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Profissão"
                  value={clienteForm.profissao}
                  onChange={e => setClienteForm(prev => ({ ...prev, profissao: e.target.value }))}
                  fullWidth
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseClienteDialog}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">
              {clienteEditando ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={openDetalhes}
        onClose={handleCloseDetalhes}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Detalhes do Cliente</DialogTitle>
        <DialogContent dividers>
          {selectedCliente && (
            <Box mb={3}>
              <Typography variant="h6">{selectedCliente.nome}</Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedCliente.email} · {formatPhone(selectedCliente.celular)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                CPF: {formatCpf(selectedCliente.cpf) || '—'} · Nascimento: {selectedCliente.dtnascimento ? new Date(selectedCliente.dtnascimento).toLocaleDateString() : '—'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedCliente.cidade ? `${selectedCliente.cidade}/${selectedCliente.estado || '--'}` : 'Cidade não informada'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Profissão: {selectedCliente.profissao || '—'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total de Cotas: {selectedCliente.totalCotas ?? cotas.length}
              </Typography>
            </Box>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">Cotas do Cliente</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenNovaCota}
            >
              Nova Cota
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Grupo</TableCell>
                  <TableCell>Cota</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Valor Total</TableCell>
                  <TableCell>Data Aquisição</TableCell>
                  <TableCell>Administradora</TableCell>
                  <TableCell>Consultor</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingCotas ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : cotas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Nenhuma cota cadastrada para este cliente.
                    </TableCell>
                  </TableRow>
                ) : (
                  cotasPaginadas.map(cota => (
                    <TableRow key={cota.id}>
                      <TableCell>{cota.grupo}</TableCell>
                      <TableCell>{cota.cota || '—'}</TableCell>
                      <TableCell>
                        {cota.valor !== null && cota.valor !== undefined
                          ? Number(cota.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {cota.valorTotal !== null && cota.valorTotal !== undefined
                          ? Number(cota.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '—'}
                      </TableCell>
                      <TableCell>
                        {cota.dtaquisicao
                          ? new Date(cota.dtaquisicao).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell>{cota.administradora}</TableCell>
                      <TableCell>{cota.consultor?.nome || '—'}</TableCell>
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={1}>
                          <IconButton size="small" color="primary" onClick={() => handleEditCota(cota)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteCota(cota)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={cotas.length}
            page={cotasPage}
            onPageChange={handleCotasPageChange}
            rowsPerPage={cotasRowsPerPage}
            onRowsPerPageChange={handleCotasRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Linhas por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetalhes}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openCotaDialog}
        onClose={handleCloseCotaDialog}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmitCota}>
          <DialogTitle>{cotaEditando ? 'Editar Cota' : 'Nova Cota'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Grupo"
                  value={cotaForm.grupo}
                  onChange={e => setCotaForm(prev => ({ ...prev, grupo: e.target.value }))}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Cota"
                  value={cotaForm.cota}
                  onChange={e => setCotaForm(prev => ({ ...prev, cota: e.target.value }))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Valor"
                  value={formatCurrencyDisplay(cotaForm.valor)}
                  onChange={e => setCotaForm(prev => ({ ...prev, valor: sanitizeDigits(e.target.value) }))}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    inputMode: 'numeric'
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Valor Total"
                  value={formatCurrencyDisplay(cotaForm.valorTotal)}
                  onChange={e => setCotaForm(prev => ({ ...prev, valorTotal: sanitizeDigits(e.target.value) }))}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                    inputMode: 'numeric'
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Data de Aquisição"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={cotaForm.dtaquisicao}
                  onChange={e => setCotaForm(prev => ({ ...prev, dtaquisicao: e.target.value }))}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Administradora"
                  value={cotaForm.administradora}
                  onChange={e => setCotaForm(prev => ({ ...prev, administradora: e.target.value }))}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Consultor</InputLabel>
                  <Select
                    value={cotaForm.consultorId}
                    label="Consultor"
                    onChange={e => handleConsultorChange(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Não informado</em>
                    </MenuItem>
                    {consultores.map(consultor => (
                      <MenuItem key={consultor.id} value={consultor.id}>
                        {consultor.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ID Agendor"
                  value={cotaForm.idagendor}
                  onChange={e => setCotaForm(prev => ({ ...prev, idagendor: e.target.value }))}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCotaDialog}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">
              {cotaEditando ? 'Atualizar' : 'Salvar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

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

export default Clientes;
