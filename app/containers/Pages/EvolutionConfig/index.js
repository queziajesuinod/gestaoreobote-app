import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import {
  Grid,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  FormControl,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Snackbar,
  Alert,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Avatar,
  CircularProgress
} from '@mui/material';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import { evolutionApi } from '../../../services/leadsApi';
import useStyles from './styles';
import { getStoredUser } from '../../../utils/userStorage';
import SearchIcon from '@mui/icons-material/Search';

const initialForm = {
  instanceName: '',
  apiUrl: '',
  apiKey: '',
  sincronizarAutomaticamente: false,
  sincronizarApenas: 'nao_lidas'
};

const formatarUltimaSync = (value) => {
  if (!value) return '--';
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return '--';
  return data.toLocaleString('pt-BR');
};

const sanitizeApiUrl = (value = '') => {
  let url = (value || '').trim();
  if (!url) return '';
  url = url.replace(/\/+$/, '');
  url = url.replace(/\/instance$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
};

const extrairErroBackend = (error) => {
  const erroTecnico = error?.response?.data?.erro;
  const mensagem = error?.response?.data?.mensagem;
  if (erroTecnico && mensagem) return `${mensagem} (${erroTecnico})`;
  if (erroTecnico) return erroTecnico;
  if (mensagem) return mensagem;
  return error?.message || 'Erro desconhecido';
};

function EvolutionConfig() {
  const { classes } = useStyles();
  const title = `${brand.name} - Configuracao WhatsApp`;
  const description = 'Configuracao da Evolution API';

  const getToken = () => localStorage.getItem('token');

  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ conectado: false, ultimaSincronizacao: null, configurada: false });
  const [carregandoStatus, setCarregandoStatus] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [cargaInicializando, setCargaInicializando] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [storedUser, setStoredUserState] = useState(() => getStoredUser());
  const [consultores, setConsultores] = useState([]);
  const [consultorSelecionado, setConsultorSelecionado] = useState('');
  const [carregandoConsultores, setCarregandoConsultores] = useState(false);
  const [contatosDialogAberto, setContatosDialogAberto] = useState(false);
  const [contatosPesquisa, setContatosPesquisa] = useState('');
  const [contatosResultados, setContatosResultados] = useState([]);
  const [carregandoContatosBusca, setCarregandoContatosBusca] = useState(false);
  const [contatosErroBusca, setContatosErroBusca] = useState('');
  const [importandoContatoId, setImportandoContatoId] = useState(null);

  const perfilUsuario = storedUser?.perfil?.toUpperCase() || '';
  const isAdminPerfil = perfilUsuario === 'ADMIN' || perfilUsuario === 'GESTOR';
  const consultorIdLogado = storedUser?.consultorId ? String(storedUser.consultorId) : '';

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const getConsultorIdPayload = useCallback(() => (
    isAdminPerfil ? consultorSelecionado : consultorIdLogado
  ), [isAdminPerfil, consultorSelecionado, consultorIdLogado]);

  const carregarContatosParaPesquisa = useCallback(async (termo = '') => {
    const consultorIdPayload = getConsultorIdPayload();
    if (isAdminPerfil && !consultorIdPayload) {
      setContatosErroBusca('Selecione um consultor antes de buscar contatos.');
      setContatosResultados([]);
      return;
    }
    if (!consultorIdPayload) {
      setContatosErroBusca('Consultor indisponível.');
      setContatosResultados([]);
      return;
    }

    if (!termo.trim()) {
      setContatosErroBusca('');
      setContatosResultados([]);
      setCarregandoContatosBusca(false);
      return;
    }

    setContatosErroBusca('');
    setCarregandoContatosBusca(true);
    try {
      const response = await evolutionApi.listarContatos({
        consultorId: consultorIdPayload,
        search: termo,
        limit: 50
      });
      setContatosResultados(Array.isArray(response?.contatos) ? response.contatos : []);
    } catch (error) {
      console.error('Erro ao buscar contatos para importação:', error);
      setContatosErroBusca('Falha ao buscar contatos.');
      showSnackbar('Falha ao carregar contatos.', 'error');
      setContatosResultados([]);
    } finally {
      setCarregandoContatosBusca(false);
    }
  }, [getConsultorIdPayload, isAdminPerfil, showSnackbar]);

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

  const carregarConsultores = async () => {
    setCarregandoConsultores(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003'}/consultor`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) {
        const texto = await response.text().catch(() => '');
        throw new Error(texto || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setConsultores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      showSnackbar('Falha ao carregar consultores.', 'error');
      setConsultores([]);
    } finally {
      setCarregandoConsultores(false);
    }
  };

  const carregarStatus = async (consultorId) => {
    setCarregandoStatus(true);
    try {
      const response = await evolutionApi.status(consultorId);
      const instancia = response?.instancia || null;
      setStatus({
        conectado: instancia?.status === 'conectada',
        ultimaSincronizacao: instancia?.ultimaSincronizacao || null,
        configurada: Boolean(response?.configurada)
      });
      if (instancia) {
        setForm({
          instanceName: instancia.instanceName || '',
          apiUrl: sanitizeApiUrl(instancia.apiUrl || ''),
          apiKey: instancia.apiKey || '',
          sincronizarAutomaticamente: Boolean(instancia.sincronizarAutomaticamente),
          sincronizarApenas: instancia.sincronizarApenas || 'nao_lidas'
        });
      }
      return true;
    } catch (error) {
      console.error('Erro ao carregar status:', error);
      showSnackbar(`Falha ao carregar status da conexao: ${extrairErroBackend(error)}`, 'error');
      return false;
    } finally {
      setCarregandoStatus(false);
    }
  };

  useEffect(() => {
    if (isAdminPerfil) {
      carregarConsultores();
    }
  }, [isAdminPerfil]);

  useEffect(() => {
    if (!isAdminPerfil) return;
    if (consultorSelecionado) return;
    if (consultores.length === 0) return;

    const consultorLogadoValido = consultorIdLogado
      && consultores.some((consultor) => String(consultor.id) === consultorIdLogado);

    setConsultorSelecionado(consultorLogadoValido ? consultorIdLogado : String(consultores[0].id));
  }, [consultores, consultorIdLogado, consultorSelecionado, isAdminPerfil]);

  useEffect(() => {
    if (!isAdminPerfil && consultorIdLogado) {
      setConsultorSelecionado(consultorIdLogado);
    }
  }, [consultorIdLogado, isAdminPerfil]);

  useEffect(() => {
    if (isAdminPerfil) {
      if (consultorSelecionado) {
        carregarStatus(consultorSelecionado);
      }
      return;
    }

    if (consultorIdLogado) {
      carregarStatus(consultorIdLogado);
    }
  }, [consultorIdLogado, consultorSelecionado, isAdminPerfil]);

  // Busca removida do useEffect - agora é manual via botão

  const handleChange = (campo) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm(prev => ({ ...prev, [campo]: value }));
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const consultorIdPayload = isAdminPerfil ? consultorSelecionado : consultorIdLogado;
      if (isAdminPerfil && !consultorIdPayload) {
        showSnackbar('Selecione um consultor antes de salvar.', 'warning');
        setSalvando(false);
        return;
      }
      const apiUrlSanitizada = sanitizeApiUrl(form.apiUrl);
      if (apiUrlSanitizada !== form.apiUrl) {
        setForm(prev => ({ ...prev, apiUrl: apiUrlSanitizada }));
      }
      await evolutionApi.configurar({
        instanceName: form.instanceName,
        apiUrl: apiUrlSanitizada,
        apiKey: form.apiKey,
        sincronizarAutomaticamente: form.sincronizarAutomaticamente,
        sincronizarApenas: form.sincronizarApenas,
        consultorId: consultorIdPayload || undefined
      });
      showSnackbar('Configuracao salva com sucesso.', 'success');
      carregarStatus(consultorIdPayload || undefined);
    } catch (error) {
      console.error('Erro ao salvar configuracao:', error);
      showSnackbar(`Falha ao salvar configuracao: ${extrairErroBackend(error)}`, 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleTestar = async () => {
    const consultorIdPayload = isAdminPerfil ? consultorSelecionado : consultorIdLogado;
    if (isAdminPerfil && !consultorIdPayload) {
      showSnackbar('Selecione um consultor antes de testar.', 'warning');
      return;
    }
    const ok = await carregarStatus(consultorIdPayload || undefined);
    if (ok) {
      showSnackbar('Status atualizado.', 'success');
    }
  };



  const handleCargaInicial = async () => {
    setCargaInicializando(true);
    try {
      const consultorIdPayload = isAdminPerfil ? consultorSelecionado : consultorIdLogado;
      if (isAdminPerfil && !consultorIdPayload) {
        showSnackbar('Selecione um consultor antes de executar a carga inicial.', 'warning');
        setCargaInicializando(false);
        return;
      }
      const response = await evolutionApi.cargaInicial(consultorIdPayload || undefined);
      showSnackbar(response?.mensagem || 'Carga inicial solicitada com sucesso.', 'success');
      carregarStatus(consultorIdPayload || undefined);
    } catch (error) {
      console.error('Erro ao executar carga inicial:', error);
      showSnackbar(`Falha ao executar carga inicial: ${extrairErroBackend(error)}`, 'error');
    } finally {
      setCargaInicializando(false);
    }
  };

  const handleAbrirDialogContatos = () => {
    setContatosPesquisa('');
    setContatosResultados([]);
    setContatosErroBusca('');
    setContatosDialogAberto(true);
  };

  const handleFecharDialogContatos = () => {
    if (carregandoContatosBusca) return;
    setContatosDialogAberto(false);
    setContatosPesquisa('');
    setContatosResultados([]);
    setContatosErroBusca('');
  };

  const handleBuscarContatos = () => {
    const termo = contatosPesquisa.trim();
    if (!termo) {
      setContatosErroBusca('Digite um número ou nome para buscar.');
      return;
    }
    carregarContatosParaPesquisa(termo);
  };

  const handleImportarContato = async (contato) => {
    const consultorIdPayload = getConsultorIdPayload();
    if (isAdminPerfil && !consultorIdPayload) {
      showSnackbar('Selecione um consultor antes de importar por contato.', 'warning');
      return;
    }
    if (!contato?.chatId) {
      showSnackbar('Contato inválido.', 'error');
      return;
    }
    setImportandoContatoId(contato.chatId);
    try {
      const response = await evolutionApi.importarContato({
        consultorId: consultorIdPayload || undefined,
        chatId: contato.chatId,
        nome: contato.nome,
        pushName: contato.pushName
      });
      showSnackbar(response?.mensagem || 'Contato importado com sucesso.', 'success');
      carregarStatus(consultorIdPayload || undefined);
      handleFecharDialogContatos();
    } catch (error) {
      console.error('Erro ao importar contato:', error);
      showSnackbar(`Falha ao importar contato: ${extrairErroBackend(error)}`, 'error');
    } finally {
      setImportandoContatoId(null);
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

      <PapperBlock title="Configuracao WhatsApp" desc="Conecte a Evolution API ao painel">
        <Box className={classes.statusRow}>
          <Typography variant="subtitle1">Status:</Typography>
          <Chip
            color={status.conectado ? 'success' : 'default'}
            label={status.conectado ? 'Conectado' : 'Desconectado'}
            size="small"
          />
          <Typography variant="body2" color="textSecondary">
            {carregandoStatus
              ? 'Atualizando status...'
              : `Ultima sincronizacao: ${formatarUltimaSync(status.ultimaSincronizacao)}`}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} className={classes.card}>
              <Typography variant="h6" gutterBottom>
                Configuracao da instancia
              </Typography>
              {isAdminPerfil && (
                <FormControl fullWidth margin="normal" disabled={carregandoConsultores}>
                  <InputLabel>Consultor</InputLabel>
                  <Select
                    label="Consultor"
                    value={consultorSelecionado}
                    onChange={(event) => setConsultorSelecionado(event.target.value)}
                  >
                    <MenuItem value="">
                      {carregandoConsultores ? 'Carregando...' : 'Selecione'}
                    </MenuItem>
                    {consultores.map((consultor) => (
                      <MenuItem key={consultor.id} value={String(consultor.id)}>
                        {consultor.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                label="Nome da instancia"
                value={form.instanceName}
                onChange={handleChange('instanceName')}
                fullWidth
                margin="normal"
              />
              <TextField
                label="URL da API"
                value={form.apiUrl}
                onChange={handleChange('apiUrl')}
                fullWidth
                margin="normal"
              />
              <TextField
                label="API Key"
                value={form.apiKey}
                onChange={handleChange('apiKey')}
                fullWidth
                margin="normal"
                type="password"
              />
              <Box mt={1}>
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={form.sincronizarAutomaticamente}
                      onChange={handleChange('sincronizarAutomaticamente')}
                    />
                  )}
                  label="Sincronizar automaticamente"
                />
              </Box>
              <FormControl fullWidth margin="normal">
                <InputLabel>Tipo de sincronização</InputLabel>
                <Select
                  label="Tipo de sincronização"
                  value={form.sincronizarApenas}
                  onChange={handleChange('sincronizarApenas')}
                >
                  <MenuItem value="nao_lidas">Apenas não lidas</MenuItem>
                  <MenuItem value="todas">Todas as mensagens</MenuItem>
                  <MenuItem value="ultimas_24h">Últimas 24 horas</MenuItem>
                </Select>
              </FormControl>
              <Box className={classes.actions}>
                <Button variant="outlined" onClick={handleTestar} disabled={carregandoStatus}>
                  Testar conexao
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSalvar}
                  disabled={salvando}
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={2} className={classes.card}>
              <Typography variant="h6" gutterBottom>
                Importar conversas
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Importa todos os chats do WhatsApp como leads automaticamente.
              </Typography>
              <Box className={classes.actions}>
                <Button
                  variant="contained"
                  color="info"
                  onClick={handleCargaInicial}
                  disabled={cargaInicializando}
                >
                  {cargaInicializando ? 'Executando...' : 'Carga inicial'}
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleAbrirDialogContatos}
                  disabled={contatosDialogAberto}
                  sx={{ ml: 2 }}
                >
                  Importar por contato
                </Button>
              </Box>
            </Paper>
        </Grid>
      </Grid>
    </PapperBlock>

      <Dialog
        open={contatosDialogAberto}
        onClose={(event, reason) => {
          if (reason === 'backdropClick' && carregandoContatosBusca) return;
          handleFecharDialogContatos();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Importar histórico por contato</DialogTitle>
        <DialogContent dividers>
          <Box display="flex" gap={1} alignItems="flex-start">
            <TextField
              label="Buscar contato"
              value={contatosPesquisa}
              onChange={(event) => setContatosPesquisa(event.target.value)}
              onKeyPress={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleBuscarContatos();
                }
              }}
              fullWidth
              margin="dense"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleBuscarContatos}
              disabled={carregandoContatosBusca || !contatosPesquisa.trim()}
              sx={{ mt: 1, minWidth: 100 }}
            >
              {carregandoContatosBusca ? 'Buscando...' : 'Buscar'}
            </Button>
          </Box>
          {contatosErroBusca && (
            <Typography variant="body2" color="error" gutterBottom>
              {contatosErroBusca}
            </Typography>
          )}
          {carregandoContatosBusca ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List disablePadding>
              {contatosResultados.map((contato) => {
                const chave = contato.chatId || contato.telefone || contato.id;
                const estaImportando = importandoContatoId === contato.chatId;
                return (
                  <ListItem key={chave} divider>
                    <ListItemAvatar>
                      <Avatar>
                        {contato.nome ? contato.nome.charAt(0) : (contato.telefone || '?').charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={contato.nome || 'Contato'}
                      secondary={contato.telefone || contato.chatId}
                    />
                    <ListItemSecondaryAction>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => handleImportarContato(contato)}
                        disabled={importandoContatoId && !estaImportando}
                      >
                        {estaImportando ? 'Importando...' : 'Importar'}
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
              {!contatosResultados.length && !carregandoContatosBusca && !contatosErroBusca && (
                <ListItem>
                  <ListItemText
                    primary="Nenhum contato encontrado"
                    secondary="Tente outro nome ou número"
                  />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFecharDialogContatos}>Fechar</Button>
        </DialogActions>
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

export default EvolutionConfig;
