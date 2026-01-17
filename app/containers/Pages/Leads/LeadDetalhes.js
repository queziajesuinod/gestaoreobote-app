import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Grid,
  Typography,
  Button,
  TextField,
  Box,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  MenuItem,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Sync as SyncIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import { leadsApi } from '../../../services/leadsApi';
import TemperaturaIndicador from '../../../components/TemperaturaIndicador';
import AnaliseIACard from '../../../components/AnaliseIACard';
import ConversaTimeline from '../../../components/ConversaTimeline';
import PromoverClienteDialog from '../../../components/PromoverClienteDialog';

const normalizarLead = (data) => {
  if (!data) return null;
  return data.lead || data.dados || data;
};

const getTendenciaIcon = (tendencia) => {
  switch (tendencia) {
    case 'melhorando':
      return <TrendingUpIcon color="success" />;
    case 'piorando':
      return <TrendingDownIcon color="error" />;
    default:
      return <TrendingFlatIcon color="action" />;
  }
};

const getTendenciaLabel = (tendencia) => {
  switch (tendencia) {
    case 'melhorando':
      return 'Melhorando';
    case 'piorando':
      return 'Piorando';
    default:
      return 'Estável';
  }
};

function LeadDetalhes() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const title = `${brand.name} - Lead`;
  const description = 'Detalhes do lead';

  const [lead, setLead] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [leadForm, setLeadForm] = useState({
    nome: '',
    status: '',
    interesseEm: '',
    valorDesejado: '',
    prazoDesejado: '',
    email: '',
    telefone: ''
  });
  const [salvandoLead, setSalvandoLead] = useState(false);
  const [instrucoesPersonalizadas, setInstrucoesPersonalizadas] = useState('');
  const [analisando, setAnalisando] = useState(false);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const carregarLead = useCallback(async () => {
    setLoading(true);
    try {
      const response = await leadsApi.obter(leadId);
      const leadData = normalizarLead(response);
      setLead(leadData);
      setInstrucoesPersonalizadas(leadData.instrucoesPersonalizadas || '');
    } catch (error) {
      console.error('Erro ao carregar lead:', error);
      showSnackbar('Falha ao carregar lead.', 'error');
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [leadId, showSnackbar]);

  const carregarInsights = useCallback(async () => {
    setLoadingInsights(true);
    try {
      const response = await leadsApi.obterInsights(leadId);
      if (response.sucesso) {
        setInsights(response.insights);
      }
    } catch (error) {
      console.error('Erro ao carregar insights:', error);
      showSnackbar('Falha ao carregar insights.', 'warning');
    } finally {
      setLoadingInsights(false);
    }
  }, [leadId, showSnackbar]);

  useEffect(() => {
    if (!lead) return;
    setLeadForm({
      nome: lead.nome || '',
      status: lead.status || 'novo',
      interesseEm: lead.interesseEm || '',
      valorDesejado: lead.valorDesejado || '',
      prazoDesejado: lead.prazoDesejado || '',
      email: lead.email || '',
      telefone: lead.telefone || ''
    });
  }, [lead]);

  const statusOptions = [
    { value: 'novo', label: 'Novo' },
    { value: 'em_contato', label: 'Em contato' },
    { value: 'qualificado', label: 'Qualificado' },
    { value: 'perdido', label: 'Perdido' },
    { value: 'convertido', label: 'Convertido' }
  ];

  const handleLeadFieldChange = useCallback((field) => (event) => {
    setLeadForm((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  }, []);

  const handleSalvarLead = async () => {
    if (!lead) return;
    setSalvandoLead(true);
    try {
      const payload = { ...leadForm };
      if (!payload.telefone?.trim()) {
        delete payload.telefone;
      }
      await leadsApi.atualizar(leadId, payload);
      showSnackbar('Lead atualizado com sucesso.', 'success');
      carregarLead();
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      const message = error?.response?.data?.mensagem || 'Falha ao atualizar lead.';
      showSnackbar(message, 'error');
    } finally {
      setSalvandoLead(false);
    }
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const response = await leadsApi.sincronizar(leadId);
      if (response.sucesso) {
        showSnackbar(
          `Sincronização concluída! ${response.mensagensNovas || 0} novas mensagens.`,
          'success'
        );
        carregarLead();
        carregarInsights();
      } else {
        showSnackbar('Erro ao sincronizar.', 'error');
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      showSnackbar('Falha ao sincronizar mensagens.', 'error');
    } finally {
      setSincronizando(false);
    }
  };

  const handleAnalisarComIA = async () => {
    setAnalisando(true);
    try {
      const response = await leadsApi.analisarManualmente(leadId, instrucoesPersonalizadas);
      if (response.sucesso) {
        showSnackbar(
          `Análise concluída! Nova temperatura: ${response.lead.temperaturaLead}`,
          'success'
        );
        carregarLead();
        carregarInsights();
      } else {
        showSnackbar('Erro ao analisar lead.', 'error');
      }
    } catch (error) {
      console.error('Erro ao analisar:', error);
      showSnackbar('Falha ao analisar lead com IA.', 'error');
    } finally {
      setAnalisando(false);
    }
  };

  useEffect(() => {
    carregarLead();
    carregarInsights();
  }, [carregarLead, carregarInsights]);

  const mensagens = useMemo(() => {
    if (!lead) return [];
    if (Array.isArray(lead?.mensagens)) return lead.mensagens;
    if (Array.isArray(lead?.conversas?.[0]?.mensagens)) return lead.conversas[0].mensagens;
    return [];
  }, [lead]);

  const sinaisCompra = useMemo(() => {
    if (!lead) return 0;
    if (typeof lead?.sinaisCompra === 'number') return lead.sinaisCompra;
    if (Array.isArray(lead?.analise?.sinaisCompra)) return lead.analise.sinaisCompra.length;
    return 0;
  }, [lead]);

  const objecoes = useMemo(() => {
    if (!lead) return 0;
    if (typeof lead?.objecoes === 'number') return lead.objecoes;
    if (Array.isArray(lead?.analise?.objecoes)) return lead.analise.objecoes.length;
    return 0;
  }, [lead]);

  const sentimento = lead?.sentimentoGeral || lead?.analise?.sentimento || '';

  const handlePromoverCliente = async (dados) => {
    try {
      await leadsApi.promover(leadId, dados);
      showSnackbar('Lead promovido com sucesso.', 'success');
      setDialogOpen(false);
      carregarLead();
    } catch (error) {
      console.error('Erro ao promover lead:', error);
      showSnackbar('Falha ao promover lead.', 'error');
    }
  };

  const handleVincularAgendor = async () => {
    const negocioId = window.prompt('Informe o ID do negocio no Agendor:');
    if (!negocioId) return;
    try {
      await leadsApi.vincularAgendor(leadId, negocioId);
      showSnackbar('Lead vinculado ao Agendor.', 'success');
      carregarLead();
    } catch (error) {
      console.error('Erro ao vincular Agendor:', error);
      showSnackbar('Falha ao vincular Agendor.', 'error');
    }
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
      </Helmet>

      <PapperBlock title="Detalhes do Lead" desc="Análise completa e histórico de conversas">
        {loading ? (
          <Box display="flex" justifyContent="center" padding={4}>
            <CircularProgress />
          </Box>
        ) : !lead ? (
          <Typography variant="body2" color="textSecondary">
            Lead não encontrado.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Button onClick={() => navigate('/app/leads')}>Voltar</Button>
                  <Typography variant="h4" gutterBottom>
                    {lead.nome || 'Lead'}
                  </Typography>
                </Box>
                <Tooltip title="Sincronizar mensagens do WhatsApp">
                  <IconButton
                    color="primary"
                    onClick={handleSincronizar}
                    disabled={sincronizando}
                  >
                    <SyncIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <TemperaturaIndicador temperatura={lead.temperaturaLead} />
              <Box mt={2}>
                <Typography variant="body2">
                  <strong>Telefone:</strong> {lead.telefone || '--'}
                </Typography>
                <Typography variant="body2">
                  <strong>Email:</strong> {lead.email || '--'}
                </Typography>
                <Typography variant="body2">
                  <strong>Última mensagem:</strong>{' '}
                  {lead.ultimaMensagem
                    ? new Date(lead.ultimaMensagem).toLocaleDateString('pt-BR')
                    : '--'}
                </Typography>
              </Box>
              <Box mt={2} display="flex" flexDirection="column" gap={1}>
                <Button variant="contained" onClick={() => setDialogOpen(true)}>
                  Promover a Cliente
                </Button>
                <Button variant="outlined" onClick={handleVincularAgendor}>
                  Vincular ao Agendor
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={8}>
              <AnaliseIACard
                resumo={lead.resumoIA || lead.resumo || ''}
                sinaisCompra={sinaisCompra}
                objecoes={objecoes}
                sentimento={sentimento}
              />
            </Grid>

            {/* Insights Detalhados */}
            {loadingInsights ? (
              <Grid item xs={12}>
                <Box display="flex" justifyContent="center" padding={2}>
                  <CircularProgress size={24} />
                </Box>
              </Grid>
            ) : insights ? (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    <LightbulbIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Insights Detalhados
                  </Typography>
                </Grid>

                {/* Tendência */}
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getTendenciaIcon(insights.tendencia)}
                        <Typography variant="h6">Tendência</Typography>
                      </Box>
                      <Typography variant="h4" color="primary" sx={{ mt: 1 }}>
                        {getTendenciaLabel(insights.tendencia)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        Baseado na evolução do sentimento nas últimas mensagens
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Estatísticas */}
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Estatísticas
                      </Typography>
                      <Typography variant="body2">
                        Total de mensagens: <strong>{insights.totalMensagens}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Analisadas: <strong>{insights.totalAnalisadas}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Dias sem mensagem: <strong>{insights.diasSemMensagem}</strong>
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Sentimento */}
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Distribuição de Sentimento
                      </Typography>
                      <Box display="flex" flexDirection="column" gap={1}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Positivo:</Typography>
                          <Chip
                            label={insights.distribuicaoSentimento?.positivo || 0}
                            color="success"
                            size="small"
                          />
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Neutro:</Typography>
                          <Chip
                            label={insights.distribuicaoSentimento?.neutro || 0}
                            color="default"
                            size="small"
                          />
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Negativo:</Typography>
                          <Chip
                            label={insights.distribuicaoSentimento?.negativo || 0}
                            color="error"
                            size="small"
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Sinais de Compra */}
                {insights.sinaisCompra && insights.sinaisCompra.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Sinais de Compra Detectados
                        </Typography>
                        <List dense>
                          {insights.sinaisCompra.slice(0, 5).map((item, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={item.sinal.replace(/_/g, ' ').toUpperCase()}
                                secondary={`${item.ocorrencias} ocorrência(s)`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Objeções */}
                {insights.objecoes && insights.objecoes.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Objeções Identificadas
                        </Typography>
                        <List dense>
                          {insights.objecoes.slice(0, 5).map((item, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={item.objecao.replace(/_/g, ' ').toUpperCase()}
                                secondary={`${item.ocorrencias} ocorrência(s)`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Recomendações */}
                {insights.recomendacoes && insights.recomendacoes.length > 0 && (
                  <Grid item xs={12}>
                    <Card sx={{ backgroundColor: '#fff3e0' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          🎯 Recomendações
                        </Typography>
                        <List>
                          {insights.recomendacoes.map((rec, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <span>{rec.icone}</span>
                                    <Typography variant="body1" fontWeight="bold">
                                      {rec.mensagem}
                                    </Typography>
                                  </Box>
                                }
                                secondary={`Tipo: ${rec.tipo}`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Tópicos */}
                {insights.topicos && insights.topicos.length > 0 && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Tópicos Mais Discutidos
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                          {insights.topicos.slice(0, 10).map((item, index) => (
                            <Chip
                              key={index}
                              label={`${item.topico.replace(/_/g, ' ')} (${item.ocorrencias})`}
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </>
            ) : null}

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 2,
                  mt: 2
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Editar Lead
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Nome"
                      fullWidth
                      value={leadForm.nome}
                      onChange={handleLeadFieldChange('nome')}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Status"
                      fullWidth
                      select
                      value={leadForm.status}
                      onChange={handleLeadFieldChange('status')}
                    >
                      {statusOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Email"
                      fullWidth
                      value={leadForm.email}
                      onChange={handleLeadFieldChange('email')}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Telefone WhatsApp"
                      fullWidth
                      value={leadForm.telefone}
                      onChange={handleLeadFieldChange('telefone')}
                      helperText="Informe DDD + número; o prefixo 55 será aplicado automaticamente"
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Interesse em"
                      fullWidth
                      value={leadForm.interesseEm}
                      onChange={handleLeadFieldChange('interesseEm')}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Valor desejado"
                      fullWidth
                      value={leadForm.valorDesejado}
                      onChange={handleLeadFieldChange('valorDesejado')}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Prazo desejado"
                      fullWidth
                      value={leadForm.prazoDesejado}
                      onChange={handleLeadFieldChange('prazoDesejado')}
                    />
                  </Grid>
                </Grid>

                <Box mt={2} display="flex" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    onClick={handleSalvarLead}
                    disabled={salvandoLead || !lead}
                  >
                    {salvandoLead ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </Box>
              </Box>
            </Grid>

            {/* Análise Manual com IA */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Card sx={{ backgroundColor: '#f3e5f5' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <LightbulbIcon color="secondary" />
                    <Typography variant="h6">
                      Análise Manual com IA
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Adicione instruções personalizadas para refinar a análise de temperatura deste lead.
                    A IA usará essas informações junto com as mensagens para recalcular a temperatura.
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Instruções Personalizadas"
                    placeholder="Ex: Lead já comprou consórcio antes e teve boa experiência. Considere isso na análise."
                    value={instrucoesPersonalizadas}
                    onChange={(e) => setInstrucoesPersonalizadas(e.target.value)}
                    sx={{ mt: 2, mb: 2 }}
                    helperText="Exemplos: 'Lead tem urgência familiar', 'Desconsidere objeções iniciais', 'Cliente indicado por outro cliente'"
                  />
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleAnalisarComIA}
                    disabled={analisando || !lead}
                    startIcon={analisando ? <CircularProgress size={20} /> : <LightbulbIcon />}
                  >
                    {analisando ? 'Analisando...' : 'Analisar com IA'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Histórico de Conversa
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Mensagens importadas do WhatsApp. Para enviar novas mensagens, use o aplicativo
                WhatsApp diretamente.
              </Typography>
              <ConversaTimeline mensagens={mensagens} />
            </Grid>
          </Grid>
        )}
      </PapperBlock>

      <PromoverClienteDialog
        open={dialogOpen}
        lead={lead}
        onClose={() => setDialogOpen(false)}
        onConfirm={handlePromoverCliente}
      />

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

export default LeadDetalhes;
