import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import { Helmet } from 'react-helmet';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import {
  Box,
  CircularProgress,
  Grid,
  Paper,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Bar,
  ComposedChart,
  Line
} from 'recharts';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import GroupIcon from '@mui/icons-material/Group';
import FlagIcon from '@mui/icons-material/Flag';
import CakeIcon from '@mui/icons-material/Cake';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const getToken = () => localStorage.getItem('token');

const NOMES_MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const agruparClientesPorEstado = (clientes = []) => {
  const mapaEstados = new Map();
  clientes.forEach((cliente) => {
    const estado = (cliente.estado || '').toUpperCase();
    if (!estado) return;
    const registro = mapaEstados.get(estado) || { estado, total: 0 };
    registro.total += 1;
    mapaEstados.set(estado, registro);
  });

  const lista = Array.from(mapaEstados.values()).sort((a, b) => b.total - a.total);
  const totalGeral = lista.reduce((acc, item) => acc + item.total, 0);
  return {
    lista: lista.map(item => ({
      ...item,
      percentual: totalGeral > 0 ? (item.total / totalGeral) * 100 : 0
    })),
    total: totalGeral
  };
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

const obterIntervaloMesReferencia = (dateString) => {
  if (!dateString) return null;
  const partes = dateString.split('-').map(Number);
  if (partes.length < 2 || Number.isNaN(partes[0]) || Number.isNaN(partes[1])) return null;
  const [ano, mes] = partes;
  if (!ano || !mes) return null;

  const numeroDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const inicio = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0, 0));
  const fim = new Date(Date.UTC(ano, mes - 1, numeroDias, 23, 59, 59, 999));

  const inicioISO = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fimISO = `${ano}-${String(mes).padStart(2, '0')}-${String(numeroDias).padStart(2, '0')}`;

  return {
    inicio,
    fim,
    inicioISO,
    fimISO,
    ano,
    mes
  };
};

const obterUltimosMesesReferencia = (quantidade = 3) => {
  const meses = [];
  const hoje = new Date();
  const base = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

  for (let i = quantidade - 1; i >= 0; i -= 1) {
    const referencia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - (quantidade - 1 - i), 1));
    const ano = referencia.getUTCFullYear();
    const mes = referencia.getUTCMonth() + 1;
    const numeroDias = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    const inicioISO = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const fimISO = `${ano}-${String(mes).padStart(2, '0')}-${String(numeroDias).padStart(2, '0')}`;
    meses.push({
      inicioISO,
      fimISO,
      ano,
      mes,
      rotulo: `${NOMES_MESES_CURTOS[mes - 1]} ${String(ano).slice(-2)}`,
      ehMesAtual: i === quantidade - 1
    });
  }

  return meses;
};

const formatCurrencyBR = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 'R$ 0,00';
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatCurrencyCompact = (valor) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1
}).format(Number(valor || 0));

const formatPercent = (valor) => `${Number(valor || 0).toFixed(1)}%`;

const calcularIdade = (dataNascimento, referencia) => {
  if (!dataNascimento || Number.isNaN(dataNascimento.getTime())) return null;
  const ref = referencia ? new Date(referencia.getTime()) : new Date();
  let idade = ref.getUTCFullYear() - dataNascimento.getUTCFullYear();
  const mesRef = ref.getUTCMonth();
  const mesNasc = dataNascimento.getUTCMonth();
  if (mesRef < mesNasc || (mesRef === mesNasc && ref.getUTCDate() < dataNascimento.getUTCDate())) {
    idade -= 1;
  }
  return idade;
};

const formatDiaSemanaCurto = (data) => {
  if (!data || Number.isNaN(data.getTime())) return '';
  const dias = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  return dias[data.getUTCDay()];
};

const obterIntervaloSemanaAtual = (refDate = new Date()) => {
  const referencia = new Date(Date.UTC(
    refDate.getUTCFullYear(),
    refDate.getUTCMonth(),
    refDate.getUTCDate()
  ));
  const diaSemana = referencia.getUTCDay();
  const deslocamentoSegunda = (diaSemana + 6) % 7;
  const inicio = new Date(referencia);
  inicio.setUTCDate(referencia.getUTCDate() - deslocamentoSegunda);
  const fim = new Date(inicio);
  fim.setUTCDate(inicio.getUTCDate() + 6);
  return {
    inicio,
    fim,
    inicioISO: inicio.toISOString().slice(0, 10),
    fimISO: fim.toISOString().slice(0, 10)
  };
};

