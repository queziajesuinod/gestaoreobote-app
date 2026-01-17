import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
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
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import brand from 'dan-api/dummy/brand';
import * as inadimplentesApi from '../../../services/inadimplentesApi';

function Dashboard() {
  const navigate = useNavigate();
  const title = `${brand.name} - Dashboard de Inadimplência`;
  const description = 'Visão geral de processos de cobrança e inadimplência';

  // Estados
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [cobrancasAtrasadas, setCobrancasAtrasadas] = useState([]);
  const [detectando, setDetectando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  // Dialog de marcar como pago
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
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);

      // Carregar dashboard
      const dashResponse = await inadimplentesApi.obterDashboard();
      setDashboard(dashResponse.dados);

      // Carregar cobranças atrasadas
      const cobrancasResponse = await inadimplentesApi.listarCobrancas({
        status: 'atrasado',
        limite: 10
      });
      setCobrancasAtrasadas(cobrancasResponse.dados || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      mostrarSnackbar('Erro ao carregar dados do dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mostrarSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fecharSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleAtualizar = async () => {
    setAtualizando(true);
    await carregarDados();
    setAtualizando(false);
    mostrarSnackbar('Dashboard atualizado');
  };

  const handleDetectarInadimplencia = async () => {
    try {
      setDetectando(true);
      const response = await inadimplentesApi.detectarInadimplencia();
      
      mostrarSnackbar(
        `Detecção concluída: ${response.dados.cobrancasVerificadas} cobranças verificadas, 
        ${response.dados.webhooksEnviados} notificações enviadas`
      );

      // Recarregar dados
      await carregarDados();
    } catch (error) {
      console.error('Erro ao detectar inadimplência:', error);
      mostrarSnackbar('Erro ao detectar inadimplência', 'error');
    } finally {
      setDetectando(false);
    }
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

      mostrarSnackbar('Cobrança marcada como paga');
      handleFecharDialogPago();
      await carregarDados();
    } catch (error) {
      console.error('Erro ao marcar como pago:', error);
      mostrarSnackbar('Erro ao marcar como pago', 'error');
    }
  };

  const handleVisualizarProcesso = (processoId) => {
    navigate(`/app/inadimplentes/processos/${processoId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock
        title="Dashboard de Inadimplência"
        desc="Visão geral de processos de cobrança e inadimplência"
        icon="ion-ios-analytics-outline"
      >
        {/* Ações */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={detectando ? <CircularProgress size={20} /> : <PlayIcon />}
            onClick={handleDetectarInadimplencia}
            disabled={detectando}
          >
            {detectando ? 'Detectando...' : 'Detectar Inadimplência'}
          </Button>

          <Button
            variant="outlined"
            startIcon={atualizando ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={handleAtualizar}
            disabled={atualizando}
          >
            Atualizar
          </Button>
        </Box>

        {/* Cards de Estatísticas */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Total de Processos */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="textSecondary">
                    Processos Ativos
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {dashboard?.totalProcessos || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  processos de cobrança
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Total de Cobranças */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <MoneyIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="textSecondary">
                    Total de Cobranças
                  </Typography>
                </Box>
                <Typography variant="h4">
                  {dashboard?.totalCobrancas || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  cobranças geradas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Cobranças Pagas */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="textSecondary">
                    Cobranças Pagas
                  </Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {dashboard?.cobrancasPagas || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {dashboard?.totalCobrancas > 0
                    ? `${((dashboard.cobrancasPagas / dashboard.totalCobrancas) * 100).toFixed(1)}%`
                    : '0%'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Cobranças Atrasadas */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <WarningIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2" color="textSecondary">
                    Cobranças Atrasadas
                  </Typography>
                </Box>
                <Typography variant="h4" color="error.main">
                  {dashboard?.cobrancasAtrasadas || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {dashboard?.totalCobrancas > 0
                    ? `${((dashboard.cobrancasAtrasadas / dashboard.totalCobrancas) * 100).toFixed(1)}%`
                    : '0%'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Valores */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Valor Total */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Valor Total em Cobrança
                </Typography>
                <Typography variant="h5">
                  {inadimplentesApi.formatarMoeda(dashboard?.valorTotal || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Valor Pago */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Valor Pago
                </Typography>
                <Typography variant="h5" color="success.main">
                  {inadimplentesApi.formatarMoeda(dashboard?.valorPago || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Valor em Atraso */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Valor em Atraso
                </Typography>
                <Typography variant="h5" color="error.main">
                  {inadimplentesApi.formatarMoeda(dashboard?.valorAtrasado || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabela de Cobranças Atrasadas */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cobranças Atrasadas (Últimas 10)
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cota</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Mês</TableCell>
                    <TableCell>Vencimento</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Dias Atraso</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cobrancasAtrasadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhuma cobrança atrasada
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cobrancasAtrasadas.map((cobranca) => (
                      <TableRow key={cobranca.id}>
                        <TableCell>
                          <Typography variant="body2">
                            {cobranca.ProcessoCobranca?.Cota?.numero || '-'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {cobranca.ProcessoCobranca?.Cota?.grupo || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {cobranca.ProcessoCobranca?.Cota?.Cliente?.nome || '-'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {cobranca.ProcessoCobranca?.Cota?.Cliente?.telefone || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {inadimplentesApi.formatarData(cobranca.mesReferencia)}
                        </TableCell>
                        <TableCell>
                          {inadimplentesApi.formatarData(cobranca.dataVencimento)}
                        </TableCell>
                        <TableCell>
                          {inadimplentesApi.formatarMoeda(cobranca.valor)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${cobranca.diasAtraso} dias`}
                            color="error"
                            size="small"
                          />
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

                          <Tooltip title="Marcar como Pago">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleAbrirDialogPago(cobranca)}
                            >
                              <PaymentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {cobrancasAtrasadas.length > 0 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="text"
                  onClick={() => navigate('/app/inadimplentes/cobrancas?status=atrasado')}
                >
                  Ver Todas as Cobranças Atrasadas
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </PapperBlock>

      {/* Dialog: Marcar como Pago */}
      <Dialog open={dialogPago.open} onClose={handleFecharDialogPago} maxWidth="sm" fullWidth>
        <DialogTitle>Marcar Cobrança como Paga</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Confirme o pagamento da cobrança de{' '}
            <strong>
              {dialogPago.cobranca?.ProcessoCobranca?.Cota?.Cliente?.nome}
            </strong>
            {' '}referente a{' '}
            <strong>
              {dialogPago.cobranca && inadimplentesApi.formatarData(dialogPago.cobranca.mesReferencia)}
            </strong>
          </DialogContentText>

          <TextField
            fullWidth
            type="date"
            label="Data do Pagamento"
            value={dialogPago.dataPagamento}
            onChange={(e) => setDialogPago({ ...dialogPago, dataPagamento: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Observação (opcional)"
            value={dialogPago.observacao}
            onChange={(e) => setDialogPago({ ...dialogPago, observacao: e.target.value })}
            placeholder="Ex: Pago via PIX"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharDialogPago}>Cancelar</Button>
          <Button onClick={handleMarcarComoPago} variant="contained" color="success">
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
        <Alert onClose={fecharSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default Dashboard;
