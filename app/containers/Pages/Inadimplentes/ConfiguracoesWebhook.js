import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Replay as RetryIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import brand from 'dan-api/dummy/brand';
import * as inadimplentesApi from '../../../services/inadimplentesApi';

function ConfiguracoesWebhook() {
  const title = `${brand.name} - Configurações de Webhook`;
  const description = 'Gerenciamento de webhook para notificações de inadimplência';

  // Estados
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);

  // Configuração
  const [config, setConfig] = useState({
    nome: 'Webhook Inadimplência',
    url: '',
    secretKey: '',
    metodo: 'POST',
    ativo: true,
    maxTentativas: 4,
    timeout: 30000
  });

  // Logs
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);

  // Estatísticas
  const [stats, setStats] = useState({
    total: 0,
    sucesso: 0,
    falha: 0,
    pendente: 0
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

  useEffect(() => {
    carregarLogs();
  }, [page, rowsPerPage]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await inadimplentesApi.obterConfiguracaoWebhook();
      
      if (response.dados) {
        setConfig({
          id: response.dados.id,
          nome: response.dados.nome || 'Webhook Inadimplência',
          url: response.dados.url || '',
          secretKey: response.dados.secretKey || '',
          metodo: response.dados.metodo || 'POST',
          ativo: response.dados.ativo !== false,
          maxTentativas: response.dados.maxTentativas || 4,
          timeout: response.dados.timeout || 30000
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      mostrarSnackbar('Erro ao carregar configuração', 'error');
    } finally {
      setLoading(false);
    }
  };

  const carregarLogs = async () => {
    try {
      const response = await inadimplentesApi.listarLogsWebhook({
        page: page + 1,
        limit: rowsPerPage
      });

      setLogs(response.dados || []);
      setTotalLogs(response.total || 0);

      // Calcular estatísticas
      const total = response.total || 0;
      const sucesso = response.dados?.filter(log => log.sucesso).length || 0;
      const falha = response.dados?.filter(log => !log.sucesso && log.tentativas >= 4).length || 0;
      const pendente = response.dados?.filter(log => !log.sucesso && log.tentativas < 4).length || 0;

      setStats({ total, sucesso, falha, pendente });
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  const mostrarSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fecharSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSalvar = async () => {
    // Validações
    if (!config.url.trim()) {
      mostrarSnackbar('URL do webhook é obrigatória', 'error');
      return;
    }

    if (!config.url.startsWith('http://') && !config.url.startsWith('https://')) {
      mostrarSnackbar('URL deve começar com http:// ou https://', 'error');
      return;
    }

    if (!config.secretKey || !config.secretKey.trim()) {
      mostrarSnackbar('Secret Key é obrigatório para segurança', 'error');
      return;
    }

    if (config.secretKey.length < 16) {
      mostrarSnackbar('Secret Key deve ter no mínimo 16 caracteres', 'error');
      return;
    }

    try {
      setSalvando(true);
      await inadimplentesApi.salvarConfiguracaoWebhook(config);
      mostrarSnackbar('Configuração salva com sucesso');
      await carregarDados();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      mostrarSnackbar('Erro ao salvar configuração', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleTestarWebhook = async () => {
    if (!config.url.trim()) {
      mostrarSnackbar('Configure a URL do webhook primeiro', 'error');
      return;
    }

    try {
      setTestando(true);
      const response = await fetch('/api/inadimplentes/configuracoes/webhook/testar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.sucesso) {
        mostrarSnackbar('Webhook de teste enviado com sucesso! Verifique os logs abaixo.', 'success');
      } else {
        mostrarSnackbar(`Erro ao enviar webhook: ${data.erro || data.mensagem}`, 'error');
      }
      
      await carregarLogs();
      
      // Recarregar logs após 2 segundos
      setTimeout(() => {
        carregarLogs();
      }, 2000);
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      mostrarSnackbar('Erro ao enviar webhook de teste', 'error');
    } finally {
      setTestando(false);
    }
  };

  const handleReenviar = async (logId) => {
    try {
      await inadimplentesApi.reenviarWebhook(logId);
      mostrarSnackbar('Webhook reenviado com sucesso');
      await carregarLogs();
    } catch (error) {
      console.error('Erro ao reenviar webhook:', error);
      mostrarSnackbar('Erro ao reenviar webhook', 'error');
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const gerarSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let secretKey = '';
    for (let i = 0; i < 32; i++) {
      secretKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setConfig({ ...config, secretKey });
    mostrarSnackbar('Secret Key gerado com sucesso', 'success');
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
        title="Configurações de Webhook"
        desc="Configure o webhook para receber notificações de inadimplência"
        icon="ion-ios-settings-outline"
      >
        {/* Formulário de Configuração */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configuração do Webhook
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              O webhook será chamado automaticamente quando uma inadimplência for detectada.
              Configure a URL do seu sistema externo e um secret para validação de segurança.
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="URL do Webhook"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value })}
                  placeholder="https://seu-sistema.com/api/webhooks/inadimplencia"
                  helperText="URL completa onde o webhook será enviado"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Secret Key (Chave Secreta)"
                  value={config.secretKey}
                  onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
                  placeholder="Mínimo 16 caracteres"
                  helperText="Usado para assinar o webhook com HMAC SHA256. Mínimo 16 caracteres."
                  InputProps={{
                    endAdornment: (
                      <Button size="small" onClick={gerarSecret}>
                        Gerar
                      </Button>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={salvando ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSalvar}
                    disabled={salvando}
                  >
                    Salvar Configuração
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={testando ? <CircularProgress size={20} /> : <SendIcon />}
                    onClick={handleTestarWebhook}
                    disabled={testando || !config.url}
                  >
                    Testar Webhook
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={carregarLogs}
                  >
                    Atualizar Logs
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="textSecondary">
                  Total de Envios
                </Typography>
                <Typography variant="h4">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SuccessIcon color="success" />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Sucesso
                    </Typography>
                    <Typography variant="h4">
                      {stats.sucesso}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'error.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ErrorIcon color="error" />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Falhas
                    </Typography>
                    <Typography variant="h4">
                      {stats.falha}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'warning.light' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PendingIcon color="warning" />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Pendentes
                    </Typography>
                    <Typography variant="h4">
                      {stats.pendente}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabela de Logs */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Histórico de Webhooks Enviados
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data/Hora</TableCell>
                    <TableCell>Cota</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Mês</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Tentativas</TableCell>
                    <TableCell>Resposta</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhum webhook enviado ainda
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {inadimplentesApi.formatarDataHora(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          {log.CobrancaMensal?.ProcessoCobranca?.Cota?.numero || '-'}
                        </TableCell>
                        <TableCell>
                          {log.CobrancaMensal?.ProcessoCobranca?.Cota?.Cliente?.nome || '-'}
                        </TableCell>
                        <TableCell>
                          {log.CobrancaMensal ? inadimplentesApi.formatarData(log.CobrancaMensal.mesReferencia) : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.sucesso ? 'Sucesso' : 'Falha'}
                            color={log.sucesso ? 'success' : 'error'}
                            size="small"
                            icon={log.sucesso ? <SuccessIcon /> : <ErrorIcon />}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${log.tentativas}/4`}
                            color={log.tentativas >= 4 ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={log.respostaServidor || 'Sem resposta'}>
                            <Typography
                              variant="caption"
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block'
                              }}
                            >
                              {log.respostaServidor || '-'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          {!log.sucesso && log.tentativas < 4 && (
                            <Tooltip title="Reenviar Webhook">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleReenviar(log.id)}
                              >
                                <RetryIcon fontSize="small" />
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
              count={totalLogs}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </CardContent>
        </Card>

        {/* Documentação */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Documentação do Webhook
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Formato do Payload
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.100' }}>
              <pre style={{ margin: 0, fontSize: '0.875rem', overflow: 'auto' }}>
{`{
  "evento": "inadimplencia_detectada",
  "timestamp": "2026-01-17T08:00:00Z",
  "cota": {
    "numero": "123456",
    "grupo": "G-01"
  },
  "cliente": {
    "nome": "João Silva",
    "telefone": "67999999999",
    "email": "joao@email.com"
  },
  "consultor": {
    "nome": "Maria Santos",
    "telefone": "67988888888"
  },
  "cobranca": {
    "id": "uuid",
    "mes_referencia": "2026-01",
    "valor": 500.00,
    "data_vencimento": "2026-01-10",
    "dias_atraso": 7,
    "status": "atrasado"
  },
  "callback_url": "https://sistema/api/webhooks/callback/uuid"
}`}
              </pre>
            </Paper>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Validação de Segurança
            </Typography>
            <Typography variant="body2" paragraph>
              Todos os webhooks incluem um header <code>X-Webhook-Signature</code> com a assinatura HMAC SHA256 do payload.
              Valide a assinatura usando o secret configurado para garantir a autenticidade.
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Callback de Confirmação
            </Typography>
            <Typography variant="body2" paragraph>
              Após processar o webhook, seu sistema deve enviar um callback para a URL fornecida no payload
              confirmando o recebimento e status da notificação.
            </Typography>
          </CardContent>
        </Card>
      </PapperBlock>

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

export default ConfiguracoesWebhook;