const MetricCard = ({
  title,
  subtitle,
  value,
  icon: Icon,
  gradient = 'linear-gradient(135deg, #007AFF 0%, #00C6FF 100%)',
  footerPrimary,
  footerSecondary
}) => (
  <Paper
    elevation={4}
    sx={{
      p: 3,
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      color: '#fff',
      background: gradient,
      borderRadius: 3
    }}
  >
    <Box
      sx={{
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        top: -60,
        right: -60
      }}
    />
    <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.2 }}>
        {subtitle}
      </Typography>
      {Icon && (
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon sx={{ fontSize: 26 }} />
        </Box>
      )}
    </Box>
    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
      {value}
    </Typography>
    <Typography variant="body1" sx={{ opacity: 0.85 }}>
      {title}
    </Typography>
    {(footerPrimary || footerSecondary) && (
      <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.25)' }}>
        {footerPrimary && (
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {footerPrimary}
          </Typography>
        )}
        {footerSecondary && (
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {footerSecondary}
          </Typography>
        )}
      </Box>
    )}
  </Paper>
);

const RechartsCurrencyTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <Paper elevation={3} sx={{ p: 1.5 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{label}</Typography>
      {payload.map((entry) => (
        <Typography key={entry.dataKey} variant="body2" color={entry.color || 'inherit'}>
          {entry.name}: {entry.dataKey.toLowerCase().includes('percent') ? formatPercent(entry.value) : formatCurrencyBR(entry.value)}
        </Typography>
      ))}
    </Paper>
  );
};

