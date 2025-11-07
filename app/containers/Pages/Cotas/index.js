import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Typography
} from '@mui/material';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import { getStoredUser } from '../../../utils/userStorage';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const getToken = () => localStorage.getItem('token');

const MESES = [
  { value: '', label: 'Todos os meses' },
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

const initialFilters = {
  cliente: '',
  consultor: '',
  mes: '',
  ano: '',
  administradora: '',
  tipoContemplacao: '',
  grupo: '',
  cota: '',
  somenteContempladas: ''
};

const TIPOS_CONTEMPLACAO = [
  { value: '', label: 'Todos os tipos' },
  { value: 'LANCE_FIXO', label: 'Lance Fixo' },
  { value: 'LANCE_LIVRE', label: 'Lance Livre' },
  { value: 'SORTEIO', label: 'Sorteio' }
];



function formatCurrency(value) {
  if (value === null || value === undefined) return 'R$ 0,00';
  const numero = Number(value);
  if (Number.isNaN(numero)) return 'R$ 0,00';
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '—';
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR');
}

function formatTipoContemplacao(tipo) {
  const normalized = (tipo || '').toUpperCase();
  if (normalized === 'LANCE_FIXO') return 'Lance Fixo';
  if (normalized === 'LANCE_LIVRE' || normalized === 'LANCE') return 'Lance Livre';
  if (normalized === 'SORTEIO') return 'Sorteio';
  return tipo || '—';
}

function CotasPage() {
  const title = `${brand.name} - Cotas`;
  const description = 'Listagem geral de cotas com filtros e paginação.';

  const [storedUser, setStoredUserState] = useState(() => getStoredUser());
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [consultores, setConsultores] = useState([]);
  const [cotas, setCotas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalValor, setTotalValor] = useState(0);
  const [totalValorLiquido, setTotalValorLiquido] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [orderBy, setOrderBy] = useState('dtaquisicao');
  const [order, setOrder] = useState('desc');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openContemplacaoDialog, setOpenContemplacaoDialog] = useState(false);
  const [cotaSelecionada, setCotaSelecionada] = useState(null);
  const [contemplacaoForm, setContemplacaoForm] = useState({
    dataContemplacao: '',
    tipo: 'LANCE_LIVRE',
    observacao: ''
  });
  const [salvandoContemplacao, setSalvandoContemplacao] = useState(false);
 

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

  const perfilUsuario = storedUser?.perfil?.toUpperCase() || '';
  const isConsultorPerfil = perfilUsuario === 'CONSULTOR';
  const consultorIdLogado = storedUser?.consultorId ? String(storedUser.consultorId) : '';
  const permissoesUsuario = storedUser?.permissoes?.map(p => p.toUpperCase()) || [];
  const podeGerirContemplacao = perfilUsuario === 'ADMIN'
    || permissoesUsuario.includes('GESTAO')
    || permissoesUsuario.includes('CLIENTES_ALL');

  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const carregarConsultores = useCallback(async () => {
    if (isConsultorPerfil) {
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

      if (!response.ok) {
        throw new Error('Erro ao carregar consultores');
      }

      const data = await response.json();
      setConsultores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Erro ao carregar consultores:', error);
      showSnackbar('Não foi possível carregar os consultores', 'error');
      setConsultores([]);
    }
  }, [isConsultorPerfil, showSnackbar]);

  useEffect(() => {
    carregarConsultores();
  }, [carregarConsultores]);

  useEffect(() => {
    if (!isConsultorPerfil || !consultorIdLogado) {
      return;
    }

    setFilters(prev => (prev.consultor === consultorIdLogado
      ? prev
      : { ...prev, consultor: consultorIdLogado }));

    setAppliedFilters(prev => (prev.consultor === consultorIdLogado
      ? prev
      : { ...prev, consultor: consultorIdLogado }));
  }, [isConsultorPerfil, consultorIdLogado]);

  const sortLista = useCallback((dados, coluna, direcao) => {
    const lista = [...dados];

    const getValue = (item) => {
      switch (coluna) {
        case 'cliente':
          return (item.cliente?.nome || '').toString().toLowerCase();
        case 'consultor':
          return (item.consultor?.nome || '').toString().toLowerCase();
        case 'grupo':
          return (item.grupo || '').toString().toLowerCase();
        case 'cota':
          return (item.cota || '').toString().toLowerCase();
        case 'administradora':
          return (item.administradora || '').toString().toLowerCase();
        case 'valor':
          return Number(item.valor ?? 0);
        case 'valorTotal':
          return Number(item.valorTotal ?? 0);
        case 'dtaquisicao': {
          const data = item.dtaquisicao ? new Date(item.dtaquisicao) : null;
          return data ? data.getTime() : 0;
        }
        default:
          return 0;
      }
    };

    lista.sort((a, b) => {
      const valorA = getValue(a);
      const valorB = getValue(b);

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return direcao === 'asc' ? valorA - valorB : valorB - valorA;
      }

      return direcao === 'asc'
        ? valorA.localeCompare(valorB)
        : valorB.localeCompare(valorA);
    });

    return lista;
  }, []);

  const fetchCotas = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', (page || 0) + 1);
      params.append('limit', rowsPerPage === -1 ? -1 : rowsPerPage);
      params.append('orderBy', orderBy);
      params.append('order', order);

      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      params.append('orderBy', orderBy);
      params.append('order', order);

      if (isConsultorPerfil && consultorIdLogado) {
        params.set('consultor', consultorIdLogado);
      }

      const response = await fetch(`${API_URL}/cotas/buscar?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = await response.json();

      if (!response.ok || data.sucesso === false) {
        throw new Error(data?.mensagem || data?.erro || 'Erro ao carregar cotas');
      }

      const lista = Array.isArray(data?.dados) ? data.dados : [];
      const ordenada = sortLista(lista, orderBy, order);
      setCotas(ordenada);
      setTotal(Number.isFinite(Number(data?.total)) ? Number(data.total) : lista.length);
      setTotalValor(Number.isFinite(Number(data?.somaValor)) ? Number(data.somaValor) : lista.reduce((acc, cota) => acc + (Number(cota.valor ?? 0) || 0), 0));
      setTotalValorLiquido(
        Number.isFinite(Number(data?.somaValorTotal))
          ? Number(data.somaValorTotal)
          : lista.reduce((acc, cota) => acc + (Number(cota.valorTotal ?? 0) || 0), 0)
      );
    } catch (error) {
      console.error('❌ Erro ao buscar cotas:', error);
      setCotas([]);
      setTotal(0);
      setTotalValor(0);
      setTotalValorLiquido(0);
      showSnackbar(error.message || 'Não foi possível carregar as cotas', 'error');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, rowsPerPage, orderBy, order, showSnackbar, sortLista]);

  useEffect(() => {
    fetchCotas();
  }, [fetchCotas]);

  const handleFilterChange = (field) => (event) => {
    const value = event.target.value;
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    setAppliedFilters(filters);
    setPage(0);
  };

  const handleClear = () => {
    const baseFilters = isConsultorPerfil && consultorIdLogado
      ? { ...initialFilters, consultor: consultorIdLogado }
      : initialFilters;

    setFilters(baseFilters);
    setAppliedFilters(baseFilters);
    setPage(0);
    setRowsPerPage(10);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const value = Number.parseInt(event.target.value, 10);
    setRowsPerPage(value);
    setPage(0);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };


  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });

      if (isConsultorPerfil && consultorIdLogado) {
        params.set('consultor', consultorIdLogado);
      }

      const queryString = params.toString();
      const url = `${API_URL}/cotas/exportar${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.mensagem || payload?.erro || 'Falha ao exportar cotas');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const matchFilename = contentDisposition.match(/filename="?(.*?)"?$/);
      const filename = matchFilename ? matchFilename[1] : 'cotas.csv';

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('❌ Erro ao exportar cotas:', error);
      showSnackbar(error.message || 'Não foi possível exportar as cotas', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenContemplacaoCotaGeral = (cota) => {
    if (!podeGerirContemplacao) {
      showSnackbar('Você não tem permissão para contemplar cotas.', 'error');
      return;
    }
    const defaultDate = cota.contemplacao?.dataContemplacao || new Date().toISOString().slice(0, 10);
    setCotaSelecionada(cota);
    setContemplacaoForm({
      dataContemplacao: defaultDate,
      tipo: cota.contemplacao?.tipo || 'LANCE_LIVRE',
      observacao: cota.contemplacao?.observacao || ''
    });
    setOpenContemplacaoDialog(true);
  };

  const handleCloseContemplacaoDialog = () => {
    setOpenContemplacaoDialog(false);
    setCotaSelecionada(null);
    setContemplacaoForm({
      dataContemplacao: '',
      tipo: 'LANCE_LIVRE',
      observacao: ''
    });
    setSalvandoContemplacao(false);
  };

  const handleSubmitContemplacao = async (event) => {
    event.preventDefault();
    if (!cotaSelecionada) return;
    if (!contemplacaoForm.dataContemplacao) {
      showSnackbar('Informe a data de contemplação.', 'error');
      return;
    }
    setSalvandoContemplacao(true);
    try {
      const response = await fetch(`${API_URL}/cotas/${cotaSelecionada.id}/contemplacao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(contemplacaoForm)
      });
      const data = await response.json();
      if (!response.ok || data?.sucesso === false) {
        throw new Error(data?.mensagem || 'Erro ao registrar contemplação.');
      }
      showSnackbar('Contemplação registrada com sucesso.');
      fetchCotas();
      handleCloseContemplacaoDialog();
    } catch (error) {
      console.error('❌ Erro ao registrar contemplação:', error);
      showSnackbar(error.message || 'Falha ao registrar contemplação.', 'error');
    } finally {
      setSalvandoContemplacao(false);
    }
  };

  const handleRemoverContemplacao = async () => {
    if (!cotaSelecionada?.contemplacao) return;
    setSalvandoContemplacao(true);
    try {
      const response = await fetch(`${API_URL}/cotas/${cotaSelecionada.id}/contemplacao`, {
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
      fetchCotas();
      handleCloseContemplacaoDialog();
    } catch (error) {
      console.error('❌ Erro ao remover contemplação:', error);
      showSnackbar(error.message || 'Falha ao remover contemplação.', 'error');
    } finally {
      setSalvandoContemplacao(false);
    }
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock title="Cotas" icon="ion-ios-list" desc="Visualize todas as cotas cadastradas com filtros avançados.">
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4} lg={3}>
            <TextField
              label="Cliente"
              value={filters.cliente}
              onChange={handleFilterChange('cliente')}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={4} lg={3}>
            <FormControl fullWidth disabled={isConsultorPerfil}>
              <InputLabel>Consultor</InputLabel>
              <Select
                value={isConsultorPerfil ? '' : filters.consultor}
                onChange={handleFilterChange('consultor')}
                label="Consultor"
                disabled={isConsultorPerfil}
              >
                <MenuItem value="">Todos</MenuItem>
                {consultores.map(consultor => (
                  <MenuItem key={consultor.id} value={consultor.id}>{consultor.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2} lg={2}>
            <FormControl fullWidth>
              <InputLabel>Mês</InputLabel>
              <Select
                value={filters.mes}
                onChange={handleFilterChange('mes')}
                label="Mês"
              >
                {MESES.map(mes => (
                  <MenuItem key={mes.value || 'todos'} value={mes.value}>{mes.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2} lg={2}>
            <TextField
              label="Ano"
              type="number"
              value={filters.ano}
              onChange={handleFilterChange('ano')}
              fullWidth
              inputProps={{ min: 2000, max: 2100 }}
            />
          </Grid>

         <Grid item xs={12} md={4} lg={2}>
           <TextField
             label="Administradora"
             value={filters.administradora}
             onChange={handleFilterChange('administradora')}
             fullWidth
           />
         </Grid>

          <Grid item xs={12} md={4} lg={2}>
            <TextField
              label="Grupo"
              value={filters.grupo}
              onChange={handleFilterChange('grupo')}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={4} lg={2}>
            <TextField
              label="Cota"
              value={filters.cota}
              onChange={handleFilterChange('cota')}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={4} lg={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Contemplação</InputLabel>
              <Select
                value={filters.tipoContemplacao}
                onChange={handleFilterChange('tipoContemplacao')}
                label="Tipo de Contemplação"
              >
                {TIPOS_CONTEMPLACAO.map(tipo => (
                  <MenuItem key={tipo.value || 'todos'} value={tipo.value}>{tipo.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4} lg={3}>
            <FormControlLabel
              control={(
                <Checkbox
                  checked={filters.somenteContempladas === 'true'}
                  onChange={(event) => setFilters(prev => ({
                    ...prev,
                    somenteContempladas: event.target.checked ? 'true' : ''
                  }))}
                />
              )}
              label="Somente contempladas"
            />
          </Grid>

          <Grid item xs={12} md={8} lg={12}>
            <Box display="flex" flexWrap="wrap" gap={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSearch}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
              >
                Buscar
              </Button>
              <Button variant="outlined" color="secondary" onClick={handleClear} disabled={loading}>
                Limpar
              </Button>
            </Box>
          </Grid>
        </Grid>

        <Paper elevation={2} sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
            <Typography variant="h6">Resultados</Typography>
            <Box display="flex" gap={3} flexWrap="wrap">
              <Typography variant="body2"><strong>Total listados:</strong> {total} registros</Typography>
              <Typography variant="body2"><strong>Valor Líquido:</strong> {formatCurrency(totalValor)}</Typography>
              <Typography variant="body2"><strong>Valor Bruto:</strong> {formatCurrency(totalValorLiquido)}</Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleExport}
              disabled={loading || exporting || cotas.length === 0}
            >
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell  sx={{ fontSize: '0.8rem' }} sortDirection={orderBy === 'cliente' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'cliente'}
                      direction={orderBy === 'cliente' ? order : 'asc'}
                      onClick={() => handleRequestSort('cliente')}
                    >
                      Cliente
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }} sortDirection={orderBy === 'consultor' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'consultor'}
                      direction={orderBy === 'consultor' ? order : 'asc'}
                      onClick={() => handleRequestSort('consultor')}
                    >
                      Consultor
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }} sortDirection={orderBy === 'cota' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'cota'}
                      direction={orderBy === 'cota' ? order : 'asc'}
                      onClick={() => handleRequestSort('cota')}
                    >
                      Cota
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }} sortDirection={orderBy === 'administradora' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'administradora'}
                      direction={orderBy === 'administradora' ? order : 'asc'}
                      onClick={() => handleRequestSort('administradora')}
                    >
                      ADM
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center" sx={{ fontSize: '0.8rem' }} ßsortDirection={orderBy === 'valor' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'valor'}
                      direction={orderBy === 'valor' ? order : 'asc'}
                      onClick={() => handleRequestSort('valor')}
                    >
                      V. Líquido
                    </TableSortLabel>
                  </TableCell >
                  <TableCell align="center" sx={{ fontSize: '0.8rem' }} sortDirection={orderBy === 'valorTotal' ? order : false} >
                    <TableSortLabel
                      active={orderBy === 'valorTotal'}
                      direction={orderBy === 'valorTotal' ? order : 'asc'}
                      onClick={() => handleRequestSort('valorTotal')}
                    >
                      V. Bruto
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'dtaquisicao' ? order : false} sx={{ fontSize: '0.8rem' }}>
                    <TableSortLabel
                      active={orderBy === 'dtaquisicao'}
                      direction={orderBy === 'dtaquisicao' ? order : 'desc'}
                      onClick={() => handleRequestSort('dtaquisicao')}
                    >
                      Dt. Aquisição
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    Contemplação
                  </TableCell>
                  {podeGerirContemplacao && (
                    <TableCell align="center" sx={{ fontSize: '0.8rem' }}>
                      Ações
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {cotas.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={podeGerirContemplacao ? 10 : 9} align="center">
                      Nenhuma cota encontrada com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}

                {loading && (
                  <TableRow>
                    <TableCell colSpan={podeGerirContemplacao ? 10 : 9} align="center">
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                )}

                {!loading && cotas.map(cota => (
                  <TableRow
                    key={cota.id}
                    hover
                    sx={{
                      backgroundColor: cota.contemplacao ? 'rgba(34,197,94,0.08)' : 'inherit'
                    }}
                  >
                    <TableCell sx={{ fontSize: '0.8rem' }}>{cota.cliente?.nome || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{cota.consultor?.nome || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{cota.grupo ? `${cota.grupo} / ${cota.cota}` : '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{cota.administradora || '—'}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{formatCurrency(cota.valor)}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{formatCurrency(cota.valorTotal)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{formatDate(cota.dtaquisicao)}</TableCell>
                    <TableCell sx={{ fontSize: '0.7rem' }}>
                      {cota.contemplacao ? (
                        <Chip
                          size="small"
                          color="success"
                          label={`${formatTipoContemplacao(cota.contemplacao.tipo)} · ${formatDate(cota.contemplacao.dataContemplacao)}`}
                        />
                      ) : (
                        <Chip size="small" variant="outlined" label="Não contemplada" />
                      )}
                    </TableCell>
                    {podeGerirContemplacao && (
                      <TableCell align="center">
                        <Button
                          variant={cota.contemplacao ? 'contained' : 'outlined'}
                          color="primary"
                          size="small"
                          startIcon={<EmojiEventsIcon fontSize="small" />}
                          onClick={() => handleOpenContemplacaoCotaGeral(cota)}
                        >
                          {cota.contemplacao ? 'Editar' : 'Contemplar'}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage === -1 ? total || 1 : rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, { label: 'Todos', value: -1 }]}
            labelRowsPerPage="Registros por página"
          />
        </Paper>
      </PapperBlock>

      <Dialog
        open={openContemplacaoDialog}
        onClose={handleCloseContemplacaoDialog}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleSubmitContemplacao}>
          <DialogTitle>{cotaSelecionada?.contemplacao ? 'Editar Contemplação' : 'Registrar Contemplação'}</DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  {cotaSelecionada?.cliente?.nome || 'Cliente'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {cotaSelecionada ? `${cotaSelecionada.grupo || 'Grupo —'} · ${cotaSelecionada.cota || 'Cota —'}` : ''}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Data"
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
                    {TIPOS_CONTEMPLACAO.filter(t => t.value).map(tipo => (
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
                  placeholder="Detalhes adicionais (opcional)"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            {cotaSelecionada?.contemplacao && (
              <Button color="error" disabled={salvandoContemplacao} onClick={handleRemoverContemplacao}>
                Remover marcação
              </Button>
            )}
            <Button onClick={handleCloseContemplacaoDialog} disabled={salvandoContemplacao}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={salvandoContemplacao}>
              {salvandoContemplacao ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default CotasPage;
