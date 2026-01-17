import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import {
  Grid,
  Typography,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Box,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AddIcon from '@mui/icons-material/Add';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import { leadsApi, evolutionApi, API_URL, getAuthHeader } from '../../../services/leadsApi';
import LeadCard from '../../../components/LeadCard';
import useStyles from './styles';
import { getStoredUser } from '../../../utils/userStorage';

const normalizarLeads = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.leads)) return data.leads;
  if (Array.isArray(data?.dados)) return data.dados;
  if (data?.agrupados) {
    const { quentes = [], mornos = [], frios = [] } = data.agrupados;
    return [...quentes, ...mornos, ...frios];
  }
  return [];
};

const STATUS_OPTIONS = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_contato', label: 'Em contato' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'perdido', label: 'Perdido' },
  { value: 'convertido', label: 'Convertido' }
];

const agruparPorTemperatura = (lista) => {
  const grupos = { quentes: [], mornos: [], frios: [] };
  lista.forEach((lead) => {
    const temperatura = Number(lead?.temperaturaLead) || 0;
    if (temperatura >= 70) {
      grupos.quentes.push(lead);
    } else if (temperatura >= 40) {
      grupos.mornos.push(lead);
    } else {
      grupos.frios.push(lead);
    }
  });

  grupos.quentes.sort((a, b) => (Number(b.temperaturaLead) || 0) - (Number(a.temperaturaLead) || 0));
  grupos.mornos.sort((a, b) => (Number(b.temperaturaLead) || 0) - (Number(a.temperaturaLead) || 0));
  grupos.frios.sort((a, b) => (Number(b.temperaturaLead) || 0) - (Number(a.temperaturaLead) || 0));

  return grupos;
};

const getConsultorId = (lead) => {
  if (lead?.consultorId) return String(lead.consultorId);
  if (lead?.consultor?.id) return String(lead.consultor.id);
  if (lead?.consultor) return String(lead.consultor);
  return '';
};

const getConsultorNome = (lead) => {
  if (lead?.consultorNome) return lead.consultorNome;
  if (lead?.consultor?.nome) return lead.consultor.nome;
  return null;
};

