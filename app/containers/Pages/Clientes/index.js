import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  EmojiEvents as EmojiEventsIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import { getStoredUser } from '../../../utils/userStorage';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT',
  'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const TIPOS_CONTEMPLACAO = [
  { value: 'LANCE_FIXO', label: 'Lance Fixo' },
  { value: 'LANCE_LIVRE', label: 'Lance Livre' },
  { value: 'SORTEIO', label: 'Sorteio' }
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
  const [cotaSearchTerm, setCotaSearchTerm] = useState('');
  const [openContemplacaoDialog, setOpenContemplacaoDialog] = useState(false);
  const [cotaSelecionadaParaContemplacao, setCotaSelecionadaParaContemplacao] = useState(null);
  const [contemplacaoForm, setContemplacaoForm] = useState({
    dataContemplacao: '',
    tipo: 'LANCE_LIVRE',
    observacao: ''
  });
  const [salvandoContemplacao, setSalvandoContemplacao] = useState(false);

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

  const [storedUser, setStoredUserState] = useState(() => getStoredUser());

  useEffect(() => {
    const handleUserUpdated = (event) => {
      const payload = event?.detail;
      if (payload) {
        setStoredUserState(payload);
      } else {
        setStoredUserState(getStoredUser());
      }
    };

    window.addEventListener('app:user-updated', handleUserUpdated);
    return () => window.removeEventListener('app:user-updated', handleUserUpdated);
  }, []);

  const permissoesUsuario = storedUser?.permissoes || [];
  const podeGerenciarClientes = permissoesUsuario.includes('CLIENTES_ALL') || permissoesUsuario.includes('GESTAO');

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

const formatDateBR = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
};

