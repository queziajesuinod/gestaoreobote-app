import React, { useState, useEffect } from 'react';
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

function ListaCobrancas() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados
  const [loading, setLoading] = useState(true);
  const [cobrancas, setCobrancas] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCobrancas, setTotalCobrancas] = useState(0);

  // Filtros
  const [filtros, setFiltros] = useState({
    status: searchParams.get('status') || '',
    processoCobrancaId: searchParams.get('processoId') || ''
  });

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
    carregarCobrancas();
  }, [page, rowsPerPage, filtros]);

  const carregarCobrancas = async () => {
    try {
      setLoading(true);

      const params = {
        ...filtros,
        limite: rowsPerPage,
        offset: page * rowsPerPage
      };

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
    setFiltros({ status: '', processoCobrancaId: '' });
    setSearchParams({});
    setPage(0);
  };

  const handleVisualizarProcesso = (processoId) => {
    navigate(`/app/inadimplentes/processos/${processoId}`);
  };

  const handleAbrirDialogPago = (cobranca) => {
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
        {/* Cabeçalho */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Cobranças
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={carregarCobrancas}
            disabled={loading}
          >
            Atualizar
          </Button>
        </Box>

        {/* Filtros */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
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

              <Grid item xs={12} sm={4}>
                <Button
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={handleLimparFiltros}
                  fullWidth
                >
                  Limpar Filtros
                </Button>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="textSecondary" align="right">
                  Total: {totalCobrancas} cobrança(s)
                </Typography>
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
                    <TableCell colSpan={8} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : cobrancas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="textSecondary">
                        Nenhuma cobrança encontrada
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  cobrancas.map((cobranca) => (
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
                          {inadimplentesApi.formatarMes(cobranca.mesReferencia)}
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
                          <Tooltip title="Marcar como Pago">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleAbrirDialogPago(cobranca)}
                            >
                              <PaymentIcon fontSize="small" />
                            </IconButton>
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
            <Button variant="contained" color="success" onClick={handleMarcarComoPago}>
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
