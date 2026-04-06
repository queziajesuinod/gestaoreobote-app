import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import * as inadimplenciaApi from '../../../services/inadimplentesApi';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Componente de Gráficos de Inadimplência
 * Exibe 4 gráficos principais:
 * 1. Evolução de Inadimplência (Linha)
 * 2. Inadimplência por Consultor (Barra)
 * 3. Distribuição de Status (Pizza)
 * 4. Taxa de Inadimplência por Mês (Linha)
 */
function GraficosInadimplencia({ meses = 6, filtros = {} }) {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [dados, setDados] = useState(null);

  useEffect(() => {
    carregarDados();
  }, [meses, filtros.consultorId, filtros.mes, filtros.ano]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setErro(null);
      
      const response = await inadimplenciaApi.obterDadosGraficos(meses, filtros);
      
      if (response.sucesso) {
        setDados(response.dados);
      } else {
        setErro(response.mensagem || 'Erro ao carregar dados dos gráficos');
      }
    } catch (error) {
      console.error('Erro ao carregar gráficos:', error);
      setErro('Erro ao carregar dados dos gráficos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (erro) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {erro}
      </Alert>
    );
  }

  if (!dados) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Nenhum dado disponível para exibir gráficos
      </Alert>
    );
  }

  // Gráfico 1: Evolução de Inadimplência (Linha)
  const evolucaoData = {
    labels: dados.evolucaoInadimplencia.map(item => item.mes),
    datasets: [
      {
        label: 'Atrasadas',
        data: dados.evolucaoInadimplencia.map(item => item.atrasadas),
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Pendentes',
        data: dados.evolucaoInadimplencia.map(item => item.pendentes),
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Pagas',
        data: dados.evolucaoInadimplencia.map(item => item.pagas),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const evolucaoOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Evolução de Inadimplência',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y} cobranças`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  // Gráfico 2: Inadimplência por Consultor (Barra)
  const consultorData = {
    labels: dados.inadimplenciaPorConsultor.map(item => item.nome),
    datasets: [
      {
        label: 'Quantidade de Cobranças Atrasadas',
        data: dados.inadimplenciaPorConsultor.map(item => item.quantidade),
        backgroundColor: '#f44336',
        borderColor: '#d32f2f',
        borderWidth: 1
      }
    ]
  };

  const consultorOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Inadimplência por Consultor (Top 10)',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const consultor = dados.inadimplenciaPorConsultor[context.dataIndex];
            return [
              `Quantidade: ${consultor.quantidade} cobranças`,
              `Valor: R$ ${consultor.valor.toFixed(2)}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  // Gráfico 3: Distribuição de Status (Pizza)
  const statusData = {
    labels: ['Pagas', 'Atrasadas', 'Pendentes'],
    datasets: [
      {
        data: [
          dados.distribuicaoStatus.pagas,
          dados.distribuicaoStatus.atrasadas,
          dados.distribuicaoStatus.pendentes
        ],
        backgroundColor: [
          '#4caf50',
          '#f44336',
          '#ff9800'
        ],
        borderColor: [
          '#388e3c',
          '#d32f2f',
          '#f57c00'
        ],
        borderWidth: 2
      }
    ]
  };

  const statusOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Distribuição de Status das Cobranças',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = dados.distribuicaoStatus.total;
            const valor = context.parsed;
            const percentual = ((valor / total) * 100).toFixed(1);
            return `${context.label}: ${valor} (${percentual}%)`;
          }
        }
      }
    }
  };

  // Gráfico 4: Taxa de Inadimplência por Mês (Linha)
  const taxaInadimplenciaData = {
    labels: dados.taxaInadimplenciaPorMes.map(item => item.mes),
    datasets: [
      {
        label: 'Taxa de Inadimplência (%)',
        data: dados.taxaInadimplenciaPorMes.map(item => item.taxa),
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        borderWidth: 3,
        pointRadius: 5,
        pointBackgroundColor: '#f44336',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0.4
      }
    ]
  };

  const taxaInadimplenciaOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Taxa de Inadimplência por Mês',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const item = dados.taxaInadimplenciaPorMes[context.dataIndex];
            return [
              `Taxa: ${item.taxa}%`,
              `Atrasadas: ${item.atrasadas}`,
              `Total: ${item.total}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Gráfico 1: Evolução de Inadimplência */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box height={350}>
                <Line data={evolucaoData} options={evolucaoOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfico 3: Distribuição de Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box height={350}>
                <Doughnut data={statusData} options={statusOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfico 2: Inadimplência por Consultor */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box height={350}>
                <Bar data={consultorData} options={consultorOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfico 4: Taxa de Inadimplência por Mês */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box height={350}>
                <Line data={taxaInadimplenciaData} options={taxaInadimplenciaOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

GraficosInadimplencia.propTypes = {
  meses: PropTypes.number,
  filtros: PropTypes.object
};

export default GraficosInadimplencia;
