import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
  Divider,
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
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Pause as PauseIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Payment as PaymentIcon,
  Comment as CommentIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import brand from 'dan-api/dummy/brand';
import * as inadimplentesApi from '../../../services/inadimplentesApi';

function DetalhesProcesso() {
  const { id } = useParams();
  const navigate = useNavigate();

  const title = `${brand.name} - Detalhes do Processo`;
  const description = 'Visualização completa do processo de cobrança';

  // Estados
  const [loading, setLoading] = useState(true);
  const [processo, setProcesso] = useState(null);
  const [cobrancas, setCobrancas] = useState([]);
  const [expandedCobranca, setExpandedCobranca] = useState(null);

  // Dialog de marcar como pago
  const [dialogPago, setDialogPago] = useState({
    open: false,
    cobranca: null,
    dataPagamento: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  // Dialog de adicionar anotação
  const [dialogAnotacao, setDialogAnotacao] = useState({
    open: false,
    cobranca: null,
    mensagem: ''
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await inadimplentesApi.buscarProcesso(id);
      setProcesso(response.dados);
      setCobrancas(response.dados.cobrancas || []);
    } catch (error) {
      console.error('Erro ao carregar processo:', error);
      mostrarSnackbar('Erro ao carregar processo', 'error');
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

  const handleVoltar = () => {
    navigate('/app/inadimplentes');
  };

  const handleEditar = () => {
    navigate(`/app/inadimplentes/processos/${id}/editar`);
  };

  const handlePausar = async () => {
    try {
      await inadimplentesApi.pausarProcesso(id);
      mostrarSnackbar('Processo pausado com sucesso');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao pausar processo:', error);
      mostrarSnackbar('Erro ao pausar processo', 'error');
    }
  };

  const handleReativar = async () => {
    try {
      await inadimplentesApi.reativarProcesso(id);
      mostrarSnackbar('Processo reativado com sucesso');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao reativar processo:', error);
      mostrarSnackbar('Erro ao reativar processo', 'error');
    }
  };

  const handleEncerrar = async () => {
    if (!window.confirm('Tem certeza que deseja encerrar este processo? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await inadimplentesApi.encerrarProcesso(id);
      mostrarSnackbar('Processo encerrado com sucesso');
      setTimeout(() => {
        navigate('/app/inadimplentes');
      }, 1500);
    } catch (error) {
      console.error('Erro ao encerrar processo:', error);
      mostrarSnackbar('Erro ao encerrar processo', 'error');
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

  const handleAbrirDialogAnotacao = (cobranca) => {
    setDialogAnotacao({
      open: true,
      cobranca,
      mensagem: ''
    });
  };

  const handleFecharDialogAnotacao = () => {
    setDialogAnotacao({
      open: false,
      cobranca: null,
      mensagem: ''
    });
  };

  const handleAdicionarAnotacao = async () => {
    try {
      await inadimplentesApi.adicionarAnotacao(dialogAnotacao.cobranca.id, {
        tipo: 'manual',
        canal: 'sistema',
        mensagem: dialogAnotacao.mensagem
      });

      mostrarSnackbar('Anotação adicionada com sucesso');
      handleFecharDialogAnotacao();
      await carregarDados();
    } catch (error) {
      console.error('Erro ao adicionar anotação:', error);
      mostrarSnackbar('Erro ao adicionar anotação', 'error');
    }
  };

  const handleExpandCobranca = (cobrancaId) => {
    setExpandedCobranca(expandedCobranca === cobrancaId ? null : cobrancaId);
  };

  const carregarNotificacoes = async (cobrancaId) => {
    try {
      const response = await inadimplentesApi.listarNotificacoes(cobrancaId);
      return response.dados || [];
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      return [];
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!processo) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Processo não encontrado</Alert>
        <Button startIcon={<BackIcon />} onClick={handleVoltar} sx={{ mt: 2 }}>
          Voltar
        </Button>
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
        title="Detalhes do Processo de Cobrança"
        desc="Visualização completa e gerenciamento do processo"
        icon="ion-ios-document-outline"
      >
        {/* Botões de Ação */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={handleVoltar}
          >
            Voltar
          </Button>

          {processo.status !== 'encerrado' && (
            <>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEditar}
              >
                Editar
              </Button>

              {processo.status === 'ativo' && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<PauseIcon />}
                  onClick={handlePausar}
                >
                  Pausar
                </Button>
              )}

              {processo.status === 'pausado' && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<PlayIcon />}
                  onClick={handleReativar}
                >
                  Reativar
                </Button>
              )}

              <Button
                variant="outlined"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleEncerrar}
              >
                Encerrar
              </Button>
            </>
          )}
        </Box>

        {/* Informações do Processo */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informações da Cota
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Número da Cota
                    </Typography>
                    <Typography variant="body1">
                      {processo.cota?.cota || '-'}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Grupo
                    </Typography>
                    <Typography variant="body1">
                      {processo.cota?.grupo || '-'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary">
                      Cliente
                    </Typography>
                    <Typography variant="body1">
                      {processo.cota?.cliente?.nome || '-'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {processo.cota?.cliente?.telefone || '-'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="caption" color="textSecondary">
                      Consultor
                    </Typography>
                    <Typography variant="body1">
                      {processo.cota?.consultor?.nome || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Configurações do Processo
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Status
                    </Typography>
                    <Box>
                      <Chip
                        label={inadimplentesApi.getStatusLabel(processo.status)}
                        color={inadimplentesApi.getStatusColor(processo.status)}
                        size="small"
                      />
                    </Box>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Dia de Vencimento
                    </Typography>
                    <Typography variant="body1">
                      Dia {processo.diaVencimento}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Data de Início
                    </Typography>
                    <Typography variant="body1">
                      {inadimplentesApi.formatarData(processo.dataInicioCobranca)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Criado em
                    </Typography>
                    <Typography variant="body1">
                      {inadimplentesApi.formatarData(processo.createdAt)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="textSecondary">
                      Atualizado em
                    </Typography>
                    <Typography variant="body1">
                      {inadimplentesApi.formatarData(processo.updatedAt)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Lista de Cobranças */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cobranças ({cobrancas.length})
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                  <TableCell>Mês</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Atraso</TableCell>
                  <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cobrancas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhuma cobrança gerada ainda
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cobrancas.map((cobranca) => (
                      <React.Fragment key={cobranca.id}>
                        <TableRow>
                          <TableCell>
                            {inadimplentesApi.formatarData(cobranca.mesReferencia)}
                            {cobranca.historicoRetroativo && (
                              <Typography variant="caption" display="block" color="textSecondary">
                                (Retroativo)
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {inadimplentesApi.formatarData(cobranca.dataVencimento)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={inadimplentesApi.getStatusLabel(cobranca.status)}
                              color={inadimplentesApi.getStatusColor(cobranca.status)}
                              size="small"
                              icon={
                                cobranca.status === 'pago' ? <CheckIcon /> :
                                cobranca.status === 'atrasado' ? <WarningIcon /> :
                                <ScheduleIcon />
                              }
                            />
                          </TableCell>
                          <TableCell>
                            {cobranca.diasAtraso > 0 && (
                              <Chip
                                label={`${cobranca.diasAtraso} dias`}
                                color="error"
                                size="small"
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {cobranca.status !== 'pago' && !cobranca.historicoRetroativo && (
                              <>
                                <Tooltip title="Marcar como Pago">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleAbrirDialogPago(cobranca)}
                                  >
                                    <PaymentIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Adicionar Anotação">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleAbrirDialogAnotacao(cobranca)}
                                  >
                                    <CommentIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}

                            <Tooltip title="Ver Notificações">
                              <IconButton
                                size="small"
                                onClick={() => handleExpandCobranca(cobranca.id)}
                              >
                                <ExpandMoreIcon
                                  fontSize="small"
                                  sx={{
                                    transform: expandedCobranca === cobranca.id ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s'
                                  }}
                                />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>

                        {/* Notificações (expandido) */}
                        {expandedCobranca === cobranca.id && (
                          <TableRow>
                            <TableCell colSpan={6} sx={{ bgcolor: 'background.default', p: 0 }}>
                              <NotificacoesCobranca cobrancaId={cobranca.id} />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </PapperBlock>

      {/* Dialog: Marcar como Pago */}
      <Dialog open={dialogPago.open} onClose={handleFecharDialogPago} maxWidth="sm" fullWidth>
        <DialogTitle>Marcar Cobrança como Paga</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Confirme o pagamento da cobrança referente a{' '}
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

      {/* Dialog: Adicionar Anotação */}
      <Dialog open={dialogAnotacao.open} onClose={handleFecharDialogAnotacao} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Anotação</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Adicione uma anotação sobre a cobrança de{' '}
            <strong>
              {dialogAnotacao.cobranca && inadimplentesApi.formatarData(dialogAnotacao.cobranca.mesReferencia)}
            </strong>
          </DialogContentText>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Mensagem"
            value={dialogAnotacao.mensagem}
            onChange={(e) => setDialogAnotacao({ ...dialogAnotacao, mensagem: e.target.value })}
            placeholder="Ex: Cliente confirmou pagamento para amanhã"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharDialogAnotacao}>Cancelar</Button>
          <Button
            onClick={handleAdicionarAnotacao}
            variant="contained"
            disabled={!dialogAnotacao.mensagem.trim()}
          >
            Adicionar
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

// Componente auxiliar para exibir notificações
function NotificacoesCobranca({ cobrancaId }) {
  const [loading, setLoading] = useState(true);
  const [notificacoes, setNotificacoes] = useState([]);

  useEffect(() => {
    carregarNotificacoes();
  }, [cobrancaId]);

  const carregarNotificacoes = async () => {
    try {
      setLoading(true);
      const response = await inadimplentesApi.listarNotificacoes(cobrancaId);
      setNotificacoes(response.dados || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (notificacoes.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="textSecondary">
          Nenhuma notificação registrada
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Histórico de Notificações ({notificacoes.length})
      </Typography>

      {notificacoes.map((notif) => (
        <Box
          key={notif.id}
          sx={{
            p: 1.5,
            mb: 1,
            bgcolor: 'background.paper',
            borderLeft: `3px solid ${notif.tipo === 'automatico' ? '#1976d2' : '#9c27b0'}`,
            borderRadius: 1
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Chip
              label={notif.tipo === 'automatico' ? 'Automático' : 'Manual'}
              size="small"
              color={notif.tipo === 'automatico' ? 'primary' : 'secondary'}
            />
            <Typography variant="caption" color="textSecondary">
              {inadimplentesApi.formatarDataHora(notif.createdAt)}
            </Typography>
          </Box>

          <Typography variant="body2">
            {notif.mensagem}
          </Typography>

          {notif.canal && (
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
              Canal: {notif.canal}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default DetalhesProcesso;
