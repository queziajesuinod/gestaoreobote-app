import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
} from 'react';
import { Helmet } from 'react-helmet';
import {
  Grid,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TablePagination,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Box,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { PapperBlock } from 'dan-components';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import brand from 'dan-api/dummy/brand';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RemoveIcon from '@mui/icons-material/Remove';
import { set } from 'lodash';
import { getStoredUser } from '../../../utils/userStorage';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const API_INTEGRANTES_URL = `${API_URL}/integrante/equipe`;
const getToken = () => localStorage.getItem('token');

const CORES = ['#007AFF', '#FF2D55', '#00C7BE', '#FF9500', '#5856D6', '#34C759', '#FF3B30', '#5AC8FA'];

const formatCurrencyBR = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 'R$ 0,00';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseISODateOnly = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [year, month, day] = value.split('-').map(Number);
  if ([year, month, day].some(num => Number.isNaN(num))) return null;
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
};

const parseDateOnly = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
  }

  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? null : data;
};

const formatDateBR = (value) => {
  const data = parseDateOnly(value);
  if (!data) return '';
  const dia = String(data.getUTCDate()).padStart(2, '0');
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const ano = data.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
};

const formatISODateOnly = (date) => (date ? date.toISOString().slice(0, 10) : '');

const formatarIdentificadorCota = (cota) => {
  if (!cota) return '—';
  const partes = [cota.grupo, cota.cota, cota.digito]
    .map(parte => (parte || '').toString().trim())
    .filter(Boolean);
  return partes.join('-') || '—';
};

const splitPeriodIntoChunks = (inicio, fim, maxDias = 31) => {
  const inicioDate = parseISODateOnly(inicio);
  const fimDate = parseISODateOnly(fim);

  if (!inicioDate || !fimDate || inicioDate > fimDate) {
    return [];
  }

  const intervalos = [];
  let cursor = new Date(inicioDate.getTime());

  while (cursor <= fimDate) {
    const segmentoInicio = new Date(cursor.getTime());
    const segmentoFim = new Date(cursor.getTime());
    segmentoFim.setUTCDate(segmentoFim.getUTCDate() + (maxDias - 1));

    if (segmentoFim > fimDate) {
      segmentoFim.setTime(fimDate.getTime());
    }

    intervalos.push({
      inicio: formatISODateOnly(segmentoInicio),
      fim: formatISODateOnly(segmentoFim)
    });

    cursor = new Date(segmentoFim.getTime());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return intervalos;
};


const formatDateForInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const data = parseDateOnly(value);
  return data ? data.toISOString().slice(0, 10) : '';
};

const obterIntervaloMesReferencia = (dateString) => {
  if (!dateString) return null;
  const partes = dateString.split('-').map(Number);
  if (partes.length < 2 || Number.isNaN(partes[0]) || Number.isNaN(partes[1])) return null;
  const [ano, mes] = partes;
  if (!ano || !mes) return null;

  const numeroDias = new Date(ano, mes, 0).getDate();
  const inicio = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
  const fim = new Date(Date.UTC(ano, mes - 1, numeroDias, 23, 59, 59, 999));

  const inicioISO = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fimISO = `${ano}-${String(mes).padStart(2, '0')}-${String(numeroDias).padStart(2, '0')}`;

  return {
    inicioISO,
    fimISO,
    inicio,
    fim
  };
};

