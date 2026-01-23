import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  ListItemText,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
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
  Payment as PaymentIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import brand from 'dan-api/dummy/brand';
import * as inadimplentesApi from '../../../services/inadimplentesApi';
import GraficosInadimplencia from './GraficosInadimplencia';
import { getStoredUser } from '../../../utils/userStorage';

const MESES = [
  { value: '', label: 'Todos os meses' },
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' }
];

const MODOS_COBRANCA = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'dia_sim_dia_nao', label: 'Dia sim, dia não' }
];

const DIAS_DA_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

function Dashboard() {
  const navigate = useNavigate();
  const title = `${brand.name} - Dashboard de Inadimplência`;
  const description = 'Visão geral de processos de cobrança e inadimplência';

  // Estados
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [cobrancasAtrasadas, setCobrancasAtrasadas] = useState([]);
  const [detectando, setDetectando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mostrarGraficos, setMostrarGraficos] = useState(true);
  const [storedUser, setStoredUserState] = useState(() => getStoredUser());
  const perfilUsuario = storedUser?.perfil?.toUpperCase() || '';
  const isConsultorPerfil = perfilUsuario === 'CONSULTOR';
  const podeSelecionarConsultor = perfilUsuario === 'ADMIN' || perfilUsuario === 'GESTOR';
  const consultorIdLogado = storedUser?.consultorId ? String(storedUser.consultorId) : '';
  const consultorNomeLogado = storedUser?.consultor?.nome
    || storedUser?.consultorNome
    || storedUser?.name
    || '';
  const [consultoresFiltro, setConsultoresFiltro] = useState([]);
  const [filtrosDashboard, setFiltrosDashboard] = useState({
    consultorId: isConsultorPerfil ? consultorIdLogado : '',
    mes: '',
    ano: ''
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState(() => ({
    consultorId: isConsultorPerfil ? consultorIdLogado : '',
    mes: '',
    ano: ''
  }));
  const [modoCobranca, setModoCobranca] = useState('diaria');
  const [diasSemanaCobranca, setDiasSemanaCobranca] = useState([]);
  const [modoSalvando, setModoSalvando] = useState(false);

  useEffect(() => {
    const handleUserUpdated = (event) => {
      setStoredUserState(event?.detail || getStoredUser());
    };

    window.addEventListener('app:user-updated', handleUserUpdated);
    return () => window.removeEventListener('app:user-updated', handleUserUpdated);
  }, []);

  useEffect(() => {
    if (isConsultorPerfil) {
      setFiltrosDashboard(prev => ({ ...prev, consultorId: consultorIdLogado }));
      setFiltrosAplicados(prev => ({ ...prev, consultorId: consultorIdLogado }));
    }
  }, [isConsultorPerfil, consultorIdLogado]);

  const anosDashboard = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 4 }, (_, index) => (anoAtual - index).toString());
  }, []);

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
    carregarConsultores();
  }, [podeSelecionarConsultor]);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    carregarConfiguracaoCobranca();
  }, []);

  const prepararFiltrosDashboard = (filtros = {}) => {
    const resultado = {};
    if (filtros.consultorId) resultado.consultorId = filtros.consultorId;
    if (filtros.mes) resultado.mes = filtros.mes;
    if (filtros.ano) resultado.ano = filtros.ano;
    return resultado;
  };

  const carregarDados = async (filtros = null) => {
    const filtrosParaAplicar = prepararFiltrosDashboard(filtros || filtrosAplicados);

    try {
      setLoading(true);

      // Carregar dashboard
      const dashResponse = await inadimplentesApi.obterDashboard(filtrosParaAplicar);
      setDashboard(dashResponse.dados);

      // Carregar cobranças atrasadas
      const cobrancasResponse = await inadimplentesApi.listarCobrancas({
        status: 'atrasado',
        limite: 10,
        ...filtrosParaAplicar
      });
      setCobrancasAtrasadas(cobrancasResponse.dados || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      mostrarSnackbar('Erro ao carregar dados do dashboard', 'error');
    } finally {
      setLoading(false);
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

  const carregarConfiguracaoCobranca = async () => {
    try {
      const response = await inadimplentesApi.obterConfiguracaoCobranca();
      const dados = response.dados || {};
      setModoCobranca(dados.modo || 'diaria');

      const dias = Array.isArray(dados.diasSemana)
        ? dados.diasSemana
          .map(Number)
          .filter((dia) => Number.isFinite(dia) && dia >= 0 && dia <= 6)
        : [];
      setDiasSemanaCobranca(dias);
    } catch (error) {
      console.error('Erro ao carregar configuração de cobrança:', error);
    }
  };

  const handleDiasSemanaChange = (event) => {
    const value = event.target.value;
    const selecionados = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : [];

    setDiasSemanaCobranca(
      selecionados
        .map(Number)
        .filter((dia) => Number.isFinite(dia) && dia >= 0 && dia <= 6)
    );
  };

  const handleSalvarConfiguracaoCobranca = async () => {
    try {
      setModoSalvando(true);
      await inadimplentesApi.atualizarConfiguracaoCobranca({
        modo: modoCobranca,
        diasSemana: modoCobranca === 'semanal' ? diasSemanaCobranca : []
      });
      mostrarSnackbar('Configuração de cobrança salva');
    } catch (error) {
      console.error('Erro ao salvar configuração de cobrança:', error);
      mostrarSnackbar('Erro ao salvar configuração de cobrança', 'error');
    } finally {
      setModoSalvando(false);
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

  const handleAplicarFiltros = async () => {
    const filtrosAtualizados = prepararFiltrosDashboard(filtrosDashboard);
    setFiltrosAplicados(filtrosAtualizados);
    await carregarDados(filtrosAtualizados);
  };

  const handleLimparFiltros = async () => {
    const padrao = {
      consultorId: isConsultorPerfil ? consultorIdLogado : '',
      mes: '',
      ano: ''
    };
    setFiltrosDashboard(padrao);
    const filtrosPadraoAplicados = prepararFiltrosDashboard(padrao);
    setFiltrosAplicados(filtrosPadraoAplicados);
    await carregarDados(filtrosPadraoAplicados);
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

  const handleVerificarStatus = async () => {
    try {
      setVerificando(true);
      const response = await inadimplentesApi.verificarStatusInadimplente();
      
      mostrarSnackbar(response.mensagem, 'success');
      // Recarregar dados
      await carregarDados();
    } catch (error) {
      console.error('Erro ao verificar status de inadimplente:', error);
      mostrarSnackbar('Erro ao verificar status de inadimplência', 'error');
    } finally {
      setVerificando(false);
    }
  };

  const handleExportarPDF = async () => {
    try {
      setExportando(true);
      await inadimplentesApi.gerarRelatorioInadimplenciaPDF();
      mostrarSnackbar('Relatório PDF gerado com sucesso');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      mostrarSnackbar('Erro ao gerar relatório PDF', 'error');
    } finally {
      setExportando(false);
    }
  };

  const handleExportarExcel = async () => {
    try {
      setExportando(true);
      await inadimplentesApi.exportarCobrancasAtrasadasExcel();
      mostrarSnackbar('Cobranças atrasadas exportadas com sucesso');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      mostrarSnackbar('Erro ao exportar para Excel', 'error');
    } finally {
      setExportando(false);
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
            variant="contained"
            color="warning"
            startIcon={verificando ? <CircularProgress size={20} /> : <WarningIcon />}
            onClick={handleVerificarStatus}
            disabled={verificando}
          >
            {verificando ? 'Verificando...' : 'Verificar status de inadimplente'}
          </Button>

          <Button
            variant="outlined"
            startIcon={atualizando ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={handleAtualizar}
            disabled={atualizando}
          >
            Atualizar
          </Button>

          <Button
            variant="outlined"
            color="error"
            startIcon={exportando ? <CircularProgress size={20} /> : <PdfIcon />}
            onClick={handleExportarPDF}
            disabled={exportando}
          >
            Exportar PDF
          </Button>

          <Button
            variant="outlined"
            color="success"
            startIcon={exportando ? <CircularProgress size={20} /> : <ExcelIcon />}
            onClick={handleExportarExcel}
            disabled={exportando}
          >
            Exportar Excel
          </Button>
        </Box>

        {/* Agenda de cobrança */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Agendamento de Cobrança
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Defina a periodicidade em que a detecção automática de inadimplência deve rodar. Ajustes aqui afetam apenas o cron diário.
            </Typography>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Modo"
                  value={modoCobranca}
                  onChange={(event) => setModoCobranca(event.target.value)}
                  size="small"
                >
                  {MODOS_COBRANCA.map((modo) => (
                    <MenuItem key={modo.value} value={modo.value}>
                      {modo.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {modoCobranca === 'semanal' && (
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Dias da semana"
                    size="small"
                    value={diasSemanaCobranca}
                    onChange={handleDiasSemanaChange}
                    SelectProps={{
                      multiple: true,
                      renderValue: (selected) => {
                        const nomes = Array.isArray(selected)
                          ? selected
                            .map((valor) => DIAS_DA_SEMANA.find((dia) => dia.value === valor)?.label)
                            .filter(Boolean)
                          : [];
                        return nomes.length ? nomes.join(', ') : 'Nenhum dia selecionado';
                      }
                    }}
                    helperText="Selecione os dias em que a detecção deve rodar"
                  >
                    {DIAS_DA_SEMANA.map((dia) => (
                      <MenuItem key={dia.value} value={dia.value}>
                        <Checkbox checked={diasSemanaCobranca.includes(dia.value)} />
                        <ListItemText primary={dia.label} />
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              )}

              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSalvarConfiguracaoCobranca}
                  disabled={modoSalvando}
                  fullWidth
                  startIcon={modoSalvando ? <CircularProgress size={20} /> : undefined}
                >
                  {modoSalvando ? 'Salvando...' : 'Salvar agendamento'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="flex-end">
            {podeSelecionarConsultor ? (
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  label="Consultor"
                  size="small"
                  fullWidth
                  value={filtrosDashboard.consultorId}
                  onChange={(event) => setFiltrosDashboard(prev => ({
                    ...prev,
                    consultorId: event.target.value
                  }))}
                >
                  <MenuItem value="">Todos os consultores</MenuItem>
                  {consultoresFiltro.map((consultor) => (
                    <MenuItem key={consultor.id} value={String(consultor.id)}>
                      {consultor.nome}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            ) : (
              <Grid item xs={12} md={4}>
                <Typography variant="body2">
                  Consultor: {consultorNomeLogado || '—'}
                </Typography>
              </Grid>
            )}

            <Grid item xs={6} md={3}>
              <TextField
                select
                label="Mês"
                size="small"
                fullWidth
                value={filtrosDashboard.mes}
                onChange={(event) => setFiltrosDashboard(prev => ({
                  ...prev,
                  mes: event.target.value
                }))}
              >
                {MESES.map((mes) => (
                  <MenuItem key={mes.value} value={mes.value}>
                    {mes.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={6} md={2}>
              <TextField
                select
                label="Ano"
                size="small"
                fullWidth
                value={filtrosDashboard.ano}
                onChange={(event) => setFiltrosDashboard(prev => ({
                  ...prev,
                  ano: event.target.value
                }))}
              >
                <MenuItem value="">Todos os anos</MenuItem>
                {anosDashboard.map((ano) => (
                  <MenuItem key={ano} value={ano}>
                    {ano}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAplicarFiltros}
                >
                  Aplicar filtros
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleLimparFiltros}
                >
                  Limpar filtros
                </Button>
              </Box>
            </Grid>
          </Grid>
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
                  {dashboard?.processosAtivos || 0}
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

        {/* Gráficos de Inadimplência */}
        {mostrarGraficos && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Gráficos de Inadimplência
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setMostrarGraficos(false)}
                >
                  Ocultar Gráficos
                </Button>
              </Box>
              <GraficosInadimplencia 
                key={JSON.stringify(filtrosAplicados)} 
                meses={6} 
                filtros={filtrosAplicados} 
              />
            </CardContent>
          </Card>
        )}

        {!mostrarGraficos && (
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => setMostrarGraficos(true)}
            >
              Mostrar Gráficos
            </Button>
          </Box>
        )}


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
                    <TableCell>Dias Atraso</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cobrancasAtrasadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
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
