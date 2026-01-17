import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Grid,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Button,
  ButtonGroup,
  Divider,
  Alert
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Insights as InsightsIcon,
  LocalFireDepartment as FireIcon,
  AcUnit as ColdIcon,
  Thermostat as WarmIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import { leadsApi } from '../../../services/leadsApi';

const COLORS = {
  quente: '#f44336',
  morno: '#ff9800',
  frio: '#2196f3'
};

const COLORS_ARRAY = ['#f44336', '#ff9800', '#2196f3', '#4caf50', '#9c27b0', '#00bcd4'];

function LeadsInsights() {
  const navigate = useNavigate();
  const title = `${brand.name} - Insights de Leads`;
  const description = 'Dashboard de análise de leads';

  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroTemperatura, setFiltroTemperatura] = useState(null);

  const carregarInsights = useCallback(async () => {
    setLoading(true);
    try {
      const response = await leadsApi.obterInsightsConsultor('meu', {
        temperatura: filtroTemperatura
      });
      
      if (response.sucesso) {
        setInsights(response.insights);
      }
    } catch (error) {
      console.error('Erro ao carregar insights:', error);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  }, [filtroTemperatura]);

  useEffect(() => {
    carregarInsights();
  }, [carregarInsights]);

  const dadosDistribuicao = insights
    ? [
      { name: 'Quentes', value: insights.distribuicao.quentes, color: COLORS.quente },
      { name: 'Mornos', value: insights.distribuicao.mornos, color: COLORS.morno },
      { name: 'Frios', value: insights.distribuicao.frios, color: COLORS.frio }
    ]
    : [];

  const dadosSinais = insights?.topSinaisCompra?.slice(0, 8).map(item => ({
    name: item.sinal.replace(/_/g, ' ').substring(0, 20),
    value: item.ocorrencias
  })) || [];

  const dadosObjecoes = insights?.topObjecoes?.slice(0, 8).map(item => ({
    name: item.objecao.replace(/_/g, ' ').substring(0, 20),
    value: item.ocorrencias
  })) || [];

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
      </Helmet>

      <PapperBlock
        title="Dashboard de Insights"
        icon={<InsightsIcon />}
        desc="Análise consolidada da sua carteira de leads"
      >
        {loading ? (
          <Box display="flex" justifyContent="center" padding={4}>
            <CircularProgress />
          </Box>
        ) : !insights ? (
          <Alert severity="info">
            Nenhum dado disponível. Importe leads do WhatsApp para começar a análise.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {/* Filtros */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Filtrar por temperatura:</Typography>
                <ButtonGroup variant="outlined" size="small">
                  <Button
                    onClick={() => setFiltroTemperatura(null)}
                    variant={filtroTemperatura === null ? 'contained' : 'outlined'}
                  >
                    Todos
                  </Button>
                  <Button
                    onClick={() => setFiltroTemperatura('quente')}
                    variant={filtroTemperatura === 'quente' ? 'contained' : 'outlined'}
                    color="error"
                  >
                    Quentes
                  </Button>
                  <Button
                    onClick={() => setFiltroTemperatura('morno')}
                    variant={filtroTemperatura === 'morno' ? 'contained' : 'outlined'}
                    color="warning"
                  >
                    Mornos
                  </Button>
                  <Button
                    onClick={() => setFiltroTemperatura('frio')}
                    variant={filtroTemperatura === 'frio' ? 'contained' : 'outlined'}
                    color="info"
                  >
                    Frios
                  </Button>
                </ButtonGroup>
              </Box>
            </Grid>

            {/* Cards de Resumo */}
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    Total de Leads
                  </Typography>
                  <Typography variant="h3" color="primary">
                    {insights.totalLeads}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', backgroundColor: '#ffebee' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <FireIcon color="error" />
                    <Typography variant="h6" color="textSecondary">
                      Quentes
                    </Typography>
                  </Box>
                  <Typography variant="h3" color="error">
                    {insights.distribuicao.quentes}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {insights.percentuais.quentes}% do total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', backgroundColor: '#fff3e0' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <WarmIcon color="warning" />
                    <Typography variant="h6" color="textSecondary">
                      Mornos
                    </Typography>
                  </Box>
                  <Typography variant="h3" color="warning.main">
                    {insights.distribuicao.mornos}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {insights.percentuais.mornos}% do total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%', backgroundColor: '#e3f2fd' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1}>
                    <ColdIcon color="info" />
                    <Typography variant="h6" color="textSecondary">
                      Frios
                    </Typography>
                  </Box>
                  <Typography variant="h3" color="info.main">
                    {insights.distribuicao.frios}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {insights.percentuais.frios}% do total
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Gráfico de Pizza - Distribuição */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribuição por Temperatura
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dadosDistribuicao}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dadosDistribuicao.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Leads que Precisam de Atenção */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <WarningIcon color="warning" />
                    <Typography variant="h6">
                      Leads que Precisam de Atenção
                    </Typography>
                  </Box>
                  {insights.leadsAtencao && insights.leadsAtencao.length > 0 ? (
                    <List dense sx={{ maxHeight: 250, overflow: 'auto' }}>
                      {insights.leadsAtencao.map((lead) => (
                        <ListItem key={lead.id} disablePadding>
                          <ListItemButton onClick={() => navigate(`/app/leads/${lead.id}`)}>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Typography variant="body1">{lead.nome}</Typography>
                                  <Chip
                                    label={lead.temperatura}
                                    size="small"
                                    color={lead.temperatura >= 70 ? 'error' : 'warning'}
                                  />
                                </Box>
                              }
                              secondary={`${lead.motivo} - ${lead.diasSemMensagem} dias sem mensagem`}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      Nenhum lead precisa de atenção urgente no momento.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Gráfico de Barras - Sinais de Compra */}
            {dadosSinais.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <TrendingUpIcon color="success" />
                      <Typography variant="h6">
                        Top Sinais de Compra
                      </Typography>
                    </Box>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dadosSinais}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#4caf50" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Gráfico de Barras - Objeções */}
            {dadosObjecoes.length > 0 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <WarningIcon color="error" />
                      <Typography variant="h6">
                        Top Objeções
                      </Typography>
                    </Box>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dadosObjecoes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f44336" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Tópicos Mais Discutidos */}
            {insights.topTopicos && insights.topTopicos.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Tópicos Mais Discutidos
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
                      {insights.topTopicos.map((item, index) => (
                        <Chip
                          key={index}
                          label={`${item.topico.replace(/_/g, ' ')} (${item.ocorrencias})`}
                          variant="outlined"
                          color="primary"
                          size="medium"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Lista Completa de Sinais */}
            {insights.topSinaisCompra && insights.topSinaisCompra.length > 8 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Todos os Sinais de Compra
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {insights.topSinaisCompra.map((item, index) => (
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

            {/* Lista Completa de Objeções */}
            {insights.topObjecoes && insights.topObjecoes.length > 8 && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Todas as Objeções
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {insights.topObjecoes.map((item, index) => (
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

            <Grid item xs={12}>
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/app/leads')}
                >
                  Ver Todos os Leads
                </Button>
              </Box>
            </Grid>
          </Grid>
        )}
      </PapperBlock>
    </div>
  );
}

export default LeadsInsights;
