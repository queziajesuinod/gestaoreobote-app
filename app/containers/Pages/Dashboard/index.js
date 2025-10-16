/* eslint-disable */
import React, { useState, useEffect } from 'react';
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
  TableContainer
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

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const API_INTEGRANTES_URL = `${API_URL}/integrante/equipe`;
const token = localStorage.getItem('token');

const CORES = ['#007AFF', '#FF2D55', '#00C7BE', '#FF9500', '#5856D6', '#34C759', '#FF3B30', '#5AC8FA'];

function DashboardReobote() {
  const title = `${brand.name} - Dashboard Reobote`;
  const description = 'Painel de tarefas integradas ao Agendor';
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [equipes, setEquipes] = useState([]);
  const [equipeSelecionada, setEquipeSelecionada] = useState('');
  const [integrantes, setIntegrantes] = useState([]);
  const [consultorSelecionado, setConsultorSelecionado] = useState('');
  const [tipo, setTipo] = useState('Todos');
  const [status, setStatus] = useState('Todos');
  const [tarefas, setTarefas] = useState([]);
  const [filtradas, setFiltradas] = useState([]);
  const [loading, setLoading] = useState(false);

  const [mapaConsultoresGlobal, setMapaConsultoresGlobal] = useState({});

  // ==================== EQUIPES ====================
  useEffect(() => {
    async function carregarEquipes() {
      try {
        const response = await fetch(`${API_URL}/equipe`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();
        console.log('✅ Equipes carregadas:', data);
        setEquipes(data || []);
      } catch (err) {
        console.error('❌ Erro ao carregar equipes:', err);
      }
    }
    carregarEquipes();
  }, []);

  // ==================== CARREGAR TODAS AS EQUIPES ====================
  useEffect(() => {
    async function carregarTodasEquipes() {
      if (equipes.length === 0) return;

      try {
        console.log('🌍 Carregando integrantes de TODAS as equipes...');
        const mapaGlobal = {};

        for (const equipe of equipes) {
          const response = await fetch(`${API_INTEGRANTES_URL}/${equipe.id}`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            }
          });
          const integrantes = await response.json();

          integrantes.forEach(int => {
            if (int.consultor?.id_agendor) {
              mapaGlobal[int.consultor.id_agendor] = {
                equipe: equipe.descricao,
                nome: int.consultor.nome
              };
            }
          });
        }

        setMapaConsultoresGlobal(mapaGlobal);
        console.log('🗺️ Mapa global de consultores criado:', mapaGlobal);
      } catch (err) {
        console.error('❌ Erro ao carregar todas as equipes:', err);
      }
    }

    carregarTodasEquipes();
  }, [equipes]);

  // ==================== INTEGRANTES DA EQUIPE SELECIONADA ====================
  useEffect(() => {
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
            Authorization: `Bearer ${token}`
          }
        });
        const data = await response.json();
        console.log('✅ Integrantes carregados:', data);
        setIntegrantes(data || []);
      } catch (err) {
        console.error('❌ Erro ao carregar integrantes:', err);
        setIntegrantes([]);
      }
    }
    carregarIntegrantes();
  }, [equipeSelecionada]);

  // ==================== BUSCAR TAREFAS ====================
  async function buscarTarefas() {
    if (!dataInicio || !dataFim) {
      alert('Selecione o período');
      return;
    }
    setLoading(true);

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

    console.log('🔍 Buscando tarefas com IDs Agendor:', idsAgendor);

    const params = new URLSearchParams({
      dataInicio: `${dataInicio}T00:00:00Z`,
      dataFim: `${dataFim}T23:59:59Z`,
      tipo: tipo !== 'Todos' ? tipo : '',
      consultores: idsAgendor.length > 0 ? idsAgendor.join(',') : ''
    });

    try {
      const response = await fetch(`${API_URL}/agendor/tarefas?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('✅ Tarefas recebidas:', data.tarefas?.length || 0);
      
      const tarefasEnriquecidas = (data.tarefas || []).map(tarefa => ({
        ...tarefa,
        nomeEquipe: mapaConsultoresGlobal[tarefa.consultorId]?.equipe || 'Sem Equipe',
        nomeConsultor: mapaConsultoresGlobal[tarefa.consultorId]?.nome || tarefa.consultor || 'Desconhecido'
      }));

      console.log('📊 Tarefas enriquecidas:', tarefasEnriquecidas.slice(0, 3));
      setTarefas(tarefasEnriquecidas);
      setFiltradas(tarefasEnriquecidas);
    } catch (err) {
      console.error('❌ Erro ao buscar tarefas:', err);
      alert('Erro ao buscar tarefas. Verifique o console.');
    } finally {
      setLoading(false);
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
    setEquipeSelecionada('');
    setConsultorSelecionado('');
    setTipo('Todos');
    setStatus('Todos');
    setTarefas([]);
    setFiltradas([]);
    setIntegrantes([]);
  }

  // ==================== MÉTRICAS BÁSICAS ====================
  const totalVisitas = filtradas.filter(t => t.tipo === 'Visita').length;
  const totalReunioes = filtradas.filter(t => t.tipo === 'Reunião').length;
  const totalPropostas = filtradas.filter(t => t.tipo === 'Proposta').length;
  const totalGeral = totalVisitas + totalReunioes;
  const totalTodasTarefas = filtradas.length;

  const percVisitas = totalTodasTarefas > 0 ? Math.round((totalVisitas / totalTodasTarefas) * 100) : 0;
  const percReunioes = totalTodasTarefas > 0 ? Math.round((totalReunioes / totalTodasTarefas) * 100) : 0;
  const percPropostas = totalTodasTarefas > 0 ? Math.round((totalPropostas / totalTodasTarefas) * 100) : 0;
  const percVisitasReunioes = totalTodasTarefas > 0 ? Math.round((totalGeral / totalTodasTarefas) * 100) : 0;

  // ==================== ✅ NOVA ANÁLISE 1: TAXA DE CONVERSÃO ====================
  const taxaConversao = totalVisitas > 0 
    ? Math.round((totalPropostas / totalVisitas) * 100) 
    : 0;

  // Taxa de conversão por consultor
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

  // ==================== ✅ NOVA ANÁLISE 2: RANKING DE CONSULTORES ====================
  const ranking = Object.entries(
    filtradas.reduce((acc, t) => {
      const nome = t.nomeConsultor;
      if (!acc[nome]) acc[nome] = { visitas: 0, reunioes: 0, propostas: 0 };
      if (t.tipo === 'Visita') acc[nome].visitas++;
      if (t.tipo === 'Reunião') acc[nome].reunioes++;
      if (t.tipo === 'Proposta') acc[nome].propostas++;
      return acc;
    }, {})
  ).map(([consultor, dados]) => ({
    consultor,
    ...dados,
    total: dados.visitas + dados.reunioes + dados.propostas,
    taxa: dados.visitas > 0 ? Math.round((dados.propostas / dados.visitas) * 100) : 0
  })).sort((a, b) => b.total - a.total);

  // ==================== ✅ NOVA ANÁLISE 3: TAXA DE CONCLUSÃO ====================
  const totalConcluidas = filtradas.filter(t => t.status === 'Concluída').length;
  const totalPendentes = filtradas.filter(t => t.status === 'Pendente').length;
  const taxaConclusao = totalTodasTarefas > 0 
    ? Math.round((totalConcluidas / totalTodasTarefas) * 100) 
    : 0;

  const dadosStatus = [
    { status: 'Concluída', total: totalConcluidas },
    { status: 'Pendente', total: totalPendentes }
  ];

  // ==================== GRÁFICOS ORIGINAIS ====================
  
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

  const totalVisitasReunioes = filtradas.filter(t => t.tipo === 'Visita' || t.tipo === 'Reunião').length;
  const totalPorEquipe = Object.entries(
    filtradas
      .filter(t => t.tipo === 'Visita' || t.tipo === 'Reunião')
      .filter(t => t.nomeEquipe !== 'Sem Equipe')
      .reduce((acc, t) => {
        const nomeEquipe = t.nomeEquipe;
        acc[nomeEquipe] = (acc[nomeEquipe] || 0) + 1;
        return acc;
      }, {})
  ).map(([equipe, total]) => ({
    equipe,
    total,
    porcentagem: totalVisitasReunioes > 0 ? Math.round((total / totalVisitasReunioes) * 100) : 0
  }));

  const graficoPorConsultor = Object.entries(
    filtradas
      .filter(t => t.tipo === 'Visita' || t.tipo === 'Reunião')
      .reduce((acc, t) => {
        const nome = t.nomeConsultor || 'Desconhecido';
        acc[nome] = (acc[nome] || 0) + 1;
        return acc;
      }, {})
  ).map(([consultor, total]) => ({ consultor, total }))
    .sort((a, b) => b.total - a.total);

  const totalPropostasGeral = filtradas.filter(t => t.tipo === 'Proposta').length;
  const propostasPorEquipe = Object.entries(
    filtradas
      .filter(t => t.tipo === 'Proposta')
      .filter(t => t.nomeEquipe !== 'Sem Equipe')
      .reduce((acc, t) => {
        const nomeEquipe = t.nomeEquipe;
        acc[nomeEquipe] = (acc[nomeEquipe] || 0) + 1;
        return acc;
      }, {})
  ).map(([equipe, total]) => ({
    equipe,
    total,
    porcentagem: totalPropostasGeral > 0 ? Math.round((total / totalPropostasGeral) * 100) : 0
  }));

  const propostasPorUsuario = Object.entries(
    filtradas
      .filter(t => t.tipo === 'Proposta')
      .reduce((acc, t) => {
        const nome = t.nomeConsultor || 'Desconhecido';
        acc[nome] = (acc[nome] || 0) + 1;
        return acc;
      }, {})
  ).map(([usuario, total]) => ({ usuario, total }))
    .sort((a, b) => b.total - a.total);

  // ==================== COMPONENTES ====================
  const IndicadorCircular = ({ titulo, valor, porcentagem, cor }) => (
    <Paper
      elevation={3}
      style={{
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 16,
        padding: 20,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Typography variant="subtitle2" style={{ marginBottom: 10, opacity: 0.9 }}>
        {titulo}
      </Typography>
      <div style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.2)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0 auto',
        border: `4px solid ${cor}`
      }}>
        <Typography variant="h3" style={{ fontWeight: 'bold' }}>
          {valor}
        </Typography>
        {porcentagem !== undefined && (
          <Typography variant="caption" style={{ opacity: 0.8 }}>
            {porcentagem}%
          </Typography>
        )}
      </div>
    </Paper>
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.equipe || data.usuario}</p>
          <p style={{ margin: 0, color: payload[0].fill }}>
            Total: {data.total}
          </p>
          {data.porcentagem !== undefined && (
            <p style={{ margin: 0, color: '#666' }}>
              Porcentagem: {data.porcentagem}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      {/* ==================== FILTROS ==================== */}
      <PapperBlock title="Filtros" icon="ion-ios-funnel" desc="Selecione o período e os filtros desejados">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Data Início"
              InputLabelProps={{ shrink: true }}
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Data Fim"
              InputLabelProps={{ shrink: true }}
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Select
              fullWidth
              value={equipeSelecionada}
              onChange={e => setEquipeSelecionada(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">Todas as Equipes</MenuItem>
              {equipes.map(eq => (
                <MenuItem key={eq.id} value={eq.id}>
                  {eq.descricao}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={12} md={2}>
            <Select
              fullWidth
              value={consultorSelecionado}
              onChange={e => setConsultorSelecionado(e.target.value)}
              displayEmpty
              disabled={!equipeSelecionada}
            >
              <MenuItem value="">Todos os Consultores</MenuItem>
              {integrantes.map(int => (
                <MenuItem key={int.id} value={int.consultor?.id_agendor}>
                  {int.consultor?.nome}
                </MenuItem>
              ))}
            </Select>
          </Grid>

          <Grid item xs={12} md={1}>
            <Select
              fullWidth
              value={tipo}
              onChange={e => setTipo(e.target.value)}
            >
              <MenuItem value="Todos">Todos os Tipos</MenuItem>
              <MenuItem value="Visita">Visita</MenuItem>
              <MenuItem value="Reunião">Reunião</MenuItem>
              <MenuItem value="Proposta">Proposta</MenuItem>
            </Select>
          </Grid>

          <Grid item xs={12} md={1}>
            <Select
              fullWidth
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <MenuItem value="Todos">Todos Status</MenuItem>
              <MenuItem value="Concluída">Concluída</MenuItem>
              <MenuItem value="Pendente">Pendente</MenuItem>
            </Select>
          </Grid>

          <Grid item xs={12} md={1}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={buscarTarefas}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Buscar'}
            </Button>
          </Grid>

          <Grid item xs={12} md={1}>
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              onClick={limparFiltros}
            >
              Limpar
            </Button>
          </Grid>
        </Grid>
      </PapperBlock>

      {/* ==================== INDICADORES CIRCULARES ==================== */}
      {filtradas.length > 0 && (
        <>
          <Grid container spacing={3} style={{ marginTop: 10 }}>
            <Grid item xs={6} md={3}>
              <IndicadorCircular
                titulo="Visitas e Reuniões"
                valor={totalGeral}
                porcentagem={percVisitasReunioes}
                cor="#00C7BE"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <IndicadorCircular
                titulo="Número de Visitas"
                valor={totalVisitas}
                porcentagem={percVisitas}
                cor="#34C759"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <IndicadorCircular
                titulo="Número de Reuniões"
                valor={totalReunioes}
                porcentagem={percReunioes}
                cor="#007AFF"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <IndicadorCircular
                titulo="Número de Propostas"
                valor={totalPropostas}
                porcentagem={percPropostas}
                cor="#FF2D55"
              />
            </Grid>
          </Grid>

          {/* ==================== ✅ NOVAS ANÁLISES ==================== */}
          <Grid container spacing={3} style={{ marginTop: 10 }}>
            {/* ANÁLISE 1: Taxa de Conversão */}
            <Grid item xs={12} md={4}>
              <IndicadorCircular
                titulo="Taxa de Conversão Visita → Proposta"
                valor={`${taxaConversao}%`}
                cor="#FFD60A"
              />
            </Grid>

            {/* ANÁLISE 3: Taxa de Conclusão */}
            <Grid item xs={12} md={4}>
              <IndicadorCircular
                titulo="Taxa de Conclusão de Tarefas"
                valor={`${taxaConclusao}%`}
                cor="#34C759"
              />
            </Grid>

            {/* Estatísticas Rápidas */}
            <Grid item xs={12} md={4}>
              <Paper elevation={3} style={{ padding: 20, borderRadius: 16 }}>
                <Typography variant="h6" gutterBottom>Resumo Geral</Typography>
                <Typography variant="body2">Total de Tarefas: <strong>{totalTodasTarefas}</strong></Typography>
                <Typography variant="body2">Concluídas: <strong>{totalConcluidas}</strong> ({taxaConclusao}%)</Typography>
                <Typography variant="body2">Pendentes: <strong>{totalPendentes}</strong></Typography>
                <Typography variant="body2" style={{ marginTop: 10 }}>
                  Conversão: <strong>{taxaConversao}%</strong> ({totalPropostas} propostas de {totalVisitas} visitas)
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* ==================== ANÁLISE 2: RANKING DE CONSULTORES ==================== */}
          {ranking.length > 0 && (
            <Grid container spacing={3} style={{ marginTop: 10 }}>
              <Grid item xs={12}>
                <PapperBlock title="🏆 Ranking de Consultores" icon="ion-ios-trophy" desc="Top performers do período">
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow style={{ background: '#f5f5f5' }}>
                          <TableCell><strong>#</strong></TableCell>
                          <TableCell><strong>Consultor</strong></TableCell>
                          <TableCell align="center"><strong>Visitas</strong></TableCell>
                          <TableCell align="center"><strong>Reuniões</strong></TableCell>
                          <TableCell align="center"><strong>Propostas</strong></TableCell>
                          <TableCell align="center"><strong>Total</strong></TableCell>
                          <TableCell align="center"><strong>Taxa Conv.</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ranking.map((r, i) => (
                          <TableRow 
                            key={i}
                            style={{
                              background: i === 0 ? '#fff9e6' : i === 1 ? '#f0f0f0' : i === 2 ? '#ffe6d9' : 'white'
                            }}
                          >
                            <TableCell>
                              {i === 0 && '🥇'}
                              {i === 1 && '🥈'}
                              {i === 2 && '🥉'}
                              {i > 2 && `${i + 1}º`}
                            </TableCell>
                            <TableCell><strong>{r.consultor}</strong></TableCell>
                            <TableCell align="center">{r.visitas}</TableCell>
                            <TableCell align="center">{r.reunioes}</TableCell>
                            <TableCell align="center">{r.propostas}</TableCell>
                            <TableCell align="center"><strong>{r.total}</strong></TableCell>
                            <TableCell 
                              align="center"
                              style={{
                                color: r.taxa >= 40 ? '#34C759' : r.taxa >= 20 ? '#FF9500' : '#FF3B30',
                                fontWeight: 'bold'
                              }}
                            >
                              {r.taxa}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </PapperBlock>
              </Grid>
            </Grid>
          )}

          {/* ==================== GRÁFICOS DE CONVERSÃO E STATUS ==================== */}
          <Grid container spacing={3} style={{ marginTop: 10 }}>
            {/* Taxa de Conversão por Consultor */}
            {conversaoPorConsultor.length > 0 && (
              <Grid item xs={12} md={6}>
                <PapperBlock title="Taxa de Conversão por Consultor" icon="ion-ios-stats" desc="">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={conversaoPorConsultor}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="consultor" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="taxa" fill="#FFD60A" name="Taxa de Conversão (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </PapperBlock>
              </Grid>
            )}

            {/* Status das Tarefas */}
            {dadosStatus.length > 0 && (
              <Grid item xs={12} md={6}>
                <PapperBlock title="Status das Tarefas" icon="ion-ios-checkmark-circle" desc="">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dadosStatus}
                        dataKey="total"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        <Cell fill="#34C759" /> {/* Verde para concluída */}
                        <Cell fill="#FF3B30" /> {/* Vermelho para pendente */}
                      </Pie>
                      <Tooltip />
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </PapperBlock>
              </Grid>
            )}
          </Grid>

          {/* ==================== GRÁFICOS ORIGINAIS ==================== */}
          <Grid container spacing={3} style={{ marginTop: 10 }}>
            {graficoPorEquipe.length > 0 && (
              <Grid item xs={12} md={6}>
                <PapperBlock title="Número de visitas e reuniões por equipe" icon="ion-ios-stats" desc="">
                  <ResponsiveContainer width="100%" height={400}>
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
                </PapperBlock>
              </Grid>
            )}

            {graficoPorConsultor.length > 0 && (
              <Grid item xs={12} md={6}>
                <PapperBlock title="Geral Reobote Visitas e Reuniões" icon="ion-ios-pie" desc="">
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={graficoPorConsultor}
                        dataKey="total"
                        nameKey="consultor"
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                      >
                        {graficoPorConsultor.map((_, i) => (
                          <Cell key={i} fill={CORES[i % CORES.length]} />
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
                </PapperBlock>
              </Grid>
            )}
          </Grid>

          <Grid container spacing={3}>
            {totalPorEquipe.length > 0 && (
              <Grid item xs={12} md={4}>
                <PapperBlock title="Porcentagem de visitas e reuniões por equipes" icon="ion-ios-pie" desc="">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={totalPorEquipe}
                        dataKey="total"
                        nameKey="equipe"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        {totalPorEquipe.map((_, i) => (
                          <Cell key={i} fill={CORES[i % CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </PapperBlock>
              </Grid>
            )}

            {propostasPorEquipe.length > 0 && (
              <Grid item xs={12} md={4}>
                <PapperBlock title="Porcentagem de propostas por equipe" icon="ion-ios-pie" desc="">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={propostasPorEquipe}
                        dataKey="total"
                        nameKey="equipe"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        {propostasPorEquipe.map((_, i) => (
                          <Cell key={i} fill={CORES[i % CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </PapperBlock>
              </Grid>
            )}

            {propostasPorUsuario.length > 0 && (
              <Grid item xs={12} md={4}>
                <PapperBlock title="Número de Proposta por Usuário" icon="ion-ios-people" desc="">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={propostasPorUsuario}
                        dataKey="total"
                        nameKey="usuario"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        {propostasPorUsuario.map((_, i) => (
                          <Cell key={i} fill={CORES[i % CORES.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </PapperBlock>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Mensagem quando não há dados */}
      {filtradas.length === 0 && !loading && (
        <PapperBlock title="Sem Dados" icon="ion-ios-information-circle" desc="">
          <Typography variant="h6" align="center" style={{ padding: 40, color: '#999' }}>
            Selecione os filtros e clique em "Buscar" para visualizar os dados
          </Typography>
        </PapperBlock>
      )}
    </div>
  );
}

export default DashboardReobote;

