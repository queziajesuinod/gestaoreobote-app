import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Snackbar,
  TextField,
  Typography
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import brand from 'dan-api/dummy/brand';
import * as inadimplentesApi from '../../../services/inadimplentesApi';
import GerenciadorCotasProcesso from './GerenciadorCotasProcesso';

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

  // Estados principais
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [tipoProcesso, setTipoProcesso] = useState('unico'); // 'unico' ou 'multiplo'
  const [processo, setProcesso] = useState(null);

  // Estados para processo de cota única (LEGADO)
  const [cotasDisponiveis, setCotasDisponiveis] = useState([]);
  const [cotaSelecionada, setCotaSelecionada] = useState(null);
  const [loadingCotas, setLoadingCotas] = useState(false);
  const [formUnico, setFormUnico] = useState({
    cotaId: '',
    nome: '',
    valor: '',
    diaVencimento: 10,
    dataInicioCobranca: new Date().toISOString().split('T')[0],
    quantidadeMeses: '',
    mesesPagosRetroativo: 0
  });

  // Estados para processo multi-cota (NOVO)
  const [formMultiplo, setFormMultiplo] = useState({
    nome: '',
    cotas: []
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Carregar processo se for edição
  useEffect(() => {
    if (isEdicao) {
      carregarProcesso();
    }
  }, [id]);

  // Carregar cotas disponíveis
  useEffect(() => {
    if (tipoProcesso === 'unico' || tipoProcesso === 'multiplo') {
      carregarCotas();
    }
  }, [tipoProcesso]);

  const carregarProcesso = async () => {
    try {
      setLoading(true);
      const response = await inadimplentesApi.buscarProcesso(id);
      const proc = response.dados;
      setProcesso(proc);

      // Determinar tipo do processo
      const tipo = proc.tipo || 'unico';
      setTipoProcesso(tipo);

      if (tipo === 'unico') {
        // Carregar dados do processo de cota única
        const cota = proc.cota || proc.Cota;
        setFormUnico({
          cotaId: proc.cotaId,
          nome: proc.nome || '',
          valor: cota?.valor || '',
          diaVencimento: proc.diaVencimento || 10,
          dataInicioCobranca: proc.dataInicioCobranca?.split('T')[0] || '',
          quantidadeMeses: proc.quantidadeMeses || '',
          mesesPagosRetroativo: 0
        });
        if (cota) {
          setCotaSelecionada(cota);
        }
      } else {
        // Carregar dados do processo multi-cota
        setFormMultiplo({
          nome: proc.nome || '',
          cotas: [] // Será carregado via API separada
        });
        // Carregar cotas do processo
        await carregarCotasDoProcesso(id);
      }
    } catch (error) {
      console.error('Erro ao carregar processo:', error);
      mostrarSnackbar('Erro ao carregar processo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const carregarCotasDoProcesso = async (processoId) => {
    try {
      const response = await fetch(`${API_URL}/inadimplentes/processos/${processoId}/cotas`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) throw new Error('Erro ao carregar cotas do processo');

      const data = await response.json();
      const cotasProcesso = data.dados || [];

      // Transformar para formato do formulário
      const cotasFormatadas = cotasProcesso.map(cp => ({
        cotaId: cp.cotaId,
        cotaSelecionada: cp.cota,
        valor: parseFloat(cp.valor),
        diaVencimento: cp.diaVencimento,
        quantidadeMeses: cp.quantidadeMeses,
        mesesPagosRetroativo: cp.mesesPagosRetroativo || 0,
        dataInicioCobranca: cp.dataInicioCobranca,
        observacao: cp.observacao || ''
      }));

      setFormMultiplo(prev => ({
        ...prev,
        cotas: cotasFormatadas
      }));
    } catch (error) {
      console.error('Erro ao carregar cotas do processo:', error);
      mostrarSnackbar('Erro ao carregar cotas do processo', 'error');
    }
  };

  const carregarCotas = async (busca = '') => {
    try {
      setLoadingCotas(true);
      
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);
      params.append('limit', '100');
      
      const url = `${API_URL}/cotas?${params}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      if (!response.ok) throw new Error('Erro ao carregar cotas');

      const data = await response.json();
      const cotasLista = Array.isArray(data) ? data : (data.dados || []);
      
      setCotasDisponiveis(cotasLista);
    } catch (error) {
      console.error('Erro ao carregar cotas:', error);
      mostrarSnackbar('Erro ao carregar cotas', 'error');
    } finally {
      setLoadingCotas(false);
    }
  };

  const mostrarSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const fecharSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleChangeTipoProcesso = (event) => {
    setTipoProcesso(event.target.value);
  };

  const handleChangeCotaUnico = (event, novaCota) => {
    setCotaSelecionada(novaCota);
    if (novaCota) {
      const valorCota = parseFloat(novaCota.valor) || 0;
      setFormUnico({
        ...formUnico,
        cotaId: novaCota.id,
        valor: valorCota,
        dataInicioCobranca: novaCota.dtaquisicao 
          ? new Date(novaCota.dtaquisicao).toISOString().split('T')[0]
          : formUnico.dataInicioCobranca
      });
    } else {
      setFormUnico({
        ...formUnico,
        cotaId: '',
        valor: ''
      });
    }
  };

  const handleChangeFormUnico = (campo, valor) => {
    setFormUnico({
      ...formUnico,
      [campo]: valor
    });
  };

  const handleChangeFormMultiplo = (campo, valor) => {
    setFormMultiplo({
      ...formMultiplo,
      [campo]: valor
    });
  };

  const validarFormulario = () => {
    if (tipoProcesso === 'unico') {
      if (!formUnico.cotaId) {
        mostrarSnackbar('Selecione uma cota', 'error');
        return false;
      }

      if (!formUnico.valor || formUnico.valor <= 0) {
        mostrarSnackbar('Informe um valor válido', 'error');
        return false;
      }

      if (!formUnico.diaVencimento || formUnico.diaVencimento < 1 || formUnico.diaVencimento > 31) {
        mostrarSnackbar('Dia de vencimento deve estar entre 1 e 31', 'error');
        return false;
      }

      if (!formUnico.dataInicioCobranca) {
        mostrarSnackbar('Informe a data de início da cobrança', 'error');
        return false;
      }
    } else {
      // Validação para processo multi-cota
      if (!formMultiplo.nome || formMultiplo.nome.trim() === '') {
        mostrarSnackbar('Informe um nome para o processo', 'error');
        return false;
      }

      if (formMultiplo.cotas.length === 0) {
        mostrarSnackbar('Adicione pelo menos uma cota ao processo', 'error');
        return false;
      }
    }

    return true;
  };

  const handleSalvar = async () => {
    if (!validarFormulario()) return;

    try {
      setSalvando(true);

      if (tipoProcesso === 'unico') {
        // Salvar processo de cota única
        const dados = {
          cotaId: formUnico.cotaId,
          nome: formUnico.nome || `Processo - Cota ${cotaSelecionada?.cota}`,
          diaVencimento: parseInt(formUnico.diaVencimento, 10),
          dataInicioCobranca: formUnico.dataInicioCobranca,
          quantidadeMeses: formUnico.quantidadeMeses === '' ? null : parseInt(formUnico.quantidadeMeses, 10)
        };

        // Adicionar histórico retroativo se houver
        if (formUnico.mesesPagosRetroativo > 0) {
          const dataInicio = new Date(formUnico.dataInicioCobranca);
          const anoInicio = dataInicio.getFullYear();
          const mesInicio = dataInicio.getMonth() + 1;
          dados.historicoRetroativo = {
            primeiroMesPago: `${anoInicio}-${String(mesInicio).padStart(2, '0')}`,
            quantidadeMeses: parseInt(formUnico.mesesPagosRetroativo, 10)
          };
        }

        if (isEdicao) {
          await inadimplentesApi.atualizarProcesso(id, dados);
          mostrarSnackbar('Processo atualizado com sucesso');
        } else {
          await inadimplentesApi.criarProcesso(dados);
          mostrarSnackbar('Processo criado com sucesso');
        }
      } else {
        // Salvar processo multi-cota
        const dados = {
          nome: formMultiplo.nome,
          cotas: formMultiplo.cotas.map(cota => ({
            cotaId: cota.cotaId,
            valor: parseFloat(cota.valor),
            diaVencimento: parseInt(cota.diaVencimento, 10),
            quantidadeMeses: cota.quantidadeMeses === '' ? null : parseInt(cota.quantidadeMeses, 10),
            mesesPagosRetroativo: parseInt(cota.mesesPagosRetroativo, 10) || 0,
            dataInicioCobranca: cota.dataInicioCobranca,
            observacao: cota.observacao || ''
          }))
        };

        if (isEdicao) {
          // Para edição de processo multi-cota, precisamos atualizar via API específica
          mostrarSnackbar('Edição de processos multi-cota ainda não implementada', 'warning');
          return;
        } else {
          await inadimplentesApi.criarProcesso(dados);
          mostrarSnackbar('Processo criado com sucesso');
        }
      }

      setTimeout(() => {
        navigate('/app/inadimplentes/processos');
      }, 1500);
    } catch (error) {
      console.error('Erro ao salvar processo:', error);
      mostrarSnackbar(error.message || 'Erro ao salvar processo', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelar = () => {
    navigate('/app/inadimplentes/processos');
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
          <Grid item xs={12}>
            {/* Seleção do Tipo de Processo */}
            {!isEdicao && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Tipo de Processo</FormLabel>
                    <RadioGroup
                      row
                      value={tipoProcesso}
                      onChange={handleChangeTipoProcesso}
                    >
                      <FormControlLabel 
                        value="unico" 
                        control={<Radio />} 
                        label="Cota Única (Tradicional)" 
                      />
                      <FormControlLabel 
                        value="multiplo" 
                        control={<Radio />} 
                        label="Múltiplas Cotas (Novo)" 
                      />
                    </RadioGroup>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                      {tipoProcesso === 'unico' 
                        ? 'Processo vinculado a uma única cota com configurações padrão'
                        : 'Processo que agrupa múltiplas cotas com configurações individuais (valor, vencimento, duração diferentes)'}
                    </Typography>
                  </FormControl>
                </CardContent>
              </Card>
            )}

            {/* Formulário para Cota Única */}
            {tipoProcesso === 'unico' && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Dados do Processo
                  </Typography>

                  <Grid container spacing={2}>
                    {/* Nome do Processo */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nome do Processo"
                        value={formUnico.nome}
                        onChange={(e) => handleChangeFormUnico('nome', e.target.value)}
                        helperText="Nome descritivo (opcional)"
                      />
                    </Grid>

                    {/* Seleção de Cota */}
                    <Grid item xs={12}>
                      <Autocomplete
                        options={cotasDisponiveis}
                        getOptionLabel={(option) => {
                          if (!option) return '';
                          const numeroCota = option.cota || '';
                          const digito = option.digito ? `-${option.digito}` : '';
                          const clienteNome = option.cliente?.nome || option.Cliente?.nome || 'Sem cliente';
                          const grupo = option.grupo ? ` (Grupo ${option.grupo})` : '';
                          return `${numeroCota}${digito} - ${clienteNome}${grupo}`;
                        }}
                        value={cotaSelecionada}
                        onChange={handleChangeCotaUnico}
                        loading={loadingCotas}
                        disabled={isEdicao}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Cota *"
                            helperText={isEdicao ? 'Não é possível alterar a cota' : 'Selecione a cota'}
                          />
                        )}
                      />
                    </Grid>

                    {/* Valor */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Valor da Cobrança *"
                        value={formUnico.valor}
                        onChange={(e) => handleChangeFormUnico('valor', parseFloat(e.target.value))}
                        inputProps={{ min: 0, step: 0.01 }}
                        helperText="Valor mensal"
                      />
                    </Grid>

                    {/* Dia de Vencimento */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Dia de Vencimento *"
                        value={formUnico.diaVencimento}
                        onChange={(e) => handleChangeFormUnico('diaVencimento', parseInt(e.target.value, 10))}
                        inputProps={{ min: 1, max: 31 }}
                        helperText="Dia do mês (1-31)"
                      />
                    </Grid>

                    {/* Data de Início */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Data de Início *"
                        value={formUnico.dataInicioCobranca}
                        onChange={(e) => handleChangeFormUnico('dataInicioCobranca', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        helperText="Início das cobranças"
                      />
                    </Grid>

                    {/* Quantidade de Meses */}
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Quantidade de Meses"
                        value={formUnico.quantidadeMeses}
                        onChange={(e) => handleChangeFormUnico('quantidadeMeses', e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        inputProps={{ min: 1 }}
                        helperText="Deixe vazio para ilimitado"
                      />
                    </Grid>

                    {/* Meses Pagos (Retroativo) */}
                    {!isEdicao && (
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Meses Já Pagos (Retroativo)"
                          value={formUnico.mesesPagosRetroativo}
                          onChange={(e) => handleChangeFormUnico('mesesPagosRetroativo', parseInt(e.target.value, 10) || 0)}
                          inputProps={{ min: 0 }}
                          helperText="Quantidade de meses já pagos"
                        />
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Formulário para Múltiplas Cotas */}
            {tipoProcesso === 'multiplo' && (
              <Card>
                <CardContent>
                  <Grid container spacing={2}>
                    {/* Nome do Processo */}
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nome do Processo *"
                        value={formMultiplo.nome}
                        onChange={(e) => handleChangeFormMultiplo('nome', e.target.value)}
                        helperText="Nome descritivo para identificar o processo"
                      />
                    </Grid>

                    {/* Gerenciador de Cotas */}
                    <Grid item xs={12}>
                      <GerenciadorCotasProcesso
                        cotas={formMultiplo.cotas}
                        onChange={(novasCotas) => handleChangeFormMultiplo('cotas', novasCotas)}
                        cotasDisponiveis={cotasDisponiveis}
                        onBuscarCotas={carregarCotas}
                        loadingCotas={loadingCotas}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Botões de Ação */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancelar}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSalvar}
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </PapperBlock>

      {/* Snackbar para mensagens */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={fecharSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={fecharSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default FormularioProcesso;