function LeadsPage() {
  const { classes } = useStyles();
  const title = `${brand.name} - Leads`;
  const description = 'Gestao de leads com IA';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [storedUser, setStoredUserState] = useState(() => getStoredUser());
  const [novoLeadOpen, setNovoLeadOpen] = useState(false);
  const [novoLeadForm, setNovoLeadForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    temperaturaLead: '',
    status: 'novo',
    consultorId: ''
  });
  const [consultores, setConsultores] = useState([]);
  const [consultoresCarregando, setConsultoresCarregando] = useState(false);

  const consultorId = storedUser?.consultorId || null;
  const isGestor = storedUser?.perfilId === 1;
  const needConsultorSelection = !consultorId || isGestor;
  const consultorFiltroInicial = !isGestor && consultorId ? String(consultorId) : 'Todos';

  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'Todos',
    temperatura: 'Todos',
    consultor: consultorFiltroInicial
  });

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

  useEffect(() => {
    if (!isGestor && consultorId) {
      setFiltros((prev) => {
        const consultorValue = String(consultorId);
        if (prev.consultor === consultorValue) return prev;
        return { ...prev, consultor: consultorValue };
      });
    }
  }, [consultorId, isGestor]);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

  const carregarLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await leadsApi.listar(consultorId);
      setLeads(normalizarLeads(response));
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      showSnackbar('Falha ao carregar leads.', 'error');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [consultorId, showSnackbar]);

  useEffect(() => {
    carregarLeads();
  }, [carregarLeads]);

  useEffect(() => {
    let ativo = true;
    setConsultoresCarregando(true);
    (async () => {
      try {
        const response = await fetch(`${API_URL}/consultor`, {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          }
        });
        if (!response.ok) {
          const texto = await response.text().catch(() => '');
          throw new Error(texto || `HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!ativo) return;
        setConsultores(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao carregar consultores:', error);
      } finally {
        if (ativo) setConsultoresCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [isGestor]);

  useEffect(() => {
    if (!needConsultorSelection || consultores.length === 0) return;
    setNovoLeadForm((prev) => {
      if (prev.consultorId) return prev;
      return { ...prev, consultorId: String(consultores[0].id) };
    });
  }, [consultores, needConsultorSelection]);

  const statusOptions = useMemo(() => {
    const mapa = new Set();
    leads.forEach((lead) => {
      if (lead?.status) mapa.add(lead.status);
    });
    return Array.from(mapa);
  }, [leads]);

  const consultorOptionsFromLeads = useMemo(() => {
    const mapa = new Map();
    leads.forEach((lead) => {
      const id = getConsultorId(lead);
      if (!id) return;
      const nome = getConsultorNome(lead) || `Consultor ${id}`;
      if (!mapa.has(id)) {
        mapa.set(id, nome);
      }
    });
    return Array.from(mapa.entries()).map(([id, nome]) => ({ id, nome }));
  }, [leads]);

  const consultorOptionsFromApi = useMemo(() => (
    consultores.map((consultor) => ({
      id: String(consultor.id),
      nome: consultor.nome
    }))
  ), [consultores]);

  const consultorOptions = consultorOptionsFromApi.length
    ? consultorOptionsFromApi
    : consultorOptionsFromLeads;

  const consultorFilterOptions = useMemo(() => {
    if (isGestor) return consultorOptions;
    if (!consultorId) return [];
    const nome = storedUser?.nome || 'Meu consultor';
    return [{ id: String(consultorId), nome }];
  }, [isGestor, consultorId, storedUser, consultorOptions]);

  const leadsFiltrados = useMemo(() => {
    const busca = filtros.busca.trim().toLowerCase();
    return leads.filter((lead) => {
      if (filtros.status !== 'Todos' && lead?.status !== filtros.status) return false;

      if (filtros.temperatura !== 'Todos') {
        const temperatura = Number(lead?.temperaturaLead) || 0;
        if (filtros.temperatura === 'Quente' && temperatura < 70) return false;
        if (filtros.temperatura === 'Morno' && (temperatura < 40 || temperatura >= 70)) return false;
        if (filtros.temperatura === 'Frio' && temperatura >= 40) return false;
      }

      if (filtros.consultor !== 'Todos') {
        const consultor = getConsultorId(lead);
        if (String(consultor) !== String(filtros.consultor)) return false;
      }

      if (!busca) return true;
      const nome = (lead?.nome || '').toLowerCase();
      const telefone = (lead?.telefone || '').toLowerCase();
      const email = (lead?.email || '').toLowerCase();
      return nome.includes(busca) || telefone.includes(busca) || email.includes(busca);
    });
  }, [leads, filtros]);

  const agrupados = useMemo(() => agruparPorTemperatura(leadsFiltrados), [leadsFiltrados]);

  const leadsNovos = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    return leads.filter((lead) => {
      const criadoEm = lead?.createdAt ? new Date(lead.createdAt) : null;
      return criadoEm && criadoEm >= limite;
    });
  }, [leads]);

  const handleFiltroChange = (campo) => (event) => {
    setFiltros(prev => ({ ...prev, [campo]: event.target.value }));
  };

  const handleAtualizarConversas = async () => {
    const consultorAlvo = isGestor
      ? (filtros.consultor !== 'Todos' ? Number(filtros.consultor) : null)
      : consultorId;

    if (!consultorAlvo) {
      showSnackbar('Selecione um consultor antes de atualizar conversas.', 'warning');
      return;
    }

    setImportando(true);
    try {
      const response = await evolutionApi.sincronizarMensagens(consultorAlvo);
      showSnackbar(response?.mensagem || 'Conversas sincronizadas com sucesso.', 'success');
      carregarLeads();
    } catch (error) {
      console.error('Erro ao sincronizar conversas:', error);
      showSnackbar('Falha ao sincronizar conversas.', 'error');
    } finally {
      setImportando(false);
    }
  };

  const handleNovoLeadChange = (campo) => (event) => {
    setNovoLeadForm(prev => ({ ...prev, [campo]: event.target.value }));
  };

  const handleCriarLead = async () => {
    try {
      if (needConsultorSelection && !novoLeadForm.consultorId) {
        showSnackbar('Selecione um consultor para o lead.', 'warning');
        return;
      }
      const temperaturaValor = novoLeadForm.temperaturaLead !== ''
        ? Number(novoLeadForm.temperaturaLead)
        : undefined;
      const payload = {
        nome: novoLeadForm.nome,
        telefone: novoLeadForm.telefone,
        email: novoLeadForm.email,
        status: novoLeadForm.status || 'novo',
        interesseEm: novoLeadForm.interesseEm,
        valorDesejado: novoLeadForm.valorDesejado,
        prazoDesejado: novoLeadForm.prazoDesejado,
        temperaturaLead: temperaturaValor,
        ...(needConsultorSelection
          ? { consultorId: Number(novoLeadForm.consultorId) || undefined }
          : {})
      };
      await leadsApi.criar(payload);
      showSnackbar('Lead criado com sucesso.', 'success');
      setNovoLeadOpen(false);
      setNovoLeadForm({
        nome: '',
        telefone: '',
        email: '',
        temperaturaLead: '',
        status: 'novo',
        consultorId: ''
      });
      carregarLeads();
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      showSnackbar('Falha ao criar lead.', 'error');
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

      <PapperBlock title="Leads" desc="Central de leads com temperatura e IA">
        <Box className={classes.headerRow}>
          <Typography variant="h5">Lista de Leads</Typography>
          <Box className={classes.actions}>
            <Button
              variant="contained"
              color="success"
              startIcon={<WhatsAppIcon />}
              onClick={handleAtualizarConversas}
              disabled={importando}
            >
              {importando ? 'Atualizando...' : 'Atualizar conversas'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setNovoLeadOpen(true)}
            >
              Novo Lead Manual
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2} className={classes.filters}>
          <Grid item xs={12} md={4}>
            <TextField
              label="Buscar"
              value={filtros.busca}
              onChange={handleFiltroChange('busca')}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={filtros.status} onChange={handleFiltroChange('status')}>
                <MenuItem value="Todos">Todos</MenuItem>
                {statusOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Temperatura</InputLabel>
              <Select
                label="Temperatura"
                value={filtros.temperatura}
                onChange={handleFiltroChange('temperatura')}
              >
                <MenuItem value="Todos">Todos</MenuItem>
                <MenuItem value="Quente">Quentes</MenuItem>
                <MenuItem value="Morno">Mornos</MenuItem>
                <MenuItem value="Frio">Frios</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Consultor</InputLabel>
              <Select
                label="Consultor"
                value={filtros.consultor}
                onChange={handleFiltroChange('consultor')}
                disabled={!isGestor}
              >
                {isGestor && (
                  <MenuItem value="Todos">Todos</MenuItem>
                )}
                {consultorFilterOptions.map((consultor) => (
                  <MenuItem key={consultor.id} value={consultor.id}>
                    {consultor.nome}
                  </MenuItem>
                ))}
                {!isGestor && consultorFilterOptions.length === 0 && (
                  <MenuItem value="" disabled>
                    Consultor não disponível
                  </MenuItem>
                )}
                {isGestor && consultorFilterOptions.length === 0 && (
                  <MenuItem value="" disabled>
                    {consultoresCarregando ? 'Carregando consultores...' : 'Nenhum consultor disponível'}
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button variant="outlined" fullWidth onClick={carregarLeads} disabled={loading}>
              Atualizar
            </Button>
          </Grid>
        </Grid>

        {loading ? (
          <Box display="flex" justifyContent="center" padding={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="h6" className={classes.sectionTitle}>
              Leads novos (últimos 7 dias) ({leadsNovos.length})
            </Typography>
            {leadsNovos.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                Nenhum lead novo nos últimos 7 dias.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {leadsNovos.map((lead) => (
                  <Grid item xs={12} sm={6} md={4} key={`novo-${lead.id}`}>
                    <LeadCard lead={lead} />
                  </Grid>
                ))}
              </Grid>
            )}
            <Typography variant="h6" className={classes.sectionTitle}>
              Quentes ({agrupados.quentes.length})
            </Typography>
            <Grid container spacing={2}>
              {agrupados.quentes.length === 0 ? (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Nenhum lead quente encontrado.
                  </Typography>
                </Grid>
              ) : (
                agrupados.quentes.map((lead) => (
                  <Grid item xs={12} sm={6} md={4} key={lead.id}>
                    <LeadCard lead={lead} />
                  </Grid>
                ))
              )}
            </Grid>

            <Typography variant="h6" className={classes.sectionTitle}>
              Mornos ({agrupados.mornos.length})
            </Typography>
            <Grid container spacing={2}>
              {agrupados.mornos.length === 0 ? (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Nenhum lead morno encontrado.
                  </Typography>
                </Grid>
              ) : (
                agrupados.mornos.map((lead) => (
                  <Grid item xs={12} sm={6} md={4} key={lead.id}>
                    <LeadCard lead={lead} />
                  </Grid>
                ))
              )}
            </Grid>

            <Typography variant="h6" className={classes.sectionTitle}>
              Frios ({agrupados.frios.length})
            </Typography>
            <Grid container spacing={2}>
              {agrupados.frios.length === 0 ? (
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Nenhum lead frio encontrado.
                  </Typography>
                </Grid>
              ) : (
                agrupados.frios.map((lead) => (
                  <Grid item xs={12} sm={6} md={4} key={lead.id}>
                    <LeadCard lead={lead} />
                  </Grid>
                ))
              )}
            </Grid>
          </>
        )}
      </PapperBlock>

      <Dialog open={novoLeadOpen} onClose={() => setNovoLeadOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo Lead Manual</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Nome"
                value={novoLeadForm.nome}
                onChange={handleNovoLeadChange('nome')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Telefone"
                value={novoLeadForm.telefone}
                onChange={handleNovoLeadChange('telefone')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email"
                value={novoLeadForm.email}
                onChange={handleNovoLeadChange('email')}
                fullWidth
              />
            </Grid>
            {needConsultorSelection && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Consultor</InputLabel>
                  <Select
                    label="Consultor"
                    value={novoLeadForm.consultorId}
                    onChange={handleNovoLeadChange('consultorId')}
                    disabled={consultoresCarregando}
                  >
                    {consultores.map((consultor) => (
                      <MenuItem key={consultor.id} value={String(consultor.id)}>
                        {consultor.nome}
                      </MenuItem>
                    ))}
                    {consultores.length === 0 && (
                      <MenuItem value="">Carregando consultores...</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Temperatura"
                value={novoLeadForm.temperaturaLead}
                onChange={handleNovoLeadChange('temperaturaLead')}
                fullWidth
                type="number"
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={novoLeadForm.status}
                  onChange={handleNovoLeadChange('status')}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNovoLeadOpen(false)}>Cancelar</Button>
          <Button onClick={handleCriarLead} variant="contained" color="primary">
            Salvar
          </Button>
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

export default LeadsPage;
