import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  ListSubheader,
  Grid,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Payment as PaymentIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import inadimplentesApi from '../../../services/inadimplentesApi';
import { getStoredUser } from '../../../utils/userStorage';

function ListaCobrancas() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados
  const [loading, setLoading] = useState(true);
  const [cobrancas, setCobrancas] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCobrancas, setTotalCobrancas] = useState(0);
  const [consultoresFiltro, setConsultoresFiltro] = useState([]);
  const [storedUser, setStoredUserState] = useState(() => getStoredUser());
  const perfilUsuario = storedUser?.perfil?.toUpperCase() || '';
  const isConsultorPerfil = perfilUsuario === 'CONSULTOR';
  const podeSelecionarConsultor = perfilUsuario === 'ADMIN' || perfilUsuario === 'GESTOR';
  const consultorIdLogado = storedUser?.consultorId ? String(storedUser.consultorId) : '';
  const podeGerenciarCobrancas = !isConsultorPerfil;
  const tooltipRestritoCobrancas = 'Somente administradores e gestores podem alterar cobranças.';

  // Filtros
  const anoAtual = String(new Date().getFullYear());
  const [filtros, setFiltros] = useState({
    status: searchParams.get('status') || '',
    processoCobrancaId: searchParams.get('processoId') || '',
    cotaId: searchParams.get('cotaId') || '',
    clienteId: searchParams.get('clienteId') || '',
    consultorId: searchParams.get('consultorId') || '',
    mes: searchParams.get('mes') || '',
    ano: searchParams.get('ano') || anoAtual,
    administradora: searchParams.get('administradora') || ''
  });
  const [clientesFiltro, setClientesFiltro] = useState([]);
  const [cotasFiltro, setCotasFiltro] = useState([]);
  const [administradoras, setAdministradoras] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [buscaConsultor, setBuscaConsultor] = useState('');

  // Dialog de pagamento
  const [dialogPago, setDialogPago] = useState({
    open: false,
    cobranca: null,
    dataPagamento: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    const handleUserUpdated = (event) => {
      setStoredUserState(event?.detail || getStoredUser());
    };

    window.addEventListener('app:user-updated', handleUserUpdated);
    return () => window.removeEventListener('app:user-updated', handleUserUpdated);
  }, []);

  useEffect(() => {
    carregarCobrancas();
  }, [page, rowsPerPage, filtros]);

  useEffect(() => {
    carregarConsultores();
  }, [podeSelecionarConsultor]);

  useEffect(() => {
    carregarClientes();
    carregarCotas();
    carregarAdministradoras();
  }, []);

  // Filtra localmente apenas processos encerrados — os demais filtros são server-side
  const cobrancasVisiveis = useMemo(() => {
    return (cobrancas || []).filter((cobranca) => {
      const processoStatus = cobranca?.processoCobranca?.status?.toLowerCase?.();
      return processoStatus !== 'encerrado';
    });
  }, [cobrancas]);

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientesFiltro;
    const termo = buscaCliente.toLowerCase();
    return clientesFiltro.filter(c => c.nome?.toLowerCase().includes(termo));
  }, [clientesFiltro, buscaCliente]);

  const consultoresFiltrados = useMemo(() => {
    if (!buscaConsultor.trim()) return consultoresFiltro;
    const termo = buscaConsultor.toLowerCase();
    return consultoresFiltro.filter(c => c.nome?.toLowerCase().includes(termo));
  }, [consultoresFiltro, buscaConsultor]);


  const carregarCobrancas = async () => {
    try {
      setLoading(true);

      const params = {
        ...filtros,
        limite: rowsPerPage,
        offset: page * rowsPerPage
      };

      if (isConsultorPerfil && consultorIdLogado) {
        params.consultorId = consultorIdLogado;
      }

      // Remover parâmetros vazios
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await inadimplentesApi.listarCobrancas(params);
      setCobrancas(response.dados || []);
      setTotalCobrancas(response.total || response.dados?.length || 0);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
      mostrarSnackbar('Erro ao carregar cobranças', 'error');
    } finally {
      setLoading(false);
    }
  };

  const carregarClientes = async () => {
    try {
      const response = await inadimplentesApi.listarClientes();
      const lista = Array.isArray(response?.dados) ? response.dados : response;
      setClientesFiltro(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const carregarConsultores = async () => {
    if (!podeSelecionarConsultor) {
      setConsultoresFiltro([]);
      return;
    }

    try {
      const consultores = await inadimplentesApi.listarConsultores();
      setConsultoresFiltro(Array.isArray(consultores) ? consultores : []);
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
    }
  };

  const carregarCotas = async () => {
    try {
      const response = await inadimplentesApi.listarCotas({ limit: 200 });
      const lista = Array.isArray(response?.dados) ? response.dados : response;
      setCotasFiltro(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error('Erro ao carregar cotas:', error);
    }
  };

  const carregarAdministradoras = async () => {
    try {
      const lista = await inadimplentesApi.listarAdministradoras();
      setAdministradoras(lista);
    } catch (error) {
      console.error('Erro ao carregar administradoras:', error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFiltroChange = (field, value) => {
    setFiltros(prev => ({ ...prev, [field]: value }));
    setPage(0);

    // Atualizar URL
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(field, value);
    } else {
      newParams.delete(field);
    }
    setSearchParams(newParams);
  };

  const handleLimparFiltros = () => {
    setFiltros({ status: '', processoCobrancaId: '', cotaId: '', clienteId: '', consultorId: '', mes: '', ano: anoAtual, administradora: '' });
    setBuscaCliente('');
    setBuscaConsultor('');
    setSearchParams({});
    setPage(0);
  };

  const handleVisualizarProcesso = (processoId) => {
    navigate(`/app/inadimplentes/processos/${processoId}`);
  };

  const handleAbrirDialogPago = (cobranca) => {
    if (!podeGerenciarCobrancas) {
      mostrarSnackbar('Você não tem permissão para marcar cobranças como pagas', 'warning');
      return;
    }
    setDialogPago({
      open: true,
      cobranca,
      dataPagamento: new Date().toISOString().split('T')[0],
      observacao: ''
    });
  };

  const handleFecharDialogPago = () => {
    setDialogPago({
      open: false,
      cobranca: null,
      dataPagamento: new Date().toISOString().split('T')[0],
      observacao: ''
    });
  };

  const handleMarcarComoPago = async () => {
    if (!podeGerenciarCobrancas) {
      mostrarSnackbar('Você não tem permissão para marcar cobranças como pagas', 'warning');
      return;
    }
    try {
      await inadimplentesApi.marcarComoPago(dialogPago.cobranca.id, {
        dataPagamento: dialogPago.dataPagamento,
        observacao: dialogPago.observacao
      });

      mostrarSnackbar('Cobrança marcada como paga com sucesso', 'success');
      handleFecharDialogPago();
      carregarCobrancas();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      mostrarSnackbar('Erro ao marcar cobrança como paga', 'error');
    }
  };

  const mostrarSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fecharSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStatusColor = (status) => {
    const colors = {
      pendente: 'warning',
      atrasado: 'error',
      pago: 'success'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pendente: 'Pendente',
      atrasado: 'Atrasado',
      pago: 'Pago'
    };
    return labels[status] || status;
  };

  return (
    <>
      <Helmet>
        <title>Cobranças - Inadimplentes</title>
      </Helmet>

      <Box sx={{ p: 3 }}>
       

        {/* Filtros */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={filtros.status}
                  onChange={(e) => handleFiltroChange('status', e.target.value)}
                  size="small"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="atrasado">Atrasado</MenuItem>
                  <MenuItem value="pago">Pago</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Mês"
                  value={filtros.mes}
                  onChange={(e) => handleFiltroChange('mes', e.target.value)}
                  size="small"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {[
                    ['01', 'Janeiro'], ['02', 'Fevereiro'], ['03', 'Março'],
                    ['04', 'Abril'], ['05', 'Maio'], ['06', 'Junho'],
                    ['07', 'Julho'], ['08', 'Agosto'], ['09', 'Setembro'],
                    ['10', 'Outubro'], ['11', 'Novembro'], ['12', 'Dezembro']
                  ].map(([v, label]) => (
                    <MenuItem key={v} value={v}>{label}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={6} sm={3} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Ano"
                  value={filtros.ano}
                  onChange={(e) => handleFiltroChange('ano', e.target.value)}
                  size="small"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {Array.from({ length: 5 }, (_, i) => String(Number(anoAtual) - 2 + i)).map(ano => (
                    <MenuItem key={ano} value={ano}>{ano}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Cota"
                  value={filtros.cotaId}
                  onChange={(e) => handleFiltroChange('cotaId', e.target.value)}
                  size="small"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {cotasFiltro.map((cota) => (
                    <MenuItem key={cota.id} value={cota.id}>
                      {`${cota.grupo || ''}-${cota.cota || ''}`.trim() || cota.id}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Cliente"
                  value={filtros.clienteId}
                  onChange={(e) => handleFiltroChange('clienteId', e.target.value)}
                  size="small"
                  SelectProps={{ MenuProps: { autoFocus: false } }}
                >
                  <ListSubheader sx={{ pt: 1, pb: 0.5, lineHeight: 'normal' }}>
                    <TextField
                      size="small"
                      placeholder="Buscar cliente..."
                      value={buscaCliente}
                      onChange={(e) => setBuscaCliente(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      fullWidth
                      autoFocus={false}
                    />
                  </ListSubheader>
                  <MenuItem value="">Todos</MenuItem>
                  {clientesFiltrados.map((cliente) => (
                    <MenuItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {podeSelecionarConsultor ? (
                <Grid item xs={12} sm={4} md={2}>
                  <TextField
                    select
                    fullWidth
                    label="Consultor"
                    value={filtros.consultorId}
                    onChange={(e) => handleFiltroChange('consultorId', e.target.value)}
                    size="small"
                    SelectProps={{ MenuProps: { autoFocus: false } }}
                  >
                    <ListSubheader sx={{ pt: 1, pb: 0.5, lineHeight: 'normal' }}>
                      <TextField
                        size="small"
                        placeholder="Buscar consultor..."
                        value={buscaConsultor}
                        onChange={(e) => setBuscaConsultor(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        fullWidth
                        autoFocus={false}
                      />
                    </ListSubheader>
                    <MenuItem value="">Todos</MenuItem>
                    {consultoresFiltrados.map((consultor) => (
                      <MenuItem key={consultor.id} value={String(consultor.id)}>
                        {consultor.nome}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              ) : (
                isConsultorPerfil && (
                  <Grid item xs={12} sm={4} md={2}>
                    <Typography variant="body2" color="textSecondary">
                      Consultor logado: {storedUser?.consultor?.nome || storedUser?.consultorNome || storedUser?.name || '—'}
                    </Typography>
                  </Grid>
                )
              )}

              <Grid item xs={12} sm={4} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Administradora"
                  value={filtros.administradora}
                  onChange={(e) => handleFiltroChange('administradora', e.target.value)}
                  size="small"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {administradoras.map((adm) => (
                    <MenuItem key={adm} value={adm}>{adm}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={handleLimparFiltros}
                  fullWidth
                >
                  Limpar Filtros
                </Button>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary" align="right">
                  Total: {totalCobrancas} cobrança(s)
                </Typography>
              </Grid>

              <Grid item xs={12} sm={12} md={3} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                <Tooltip title="Atualizar">
                  <span>
                    <IconButton onClick={carregarCobrancas} color="primary">
                      <RefreshIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Cota</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Administradora</TableCell>
                  <TableCell>Mês Referência</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Dias Atraso</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : cobrancasVisiveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="textSecondary">
                        Nenhuma cobrança corresponde aos filtros aplicados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  cobrancasVisiveis.map((cobranca) => (
                    <TableRow key={cobranca.id}>
                      <TableCell>
                        <Typography variant="body2">
                          {cobranca.processoCobranca?.cota?.cota || '-'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Grupo {cobranca.processoCobranca?.cota?.grupo || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {cobranca.processoCobranca?.cota?.cliente?.nome || '-'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {cobranca.processoCobranca?.cota?.cliente?.telefone || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {cobranca.processoCobranca?.cota?.administradora || '-'}
                        </Typography>
                      </TableCell>
                        <TableCell>
                          {inadimplentesApi.formatarMes(cobranca.dataVencimento)}
                        </TableCell>
                      <TableCell>
                        {inadimplentesApi.formatarData(cobranca.dataVencimento)}
                      </TableCell>
                      <TableCell>
                        R$ {parseFloat(cobranca.valor).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(cobranca.status)}
                          color={getStatusColor(cobranca.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {cobranca.status === 'atrasado' && cobranca.diasAtraso > 0 ? (
                          <Chip
                            label={`${cobranca.diasAtraso} dias`}
                            color="error"
                            size="small"
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Visualizar Processo">
                          <IconButton
                            size="small"
                            onClick={() => handleVisualizarProcesso(cobranca.processoCobrancaId)}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {cobranca.status !== 'pago' && (
                          <Tooltip title={podeGerenciarCobrancas ? 'Marcar como Pago' : tooltipRestritoCobrancas}>
                            <span>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleAbrirDialogPago(cobranca)}
                                disabled={!podeGerenciarCobrancas}
                              >
                                <PaymentIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
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
            count={totalCobrancas}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Linhas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </Card>

        {/* Dialog de Marcar como Pago */}
        <Dialog open={dialogPago.open} onClose={handleFecharDialogPago} maxWidth="sm" fullWidth>
          <DialogTitle>Marcar Cobrança como Paga</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Data de Pagamento"
                type="date"
                value={dialogPago.dataPagamento}
                onChange={(e) => setDialogPago({ ...dialogPago, dataPagamento: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Observação (opcional)"
                multiline
                rows={3}
                value={dialogPago.observacao}
                onChange={(e) => setDialogPago({ ...dialogPago, observacao: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleFecharDialogPago}>Cancelar</Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleMarcarComoPago}
              disabled={!podeGerenciarCobrancas}
            >
              Confirmar Pagamento
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={fecharSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={fecharSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}

export default ListaCobrancas;
