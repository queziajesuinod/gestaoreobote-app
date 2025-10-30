/* eslint-disable */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Box
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

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const API_INTEGRANTES_URL = `${API_URL}/integrante/equipe`;
const getToken = () => localStorage.getItem('token');

const CORES = ['#007AFF', '#FF2D55', '#00C7BE', '#FF9500', '#5856D6', '#34C759', '#FF3B30', '#5AC8FA'];

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
  const title = `${brand.name} - Dashboard Reobote`;
  const description = 'Painel de tarefas integradas ao Agendor';

  // ==================== ESTADOS - PERÍODO ATUAL ====================
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [cotasAtuais, setCotasAtuais] = useState({});
  const [cotasComp, setCotasComp] = useState({});

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
  const [status, setStatus] = useState('Todos');

  // ==================== ESTADOS - DADOS ====================
  const [tarefas, setTarefas] = useState([]);
  const [tarefasComparacao, setTarefasComparacao] = useState([]);
  const [filtradas, setFiltradas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapaConsultoresGlobal, setMapaConsultoresGlobal] = useState({});

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
              if (int.consultor?.id_agendor) {
                mapaGlobal[int.consultor.id_agendor] = {
                  equipe: equipe.descricao,
                  nome: int.consultor.nome
                };
              }
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
        setConsultorSelecionado('');
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
  }, [equipeSelecionada]);

  // ==================== FUNÇÃO AUXILIAR: BUSCAR TAREFAS POR PERÍODO ====================
  async function buscarTarefasPorPeriodo(inicio, fim) {
    // ✅ VALIDAÇÃO: Verificar se tem dados carregados
    if (!inicio || !fim) {
      console.warn('⚠️ Datas não fornecidas');
      return [];
    }

    let idsAgendor = [];
    if (consultorSelecionado) {
      idsAgendor = [consultorSelecionado];
    } else if (equipeSelecionada) {
      idsAgendor = integrantes
        .map(i => i.consultor?.id_agendor)
        .filter(Boolean);
    } else {
      idsAgendor = Object.keys(mapaConsultoresGlobal).map(Number);
    }

    // ✅ VALIDAÇÃO: Se não tem consultores, não buscar
    if (idsAgendor.length === 0) {
      console.warn('⚠️ Nenhum consultor disponível para buscar tarefas');
      return [];
    }

    const params = new URLSearchParams({
      dataInicio: `${inicio}T00:00:00Z`,
      dataFim: `${fim}T23:59:59Z`,
      tipo: tipo !== 'Todos' ? tipo : '',
      consultores: idsAgendor.join(',')
    });

    const response = await fetch(`${API_URL}/agendor/tarefas?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      }
    });

    const data = await response.json();

    const tarefasEnriquecidas = (data.tarefas || []).map(tarefa => ({
      ...tarefa,
      nomeEquipe: mapaConsultoresGlobal[tarefa.consultorId]?.equipe || 'Sem Equipe',
      nomeConsultor: mapaConsultoresGlobal[tarefa.consultorId]?.nome || tarefa.consultor || 'Desconhecido'
    }));

    return tarefasEnriquecidas;
  }

  // ==================== BUSCAR TAREFAS (OTIMIZADO) ====================
  async function buscarTarefas() {
    if (!dataInicio || !dataFim) {
      alert('Selecione o período atual');
      return;
    }

    if (habilitarComparacao && (!dataInicioComp || !dataFimComp)) {
      alert('Selecione o período de comparação');
      return;
    }

    setLoading(true);

    try {
      // ✅ OTIMIZAÇÃO: Buscar ambos os períodos em PARALELO
      const promises = [buscarTarefasPorPeriodo(dataInicio, dataFim)];

      if (habilitarComparacao) {
        promises.push(buscarTarefasPorPeriodo(dataInicioComp, dataFimComp));
      }

      const [tarefasAtuais, tarefasComp = []] = await Promise.all(promises);

      console.log('✅ Tarefas carregadas:', {
        atuais: tarefasAtuais.length,
        comparacao: tarefasComp.length
      });

      // ✅ OTIMIZAÇÃO: Atualizar estados em sequência rápida
      setTarefas(tarefasAtuais);
      setFiltradas(tarefasAtuais);
      setTarefasComparacao(tarefasComp);
    } catch (err) {
      console.error('❌ Erro ao buscar tarefas:', err);
      alert('Erro ao buscar tarefas. Verifique o console.');
    } finally {
      setLoading(false);
    }
  }

  // ==================== BUSCAR COTAS ====================
  async function buscarCotasPorPeriodo(inicio, fim, idsAgendor) {
    try {
      const resultados = await Promise.all(
        idsAgendor.map(async (idagendor) => {
          const url = `${API_URL}/cotas/periodo?inicio=${inicio}&fim=${fim}&idagendor=${idagendor}`;
          const resp = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getToken()}`
            }
          });
          const data = await resp.json();
          return data || [];
        })
      );

      // Achata o array e soma os valores por consultor (idagendor)
      const cotasPorConsultor = resultados.flat().reduce((acc, cota) => {
        const id = cota.idagendor;
        const valor = parseFloat(cota.valorTotal) || 0;
        acc[id] = (acc[id] || 0) + valor;
        return acc;
      }, {});
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
    if (status !== 'Todos') f = f.filter(t => t.status === status);
    if (consultorSelecionado)
      f = f.filter(t => String(t.consultorId) === String(consultorSelecionado));
    setFiltradas(f);
  }, [tipo, status, consultorSelecionado, tarefas]);

  // ==================== LIMPAR FILTROS ====================
  function limparFiltros() {
    setDataInicio('');
    setDataFim('');
    setDataInicioComp('');
    setDataFimComp('');
    setHabilitarComparacao(false);
    setEquipeSelecionada('');
    setConsultorSelecionado('');
    setTipo('Todos');
    setStatus('Todos');
    setTarefas([]);
    setTarefasComparacao([]);
    setFiltradas([]);
    setIntegrantes([]);
  }

  // ==================== MÉTRICAS - PERÍODO ATUAL ====================
  const totalVisitas = filtradas.filter(t => t.tipo === 'Visita').length;
  const totalReunioes = filtradas.filter(t => t.tipo === 'Reunião').length;
  const totalPropostas = filtradas.filter(t => t.tipo === 'Proposta').length;
  const totalGeral = totalVisitas + totalReunioes;

  // ==================== MÉTRICAS - PERÍODO DE COMPARAÇÃO ====================
  const totalVisitasComp = tarefasComparacao.filter(t => t.tipo === 'Visita').length;
  const totalReunioesComp = tarefasComparacao.filter(t => t.tipo === 'Reunião').length;
  const totalPropostasComp = tarefasComparacao.filter(t => t.tipo === 'Proposta').length;
  const totalGeralComp = totalVisitasComp + totalReunioesComp;

  // ==================== TAXA DE CONVERSÃO ====================
  const taxaConversao = totalVisitas > 0
    ? Math.round((totalPropostas / totalVisitas) * 100)
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
      if (!acc[nome]) acc[nome] = { visitas: 0, reunioes: 0, propostas: 0 };
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
    const taxaComparacao = totalAnterior > 0
      ? Math.round(((totalAtual - totalAnterior) / totalAnterior) * 100)
      : null;

    return {
      consultor,
      visitas: dados.visitas,
      reunioes: dados.reunioes,
      propostas: dados.propostas,
      total: totalAtual,
      taxaComparacao
    };
  }).sort((a, b) => b.total - a.total);


  // ==================== TAXA DE CONCLUSÃO ====================
  const totalConcluidas = filtradas.filter(t => t.status === 'Concluída').length;
  const totalPendentes = filtradas.filter(t => t.status === 'Pendente').length;
  const taxaConclusao = filtradas.length > 0
    ? Math.round((totalConcluidas / filtradas.length) * 100)
    : 0;

  const dadosStatus = [
    { status: 'Concluída', total: totalConcluidas },
    { status: 'Pendente', total: totalPendentes }
  ];

  // ==================== NOVOS INDICADORES ====================
  // 1. Taxa de Conversão Reunião → Proposta
  const taxaConversaoReuniao = totalReunioes > 0
    ? Math.round((totalPropostas / totalReunioes) * 100)
    : 0;

  // 2. Média de Tarefas por Dia
  const diasPeriodo = dataInicio && dataFim
    ? Math.ceil((new Date(dataFim) - new Date(dataInicio)) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const mediaTarefasPorDia = diasPeriodo > 0
    ? (filtradas.length / diasPeriodo).toFixed(1)
    : 0;

  // 3. Taxa de Atividade (Tarefas Concluídas / Dia)
  const taxaAtividade = diasPeriodo > 0
    ? (totalConcluidas / diasPeriodo).toFixed(1)
    : 0;

  // 4. Taxa de Pendências
  const taxaPendencias = filtradas.length > 0
    ? Math.round((totalPendentes / filtradas.length) * 100)
    : 0;

  // 5. Produtividade Média por Consultor
  const consultoresUnicos = [...new Set(filtradas.map(t => t.nomeConsultor))].filter(n => n !== 'Desconhecido').length;
  const produtividadeMedia = consultoresUnicos > 0
    ? Math.round(filtradas.length / consultoresUnicos)
    : 0;

  // 6. Taxa de Engajamento (Visitas + Reuniões / Total)
  const taxaEngajamento = filtradas.length > 0
    ? Math.round((totalGeral / filtradas.length) * 100)
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
            <FormControl fullWidth>
              <InputLabel>Equipe</InputLabel>
              <Select
                value={equipeSelecionada}
                onChange={e => setEquipeSelecionada(e.target.value)}
                label="Equipe"
              >
                <MenuItem value="">Todas as Equipes</MenuItem>
                {equipes.map(eq => (
                  <MenuItem key={eq.id} value={eq.id}>{eq.descricao}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Consultor</InputLabel>
              <Select
                value={consultorSelecionado}
                onChange={e => setConsultorSelecionado(e.target.value)}
                disabled={!equipeSelecionada}
                label="Consultor"
              >
                <MenuItem value="">Todos os Consultores</MenuItem>
                {integrantes.map(int => (
                  <MenuItem key={int.consultor?.id_agendor} value={int.consultor?.id_agendor}>
                    {int.consultor?.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* LINHA 2: FILTROS ADICIONAIS */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Tarefa</InputLabel>
              <Select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                label="Tipo de Tarefa"
              >
                <MenuItem value="Todos">Todos os Tipos</MenuItem>
                <MenuItem value="Visita">Visita</MenuItem>
                <MenuItem value="Reunião">Reunião</MenuItem>
                <MenuItem value="Proposta">Proposta</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={e => setStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="Todos">Todos Status</MenuItem>
                <MenuItem value="Concluída">Concluída</MenuItem>
                <MenuItem value="Pendente">Pendente</MenuItem>
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
                  valorAtual={totalGeral}
                  valorComparativo={totalGeralComp}
                  cor="#007AFF"
                  mostrarComparacao={habilitarComparacao}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <IndicadorComparativo
                  titulo="Número de Visitas"
                  valorAtual={totalVisitas}
                  valorComparativo={totalVisitasComp}
                  cor="#00C7BE"
                  mostrarComparacao={habilitarComparacao}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <IndicadorComparativo
                  titulo="Número de Reuniões"
                  valorAtual={totalReunioes}
                  valorComparativo={totalReunioesComp}
                  cor="#FF9500"
                  mostrarComparacao={habilitarComparacao}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <IndicadorComparativo
                  titulo="Número de Propostas"
                  valorAtual={totalPropostas}
                  valorComparativo={totalPropostasComp}
                  cor="#34C759"
                  mostrarComparacao={habilitarComparacao}
                />
              </Grid>
            </Grid>

            {/* ==================== GRÁFICOS ==================== */}
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

            {/* Indicadores Adicionais */}
            <Typography variant="h5" gutterBottom style={{ marginTop: 30, marginBottom: 20 }}>
              📊 Métricas de Desempenho
            </Typography>

            <Grid container spacing={3} style={{ marginBottom: 30 }}>
              {/* COLUNA 1 */}
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        Taxa de Conversão Geral
                      </Typography>
                      <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                        {taxaConversao}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {totalPropostas} propostas / {totalVisitas} visitas
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        Taxa de Conversão Reunião → Proposta
                      </Typography>
                      <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                        {taxaConversaoReuniao}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {totalPropostas} propostas / {totalReunioes} reuniões
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        Média de Tarefas por Dia
                      </Typography>
                      <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                        {mediaTarefasPorDia}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {filtradas.length} tarefas / {diasPeriodo} dias
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        Taxa de Atividade
                      </Typography>
                      <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                        {taxaAtividade}/dia
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {totalConcluidas} concluídas / {diasPeriodo} dias
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Grid>

              {/* COLUNA 2 */}
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        Taxa de Conclusão
                      </Typography>
                      <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                        {taxaConclusao}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {totalConcluidas} concluídas / {filtradas.length} total
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        Taxa de Pendências
                      </Typography>
                      <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                        {taxaPendencias}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {totalPendentes} pendentes / {filtradas.length} total
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        Produtividade Média
                      </Typography>
                      <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                        {produtividadeMedia}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {filtradas.length} tarefas / {consultoresUnicos} consultores
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Paper elevation={2} style={{ padding: 20, textAlign: 'center' }}>
                      <Typography variant="h6" gutterBottom>
                        Taxa de Engajamento
                      </Typography>
                      <Typography variant="h2" color="primary" style={{ fontWeight: 'bold' }}>
                        {taxaEngajamento}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {totalGeral} interações / {filtradas.length} total
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            {/* Ranking de Consultores */}
            <Paper elevation={2} style={{ padding: 20, marginBottom: 30 }}>
              <Typography variant="h6" gutterBottom>
                🏆 Ranking de Consultores
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow style={{ backgroundColor: '#F5F5F5' }}>
                      <TableCell><strong>#</strong></TableCell>
                      <TableCell><strong>Consultor</strong></TableCell>
                      <TableCell align="center"><strong>Visitas</strong></TableCell>
                      <TableCell align="center"><strong>Reuniões</strong></TableCell>
                      <TableCell align="center"><strong>Propostas</strong></TableCell>
                      <TableCell align="center"><strong>Total</strong></TableCell>
                      <TableCell align="center"><strong>Valor Total Cotas (R$)</strong></TableCell>
                      <TableCell align="center"><strong>Variação</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ranking.map((r, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{r.consultor}</TableCell>
                        <TableCell align="center">{r.visitas}</TableCell>
                        <TableCell align="center">{r.reunioes}</TableCell>
                        <TableCell align="center">{r.propostas}</TableCell>
                        <TableCell align="center"><strong>{r.total}</strong></TableCell>
                        <TableCell align="center">
                          R$ {r.valorCota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    ))}
                  </TableBody>

                </Table>
              </TableContainer>
            </Paper>
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

