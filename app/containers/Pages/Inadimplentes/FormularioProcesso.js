import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import brand from 'dan-api/dummy/brand';
import * as inadimplentesApi from '../../../services/inadimplentesApi';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const getToken = () => localStorage.getItem('token');

function FormularioProcesso() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdicao = !!id;

  const title = `${brand.name} - ${isEdicao ? 'Editar' : 'Novo'} Processo de Cobrança`;
  const description = isEdicao
    ? 'Editar processo de cobrança existente'
    : 'Criar novo processo de cobrança';

  // Estados do formulário
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [cotas, setCotas] = useState([]);
  const [cotaSelecionada, setCotaSelecionada] = useState(null);
  const [loadingCotas, setLoadingCotas] = useState(false);

  const [form, setForm] = useState({
    cotaId: '',
    diaVencimento: 10,
    dataInicioCobranca: new Date().toISOString().split('T')[0],
    valorParcela: ''
  });

  // Histórico retroativo
  const [importarHistorico, setImportarHistorico] = useState(false);
  const [historico, setHistorico] = useState({
    primeiroMesPago: '',
    quantidadeMeses: 1
  });

  // Preview de cobranças
  const [previewCobrancas, setPreviewCobrancas] = useState([]);

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Carregar cotas disponíveis
  useEffect(() => {
    carregarCotas();
  }, []);

  // Carregar processo se for edição
  useEffect(() => {
    if (isEdicao) {
      carregarProcesso();
    }
  }, [id]);

  // Atualizar preview quando form mudar
  useEffect(() => {
    atualizarPreview();
  }, [form, importarHistorico, historico]);

  const carregarCotas = async () => {
    try {
      setLoadingCotas(true);
      const response = await fetch(`${API_URL}/api/cotas`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) throw new Error('Erro ao carregar cotas');

      const data = await response.json();
      setCotas(data.dados || []);
    } catch (error) {
      console.error('Erro ao carregar cotas:', error);
      mostrarSnackbar('Erro ao carregar cotas', 'error');
    } finally {
      setLoadingCotas(false);
    }
  };

  const carregarProcesso = async () => {
    try {
      setLoading(true);
      const response = await inadimplentesApi.buscarProcesso(id);
      const processo = response.dados;

      setForm({
        cotaId: processo.cotaId,
        diaVencimento: processo.diaVencimento,
        dataInicioCobranca: processo.dataInicioCobranca.split('T')[0],
        valorParcela: processo.valorParcela
      });

      // Buscar cota selecionada
      const cota = cotas.find(c => c.id === processo.cotaId);
      if (cota) setCotaSelecionada(cota);
    } catch (error) {
      console.error('Erro ao carregar processo:', error);
      mostrarSnackbar('Erro ao carregar processo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const mostrarSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fecharSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleChangeCota = (event, novaCota) => {
    setCotaSelecionada(novaCota);
    if (novaCota) {
      setForm({
        ...form,
        cotaId: novaCota.id,
        valorParcela: novaCota.valor || ''
      });
    } else {
      setForm({
        ...form,
        cotaId: '',
        valorParcela: ''
      });
    }
  };

  const handleChangeForm = (campo, valor) => {
    setForm({
      ...form,
      [campo]: valor
    });
  };

  const handleChangeHistorico = (campo, valor) => {
    setHistorico({
      ...historico,
      [campo]: valor
    });
  };

  const atualizarPreview = () => {
    const cobrancas = [];

    // Cobranças retroativas
    if (importarHistorico && historico.primeiroMesPago && historico.quantidadeMeses > 0) {
      const [ano, mes] = historico.primeiroMesPago.split('-').map(Number);
      
      for (let i = 0; i < historico.quantidadeMeses; i++) {
        const data = new Date(ano, mes - 1 + i, form.diaVencimento);
        cobrancas.push({
          mesReferencia: `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`,
          dataVencimento: data.toLocaleDateString('pt-BR'),
          valor: form.valorParcela || 0,
          status: 'pago',
          tipo: 'retroativo'
        });
      }
    }

    // Cobrança do mês atual
    const hoje = new Date();
    const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), form.diaVencimento);
    cobrancas.push({
      mesReferencia: `${String(mesAtual.getMonth() + 1).padStart(2, '0')}/${mesAtual.getFullYear()}`,
      dataVencimento: mesAtual.toLocaleDateString('pt-BR'),
      valor: form.valorParcela || 0,
      status: 'pendente',
      tipo: 'atual'
    });

    setPreviewCobrancas(cobrancas);
  };

  const validarFormulario = () => {
    if (!form.cotaId) {
      mostrarSnackbar('Selecione uma cota', 'error');
      return false;
    }

    if (!form.diaVencimento || form.diaVencimento < 1 || form.diaVencimento > 31) {
      mostrarSnackbar('Dia de vencimento deve estar entre 1 e 31', 'error');
      return false;
    }

    if (!form.dataInicioCobranca) {
      mostrarSnackbar('Informe a data de início da cobrança', 'error');
      return false;
    }

    if (!form.valorParcela || form.valorParcela <= 0) {
      mostrarSnackbar('Informe o valor da parcela', 'error');
      return false;
    }

    if (importarHistorico) {
      if (!historico.primeiroMesPago) {
        mostrarSnackbar('Informe o primeiro mês pago', 'error');
        return false;
      }

      if (!historico.quantidadeMeses || historico.quantidadeMeses < 1) {
        mostrarSnackbar('Informe a quantidade de meses pagos', 'error');
        return false;
      }
    }

    return true;
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) return;

    try {
      setSalvando(true);

      const dados = {
        ...form,
        valorParcela: parseFloat(form.valorParcela)
      };

      // Adicionar histórico se marcado
      if (importarHistorico) {
        dados.historicoRetroativo = {
          primeiroMesPago: historico.primeiroMesPago,
          quantidadeMeses: parseInt(historico.quantidadeMeses, 10)
        };
      }

      if (isEdicao) {
        await inadimplentesApi.atualizarProcesso(id, dados);
        mostrarSnackbar('Processo atualizado com sucesso');
      } else {
        await inadimplentesApi.criarProcesso(dados);
        mostrarSnackbar('Processo criado com sucesso');
      }

      setTimeout(() => {
        navigate('/app/inadimplentes');
      }, 1500);
    } catch (error) {
      console.error('Erro ao salvar processo:', error);
      mostrarSnackbar('Erro ao salvar processo', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelar = () => {
    navigate('/app/inadimplentes');
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
        title={isEdicao ? 'Editar Processo de Cobrança' : 'Novo Processo de Cobrança'}
        desc={description}
        icon="ion-ios-cash-outline"
      >
        <Grid container spacing={3}>
          {/* Formulário Principal */}
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dados do Processo
                </Typography>

                <Grid container spacing={2}>
                  {/* Seleção de Cota */}
                  <Grid item xs={12}>
                    <Autocomplete
                      options={cotas}
                      getOptionLabel={(option) => 
                        `${option.numero} - ${option.Cliente?.nome || 'Sem cliente'} (Grupo: ${option.grupo})`
                      }
                      value={cotaSelecionada}
                      onChange={handleChangeCota}
                      loading={loadingCotas}
                      disabled={isEdicao}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Cota *"
                          placeholder="Digite para buscar..."
                          helperText={isEdicao ? 'Não é possível alterar a cota' : 'Selecione a cota para cobrança'}
                        />
                      )}
                    />
                  </Grid>

                  {/* Dia de Vencimento */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Dia de Vencimento *"
                      value={form.diaVencimento}
                      onChange={(e) => handleChangeForm('diaVencimento', parseInt(e.target.value, 10))}
                      inputProps={{ min: 1, max: 31 }}
                      helperText="Dia do mês para vencimento (1-31)"
                    />
                  </Grid>

                  {/* Data de Início */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Data de Início da Cobrança *"
                      value={form.dataInicioCobranca}
                      onChange={(e) => handleChangeForm('dataInicioCobranca', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      helperText="A partir de quando gerar cobranças"
                    />
                  </Grid>

                  {/* Valor da Parcela */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Valor da Parcela *"
                      value={form.valorParcela}
                      onChange={(e) => handleChangeForm('valorParcela', e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
                      helperText="Valor mensal da parcela"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                {/* Histórico Retroativo */}
                {!isEdicao && (
                  <>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={importarHistorico}
                          onChange={(e) => setImportarHistorico(e.target.checked)}
                        />
                      }
                      label="Importar histórico de cobranças já pagas"
                    />

                    {importarHistorico && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                          Histórico Retroativo
                        </Typography>
                        <Typography variant="caption" color="textSecondary" paragraph>
                          As cobranças retroativas serão criadas com status "pago" e servem apenas para histórico e relatórios.
                          Não disparam webhooks de notificação.
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              type="month"
                              label="Primeiro Mês Pago *"
                              value={historico.primeiroMesPago}
                              onChange={(e) => handleChangeHistorico('primeiroMesPago', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              helperText="Ex: 01/2024"
                            />
                          </Grid>

                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              type="number"
                              label="Quantidade de Meses *"
                              value={historico.quantidadeMeses}
                              onChange={(e) => handleChangeHistorico('quantidadeMeses', parseInt(e.target.value, 10))}
                              inputProps={{ min: 1, max: 120 }}
                              helperText="Quantos meses foram pagos"
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </>
                )}

                {/* Botões */}
                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={salvando ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSalvar}
                    disabled={salvando}
                  >
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancelar}
                    disabled={salvando}
                  >
                    Cancelar
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Preview de Cobranças */}
          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preview de Cobranças
                </Typography>
                <Typography variant="caption" color="textSecondary" paragraph>
                  Cobranças que serão criadas ao salvar o processo
                </Typography>

                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Mês</TableCell>
                        <TableCell>Vencimento</TableCell>
                        <TableCell>Valor</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewCobrancas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="caption" color="textSecondary">
                              Preencha os dados para ver o preview
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        previewCobrancas.map((cobranca, index) => (
                          <TableRow
                            key={index}
                            sx={{
                              bgcolor: cobranca.tipo === 'retroativo' ? 'action.hover' : 'inherit'
                            }}
                          >
                            <TableCell>
                              {cobranca.mesReferencia}
                              {cobranca.tipo === 'retroativo' && (
                                <Typography variant="caption" display="block" color="textSecondary">
                                  (Retroativo)
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{cobranca.dataVencimento}</TableCell>
                            <TableCell>
                              {inadimplentesApi.formatarMoeda(cobranca.valor)}
                            </TableCell>
                            <TableCell>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: cobranca.status === 'pago' ? 'success.main' : 'warning.main',
                                  fontWeight: 'bold'
                                }}
                              >
                                {cobranca.status.toUpperCase()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {previewCobrancas.length > 0 && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="info.main">
                      Total de cobranças: {previewCobrancas.length}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      • Retroativas: {previewCobrancas.filter(c => c.tipo === 'retroativo').length}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="textSecondary">
                      • Atuais: {previewCobrancas.filter(c => c.tipo === 'atual').length}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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

export default FormularioProcesso;