// ==================== COMPONENTE DE INDICADOR COM COMPARAÇÃO ====================
const IndicadorComparativo = React.memo(({ titulo, valorAtual, valorComparativo, cor = '#007AFF', mostrarComparacao = false }) => {
  const diferenca = valorAtual - valorComparativo;
  const percentualMudanca = valorComparativo > 0
    ? Math.round(((valorAtual - valorComparativo) / valorComparativo) * 100)
    : 0;

  const getTrendIcon = () => {
    if (diferenca > 0) return <TrendingUpIcon style={{ color: '#34C759', fontSize: 20 }} />;
    if (diferenca < 0) return <TrendingDownIcon style={{ color: '#FF3B30', fontSize: 20 }} />;
    return <RemoveIcon style={{ color: '#8E8E93', fontSize: 20 }} />;
  };

  return (
    <Paper
      elevation={2}
      style={{
        padding: '20px',
        textAlign: 'center',
        borderTop: `4px solid ${cor}`,
        height: '100%'
      }}
    >
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        {titulo}
      </Typography>

      {/* Valor Atual (Grande) */}
      <Typography variant="h3" style={{ color: cor, fontWeight: 'bold', margin: '10px 0' }}>
        {valorAtual}
      </Typography>

      {/* Comparação (Se habilitada) */}
      {mostrarComparacao && (
        <Box style={{ marginTop: '10px', padding: '10px', backgroundColor: '#F5F5F5', borderRadius: '8px' }}>
          <Typography variant="caption" color="textSecondary" display="block">
            Período Anterior
          </Typography>
          <Typography variant="h6" style={{ color: '#8E8E93', fontWeight: 500 }}>
            {valorComparativo}
          </Typography>

          {/* Indicador de Tendência */}
          <Box display="flex" alignItems="center" justifyContent="center" style={{ marginTop: '5px' }}>
            {getTrendIcon()}
            <Typography
              variant="body2"
              style={{
                marginLeft: '5px',
                color: diferenca > 0 ? '#34C759' : diferenca < 0 ? '#FF3B30' : '#8E8E93',
                fontWeight: 600
              }}
            >
              {diferenca > 0 ? '+' : ''}{diferenca} ({percentualMudanca > 0 ? '+' : ''}{percentualMudanca}%)
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
});



function DashboardReobote() {

  const cacheNegocios = useRef({
    ganhos: { dataInicio: null, consultores: [], dados: [] },
    andamento: { dataInicio: null, consultores: [], dados: [] }
  });
  const title = `${brand.name} - Dashboard Reobote`;
  const description = 'Painel de tarefas integradas ao Agendor';

  // ==================== ESTADOS - PERÍODO ATUAL ====================
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
const [cotasAtuais, setCotasAtuais] = useState({});
const [cotasComp, setCotasComp] = useState({});
const [rankingCotasDialog, setRankingCotasDialog] = useState({
  open: false,
  consultorNome: '',
  consultorId: '',
  cotas: []
});
  const [negociosGanhos, setNegociosGanhos] = useState([]);
  const [negociosEmAndamento, setNegociosEmAndamento] = useState([]);
  const [metaAtiva, setMetaAtiva] = useState(null);
  const [totalMetaLiquido, setTotalMetaLiquido] = useState(0);
  const [totalMetaBruto, setTotalMetaBruto] = useState(0);
  // ==================== ESTADOS - PERÍODO DE COMPARAÇÃO ====================
  const [habilitarComparacao, setHabilitarComparacao] = useState(false);
  const [dataInicioComp, setDataInicioComp] = useState('');
  const [dataFimComp, setDataFimComp] = useState('');

  // ==================== ESTADOS - FILTROS ====================
  const [equipes, setEquipes] = useState([]);
  const [equipeSelecionada, setEquipeSelecionada] = useState('');
  const [integrantes, setIntegrantes] = useState([]);
  const [consultorSelecionado, setConsultorSelecionado] = useState('');
  const [tipo, setTipo] = useState('Todos');

  // ==================== ESTADOS - DADOS ====================
  const [tarefas, setTarefas] = useState([]);
  const [tarefasComparacao, setTarefasComparacao] = useState([]);
  const [filtradas, setFiltradas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapaConsultoresGlobal, setMapaConsultoresGlobal] = useState({});
  const [consultorAgendorLogado, setConsultorAgendorLogado] = useState(null);

  // ==================== ESTADOS - ORDENAÇÃO ====================
  const [orderBy, setOrderBy] = useState('total'); // Coluna padrão de ordenação
  const [order, setOrder] = useState('desc'); // 'asc' ou 'desc'
  const [storedUser, setStoredUserState] = useState(() => getStoredUser());
  const [rankingPage, setRankingPage] = useState(0);
  const [rankingRowsPerPage, setRankingRowsPerPage] = useState(10);

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

  const perfilUsuario = storedUser?.perfil?.toUpperCase() || '';
  const permissoesUsuario = storedUser?.permissoes || [];
  const isConsultorPerfil = perfilUsuario === 'CONSULTOR';
  const isAdminPerfil = perfilUsuario === 'ADMIN';
  const isGestorPerfil = perfilUsuario === 'GESTOR';
  const consultorIdLogado = isConsultorPerfil && storedUser?.consultorId
    ? Number(storedUser.consultorId)
    : null;
  const podeVerTodasEquipes = isAdminPerfil || isGestorPerfil || permissoesUsuario.includes('GESTAO');
  const podeSelecionarTodasEquipes = podeVerTodasEquipes && !isConsultorPerfil;

  useEffect(() => {
    let ativo = true;

    async function carregarConsultorLogado() {
      if (!isConsultorPerfil) {
        if (ativo) {
          setConsultorAgendorLogado(null);
        }
        return;
      }

      if (!consultorIdLogado) {
        if (ativo) {
          setConsultorAgendorLogado(null);
          setConsultorSelecionado('');
        }
        return;
      }

      try {
        const resposta = await fetch(`${API_URL}/consultor/${consultorIdLogado}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          }
        });

        if (!resposta.ok) {
          const texto = await resposta.text();
          throw new Error(`HTTP ${resposta.status}: ${resposta.statusText} - ${texto.slice(0, 200)}`);
        }

        let dadosConsultor;
        const contentType = resposta.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          dadosConsultor = await resposta.json();
        } else {
          const texto = await resposta.text();
          throw new Error(`Resposta inesperada ao carregar consultor: ${texto.slice(0, 200)}`);
        }
        if (!ativo) return;

        const idAgendorBruto = dadosConsultor?.id_agendor;
        const idAgendorNormalizado = idAgendorBruto !== null && idAgendorBruto !== undefined
          ? String(idAgendorBruto).trim()
          : '';
        const possuiIdAgendor = Boolean(idAgendorNormalizado);

        setConsultorAgendorLogado(possuiIdAgendor ? idAgendorNormalizado : null);

        if (possuiIdAgendor) {
          setMapaConsultoresGlobal(prev => {
            if (prev[idAgendorNormalizado]) {
              const existente = prev[idAgendorNormalizado];
              return {
                ...prev,
                [idAgendorNormalizado]: {
                  equipe: existente.equipe || 'Sem Equipe',
                  nome: existente.nome || dadosConsultor?.nome || 'Desconhecido'
                }
              };
            }

            return {
              ...prev,
              [idAgendorNormalizado]: {
                equipe: dadosConsultor?.equipe || 'Sem Equipe',
                nome: dadosConsultor?.nome || 'Desconhecido'
              }
            };
          });

          if (isConsultorPerfil) {
            setConsultorSelecionado(idAgendorNormalizado);
          }
        } else if (isConsultorPerfil) {
          setConsultorSelecionado('');
        }
      } catch (error) {
        console.error('❌ Erro ao buscar consultor logado:', error);
        if (ativo) {
          setConsultorAgendorLogado(null);
          if (isConsultorPerfil) {
            setConsultorSelecionado('');
          }
        }
      }
    }

    carregarConsultorLogado();

    return () => {
      ativo = false;
    };
  }, [consultorIdLogado, isConsultorPerfil]);


  // ==================== CARREGAR DADOS INICIAIS (OTIMIZADO) ====================
  useEffect(() => {
    let isMounted = true;

    async function carregarDadosIniciais() {
      try {
        // 1. Carregar equipes
        const responseEquipes = await fetch(`${API_URL}/equipe`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          }
        });
        const equipesData = await responseEquipes.json();

        if (!isMounted) return;
        console.log('✅ Equipes carregadas:', equipesData);
        setEquipes(equipesData || []);

        // 2. Carregar integrantes de TODAS as equipes em PARALELO
        if (equipesData && equipesData.length > 0) {
          console.log('🌍 Carregando integrantes de TODAS as equipes em paralelo...');
          const promises = equipesData.map(equipe =>
            fetch(`${API_INTEGRANTES_URL}/${equipe.id}`, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`
              }
            }).then(res => res.json()).then(integrantes => ({ equipe, integrantes }))
          );

          const resultados = await Promise.all(promises);

          if (!isMounted) return;

          // 3. Criar mapa global
          const mapaGlobal = {};
          resultados.forEach(({ equipe, integrantes }) => {
            integrantes.forEach(int => {
              const idAgendorKey = String(int.consultor?.id_agendor ?? '').trim();
              if (!idAgendorKey) return;
              mapaGlobal[idAgendorKey] = {
                equipe: equipe.descricao,
                nome: int.consultor.nome
              };
            });
          });

          setMapaConsultoresGlobal(mapaGlobal);
          console.log('🗺️ Mapa global criado com sucesso:', mapaGlobal);
        }
      } catch (err) {
        console.error('❌ Erro ao carregar dados iniciais:', err);
      }
    }

    carregarDadosIniciais();

    return () => {
      isMounted = false;
    };
  }, []); // ✅ Executa apenas UMA VEZ



  // ==================== INTEGRANTES DA EQUIPE SELECIONADA ====================
  useEffect(() => {
    let isMounted = true;

    async function carregarIntegrantes() {
      if (!equipeSelecionada) {
        setIntegrantes([]);
        if (!isConsultorPerfil) {
          setConsultorSelecionado('');
        }
        return;
      }

      try {
        console.log('🔍 Carregando integrantes da equipe ID:', equipeSelecionada);
        const response = await fetch(`${API_INTEGRANTES_URL}/${equipeSelecionada}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          }
        });
        const data = await response.json();

        if (!isMounted) return;
        console.log('✅ Integrantes carregados:', data);
        setIntegrantes(data || []);
      } catch (err) {
        console.error('❌ Erro ao carregar integrantes:', err);
        if (isMounted) setIntegrantes([]);
      }
    }

    carregarIntegrantes();

    return () => {
      isMounted = false;
    };
  }, [equipeSelecionada, isConsultorPerfil]);

  const obterIdsConsultores = useCallback((idsExplicitos = []) => {
    if (Array.isArray(idsExplicitos) && idsExplicitos.length > 0) {
      return idsExplicitos
        .map(id => String(id).trim())
        .filter(Boolean);
    }

    if (consultorSelecionado) {
      const normalizado = String(consultorSelecionado).trim();
      return normalizado ? [normalizado] : [];
    }

    if (equipeSelecionada) {
      return integrantes
        .map(i => String(i.consultor?.id_agendor ?? '').trim())
        .filter(Boolean);
    }

    if (isConsultorPerfil) {
      return consultorAgendorLogado ? [consultorAgendorLogado] : [];
    }

    return Object.keys(mapaConsultoresGlobal)
      .map(id => String(id).trim())
      .filter(Boolean);
  }, [
    consultorSelecionado,
    equipeSelecionada,
    integrantes,
    isConsultorPerfil,
    consultorAgendorLogado,
    mapaConsultoresGlobal
  ]);

  const possuiFiltroExplicito = useCallback((idsExplicitos = []) => {
    if (Array.isArray(idsExplicitos) && idsExplicitos.length > 0) return true;
    if (consultorSelecionado) return true;
    if (equipeSelecionada) return true;
    return false;
  }, [consultorSelecionado, equipeSelecionada]);

  async function buscarTotalCotasMeta(dataReferencia) {
    const intervalo = obterIntervaloMesReferencia(dataReferencia);
    if (!intervalo) {
      setTotalMetaLiquido(0);
      setTotalMetaBruto(0);
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('dataInicio', intervalo.inicioISO);
      params.append('dataFim', intervalo.fimISO);

      const response = await fetch(`${API_URL}/cotas/total?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        const texto = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${texto.slice(0, 200)}`);
      }

      const data = await response.json();
      const valores = data?.dados || {};
      setTotalMetaLiquido(Number(valores.valor || 0));
      setTotalMetaBruto(Number(valores.valorTotal || 0));
    } catch (error) {
      console.error('❌ Erro ao somar cotas para meta:', error);
      setTotalMetaLiquido(0);
      setTotalMetaBruto(0);
    }
  }

  async function buscarMetaPorReferencia(inicio, fim) {
    if (!inicio) return null;
    try {
      const params = new URLSearchParams();
      params.append('dataInicio', inicio);
      if (fim) params.append('dataFim', fim);

      const response = await fetch(`${API_URL}/metas/referencia?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data?.meta || null;
    } catch (error) {
      console.error('❌ Erro ao buscar meta de referência:', error);
      return null;
    }
  }

  // ==================== FUNÇÃO AUXILIAR: BUSCAR TAREFAS POR PERÍODO ====================
  async function buscarTarefasPorPeriodo(inicio, fim) {
    // ✅ VALIDAÇÃO: Verificar se tem dados carregados
    if (!inicio || !fim) {
      console.warn('⚠️ Datas não fornecidas');
      return [];
    }

    const idsAgendor = obterIdsConsultores();
    const filtroExplicito = possuiFiltroExplicito();

    if (idsAgendor.length === 0) {
      if (isConsultorPerfil) {
        console.warn('⚠️ Consultor sem ID de integração configurado.');
        return [];
      }
      console.warn('⚠️ Nenhum consultor disponível para buscar tarefas');
      return [];
    }

    const intervalos = splitPeriodIntoChunks(inicio, fim, 31);
    if (intervalos.length === 0) {
      console.warn('⚠️ Período inválido ou data final anterior à inicial.');
      return [];
    }

    const deveFiltrarLocalmente = isConsultorPerfil && !filtroExplicito && idsAgendor.length > 0;
    const idsSet = deveFiltrarLocalmente ? new Set(idsAgendor.map(id => String(id))) : null;
    const todasTarefas = [];

    for (const intervalo of intervalos) {
      const params = new URLSearchParams();
      params.append('dataInicio', `${intervalo.inicio}T00:00:00Z`);
      params.append('dataFim', `${intervalo.fim}T23:59:59Z`);
      if (tipo && tipo !== 'Todos') {
        params.append('tipo', tipo);
      }
      if (idsAgendor.length > 0 && (isConsultorPerfil || filtroExplicito)) {
        params.append('consultores', idsAgendor.join(','));
      }

      const response = await fetch(`${API_URL}/agendor/tarefas?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        const texto = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${texto.slice(0, 200)}`);
      }

      const data = await response.json();

      const tarefasEnriquecidas = (data.tarefas || []).map(tarefa => {
        const chaveConsultor = String(tarefa.consultorId ?? '').trim();
        return {
          ...tarefa,
          nomeEquipe: mapaConsultoresGlobal[chaveConsultor]?.equipe || 'Sem Equipe',
          nomeConsultor: mapaConsultoresGlobal[chaveConsultor]?.nome || tarefa.consultor || 'Desconhecido'
        };
      });

      const tarefasFiltradas = deveFiltrarLocalmente && idsSet
        ? tarefasEnriquecidas.filter(t => idsSet.has(String(t.consultorId ?? '').trim()))
        : tarefasEnriquecidas;

      todasTarefas.push(...tarefasFiltradas);
    }

    return todasTarefas;
  }

  async function buscarNegociosGanhos(dataInicio, consultoresSelecionados = [], dealStatus) {
    try {
      // ✅ Normaliza o array de consultores
      const idsAgendor = obterIdsConsultores(consultoresSelecionados);
      const filtroExplicito = possuiFiltroExplicito(consultoresSelecionados);

      if (idsAgendor.length === 0) {
        console.warn('⚠️ Nenhum consultor identificado para buscar negócios ganhos.');
        setNegociosGanhos([]);
        return [];
      }

      const cacheGanhos = cacheNegocios.current.ganhos;
      cacheGanhos.consultores = (cacheGanhos.consultores || []).map(id => String(id));
      const idsSet = new Set(idsAgendor.map(id => String(id)));

      // ✅ Se já tem cache válido e a lista de consultores é subset do cache, utiliza o cache
      const podeUsarCacheGanhos =
        dealStatus === 2 &&
        cacheGanhos.dados.length > 0 &&
        cacheGanhos.dataInicio === dataInicio &&
        idsAgendor.length > 0 &&
        [...idsSet].every(id => cacheGanhos.consultores.includes(id));

      if (podeUsarCacheGanhos) {
        const filtrados = cacheGanhos.dados.filter(n => idsSet.has(String(n.consultorId ?? '').trim()));
        console.log(`⚡ Usando cache local ganhos (${filtrados.length})`);
        setNegociosGanhos(filtrados);
        return filtrados;
      }

      // ✅ Monta parâmetros da requisição
      const params = new URLSearchParams();
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (idsAgendor.length > 0 && (isConsultorPerfil || filtroExplicito)) {
        params.append('consultor', idsAgendor.join(','));
      }
      params.append('dealStatus', dealStatus);

      console.log('🌐 Buscando da API com params:', params.toString());

      const response = await fetch(`${API_URL}/agendor/negocios?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('❌ Sessão expirada! Token inválido.');
          alert('Sua sessão expirou. Faça login novamente.');
          localStorage.removeItem('token');
          window.location.href = '/login';
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const dadosGanhos = data.negocios || [];
      cacheNegocios.current.ganhos = {
        dataInicio,
        consultores: Array.from(new Set(idsAgendor.map(id => String(id)))),
        dados: dadosGanhos
      };

      const filtrados = idsAgendor.length
        ? dadosGanhos.filter(n => idsSet.has(String(n.consultorId ?? '').trim()))
        : dadosGanhos;

      console.log(`💾 Negócios carregados: ${filtrados.length} de ${dadosGanhos.length}`);
      setNegociosGanhos(filtrados);

      return filtrados;
    } catch (error) {
      console.error('❌ Erro em buscarNegociosGanhos:', error);
      return [];
    }
  }

  async function buscarNegociosEmAndamento(dataInicio, consultoresSelecionados = [], dealStatus) {
    try {
      // ✅ Normaliza o array de consultores
      const idsAgendor = obterIdsConsultores(consultoresSelecionados);
      const filtroExplicito = possuiFiltroExplicito(consultoresSelecionados);

      if (idsAgendor.length === 0) {
        console.warn('⚠️ Nenhum consultor identificado para buscar negócios em andamento.');
        setNegociosEmAndamento([]);
        return [];
      }

      const cacheAndamento = cacheNegocios.current.andamento;
      cacheAndamento.consultores = (cacheAndamento.consultores || []).map(id => String(id));
      const idsSet = new Set(idsAgendor.map(id => String(id)));

      const podeUsarCacheAndamento =
        dealStatus === 1 &&
        cacheAndamento.dados.length > 0 &&
        cacheAndamento.dataInicio === dataInicio &&
        idsAgendor.length > 0 &&
        [...idsSet].every(id => cacheAndamento.consultores.includes(id));

      if (podeUsarCacheAndamento) {
        const filtrados = cacheAndamento.dados.filter(n => idsSet.has(String(n.consultorId ?? '').trim()));
        console.log(`⚡ Usando cache local andamento (${filtrados.length})`);
        setNegociosEmAndamento(filtrados);
        return filtrados;
      }

      // ✅ Monta parâmetros da requisição
      const params = new URLSearchParams();
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (idsAgendor.length > 0 && (isConsultorPerfil || filtroExplicito)) {
        params.append('consultor', idsAgendor.join(','));
      }
      params.append('dealStatus', dealStatus);

      console.log('🌐 Buscando da API com params:', params.toString());

      const response = await fetch(`${API_URL}/agendor/negocios?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('❌ Sessão expirada! Token inválido.');
          alert('Sua sessão expirou. Faça login novamente.');
          localStorage.removeItem('token');
          window.location.href = '/login';
          return [];
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const dadosAndamento = data.negocios || [];
      cacheNegocios.current.andamento = {
        dataInicio,
        consultores: Array.from(new Set(idsAgendor.map(id => String(id)))),
        dados: dadosAndamento
      };

      const filtrados = idsAgendor.length
        ? dadosAndamento.filter(n => idsSet.has(String(n.consultorId ?? '').trim()))
        : dadosAndamento;

      console.log(`💾 Negócios carregados: ${filtrados.length} de ${dadosAndamento.length}`);
      setNegociosEmAndamento(filtrados);

      return filtrados;
    } catch (error) {
      console.error('❌ Erro em buscarNegociosEmAndamento:', error);
      return [];
    }
  }



  // ==================== BUSCAR TAREFAS (OTIMIZADO) ====================
  async function buscarTarefas() {
    if (!dataInicio || !dataFim) {
      alert('Selecione o período atual');
      return;
    }

    // ❌ REMOVIDO: NÃO limpar cache aqui, pois as funções verificam se tem cache

    if (habilitarComparacao && (!dataInicioComp || !dataFimComp)) {
      alert('Selecione o período de comparação');
      return;
    }

    setLoading(true);

    try {
      // ✅ PASSO 1: Buscar tarefas primeiro
      const promises = [buscarTarefasPorPeriodo(dataInicio, dataFim)];

      if (habilitarComparacao) {
        promises.push(buscarTarefasPorPeriodo(dataInicioComp, dataFimComp));
      }

      const [tarefasAtuais, tarefasComp = []] = await Promise.all(promises);

      const idsConsultoresParaNegocios = obterIdsConsultores();
      const consultoresFiltro = (isConsultorPerfil || possuiFiltroExplicito())
        ? idsConsultoresParaNegocios
        : [];

      const negociosGanhosData = await buscarNegociosGanhos(dataInicio, consultoresFiltro, 2);
      const negociosEmAndamentoData = await buscarNegociosEmAndamento(dataInicio, consultoresFiltro, 1);


      // ✅ PASSO 2: Extrair consultorId únicos das tarefas retornadas
      const consultoresUnicos = [...new Set(
        [...tarefasAtuais, ...tarefasComp]
          .map(t => t.consultorId)
          .filter(Boolean)
      )];

      console.log('✅ Tarefas carregadas:', {
        tarefasAtuais: tarefasAtuais.length,
        tarefasComparacao: tarefasComp.length,
        consultoresUnicos: consultoresUnicos.length
      });

      // ✅ PASSO 3: Buscar cotas apenas para os consultores que aparecem nas tarefas
      let cotasAtuaisData = {};
      let cotasCompData = {};

      if (consultoresUnicos.length > 0) {
        const promisesCotas = [
          buscarCotasPorPeriodo(`${dataInicio}T00:00:00Z`, `${dataFim}T23:59:59Z`, consultoresUnicos)
        ];

        if (habilitarComparacao) {
          promisesCotas.push(
            buscarCotasPorPeriodo(`${dataInicioComp}T00:00:00Z`, `${dataFimComp}T23:59:59Z`, consultoresUnicos)
          );
        }

        const resultadosCotas = await Promise.all(promisesCotas);
        cotasAtuaisData = resultadosCotas[0];
        cotasCompData = habilitarComparacao ? resultadosCotas[1] : {};

        console.log('✅ Cotas carregadas:', {
          cotasAtuais: Object.keys(cotasAtuaisData).length,
          cotasComparacao: Object.keys(cotasCompData).length
        });
      }

      // ✅ PASSO 4: Atualizar estados
      setTarefas(tarefasAtuais);
      setFiltradas(tarefasAtuais);
      setTarefasComparacao(tarefasComp);
      setCotasAtuais(cotasAtuaisData);
      setCotasComp(cotasCompData);
      setNegociosGanhos(negociosGanhosData);
      setNegociosEmAndamento(negociosEmAndamentoData);

      const intervaloMetaAtual = dataInicio ? obterIntervaloMesReferencia(dataInicio) : null;
      if (intervaloMetaAtual) {
        const metaSelecionada = await buscarMetaPorReferencia(intervaloMetaAtual.inicioISO, intervaloMetaAtual.fimISO);
        setMetaAtiva(metaSelecionada);
        await buscarTotalCotasMeta(intervaloMetaAtual.inicioISO);
      } else {
        setMetaAtiva(null);
        setTotalMetaLiquido(0);
        setTotalMetaBruto(0);
      }
    } catch (err) {
      console.error('❌ Erro ao buscar dados:', err);
      setMetaAtiva(null);
      setTotalMetaLiquido(0);
      setTotalMetaBruto(0);
      alert('Erro ao buscar dados. Verifique o console.');
    } finally {
      setLoading(false);
    }
  }

  // ==================== BUSCAR COTAS ====================
  async function buscarCotasPorPeriodo(inicio, fim, idsAgendor) {
    try {
      console.log(`🔍 Buscando cotas para ${idsAgendor.length} consultores...`);

      const normalizarCotaParaConsultor = (cota, idagendor) => {
        const consultores = Array.isArray(cota.consultores) ? cota.consultores : [];
        const consultorRelacionado = consultores.find((consultor) => {
          const idComparacao = consultor?.CotaConsultor?.idagendor
            || consultor?.idagendor
            || consultor?.id;
          if (!idComparacao) return false;
          return String(idComparacao).trim() === String(idagendor).trim();
        });

        const valorConsultor = Number(
          consultorRelacionado?.valorRecebido
          ?? cota.valorDistribuidoPorConsultor
          ?? cota.valor
          ?? 0
        );

        return {
          id: cota.id,
          grupo: cota.grupo,
          cota: cota.cota,
          digito: cota.digito,
          cliente: cota.cliente?.nome || '',
          administradora: cota.administradora || '',
          dtaquisicao: cota.dtaquisicao,
          valor: Number(cota.valor ?? 0),
          valorConsultor,
          idagendorRelacionado: consultorRelacionado?.CotaConsultor?.idagendor
            || consultorRelacionado?.idagendor
            || null
        };
      };

      // Faz uma requisição para CADA consultor
      const resultados = await Promise.all(
        idsAgendor.map(async (idagendor) => {
          const url = `${API_URL}/cotas/periodo?inicio=${inicio}&fim=${fim}&idagendor=${idagendor}`;
          console.log(`🔗 Buscando cotas do consultor ${idagendor}:`, url);

          // ✅ Adiciona o header Authorization
          const resp = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getToken()}` // 👈 ESSA LINHA É FUNDAMENTAL
            }
          });
          const data = await resp.json();
          const cotas = data.dados || [];

          console.log(`  ✅ Consultor ${idagendor}: ${cotas.length} cotas encontradas`);

          const cotasNormalizadas = cotas.map(cota => normalizarCotaParaConsultor(cota, idagendor));

          return { idagendor, cotas: cotasNormalizadas };
        })
      );

      // Agrupa e soma os valores por consultorId
      const cotasPorConsultor = {};

      resultados.forEach(({ idagendor, cotas }) => {
        const somaTotal = cotas.reduce((soma, cota) => soma + Number(cota.valorConsultor || 0), 0);
        const chave = String(idagendor || '').trim();
        if (!chave) {
          console.warn('⚠️ Consultor sem identificador de Agendor nas cotas retornadas.');
          return;
        }

        // Usa o idagendor como chave (mesmo ID usado nas tarefas)
        cotasPorConsultor[chave] = {
          total: somaTotal,
          cotas
        };

        console.log(`  💰 Total do consultor ${idagendor}: ${somaTotal} (valor atribuído ao consultor)`);
      });

      console.log('✅ Valores finais por consultor:', cotasPorConsultor);

      return cotasPorConsultor;
    } catch (err) {
      console.error('❌ Erro ao buscar cotas:', err);
      return {};
    }
  }


  // ==================== FILTRO LOCAL ====================
  useEffect(() => {
    let f = [...tarefas];
    if (tipo !== 'Todos') f = f.filter(t => t.tipo === tipo);
    if (consultorSelecionado)
      f = f.filter(t => String(t.consultorId ?? '').trim() === String(consultorSelecionado ?? '').trim());
    setFiltradas(f);
  }, [tipo, consultorSelecionado, tarefas]);

  // ==================== LIMPAR FILTROS ====================
  function limparFiltros() {
    setDataInicio('');
    setDataFim('');
    setDataInicioComp('');
    setDataFimComp('');
    setHabilitarComparacao(false);
    setEquipeSelecionada('');
    setConsultorSelecionado(isConsultorPerfil && consultorAgendorLogado
      ? consultorAgendorLogado
      : '');
    setTipo('Todos');
    setTarefas([]);
    setTarefasComparacao([]);
    setFiltradas([]);
    setIntegrantes([]);
    setMetaAtiva(null);
    setTotalMetaLiquido(0);
    setTotalMetaBruto(0);
  }

  // ==================== MÉTRICAS - PERÍODO ATUAL ====================
  const pendentesAtuais = filtradas.filter(t => t.status === 'Pendente');
  const pendentesComparacao = tarefasComparacao.filter(t => t.status === 'Pendente');

  // Totais usados nos indicadores principais (somente pendentes)
  const totalVisitasPendentes = pendentesAtuais.filter(t => t.tipo === 'Visita').length;
  const totalReunioesPendentes = pendentesAtuais.filter(t => t.tipo === 'Reunião').length;
  const totalPropostasPendentes = pendentesAtuais.filter(t => t.tipo === 'Proposta').length;
  const totalGeralPendentes = totalVisitasPendentes + totalReunioesPendentes;

  // Totais gerais (pendentes + concluídas) para os demais cálculos
  const totalVisitas = filtradas.filter(t => t.tipo === 'Visita').length;
  const totalReunioes = filtradas.filter(t => t.tipo === 'Reunião').length;
  const totalPropostas = filtradas.filter(t => t.tipo === 'Proposta').length;
  const totalGeral = totalVisitas + totalReunioes;

  // ==================== MÉTRICAS - PERÍODO DE COMPARAÇÃO ====================
  const totalVisitasCompPendentes = pendentesComparacao.filter(t => t.tipo === 'Visita').length;
  const totalReunioesCompPendentes = pendentesComparacao.filter(t => t.tipo === 'Reunião').length;
  const totalPropostasCompPendentes = pendentesComparacao.filter(t => t.tipo === 'Proposta').length;
  const totalGeralCompPendentes = totalVisitasCompPendentes + totalReunioesCompPendentes;

  const totalVisitasComp = tarefasComparacao.filter(t => t.tipo === 'Visita').length;
  const totalReunioesComp = tarefasComparacao.filter(t => t.tipo === 'Reunião').length;
  const totalPropostasComp = tarefasComparacao.filter(t => t.tipo === 'Proposta').length;
  const totalGeralComp = totalVisitasComp + totalReunioesComp;

  // ==================== TAXA DE CONVERSÃO ====================
  const totalNegociosGanhos = negociosGanhos.length;
  const totalNegociosEmAndamento = negociosEmAndamento.length;
  const taxaConversaoNegociosPendentesGanhos = (totalNegociosGanhos) > 0
    ? Math.round((totalNegociosGanhos / (totalNegociosEmAndamento)) * 100)
    : 0;
  const taxaConversao = (totalReunioes + totalVisitas) > 0
    ? Math.round((totalNegociosGanhos / (totalReunioes + totalVisitas)) * 100)
    : 0;

  const conversaoPorConsultor = Object.entries(
    filtradas.reduce((acc, t) => {
      const nome = t.nomeConsultor;
      if (!acc[nome]) acc[nome] = { visitas: 0, propostas: 0 };
      if (t.tipo === 'Visita') acc[nome].visitas++;
      if (t.tipo === 'Proposta') acc[nome].propostas++;
      return acc;
    }, {})
  ).map(([consultor, dados]) => ({
    consultor,
    taxa: dados.visitas > 0 ? Math.round((dados.propostas / dados.visitas) * 100) : 0,
    visitas: dados.visitas,
    propostas: dados.propostas
  })).sort((a, b) => b.taxa - a.taxa);

  // ==================== RANKING DE CONSULTORES ====================
  // ==================== RANKING DE CONSULTORES (COMPARATIVO) ====================
  const ranking = Object.entries(
    filtradas.reduce((acc, t) => {
      const nome = t.nomeConsultor;
      const consultorId = t.consultorId;
      if (!acc[nome]) acc[nome] = { visitas: 0, reunioes: 0, propostas: 0, consultorId };
      if (t.tipo === 'Visita') acc[nome].visitas++;
      if (t.tipo === 'Reunião') acc[nome].reunioes++;
      if (t.tipo === 'Proposta') acc[nome].propostas++;
      return acc;
    }, {})
  ).map(([consultor, dados]) => {
    const totalAtual = dados.visitas + dados.reunioes;

    // Calcula o total do período anterior (comparação)
    let totalAnterior = 0;
    if (habilitarComparacao && tarefasComparacao.length > 0) {
      const tarefasAnt = tarefasComparacao.filter(
        t => t.nomeConsultor === consultor && (t.tipo === 'Visita' || t.tipo === 'Reunião')
      );
      totalAnterior = tarefasAnt.length;
    }

    // Calcula a taxa de comparação (variação percentual)
    const variacao = totalAnterior > 0
      ? Math.round(((totalAtual - totalAnterior) / totalAnterior) * 100)
      : null;

    // Busca o valor total das cotas do consultor
    const consultorId = dados.consultorId ? String(dados.consultorId).trim() : '';
    const valorCotaAtual = cotasAtuais?.[consultorId]?.total || 0;
    const valorCotaComp = cotasComp?.[consultorId]?.total || 0;
    const valorCota = valorCotaAtual;

    return {
      consultor,
      consultorId,
      visitas: dados.visitas,
      reunioes: dados.reunioes,
      propostas: dados.propostas,
      total: totalAtual,
      variacao,
      valorCota,
      valorCotaComparacao: valorCotaComp
    };
  });

  // ==================== FUNÇÃO DE ORDENAÇÃO ====================
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Aplica ordenação ao ranking
  const rankingOrdenado = useMemo(() => {
    const ordenado = [...ranking].sort((a, b) => {
      let aValue = a[orderBy];
      let bValue = b[orderBy];

      if (aValue === null || aValue === undefined) aValue = 0;
      if (bValue === null || bValue === undefined) bValue = 0;

      if (orderBy === 'consultor') {
        return order === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return ordenado;
  }, [ranking, orderBy, order]);

  const rankingPaginado = useMemo(() => {
    if (rankingRowsPerPage === -1) {
      return rankingOrdenado;
    }
    const inicio = rankingPage * rankingRowsPerPage;
    return rankingOrdenado.slice(inicio, inicio + rankingRowsPerPage);
  }, [rankingOrdenado, rankingRowsPerPage, rankingPage]);

  useEffect(() => {
    setRankingPage(0);
  }, [rankingOrdenado.length, rankingRowsPerPage]);

  // ✅ NOVO: Calcula soma total de cotas
  const somaValorCotas = ranking.reduce((soma, r) => soma + (r.valorCota || 0), 0);
  const totalValorCotas = useMemo(
    () => Object.values(cotasAtuais).reduce((soma, valor) => soma + Number(valor?.total || 0), 0),
    [cotasAtuais]
  );
  const totalCotasConsultorDialog = useMemo(
    () => rankingCotasDialog.cotas.reduce((soma, cota) => soma + Number(cota.valorConsultor || 0), 0),
    [rankingCotasDialog]
  );

  const handleAbrirCotasConsultor = useCallback((rankingItem) => {
    if (!rankingItem) return;
    const consultorId = rankingItem.consultorId ? String(rankingItem.consultorId).trim() : '';
    if (!consultorId) return;
    const dadosConsultor = cotasAtuais?.[consultorId];
    setRankingCotasDialog({
      open: true,
      consultorNome: rankingItem.consultor,
      consultorId,
      cotas: Array.isArray(dadosConsultor?.cotas) ? dadosConsultor.cotas : []
    });
  }, [cotasAtuais]);

  const handleFecharCotasConsultor = useCallback(() => {
    setRankingCotasDialog((prev) => ({
      ...prev,
      open: false
    }));
  }, []);
  const metaValorNumero = metaAtiva && metaAtiva.valor !== undefined && metaAtiva.valor !== null
    ? Number(metaAtiva.valor)
    : 0;
  const metaPercentual = useMemo(() => {
    if (!metaValorNumero || Number.isNaN(metaValorNumero) || metaValorNumero <= 0) {
      return 0;
    }
    const percentual = (totalMetaLiquido / metaValorNumero) * 100;
    return Math.max(0, Math.min(100, percentual));
  }, [metaValorNumero, totalMetaLiquido]);
  const metaValorRestante = metaValorNumero > 0
    ? Math.max(0, metaValorNumero - totalMetaLiquido)
    : 0;


  // 2. Média de Tarefas por Dia
  const diasPeriodo = dataInicio && dataFim
    ? Math.ceil((new Date(dataFim) - new Date(dataInicio)) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const mediaTarefasPorDia = diasPeriodo > 0
    ? ((totalReunioes + totalVisitas + totalPropostas) / diasPeriodo).toFixed(1)
    : 0;


  const mediaTarefasReuniaoVisitaPorDia = diasPeriodo > 0
    ? ((totalReunioes + totalVisitas) / diasPeriodo).toFixed(1)
    : 0;


  // ==================== GRÁFICOS ====================
  const graficoPorEquipe = Object.entries(
    filtradas
      .filter(t => t.tipo === 'Visita' || t.tipo === 'Reunião')
      .filter(t => t.nomeEquipe !== 'Sem Equipe')
      .reduce((acc, t) => {
        const nomeEquipe = t.nomeEquipe;
        if (!acc[nomeEquipe]) acc[nomeEquipe] = { visitas: 0, reunioes: 0 };
        if (t.tipo === 'Visita') acc[nomeEquipe].visitas++;
        if (t.tipo === 'Reunião') acc[nomeEquipe].reunioes++;
        return acc;
      }, {})
  ).map(([equipe, dados]) => ({
    equipe,
    'Número de Reuniões': dados.reunioes,
    'Número de Visitas': dados.visitas
  }));

  const graficoGeralPizza = Object.entries(
    filtradas
      .filter(t => t.tipo === 'Visita' || t.tipo === 'Reunião')
      .reduce((acc, t) => {
        const nome = t.nomeConsultor;
        acc[nome] = (acc[nome] || 0) + 1;
        return acc;
      }, {})
  ).map(([nome, total]) => ({ nome, total }));

  const graficoPorcEquipes = Object.entries(
    filtradas
      .filter(t => t.tipo === 'Visita' || t.tipo === 'Reunião')
      .filter(t => t.nomeEquipe !== 'Sem Equipe')
      .reduce((acc, t) => {
        const equipe = t.nomeEquipe;
        acc[equipe] = (acc[equipe] || 0) + 1;
        return acc;
      }, {})
  ).map(([equipe, total]) => ({ equipe, total }));

  const graficoPropostasPorEquipe = Object.entries(
    filtradas
      .filter(t => t.tipo === 'Proposta')
      .filter(t => t.nomeEquipe !== 'Sem Equipe')
      .reduce((acc, t) => {
        const equipe = t.nomeEquipe;
        acc[equipe] = (acc[equipe] || 0) + 1;
        return acc;
      }, {})
  ).map(([equipe, total]) => ({ equipe, total }));

  const graficoPropostasPorUsuario = Object.entries(
    filtradas
      .filter(t => t.tipo === 'Proposta')
      .reduce((acc, t) => {
        const nome = t.nomeConsultor;
        acc[nome] = (acc[nome] || 0) + 1;
        return acc;
      }, {})
  ).map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock title="Dashboard Reobote" icon="ion-ios-analytics" desc="Análise de tarefas do Agendor">

        {/* ==================== FILTROS ==================== */}
        <Grid container spacing={2} style={{ marginBottom: 20 }}>

          {/* LINHA 1: PERÍODO ATUAL */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom style={{ marginTop: 10 }}>
              📅 Período Atual
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Data Fim"
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth disabled={isConsultorPerfil}>
              <InputLabel>Equipe</InputLabel>
              <Select
                value={equipeSelecionada}
                onChange={e => setEquipeSelecionada(e.target.value)}
                label="Equipe"
                disabled={isConsultorPerfil}
              >
                <MenuItem value="" disabled={!podeSelecionarTodasEquipes}>
                  Todas as Equipes
                </MenuItem>
                {equipes.map(eq => (
                  <MenuItem key={eq.id} value={eq.id}>{eq.descricao}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth disabled={isConsultorPerfil}>
              <InputLabel>Consultor</InputLabel>
              <Select
                value={isConsultorPerfil ? (consultorAgendorLogado || '') : consultorSelecionado}
                onChange={e => setConsultorSelecionado(String(e.target.value).trim())}
                disabled={isConsultorPerfil || !equipeSelecionada}
                label="Consultor"
              >
                <MenuItem value="">Todos os Consultores</MenuItem>
                {integrantes.map(int => (
                  <MenuItem
                    key={int.consultor?.id_agendor}
                    value={String(int.consultor?.id_agendor ?? '').trim()}
                  >
                    {int.consultor?.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>


          {/* LINHA 3: COMPARAÇÃO DE PERÍODOS */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={habilitarComparacao}
                  onChange={e => setHabilitarComparacao(e.target.checked)}
                  color="primary"
                />
              }
              label="Comparar com período anterior"
            />
          </Grid>

          {habilitarComparacao && (
            <>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom style={{ marginTop: 10 }}>
                  📊 Período de Comparação
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Data Início (Comparação)"
                  type="date"
                  value={dataInicioComp}
                  onChange={e => setDataInicioComp(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Data Fim (Comparação)"
                  type="date"
                  value={dataFimComp}
                  onChange={e => setDataFimComp(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}

          {/* LINHA 4: BOTÕES */}
          <Grid item xs={12}>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="contained"
                color="primary"
                onClick={buscarTarefas}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Buscar'}
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={limparFiltros}
              >
                Limpar Filtros
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* ==================== INDICADORES ==================== */}
        {filtradas.length > 0 && (
          <>
            <Typography variant="h5" gutterBottom style={{ marginTop: 30, marginBottom: 20 }}>
              📊 Indicadores Principais
            </Typography>

            <Grid container spacing={3} style={{ marginBottom: 30 }}>
              <Grid item xs={12} sm={6} md={3}>
                <IndicadorComparativo
                  titulo="Visitas e Reuniões"
                  valorAtual={totalGeralPendentes}
                  valorComparativo={totalGeralCompPendentes}
                  cor="#007AFF"
                  mostrarComparacao={habilitarComparacao}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <IndicadorComparativo
                  titulo="Número de Visitas"
                  valorAtual={totalVisitasPendentes}
                  valorComparativo={totalVisitasCompPendentes}
                  cor="#00C7BE"
                  mostrarComparacao={habilitarComparacao}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <IndicadorComparativo
                  titulo="Número de Reuniões"
                  valorAtual={totalReunioesPendentes}
                  valorComparativo={totalReunioesCompPendentes}
                  cor="#FF9500"
                  mostrarComparacao={habilitarComparacao}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <IndicadorComparativo
                  titulo="Número de Propostas"
                  valorAtual={totalPropostasPendentes}
                  valorComparativo={totalPropostasCompPendentes}
                  cor="#34C759"
                  mostrarComparacao={habilitarComparacao}
                />
              </Grid>
            </Grid>

            {/* ==================== GRÁFICOS ==================== */}
            {!isConsultorPerfil && (
              <>
                <Typography variant="h5" gutterBottom style={{ marginTop: 30, marginBottom: 20 }}>
                  📈 Gráficos e Análises
                </Typography>

                {/* Gráficos Lado a Lado */}
                <Grid container spacing={3} style={{ marginBottom: 30 }}>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={2} style={{ padding: 20 }}>
                      <Typography variant="h6" gutterBottom>
                        Número de visitas e reuniões por equipe
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={graficoPorEquipe}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="equipe" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Número de Reuniões" fill="#007AFF" />
                          <Bar dataKey="Número de Visitas" fill="#00C7BE" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Paper elevation={2} style={{ padding: 20 }}>
                      <Typography variant="h6" gutterBottom>
                        Geral Reobote Visitas e Reuniões
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={graficoGeralPizza}
                            dataKey="total"
                            nameKey="nome"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                          >
                            {graficoGeralPizza.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            wrapperStyle={{ paddingLeft: '20px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Gráficos de Rosca (Apenas se nenhuma equipe selecionada) */}
                {!equipeSelecionada && (
                  <Grid container spacing={3} style={{ marginBottom: 30 }}>
                    <Grid item xs={12} md={4}>
                      <Paper elevation={2} style={{ padding: 20 }}>
                        <Typography variant="h6" gutterBottom>
                          % de visitas e reuniões por equipes
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={graficoPorcEquipes}
                              dataKey="total"
                              nameKey="equipe"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                            >
                              {graficoPorcEquipes.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                          </PieChart>
                        </ResponsiveContainer>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Paper elevation={2} style={{ padding: 20 }}>
                        <Typography variant="h6" gutterBottom>
                          % de propostas por Equipe
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={graficoPropostasPorEquipe}
                              dataKey="total"
                              nameKey="equipe"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                            >
                              {graficoPropostasPorEquipe.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                          </PieChart>
                        </ResponsiveContainer>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Paper elevation={2} style={{ padding: 20 }}>
                        <Typography variant="h6" gutterBottom>
                          Propostas por Usuário
                        </Typography>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={graficoPropostasPorUsuario}
                              dataKey="total"
                              nameKey="nome"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                            >
                              {graficoPropostasPorUsuario.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend layout="horizontal" align="center" verticalAlign="bottom" />
                          </PieChart>
                        </ResponsiveContainer>
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </>
            )}

            {/* Indicadores Adicionais */}
            <Typography variant="h5" gutterBottom style={{ marginTop: 30, marginBottom: 20 }}>
              📊 Métricas de Desempenho
            </Typography>

            <Grid container spacing={3} style={{ marginBottom: 30 }} alignItems="stretch">
              <Grid item xs={12} md={4}>
                <Box style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
                  <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Taxa de <br />Conversão Geral
                    </Typography>
                    <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                      {taxaConversao}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {totalNegociosGanhos} Negócios Ganhos/ {totalReunioes + totalVisitas} Reuniões+Visitas
                    </Typography>
                  </Paper>

                  <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Média de<br /> Tarefas por Dia
                    </Typography>
                    <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                      {mediaTarefasPorDia}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {totalPropostas + totalReunioes + totalVisitas} tarefas / {diasPeriodo} dias
                    </Typography>
                  </Paper>
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
                  <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Média <br />de Visitas + Reuniões / dia
                    </Typography>
                    <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                      {mediaTarefasReuniaoVisitaPorDia}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {totalReunioes + totalVisitas} Reuniões + Visitas / {diasPeriodo} dias
                    </Typography>
                  </Paper>

                  <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                      Taxa de Negócios<br /> Ganhos sobre Pendentes
                    </Typography>
                    <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                      {taxaConversaoNegociosPendentesGanhos}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {totalNegociosGanhos}  ganhos / {totalNegociosEmAndamento}  em andamento
                    </Typography>
                  </Paper>
                </Box>
              </Grid>

              <Grid item xs={12} md={4} style={{ display: 'flex' }}>
                <Paper elevation={2} style={{ padding: 20, height: '100%', textAlign: 'center', width: '100%' }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Meta de Vendas
                  </Typography>
                  {metaAtiva ? (
                    <>
                      <Box position="relative" display="inline-flex" sx={{ mt: 2, mb: 2 }}>
                        <CircularProgress variant="determinate" value={metaPercentual} size={140} thickness={5} />
                        <Box
                          top={0}
                          left={0}
                          bottom={0}
                          right={0}
                          position="absolute"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Typography variant="h4" component="div" color="textPrimary">
                            {`${Math.round(metaPercentual)}%`}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body1" color="textSecondary">
                        {formatCurrencyBR(totalMetaLiquido)} de {formatCurrencyBR(metaValorNumero)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        {formatDateBR(metaAtiva.dataInicio)}
                        {metaAtiva.dataFim ? ` até ${formatDateBR(metaAtiva.dataFim)}` : ' em diante'}
                      </Typography>
                      {metaValorNumero > 0 && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          Restante: {formatCurrencyBR(metaValorRestante)}
                        </Typography>
                      )}
                      <Typography variant="caption" color="textSecondary" display="block">
                        Valor Bruto: {formatCurrencyBR(totalMetaBruto)}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 4 }}>
                      Nenhuma meta cadastrada para o período selecionado.
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>


            <Grid container spacing={3} style={{ marginBottom: 30 }}>
              <Grid item xs={12} md={12}>
                <Paper elevation={2} style={{ padding: 20, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    🏆 Ranking de Consultores
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow style={{ backgroundColor: '#F5F5F5' }}>
                          <TableCell><strong>#</strong></TableCell>
                          <TableCell>
                            <TableSortLabel
                              active={orderBy === 'consultor'}
                              direction={orderBy === 'consultor' ? order : 'asc'}
                              onClick={() => handleRequestSort('consultor')}
                            >
                              <strong>Consultor</strong>
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="center">
                            <TableSortLabel
                              active={orderBy === 'visitas'}
                              direction={orderBy === 'visitas' ? order : 'asc'}
                              onClick={() => handleRequestSort('visitas')}
                            >
                              <strong>Visitas</strong>
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="center">
                            <TableSortLabel
                              active={orderBy === 'reunioes'}
                              direction={orderBy === 'reunioes' ? order : 'asc'}
                              onClick={() => handleRequestSort('reunioes')}
                            >
                              <strong>Reuniões</strong>
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="center">
                            <TableSortLabel
                              active={orderBy === 'propostas'}
                              direction={orderBy === 'propostas' ? order : 'asc'}
                              onClick={() => handleRequestSort('propostas')}
                            >
                              <strong>Propostas</strong>
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="center">
                            <TableSortLabel
                              active={orderBy === 'total'}
                              direction={orderBy === 'total' ? order : 'asc'}
                              onClick={() => handleRequestSort('total')}
                            >
                              <strong>Total</strong>
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="center">
                            <TableSortLabel
                              active={orderBy === 'valorCota'}
                              direction={orderBy === 'valorCota' ? order : 'asc'}
                              onClick={() => handleRequestSort('valorCota')}
                            >
                              <strong>Valor Total Cotas (R$)</strong>
                            </TableSortLabel>
                          </TableCell>
                          <TableCell align="center">
                            <TableSortLabel
                              active={orderBy === 'variacao'}
                              direction={orderBy === 'variacao' ? order : 'asc'}
                              onClick={() => handleRequestSort('variacao')}
                            >
                              <strong>Variação</strong>
                            </TableSortLabel>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rankingPaginado.map((r, index) => {
                          const posicao = rankingRowsPerPage === -1
                            ? index + 1
                            : rankingPage * rankingRowsPerPage + index + 1;
                          const consultorIdLinha = r.consultorId ? String(r.consultorId).trim() : '';
                          const temCotasDetalhadas = Boolean(cotasAtuais?.[consultorIdLinha]?.cotas?.length);
                          const valorFormatadoRanking = formatCurrencyBR(r.valorCota);

                          return (
                            <TableRow key={`${r.consultor}-${posicao}`}>
                              <TableCell>{posicao}</TableCell>
                              <TableCell>{r.consultor}</TableCell>
                              <TableCell align="center">{r.visitas}</TableCell>
                              <TableCell align="center">{r.reunioes}</TableCell>
                              <TableCell align="center">{r.propostas}</TableCell>
                              <TableCell align="center"><strong>{r.total}</strong></TableCell>
                              <TableCell align="center">
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() => handleAbrirCotasConsultor(r)}
                                  disabled={!temCotasDetalhadas}
                                >
                                  {valorFormatadoRanking}
                                </Button>
                              </TableCell>
                              <TableCell
                                align="center"
                                style={{
                                  color: r.variacao > 0 ? '#34C759' : r.variacao < 0 ? '#FF3B30' : '#8E8E93',
                                  fontWeight: 600
                                }}
                              >
                                {habilitarComparacao
                                  ? (r.variacao !== null ? `${r.variacao > 0 ? '+' : ''}${r.variacao}%` : '—')
                                  : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableBody>
                        <TableRow style={{ backgroundColor: '#F0F8FF', fontWeight: 'bold' }}>
                          <TableCell colSpan={6} align="right">
                            <strong>TOTAL:</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong style={{ color: '#007AFF', fontSize: '1.1em' }}>
                              R$ {somaValorCotas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={rankingOrdenado.length}
                    page={rankingPage}
                    onPageChange={(event, newPage) => setRankingPage(newPage)}
                    rowsPerPage={rankingRowsPerPage === -1 ? rankingOrdenado.length || 1 : rankingRowsPerPage}
                    onRowsPerPageChange={(event) => {
                      const value = parseInt(event.target.value, 10);
                      setRankingRowsPerPage(value);
                      setRankingPage(0);
                    }}
                    rowsPerPageOptions={[10, 25, 50, { label: 'Todos', value: -1 }]}
                    labelRowsPerPage="Consultores por página"
                  />
                </Paper>
              </Grid>
           
            </Grid>

            <Dialog
              open={rankingCotasDialog.open}
              onClose={handleFecharCotasConsultor}
              fullWidth
              maxWidth="md"
            >
              <DialogTitle>
                Vendas de {rankingCotasDialog.consultorNome || 'Consultor'}
              </DialogTitle>
              <DialogContent dividers>
                {rankingCotasDialog.cotas.length === 0 ? (
                  <Typography align="center" color="textSecondary">
                    Nenhuma cota registrada para este consultor no período selecionado.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Cliente</TableCell>
                        <TableCell>Grupo/Cota</TableCell>
                        <TableCell>Administradora</TableCell>
                        <TableCell align="right">Valor da Cota</TableCell>
                        <TableCell align="right">Valor do Consultor</TableCell>
                        <TableCell align="center">Data</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rankingCotasDialog.cotas.map((cota) => (
                        <TableRow key={`${cota.id}-${cota.grupo}-${cota.cota}`}>
                          <TableCell>{cota.cliente || '—'}</TableCell>
                          <TableCell>{formatarIdentificadorCota(cota)}</TableCell>
                          <TableCell>{cota.administradora || '—'}</TableCell>
                          <TableCell align="right">{formatCurrencyBR(cota.valor)}</TableCell>
                          <TableCell align="right">{formatCurrencyBR(cota.valorConsultor)}</TableCell>
                          <TableCell align="center">{formatDateBR(cota.dtaquisicao) || '—'}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={4} align="right">
                          <strong>Total</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>{formatCurrencyBR(totalCotasConsultorDialog)}</strong>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleFecharCotasConsultor}>Fechar</Button>
              </DialogActions>
            </Dialog>
          </>
        )}

        {filtradas.length === 0 && !loading && (
          <Typography variant="body1" color="textSecondary" style={{ textAlign: 'center', marginTop: 50 }}>
            Selecione um período e clique em "Buscar" para visualizar os dados.
          </Typography>
        )}
      </PapperBlock>
    </div>
  );
}

export default DashboardReobote;
