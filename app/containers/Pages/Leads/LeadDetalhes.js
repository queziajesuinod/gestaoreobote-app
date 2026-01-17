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
  MenuItem
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import { leadsApi, evolutionApi } from '../../../services/leadsApi';
import TemperaturaIndicador from '../../../components/TemperaturaIndicador';
import AnaliseIACard from '../../../components/AnaliseIACard';
import ConversaTimeline from '../../../components/ConversaTimeline';
import PromoverClienteDialog from '../../../components/PromoverClienteDialog';

const normalizarLead = (data) => {
  if (!data) return null;
  return data.lead || data.dados || data;
};

function LeadDetalhes() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const title = `${brand.name} - Lead`;
  const description = 'Detalhes do lead';

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
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

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const carregarLead = useCallback(async () => {
    setLoading(true);
    try {
      const response = await leadsApi.obter(leadId);
      setLead(normalizarLead(response));
    } catch (error) {
      console.error('Erro ao carregar lead:', error);
      showSnackbar('Falha ao carregar lead.', 'error');
      setLead(null);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    carregarLead();
  }, [carregarLead]);

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

  const handleEnviarMensagem = async () => {
    const texto = mensagem.trim();
    if (!texto) return;
    setEnviando(true);
    try {
      await evolutionApi.enviarMensagem(leadId, texto);
      setMensagem('');
      showSnackbar('Mensagem enviada.', 'success');
      carregarLead();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      showSnackbar('Falha ao enviar mensagem.', 'error');
    } finally {
      setEnviando(false);
    }
  };

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

      <PapperBlock title="Detalhes do Lead" desc="Informacoes completas e historico">
        {loading ? (
          <Box display="flex" justifyContent="center" padding={4}>
            <CircularProgress />
          </Box>
        ) : !lead ? (
          <Typography variant="body2" color="textSecondary">
            Lead nao encontrado.
          </Typography>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Button onClick={() => navigate('/app/leads')}>Voltar</Button>
              <Typography variant="h4" gutterBottom>
                {lead.nome || 'Lead'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TemperaturaIndicador temperatura={lead.temperaturaLead} />
              <Box mt={2}>
                <Typography variant="body2">Telefone: {lead.telefone || '--'}</Typography>
                <Typography variant="body2">Email: {lead.email || '--'}</Typography>
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

            <Grid item xs={12}>
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

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Conversa
              </Typography>
              <ConversaTimeline mensagens={mensagens} />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Enviar mensagem
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Digite sua mensagem"
                value={mensagem}
                onChange={(event) => setMensagem(event.target.value)}
              />
              <Box mt={2}>
                <Button
                  variant="contained"
                  onClick={handleEnviarMensagem}
                  disabled={enviando}
                >
                  {enviando ? 'Enviando...' : 'Enviar'}
                </Button>
              </Box>
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