const formatTipoContemplacao = (tipo) => {
  const mapa = {
    LANCE_FIXO: 'Lance Fixo',
    LANCE_LIVRE: 'Lance Livre',
    SORTEIO: 'Sorteio',
    LANCE: 'Lance'
  };
  const chave = (tipo || '').toUpperCase();
  return mapa[chave] || tipo || '—';
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
    if (podeGerenciarClientes) {
      loadConsultores();
    } else {
      setConsultores([]);
    }
  }, [podeGerenciarClientes]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, clientes, orderBy, order]);

  useEffect(() => {
    setCotasPage(0);
  }, [cotas, cotaSearchTerm]);

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
    if (!podeGerenciarClientes) {
      setConsultores([]);
      return;
    }
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
      setCotaSearchTerm('');
      setCotasPage(0);
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
    if (!podeGerenciarClientes) {
      showSnackbar('Você não tem permissão para cadastrar clientes.', 'error');
      return;
    }
    resetClienteForm();
    setClienteEditando(null);
    setOpenClienteDialog(true);
  };

  const handleEditCliente = (cliente) => {
    if (!podeGerenciarClientes) {
      showSnackbar('Você não tem permissão para editar clientes.', 'error');
      return;
    }
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
     setCotaSearchTerm('');
    setCotaEditando(null);
    setOpenCotaDialog(false);
    resetCotaForm();
  };

  const handleSubmitCliente = async (event) => {
    event.preventDefault();
    if (!podeGerenciarClientes) {
      showSnackbar('Você não tem permissão para salvar clientes.', 'error');
      return;
    }
    const emEdicao = Boolean(clienteEditando);
    const endpoint = emEdicao ? `${API_URL}/clientes/${clienteEditando.id}` : `${API_URL}/clientes`;
    const metodo = emEdicao ? 'PUT' : 'POST';
    const mensagemSucesso = emEdicao ? 'Cliente atualizado com sucesso' : 'Cliente cadastrado com sucesso';

    try {
      const cpfSanitizado = sanitizeDigits(clienteForm.cpf);
      const celularSanitizado = sanitizeDigits(clienteForm.celular);
      const emailTrimmed = (clienteForm.email || '').trim();
      const emailLower = emailTrimmed.toLowerCase();

      const duplicado = clientes.some(cliente => {
        if (emEdicao && cliente.id === clienteEditando.id) {
          return false;
        }

        const cpfExistente = sanitizeDigits(cliente.cpf);
        const emailExistente = (cliente.email || '').trim().toLowerCase();

        const mesmoCpf = cpfSanitizado && cpfExistente && cpfExistente === cpfSanitizado;
        const mesmoEmail = emailLower && emailExistente === emailLower;

        return mesmoCpf || mesmoEmail;
      });

      if (duplicado) {
        showSnackbar('Já existe um cliente cadastrado com este CPF ou e-mail.', 'error');
        return;
      }

      const payload = {
        ...clienteForm,
        nome: (clienteForm.nome || '').trim(),
        cpf: cpfSanitizado || null,
        celular: celularSanitizado,
        email: emailTrimmed,
        profissao: (clienteForm.profissao || '').trim(),
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
    if (!podeGerenciarClientes) {
      showSnackbar('Você não tem permissão para remover clientes.', 'error');
      return;
    }
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
    if (!podeGerenciarClientes) {
      showSnackbar('Você não tem permissão para cadastrar cotas.', 'error');
      return;
    }
    resetCotaForm();
    setCotaEditando(null);
    setOpenCotaDialog(true);
  };

  const handleEditCota = (cota) => {
    if (!podeGerenciarClientes) {
      showSnackbar('Você não tem permissão para editar cotas.', 'error');
      return;
    }
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
    if (!podeGerenciarClientes) {
      showSnackbar('Você não tem permissão para salvar cotas.', 'error');
      return;
    }

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

  const handleOpenContemplacaoDialog = (cota) => {
    if (!podeGerenciarClientes) {
      showSnackbar('Você não tem permissão para contemplar cotas.', 'error');
      return;
    }
    const defaultDate = cota.contemplacao?.dataContemplacao || new Date().toISOString().slice(0, 10);
    setCotaSelecionadaParaContemplacao(cota);
    setContemplacaoForm({
      dataContemplacao: formatDateForInput(defaultDate),
      tipo: cota.contemplacao?.tipo || 'LANCE_LIVRE',
      observacao: cota.contemplacao?.observacao || ''
    });
    setOpenContemplacaoDialog(true);
  };

  const handleCloseContemplacaoDialog = () => {
    setOpenContemplacaoDialog(false);
    setCotaSelecionadaParaContemplacao(null);
    setContemplacaoForm({
      dataContemplacao: '',
      tipo: 'LANCE_LIVRE',
      observacao: ''
    });
    setSalvandoContemplacao(false);
  };

  const handleSubmitContemplacao = async (event) => {
    event.preventDefault();
    if (!selectedCliente || !cotaSelecionadaParaContemplacao) return;
    if (!contemplacaoForm.dataContemplacao) {
      showSnackbar('Informe a data de contemplação.', 'error');
      return;
    }
    setSalvandoContemplacao(true);
    try {
      const response = await fetch(`${API_URL}/cotas/${cotaSelecionadaParaContemplacao.id}/contemplacao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          dataContemplacao: contemplacaoForm.dataContemplacao,
          tipo: contemplacaoForm.tipo,
          observacao: contemplacaoForm.observacao || null
        })
      });
      const data = await response.json();
      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.mensagem || 'Erro ao salvar contemplação.');
      }
      showSnackbar('Contemplação registrada com sucesso.');
      await loadCotas(selectedCliente.id);
      handleCloseContemplacaoDialog();
    } catch (error) {
      console.error('❌ Erro ao registrar contemplação:', error);
      showSnackbar(error.message || 'Falha ao registrar contemplação.', 'error');
    } finally {
      setSalvandoContemplacao(false);
    }
  };

  const handleRemoverContemplacao = async () => {
    if (!selectedCliente || !cotaSelecionadaParaContemplacao?.contemplacao) {
      return;
    }
    setSalvandoContemplacao(true);
    try {
      const response = await fetch(`${API_URL}/cotas/${cotaSelecionadaParaContemplacao.id}/contemplacao`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      const data = await response.json();
      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.mensagem || 'Erro ao remover contemplação.');
      }
      showSnackbar('Contemplação removida com sucesso.');
      await loadCotas(selectedCliente.id);
      handleCloseContemplacaoDialog();
    } catch (error) {
      console.error('❌ Erro ao remover contemplação:', error);
      showSnackbar(error.message || 'Falha ao remover contemplação.', 'error');
    } finally {
      setSalvandoContemplacao(false);
    }
  };

  const handleDeleteCota = async (cota) => {
    if (!podeGerenciarClientes) {
      showSnackbar('Você não tem permissão para remover cotas.', 'error');
      return;
    }
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

  const cotasFiltradas = useMemo(() => {
    if (!cotaSearchTerm.trim()) return cotas;
    const termo = cotaSearchTerm.trim().toLowerCase();
    return cotas.filter(cota => {
      const campos = [
        cota.grupo,
        cota.cota,
        cota.administradora
      ].map(valor => (valor || '').toString().toLowerCase());
      return campos.some(valor => valor.includes(termo));
    });
  }, [cotas, cotaSearchTerm]);

  const cotasPaginadas = useMemo(() => {
    const inicio = cotasPage * cotasRowsPerPage;
    return cotasFiltradas.slice(inicio, inicio + cotasRowsPerPage);
  }, [cotasFiltradas, cotasPage, cotasRowsPerPage]);

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
            {podeGerenciarClientes && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenClienteDialog}
              >
                Novo Cliente
              </Button>
            )}
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
                    <TableCell>{formatPhone(cliente.celular)}</TableCell>
                    <TableCell>
                      {cliente.cidade ? `${cliente.cidade}/${cliente.estado || '--'}` : '--'}
                    </TableCell>
                    <TableCell align="center">
                      {Number(cliente.totalCotas ?? 0)}
                    </TableCell>
                    <TableCell align="center">
                      <Box display="flex" justifyContent="center" gap={1}>
                        <IconButton size="small" color="primary" onClick={() => handleOpenDetalhes(cliente)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        {podeGerenciarClientes && (
                          <IconButton size="small" color="primary" onClick={() => handleEditCliente(cliente)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        {podeGerenciarClientes && (
                          <IconButton size="small" color="error" onClick={() => handleDeleteCliente(cliente)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
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

          <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5} mb={2}>
            <Typography variant="subtitle1">Cotas do Cliente</Typography>
            <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
              <TextField
                size="small"
                label="Buscar cota/grupo"
                value={cotaSearchTerm}
                onChange={e => setCotaSearchTerm(e.target.value)}
                placeholder="Digite o grupo ou cota"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
              />
              {podeGerenciarClientes && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleOpenNovaCota}
                >
                  Nova Cota
                </Button>
              )}
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Grupo</TableCell>
                  <TableCell>Cota</TableCell>
                  <TableCell>Valor Líquido</TableCell>
                  <TableCell>Valor Bruto</TableCell>
                  <TableCell>Data Aquisição</TableCell>
                  <TableCell>Administradora</TableCell>
                  <TableCell>Consultor</TableCell>
                  <TableCell>Contemplação</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingCotas ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : cotasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      Nenhuma cota encontrada com o critério informado.
                    </TableCell>
                  </TableRow>
                ) : (
                  cotasPaginadas.map(cota => (
                    <TableRow
                      key={cota.id}
                      sx={{
                        backgroundColor: cota.contemplacao ? 'rgba(34,197,94,0.08)' : 'inherit'
                      }}
                    >
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
                      <TableCell>
                        {cota.contemplacao ? (
                          <Chip
                            size="small"
                            color="success"
                            icon={<EmojiEventsIcon fontSize="small" />}
                            label={`${formatTipoContemplacao(cota.contemplacao.tipo)} · ${formatDateBR(cota.contemplacao.dataContemplacao)}`}
                          />
                        ) : (
                          <Chip size="small" variant="outlined" label="Não contemplada" />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {podeGerenciarClientes ? (
                          <Box display="flex" justifyContent="center" gap={1}>
                            <Tooltip title={cota.contemplacao ? 'Editar contemplação' : 'Marcar como contemplada'}>
                              <IconButton size="small" color={cota.contemplacao ? 'success' : 'default'} onClick={() => handleOpenContemplacaoDialog(cota)}>
                                <EmojiEventsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <IconButton size="small" color="primary" onClick={() => handleEditCota(cota)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteCota(cota)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={cotasFiltradas.length}
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
                  label="Valor Bruto"
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

      <Dialog
        open={openContemplacaoDialog}
        onClose={handleCloseContemplacaoDialog}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmitContemplacao}>
          <DialogTitle>
            {cotaSelecionadaParaContemplacao?.contemplacao ? 'Editar Contemplação' : 'Registrar Contemplação'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  {cotaSelecionadaParaContemplacao?.grupo || 'Grupo —'} · {cotaSelecionadaParaContemplacao?.cota || 'Cota —'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Data de contemplação"
                  type="date"
                  value={contemplacaoForm.dataContemplacao}
                  onChange={e => setContemplacaoForm(prev => ({ ...prev, dataContemplacao: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Tipo</InputLabel>
                  <Select
                    label="Tipo"
                    value={contemplacaoForm.tipo}
                    onChange={e => setContemplacaoForm(prev => ({ ...prev, tipo: e.target.value }))}
                  >
                    {TIPOS_CONTEMPLACAO.map(tipo => (
                      <MenuItem key={tipo.value} value={tipo.value}>{tipo.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Observação"
                  value={contemplacaoForm.observacao}
                  onChange={e => setContemplacaoForm(prev => ({ ...prev, observacao: e.target.value }))}
                  fullWidth
                  multiline
                  minRows={2}
                  placeholder="Detalhes adicionais sobre a contemplação (opcional)"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            {cotaSelecionadaParaContemplacao?.contemplacao && (
              <Button color="error" disabled={salvandoContemplacao} onClick={handleRemoverContemplacao}>
                Remover marcação
              </Button>
            )}
            <Button onClick={handleCloseContemplacaoDialog} disabled={salvandoContemplacao}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={salvandoContemplacao}>
              {salvandoContemplacao ? 'Salvando...' : 'Salvar'}
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