function BlankPage() {
  const title = `${brand.name} - Página Inicial`;
  const description = brand.desc;

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [resumoCotasMesAtual, setResumoCotasMesAtual] = useState({ liquido: 0, bruto: 0 });
  const [clientesCadastradosMesAtual, setClientesCadastradosMesAtual] = useState(0);
  const [clientesPorEstado, setClientesPorEstado] = useState([]);
  const [serieProgressoMetas, setSerieProgressoMetas] = useState([]);
  const [aniversariantesSemana, setAniversariantesSemana] = useState([]);

  const metaAtual = useMemo(
    () => serieProgressoMetas.find(item => item.ehAtual),
    [serieProgressoMetas]
  );

  const carregarResumo = useCallback(async () => {
    setCarregando(true);
    setErro('');

    const hoje = new Date();
    const hojeISO = hoje.toISOString().slice(0, 10);
    const intervaloMesAtual = obterIntervaloMesReferencia(hojeISO);
    if (!intervaloMesAtual) {
      setErro('Não foi possível determinar o mês atual.');
      setCarregando(false);
      return;
    }

    try {
      const paramsCotas = new URLSearchParams();
      paramsCotas.append('dataInicio', intervaloMesAtual.inicioISO);
      paramsCotas.append('dataFim', intervaloMesAtual.fimISO);

      const [totaisResp, clientesResp] = await Promise.all([
        fetch(`${API_URL}/cotas/total?${paramsCotas.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          }
        }),
        fetch(`${API_URL}/clientes`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          }
        })
      ]);

      if (!totaisResp.ok) {
        const texto = await totaisResp.text();
        throw new Error(`Erro ao buscar cotas: ${totaisResp.status} - ${texto.slice(0, 200)}`);
      }

      const totaisPayload = await totaisResp.json();
      const totaisDados = totaisPayload?.dados || {};
      setResumoCotasMesAtual({
        liquido: Number(totaisDados.valor || 0),
        bruto: Number(totaisDados.valorTotal || 0)
      });

      if (!clientesResp.ok) {
        const texto = await clientesResp.text();
        throw new Error(`Erro ao buscar clientes: ${clientesResp.status} - ${texto.slice(0, 200)}`);
      }

      const clientesPayload = await clientesResp.json();
      const listaClientes = Array.isArray(clientesPayload?.dados)
        ? clientesPayload.dados
        : Array.isArray(clientesPayload)
          ? clientesPayload
          : [];

      const inicioMillis = intervaloMesAtual.inicio.getTime();
      const fimMillis = intervaloMesAtual.fim.getTime();

      const clientesMes = listaClientes.filter((cliente) => {
        const dataCadastro = parseDateOnly(cliente?.createdAt);
        if (!dataCadastro) return false;
        const millis = dataCadastro.getTime();
        return millis >= inicioMillis && millis <= fimMillis;
      }).length;

      setClientesCadastradosMesAtual(clientesMes);
      const estadosAgrupados = agruparClientesPorEstado(listaClientes);
      setClientesPorEstado(estadosAgrupados.lista);

      const intervaloSemanaAtual = obterIntervaloSemanaAtual(hoje);
      const semanaInicio = intervaloSemanaAtual.inicio;
      const semanaFim = intervaloSemanaAtual.fim;

      const aniversariantes = listaClientes
        .map((cliente) => {
          const dataNascimento = parseDateOnly(cliente?.dtnascimento);
          if (!dataNascimento) return null;

          const mesNascimento = dataNascimento.getUTCMonth();
          const diaNascimento = dataNascimento.getUTCDate();

          let proximoAniversario = new Date(Date.UTC(
            semanaInicio.getUTCFullYear(),
            mesNascimento,
            diaNascimento
          ));

          if (proximoAniversario < semanaInicio) {
            proximoAniversario = new Date(Date.UTC(
              semanaInicio.getUTCFullYear() + 1,
              mesNascimento,
              diaNascimento
            ));
          }

          if (proximoAniversario > semanaFim) {
            return null;
          }

          const idade = calcularIdade(dataNascimento, proximoAniversario);

          return {
            id: cliente.id,
            nome: cliente.nome || 'Cliente sem nome',
            cidade: cliente.cidade || 'Cidade não informada',
            estado: cliente.estado || '',
            dataNascimento,
            idade,
            dia: proximoAniversario.getUTCDate(),
            diaSemana: formatDiaSemanaCurto(proximoAniversario),
            dataOcorrencia: proximoAniversario,
            initials: (cliente.nome || '?')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(parte => parte[0]?.toUpperCase() || '')
              .join('')
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.dataOcorrencia - b.dataOcorrencia);

      setAniversariantesSemana(aniversariantes);

      const mesesReferencia = obterUltimosMesesReferencia(3);
      const progressoCalculado = [];

      for (const mes of mesesReferencia) {
        try {
          const paramsMes = new URLSearchParams();
          paramsMes.append('dataInicio', mes.inicioISO);
          paramsMes.append('dataFim', mes.fimISO);

          const [metaResp, totaisMesResp] = await Promise.all([
            fetch(`${API_URL}/metas/referencia?${paramsMes.toString()}`, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`
              }
            }),
            fetch(`${API_URL}/cotas/total?${paramsMes.toString()}`, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`
              }
            })
          ]);

          if (!metaResp.ok) {
            const texto = await metaResp.text();
            throw new Error(`Erro meta ${mes.rotulo}: ${metaResp.status} - ${texto.slice(0, 200)}`);
          }

          if (!totaisMesResp.ok) {
            const texto = await totaisMesResp.text();
            throw new Error(`Erro cotas ${mes.rotulo}: ${totaisMesResp.status} - ${texto.slice(0, 200)}`);
          }

          const metaPayload = await metaResp.json();
          const metaValor = Number(metaPayload?.meta?.valor || 0);

          const totaisMesPayload = await totaisMesResp.json();
          const realizado = Number(totaisMesPayload?.dados?.valor || 0);

          const percentual = metaValor > 0 ? Math.min(100, (realizado / metaValor) * 100) : 0;

          progressoCalculado.push({
            label: mes.rotulo,
            meta: metaValor,
            realizado,
            percentual: Number.isFinite(percentual) ? Number(percentual.toFixed(1)) : 0,
            restante: metaValor > realizado ? metaValor - realizado : 0,
            ehAtual: mes.ehMesAtual
          });
        } catch (error) {
          console.error(`❌ Erro ao calcular progresso da meta para ${mes.rotulo}:`, error);
          progressoCalculado.push({
            label: mes.rotulo,
            meta: 0,
            realizado: 0,
            percentual: 0,
            restante: 0,
            ehAtual: mes.ehMesAtual
          });
        }
      }

      setSerieProgressoMetas(progressoCalculado);
    } catch (error) {
      console.error('❌ Erro ao carregar resumo inicial:', error);
      setErro(error.message || 'Falha ao carregar dados.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  const totalClientes = useMemo(
    () => clientesPorEstado.reduce((acc, estado) => acc + estado.total, 0),
    [clientesPorEstado]
  );

  const dataGraficoMetas = useMemo(() => serieProgressoMetas.map(item => ({
    ...item,
    percentualString: formatPercent(item.percentual)
  })), [serieProgressoMetas]);

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
      <PapperBlock title="Página Inicial" desc="Visão consolidada de resultados e clientes.">
        {carregando && (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!carregando && erro && (
          <Typography color="error" sx={{ mb: 3 }}>
            {erro}
          </Typography>
        )}

        {!carregando && !erro && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <MetricCard
                subtitle="Cotas Vendidas"
                title="Valor líquido no mês"
                value={formatCurrencyCompact(resumoCotasMesAtual.liquido)}
                icon={MonetizationOnIcon}
                gradient="linear-gradient(135deg, #00C6FF 0%, #0078FF 100%)"
                footerPrimary={`Bruto: ${formatCurrencyBR(resumoCotasMesAtual.bruto)}`}
                footerSecondary="Valores consolidados do período vigente"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <MetricCard
                subtitle="Novos Clientes"
                title="Cadastrados no mês atual"
                value={clientesCadastradosMesAtual}
                icon={GroupIcon}
                gradient="linear-gradient(135deg, #5C33F6 0%, #C833F6 100%)"
                footerPrimary={`Base total: ${totalClientes}`}
                footerSecondary="Clientes em toda a base ativa"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <MetricCard
                subtitle="Meta de Vendas"
                title={
                  metaAtual
                    ? `${formatCurrencyBR(metaAtual.realizado)} de ${formatCurrencyBR(metaAtual.meta)}`
                    : 'Nenhuma meta encontrada'
                }
                value={metaAtual ? formatPercent(metaAtual.percentual) : '--'}
                icon={FlagIcon}
                gradient="linear-gradient(135deg, #FF7842 0%, #FF3A7C 100%)"
                footerPrimary={
                  metaAtual && metaAtual.restante > 0
                    ? `Restante: ${formatCurrencyBR(metaAtual.restante)}`
                    : metaAtual
                      ? 'Meta superada 🎉'
                      : null
                }
                footerSecondary={metaAtual ? 'Progresso consolidado do mês vigente' : null}
              />
            </Grid>

            <Grid item xs={12} lg={8}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Progresso da Meta - Últimos 3 meses
                </Typography>
                {serieProgressoMetas.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum dado disponível.
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={dataGraficoMetas}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis yAxisId="left" tickFormatter={formatCurrencyCompact} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={formatPercent} domain={[0, 100]} />
                      <RechartsTooltip content={<RechartsCurrencyTooltip />} />
                      <Legend />
                      <Bar yAxisId="left" dataKey="realizado" name="Realizado" fill="#34C759" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="left" type="monotone" dataKey="meta" name="Meta" stroke="#FF3B30" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="percentual" name="% Atig." stroke="#007AFF" strokeDasharray="4 2" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Distribuição de clientes por estado
                </Typography>
                {clientesPorEstado.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum cliente com estado definido.
                  </Typography>
                ) : (
                  <List dense sx={{ maxHeight: 280, overflow: 'auto' }}>
                    {clientesPorEstado.map((estado) => (
                      <ListItem
                        key={estado.estado}
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          mb: 1.5,
                          borderRadius: 2,
                          bgcolor: 'rgba(15, 23, 42, 0.04)',
                          px: 2,
                          py: 1.2
                        }}
                      >
                        <Box
                          sx={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.8
                          }}
                        >
                          <Chip
                            label={estado.estado}
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 600 }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {estado.total} clientes
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, estado.percentual)}
                          sx={{
                            width: '100%',
                            height: 8,
                            borderRadius: 4,
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4
                            }
                          }}
                        />
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                          {estado.percentual.toFixed(1)}% da base
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CakeIcon color="primary" />
                  Aniversariantes da semana
                </Typography>
                {aniversariantesSemana.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum cliente aniversaria nesta semana.
                  </Typography>
                ) : (
                  <List dense sx={{ maxHeight: 280, overflow: 'auto' }}>
                    {aniversariantesSemana.map((cliente) => (
                      <ListItem
                        key={cliente.id || `${cliente.nome}-${cliente.dia}`}
                        sx={{
                          borderRadius: 2,
                          mb: 1,
                          bgcolor: 'rgba(59,130,246,0.07)',
                          '&:hover': { bgcolor: 'rgba(59,130,246,0.12)' }
                        }}
                        alignItems="flex-start"
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: 'primary.main',
                              color: '#fff',
                              fontWeight: 600
                            }}
                          >
                            {cliente.initials || 'C'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {cliente.nome}
                              </Typography>
                              <Chip
                                label={`${cliente.diaSemana} · ${String(cliente.dia).padStart(2, '0')}`}
                                size="small"
                                color="primary"
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box component="span">
                              <Typography variant="body2" color="textSecondary">
                                {cliente.cidade}{cliente.estado ? ` • ${cliente.estado}` : ''}
                              </Typography>
                              {cliente.idade !== null && (
                                <Chip
                                  label={`${cliente.idade} anos`}
                                  size="small"
                                  sx={{ mt: 0.5, bgcolor: 'rgba(12,74,110,0.12)', color: 'primary.main', fontWeight: 600 }}
                                />
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </PapperBlock>
    </div>
  );
}

export default BlankPage;
