import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  UploadFile as UploadFileIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import brand from 'dan-api/dummy/brand';
import * as inadimplentesApi from '../../../services/inadimplentesApi';
import { getStoredUser } from '../../../utils/userStorage';

const MODELO_IMPORTACAO_PROCESSOS = [
  'grupo;cota;digito;data_aquisicao;parcelas_pagas;dia_vencimento;data_inicio_cobranca;quantidade_meses;nome_processo;observacao',
  '1234;56;0;2024-01-15;8;15;2024-01-15;12;Processo Grupo 1234 Cota 56;Importado em lote'
].join('\n');

const CABECALHOS_IMPORTACAO = {
  grupo: ['grupo', 'grupo_cota'],
  numeroCota: ['cota', 'numero_cota', 'nro_cota'],
  digito: ['digito', 'dig', 'dv'],
  dataAquisicao: ['data_aquisicao', 'data_de_aquisicao', 'dtaquisicao'],
  parcelasPagas: ['parcelas_pagas', 'qtd_parcelas_pagas', 'quantidade_parcelas_pagas', 'meses_pagos_retroativo'],
  nome: ['nome_processo', 'nome', 'processo_nome'],
  diaVencimento: ['dia_vencimento', 'dia_vencimento_cobranca', 'dia_venc'],
  dataInicioCobranca: ['data_inicio_cobranca', 'data_inicio', 'inicio_cobranca'],
  primeiroMesPago: ['primeiro_mes_pago', 'mes_inicial_pago', 'primeiro_mes_retroativo'],
  quantidadeMeses: ['quantidade_meses', 'qtd_meses', 'meses_total'],
  observacao: ['observacao', 'observacoes', 'obs']
};

const removerAcentos = (texto = '') => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const normalizarCabecalho = (texto = '') => removerAcentos(texto).toLowerCase().trim().replace(/\s+/g, '_');
const normalizarTextoComparacao = (texto = '') => removerAcentos(String(texto || '')).toLowerCase().trim();
const normalizarCodigoComparacao = (texto = '') => normalizarTextoComparacao(texto).replace(/^0+(?=\d)/, '');
const formatarDataChaveUtc = (valorData) => {
  const data = new Date(valorData);
  if (Number.isNaN(data.getTime())) return '';
  return `${String(data.getUTCFullYear()).padStart(4, '0')}-${String(data.getUTCMonth() + 1).padStart(2, '0')}-${String(data.getUTCDate()).padStart(2, '0')}`;
};
const formatarDataChaveLocal = (valorData) => {
  const data = new Date(valorData);
  if (Number.isNaN(data.getTime())) return '';
  return `${String(data.getFullYear()).padStart(4, '0')}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
};

const detectarSeparadorCsv = (linhaCabecalho = '') => {
  const totalPontoVirgula = (linhaCabecalho.match(/;/g) || []).length;
  const totalVirgula = (linhaCabecalho.match(/,/g) || []).length;
  return totalPontoVirgula >= totalVirgula ? ';' : ',';
};

const parseLinhaCsv = (linha, separador) => {
  const valores = [];
  let atual = '';
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i += 1) {
    const charAtual = linha[i];
    const proximoChar = linha[i + 1];

    if (charAtual === '"') {
      if (dentroAspas && proximoChar === '"') {
        atual += '"';
        i += 1;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (charAtual === separador && !dentroAspas) {
      valores.push(atual.trim());
      atual = '';
    } else {
      atual += charAtual;
    }
  }

  valores.push(atual.trim());
  return valores;
};

const parseDataIso = (valorBruto, nomeCampo) => {
  const valor = String(valorBruto || '').trim();
  if (!valor) throw new Error(`Campo ${nomeCampo} obrigatorio`);

  let ano;
  let mes;
  let dia;

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    [ano, mes, dia] = valor.split('-').map((parte) => Number(parte));
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    const partes = valor.split('/').map((parte) => Number(parte));
    dia = partes[0];
    mes = partes[1];
    ano = partes[2];
  } else {
    throw new Error(`Campo ${nomeCampo} deve estar em YYYY-MM-DD ou DD/MM/YYYY`);
  }

  const dataUtc = Date.UTC(ano, mes - 1, dia);
  const data = new Date(dataUtc);
  if (
    Number.isNaN(data.getTime())
    || data.getUTCFullYear() !== ano
    || data.getUTCMonth() !== mes - 1
    || data.getUTCDate() !== dia
  ) {
    throw new Error(`Campo ${nomeCampo} possui data invalida`);
  }

  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

const parseAnoMes = (valorBruto, nomeCampo) => {
  const valor = String(valorBruto || '').trim();
  if (!valor) throw new Error(`Campo ${nomeCampo} obrigatorio`);

  let ano;
  let mes;

  if (/^\d{4}-\d{2}$/.test(valor)) {
    [ano, mes] = valor.split('-').map((parte) => Number(parte));
  } else if (/^\d{2}\/\d{4}$/.test(valor)) {
    const partes = valor.split('/').map((parte) => Number(parte));
    mes = partes[0];
    ano = partes[1];
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    [ano, mes] = valor.split('-').map((parte) => Number(parte));
  } else {
    throw new Error(`Campo ${nomeCampo} deve estar em YYYY-MM ou MM/YYYY`);
  }

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error(`Campo ${nomeCampo} invalido`);
  }

  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}`;
};

const parseInteiro = (valorBruto, nomeCampo, obrigatorio = false) => {
  const valor = String(valorBruto ?? '').trim();
  if (!valor) {
    if (obrigatorio) throw new Error(`Campo ${nomeCampo} obrigatorio`);
    return null;
  }

  if (!/^-?\d+$/.test(valor)) {
    throw new Error(`Campo ${nomeCampo} deve ser um numero inteiro`);
  }

  const numero = Number.parseInt(valor, 10);
  return numero;
};

const mapearColunasImportacao = (cabecalhos) => {
  const colunas = {};

  Object.entries(CABECALHOS_IMPORTACAO).forEach(([chave, aliases]) => {
    const indice = cabecalhos.findIndex((cabecalho) => aliases.includes(cabecalho));
    if (indice >= 0) {
      colunas[chave] = indice;
    }
  });

  return colunas;
};

const criarEstadoInicialImportacao = () => ({
  open: false,
  emAndamento: false,
  totalLinhas: 0,
  linhasProcessadas: 0,
  sucessos: 0,
  erros: [],
  cabecalhosOriginais: []
});

const mapearDadosOriginaisLinha = (cabecalhosOriginais, valores) => {
  const dados = {};
  cabecalhosOriginais.forEach((cabecalho, indice) => {
    dados[cabecalho] = String(valores[indice] ?? '').trim();
  });
  return dados;
};

const escaparValorCsv = (valor) => {
  const texto = String(valor ?? '');
  if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
};

function ListaProcessos() {
  const navigate = useNavigate();
  const title = `${brand.name} - Processos de Cobrança`;
  const description = 'Gestão de processos de cobrança de inadimplentes';

  // Estados
  const [loading, setLoading] = useState(false);
  const [processos, setProcessos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [clientesFiltro, setClientesFiltro] = useState([]);
  const [consultoresFiltro, setConsultoresFiltro] = useState([]);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroConsultor, setFiltroConsultor] = useState(() => {
    const u = getStoredUser();
    return u?.perfil?.toUpperCase() === 'CONSULTOR' && u?.consultorId ? String(u.consultorId) : '';
  });
  const [filtroDiaVencimento, setFiltroDiaVencimento] = useState('');
  const [importandoArquivo, setImportandoArquivo] = useState(false);
  const [progressoImportacao, setProgressoImportacao] = useState(criarEstadoInicialImportacao);
  const inputImportacaoRef = useRef(null);
  const [storedUser, setStoredUserState] = useState(() => getStoredUser());
  const perfilUsuario = storedUser?.perfil?.toUpperCase() || '';
  const isConsultorPerfil = perfilUsuario === 'CONSULTOR';
  const podeSelecionarConsultor = perfilUsuario === 'ADMIN' || perfilUsuario === 'GESTOR';
  const consultorIdLogado = storedUser?.consultorId ? String(storedUser.consultorId) : '';
  const consultorNomeLogado = storedUser?.consultor?.nome || storedUser?.consultorNome || storedUser?.name || '';
  const podeGerenciarProcessos = !isConsultorPerfil;
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalProcessos, setTotalProcessos] = useState(0);

  
  // Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Dialog de confirmação
  const [dialogConfirmacao, setDialogConfirmacao] = useState({
    open: false,
    titulo: '',
    mensagem: '',
    acao: null
  });

  useEffect(() => {
    const handleUserUpdated = (event) => {
      setStoredUserState(event?.detail || getStoredUser());
    };

    window.addEventListener('app:user-updated', handleUserUpdated);
    return () => window.removeEventListener('app:user-updated', handleUserUpdated);
  }, []);

  // Carregar processos
  useEffect(() => {
    carregarProcessos();
  }, [filtroStatus, filtroCliente, filtroConsultor, filtroDiaVencimento, page, rowsPerPage]);

  useEffect(() => {
    carregarConsultores();
    carregarClientes();
  }, [podeSelecionarConsultor]);

  const carregarProcessos = async () => {
    try {
      setLoading(true);
      const filtros = {
        limite: rowsPerPage,
        offset: page * rowsPerPage
      };
      if (filtroStatus) filtros.status = filtroStatus;
      if (filtroCliente) filtros.clienteId = filtroCliente;
      if (isConsultorPerfil && consultorIdLogado) {
        filtros.consultorId = consultorIdLogado;
      } else if (filtroConsultor) {
        filtros.consultorId = filtroConsultor;
      }
      if (filtroDiaVencimento) filtros.diaVencimento = filtroDiaVencimento;

      const response = await inadimplentesApi.listarProcessos(filtros);
      setProcessos(response.dados || []);
      setTotalProcessos(response.total || 0);
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
      mostrarSnackbar('Erro ao carregar processos', 'error');
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

  const carregarConsultores = async () => {
    if (!podeSelecionarConsultor) {
      setConsultoresFiltro([]);
      return;
    }

    try {
      const consultores = await inadimplentesApi.listarConsultores();
      setConsultoresFiltro(Array.isArray(consultores) ? consultores : []);
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
    }
  };

  const carregarClientes = async () => {
    try {
      const clientes = await inadimplentesApi.listarClientes();
      const lista = Array.isArray(clientes?.dados) ? clientes.dados : clientes;
      setClientesFiltro(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const baixarModeloImportacao = () => {
    const blob = new Blob([MODELO_IMPORTACAO_PROCESSOS], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-processos-inadimplentes.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const abrirSeletorImportacao = () => {
    if (importandoArquivo) return;
    inputImportacaoRef.current?.click();
  };

  const fecharDialogImportacao = () => {
    if (progressoImportacao.emAndamento) return;
    setProgressoImportacao(criarEstadoInicialImportacao());
  };

  const baixarErrosImportacao = () => {
    if (!progressoImportacao.erros.length) return;

    const cabecalhosBase = progressoImportacao.cabecalhosOriginais || [];
    const cabecalhosSaida = [...cabecalhosBase, 'linha_arquivo', 'motivo_erro'];
    const linhasCsv = [cabecalhosSaida.map(escaparValorCsv).join(';')];

    progressoImportacao.erros.forEach((erro) => {
      const valoresLinha = cabecalhosBase.map((cabecalho) => erro.dadosOriginais?.[cabecalho] ?? '');
      const registro = [
        ...valoresLinha,
        erro.numeroLinha,
        erro.motivo
      ];
      linhasCsv.push(registro.map(escaparValorCsv).join(';'));
    });

    const blob = new Blob([linhasCsv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'erros-importacao-processos-inadimplentes.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const resolverCotaIdPorReferencia = async (referencia, cache) => {
    const grupoNormalizado = normalizarCodigoComparacao(referencia.grupo);
    const cotaNormalizada = normalizarCodigoComparacao(referencia.cota);
    const digitoNormalizado = normalizarCodigoComparacao(referencia.digito || '');
    const chaveCache = `${grupoNormalizado}|${cotaNormalizada}|${digitoNormalizado || '*'}`;

    let candidatas = cache.get(chaveCache);

    if (!candidatas) {
      const resposta = await inadimplentesApi.listarCotas({
        grupo: referencia.grupo,
        busca: referencia.cota,
        limit: '200'
      });
      const lista = Array.isArray(resposta?.dados) ? resposta.dados : (Array.isArray(resposta) ? resposta : []);

      candidatas = lista.filter((item) => {
        const grupoItem = normalizarCodigoComparacao(item?.grupo);
        const cotaItem = normalizarCodigoComparacao(item?.cota);
        if (grupoItem !== grupoNormalizado || cotaItem !== cotaNormalizada) {
          return false;
        }

        if (digitoNormalizado) {
          const digitoItem = normalizarCodigoComparacao(item?.digito || '');
          return digitoItem === digitoNormalizado;
        }

        return true;
      });

      cache.set(chaveCache, candidatas);
    }

    const dataAquisicao = referencia.dataAquisicao;
    const candidatasData = candidatas.filter((item) => {
      const dataUtc = formatarDataChaveUtc(item?.dtaquisicao);
      const dataLocal = formatarDataChaveLocal(item?.dtaquisicao);
      return dataUtc === dataAquisicao || dataLocal === dataAquisicao;
    });

    if (candidatasData.length === 1) {
      return candidatasData[0].id;
    }

    if (candidatasData.length > 1) {
      throw new Error(
        `Mais de uma cota encontrada para grupo ${referencia.grupo}, cota ${referencia.cota} e data ${referencia.dataAquisicao}. Informe a coluna digito.`
      );
    }

    throw new Error(
      `Cota nao encontrada para grupo ${referencia.grupo}, cota ${referencia.cota} e data ${referencia.dataAquisicao}.`
    );
  };

  const converterLinhaImportacao = (valores, colunas, numeroLinha) => {
    const obterValor = (chave) => {
      const indice = colunas[chave];
      if (indice === undefined) return '';
      return valores[indice] || '';
    };

    const grupo = String(obterValor('grupo')).trim();
    if (!grupo) {
      throw new Error(`Linha ${numeroLinha}: campo grupo obrigatorio`);
    }

    const numeroCota = String(obterValor('numeroCota')).trim();
    if (!numeroCota) {
      throw new Error(`Linha ${numeroLinha}: campo cota obrigatorio`);
    }

    const digito = String(obterValor('digito')).trim();
    const dataAquisicao = parseDataIso(obterValor('dataAquisicao'), 'data_aquisicao');
    const parcelasPagas = parseInteiro(obterValor('parcelasPagas'), 'parcelas_pagas', true);
    if (parcelasPagas < 0) {
      throw new Error(`Linha ${numeroLinha}: parcelas_pagas deve ser maior ou igual a 0`);
    }

    const diaVencimento = parseInteiro(obterValor('diaVencimento'), 'dia_vencimento') || Number(dataAquisicao.slice(8, 10));
    if (diaVencimento < 1 || diaVencimento > 31) {
      throw new Error(`Linha ${numeroLinha}: dia_vencimento deve estar entre 1 e 31`);
    }

    const dataInicioInformada = String(obterValor('dataInicioCobranca')).trim();
    const dataInicioCobranca = dataInicioInformada
      ? parseDataIso(dataInicioInformada, 'data_inicio_cobranca')
      : dataAquisicao;
    const nome = String(obterValor('nome')).trim();
    const observacao = String(obterValor('observacao')).trim();

    const quantidadeMeses = parseInteiro(obterValor('quantidadeMeses'), 'quantidade_meses');
    if (quantidadeMeses !== null && quantidadeMeses < 1) {
      throw new Error(`Linha ${numeroLinha}: quantidade_meses deve ser maior ou igual a 1`);
    }

    const dados = {
      diaVencimento,
      dataInicioCobranca,
      nome: nome || undefined,
      observacao: observacao || undefined,
      quantidadeMeses
    };

    if (parcelasPagas > 0) {
      const primeiroMesInformado = String(obterValor('primeiroMesPago')).trim();
      const primeiroMesPago = primeiroMesInformado
        ? parseAnoMes(primeiroMesInformado, 'primeiro_mes_pago')
        : dataAquisicao.substring(0, 7);

      dados.historicoRetroativo = {
        primeiroMesPago,
        quantidadeMeses: parcelasPagas
      };
    }

    return {
      referenciaCota: {
        grupo,
        cota: numeroCota,
        digito: digito || undefined,
        dataAquisicao
      },
      dadosProcesso: dados
    };
  };

  const processarImportacao = async (arquivo) => {
    if (!arquivo) return;

    try {
      setImportandoArquivo(true);
      const conteudo = await arquivo.text();
      const linhas = conteudo
        .replace(/^\uFEFF/, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .filter((linha) => linha.trim() !== '');

      if (linhas.length < 2) {
        throw new Error('Arquivo invalido: inclua cabecalho e ao menos uma linha de dados');
      }

      const separador = detectarSeparadorCsv(linhas[0]);
      const cabecalhosOriginais = parseLinhaCsv(linhas[0], separador).map((valor) => String(valor).trim());
      const cabecalhos = cabecalhosOriginais.map((valor) => normalizarCabecalho(valor));
      const colunas = mapearColunasImportacao(cabecalhos);

      const obrigatorios = ['grupo', 'numeroCota', 'dataAquisicao', 'parcelasPagas'];
      const faltantes = obrigatorios.filter((campo) => colunas[campo] === undefined);

      if (faltantes.length > 0) {
        throw new Error('Cabecalho invalido. Campos obrigatorios: grupo, cota, data_aquisicao, parcelas_pagas');
      }

      const registrosImportacao = linhas.slice(1).map((linha, index) => {
        const numeroLinha = index + 2;
        const valores = parseLinhaCsv(linha, separador);
        const dadosOriginais = mapearDadosOriginaisLinha(cabecalhosOriginais, valores);

        try {
          const dados = converterLinhaImportacao(valores, colunas, numeroLinha);
          return {
            numeroLinha,
            dadosOriginais,
            dados,
            erro: null
          };
        } catch (erro) {
          return {
            numeroLinha,
            dadosOriginais,
            dados: null,
            erro: erro.message || `Linha ${numeroLinha}: erro de validacao`
          };
        }
      });

      if (registrosImportacao.length === 0) {
        throw new Error('Nenhuma linha valida encontrada');
      }

      setProgressoImportacao({
        open: true,
        emAndamento: true,
        totalLinhas: registrosImportacao.length,
        linhasProcessadas: 0,
        sucessos: 0,
        erros: [],
        cabecalhosOriginais
      });

      let sucesso = 0;
      const errosTotais = [];
      const cacheCotas = new Map();

      for (const item of registrosImportacao) {
        if (item.erro) {
          errosTotais.push({
            numeroLinha: item.numeroLinha,
            motivo: item.erro,
            dadosOriginais: item.dadosOriginais
          });
          setProgressoImportacao((anterior) => ({
            ...anterior,
            linhasProcessadas: anterior.linhasProcessadas + 1,
            erros: [...anterior.erros, {
              numeroLinha: item.numeroLinha,
              motivo: item.erro,
              dadosOriginais: item.dadosOriginais
            }]
          }));
          continue;
        }

        try {
          const cotaId = await resolverCotaIdPorReferencia(item.dados.referenciaCota, cacheCotas);
          await inadimplentesApi.criarProcesso({
            ...item.dados.dadosProcesso,
            cotaId
          });
          sucesso += 1;
          setProgressoImportacao((anterior) => ({
            ...anterior,
            linhasProcessadas: anterior.linhasProcessadas + 1,
            sucessos: anterior.sucessos + 1
          }));
        } catch (erro) {
          const motivoErro = erro.message || 'Erro ao criar processo';
          errosTotais.push({
            numeroLinha: item.numeroLinha,
            motivo: motivoErro,
            dadosOriginais: item.dadosOriginais
          });
          setProgressoImportacao((anterior) => ({
            ...anterior,
            linhasProcessadas: anterior.linhasProcessadas + 1,
            erros: [...anterior.erros, {
              numeroLinha: item.numeroLinha,
              motivo: motivoErro,
              dadosOriginais: item.dadosOriginais
            }]
          }));
        }
      }

      setProgressoImportacao((anterior) => ({
        ...anterior,
        emAndamento: false
      }));

      if (sucesso > 0) {
        await carregarProcessos();
      }

      if (errosTotais.length === 0) {
        mostrarSnackbar(`${sucesso} processo(s) importado(s) com sucesso`, 'success');
        return;
      }

      if (sucesso > 0) {
        const detalheErros = errosTotais
          .slice(0, 2)
          .map((item) => `Linha ${item.numeroLinha}: ${item.motivo}`)
          .join(' | ');
        mostrarSnackbar(
          `${sucesso} processo(s) importado(s), ${errosTotais.length} com erro. ${detalheErros}`,
          'warning'
        );
        return;
      }

      const resumoErros = errosTotais
        .slice(0, 2)
        .map((item) => `Linha ${item.numeroLinha}: ${item.motivo}`)
        .join(' | ');
      mostrarSnackbar(resumoErros || 'Erro ao importar arquivo', 'error');
    } catch (erro) {
      console.error('Erro ao importar arquivo de processos:', erro);
      mostrarSnackbar(erro.message || 'Erro ao importar arquivo', 'error');
      setProgressoImportacao((anterior) => ({
        ...anterior,
        emAndamento: false
      }));
    } finally {
      setImportandoArquivo(false);
    }
  };

  const handleArquivoSelecionado = async (event) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    await processarImportacao(arquivo);
  };

  const abrirDialogConfirmacao = (titulo, mensagem, acao) => {
    setDialogConfirmacao({
      open: true,
      titulo,
      mensagem,
      acao
    });
  };

  const fecharDialogConfirmacao = () => {
    setDialogConfirmacao({
      open: false,
      titulo: '',
      mensagem: '',
      acao: null
    });
  };

  const confirmarAcao = async () => {
    if (dialogConfirmacao.acao) {
      await dialogConfirmacao.acao();
    }
    fecharDialogConfirmacao();
  };

  // Ações
  const handlePausar = (processo) => {
    abrirDialogConfirmacao(
      'Pausar Processo',
      `Deseja pausar o processo de cobrança da cota ${processo.cota?.cota}? Novas cobranças não serão geradas até reativar.`,
      async () => {
        try {
          await inadimplentesApi.pausarProcesso(processo.id);
          mostrarSnackbar('Processo pausado com sucesso');
          carregarProcessos();
        } catch (error) {
          mostrarSnackbar('Erro ao pausar processo', 'error');
        }
      }
    );
  };

  const handleReativar = (processo) => {
    abrirDialogConfirmacao(
      'Reativar Processo',
      `Deseja reativar o processo de cobrança da cota ${processo.cota?.cota}?`,
      async () => {
        try {
          await inadimplentesApi.reativarProcesso(processo.id);
          mostrarSnackbar('Processo reativado com sucesso');
          carregarProcessos();
        } catch (error) {
          mostrarSnackbar('Erro ao reativar processo', 'error');
        }
      }
    );
  };

  const handleEncerrar = (processo) => {
    abrirDialogConfirmacao(
      'Encerrar Processo',
      `Deseja encerrar definitivamente o processo de cobrança da cota ${processo.cota?.cota}? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await inadimplentesApi.encerrarProcesso(processo.id);
          mostrarSnackbar('Processo encerrado com sucesso');
          carregarProcessos();
        } catch (error) {
          mostrarSnackbar('Erro ao encerrar processo', 'error');
        }
      }
    );
  };

  const handleExcluir = (processo) => {
    abrirDialogConfirmacao(
      'Excluir Processo',
      `Deseja excluir o processo de cobrança da cota ${processo.cota?.cota}? Esta ação não pode ser desfeita.`,
      async () => {
        try {
          await inadimplentesApi.excluirProcesso(processo.id);
          mostrarSnackbar('Processo excluído com sucesso');
          carregarProcessos();
        } catch (error) {
          mostrarSnackbar('Erro ao excluir processo', 'error');
        }
      }
    );
  };

  // Paginação
  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const percentualImportacao = progressoImportacao.totalLinhas > 0
    ? Math.round((progressoImportacao.linhasProcessadas / progressoImportacao.totalLinhas) * 100)
    : 0;

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
      </Helmet>

      <PapperBlock
        title="Processos de Cobrança"
        desc="Gerenciamento de processos de cobrança de inadimplentes"
        icon="ion-ios-cash-outline"
      >
        {/* Barra de Ações */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {podeGerenciarProcessos ? (
            <>
              <Tooltip title="Novo Processo">
                <span>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    href="/app/inadimplentes/processos-novo"
                  >
                    Novo Processo
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title="Baixar modelo CSV de importacao">
                <span>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<DownloadIcon />}
                    onClick={baixarModeloImportacao}
                  >
                    Baixar Modelo
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title="Importar processos e cobrancas retroativas via CSV">
                <span>
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={importandoArquivo ? <CircularProgress size={16} /> : <UploadFileIcon />}
                    onClick={abrirSeletorImportacao}
                    disabled={importandoArquivo}
                  >
                    {importandoArquivo ? 'Importando...' : 'Importar Arquivo'}
                  </Button>
                </span>
              </Tooltip>

              <input
                ref={inputImportacaoRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleArquivoSelecionado}
                style={{ display: 'none' }}
              />
            </>
          ) : (
            <Typography variant="body2" color="textSecondary">
              Consultores não podem criar processos
            </Typography>
          )}

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filtrar por Status</InputLabel>
            <Select
              value={filtroStatus}
              onChange={(e) => { setPage(0); setFiltroStatus(e.target.value); }}
              label="Filtrar por Status"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ativo">Ativo</MenuItem>
              <MenuItem value="pausado">Pausado</MenuItem>
              <MenuItem value="encerrado">Encerrado</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Filtrar por Cliente</InputLabel>
            <Select
              value={filtroCliente}
              label="Filtrar por Cliente"
              onChange={(event) => { setPage(0); setFiltroCliente(event.target.value); }}
            >
              <MenuItem value="">Todos</MenuItem>
              {clientesFiltro.map((cliente) => (
                <MenuItem key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {podeSelecionarConsultor ? (
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Filtrar por Consultor</InputLabel>
              <Select
                value={filtroConsultor}
                label="Filtrar por Consultor"
                onChange={(event) => { setPage(0); setFiltroConsultor(event.target.value); }}
              >
                <MenuItem value="">Todos</MenuItem>
                {consultoresFiltro.map((consultor) => (
                  <MenuItem key={consultor.id} value={String(consultor.id)}>
                    {consultor.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            isConsultorPerfil && (
              <Typography variant="body2" color="textSecondary">
                Consultor logado: {consultorNomeLogado || '—'}
              </Typography>
            )
          )}

          <TextField
            label="Dia do Vencimento"
            type="number"
            size="small"
            sx={{ minWidth: 150 }}
            value={filtroDiaVencimento}
            onChange={(event) => { setPage(0); setFiltroDiaVencimento(event.target.value); }}
            inputProps={{ min: 1, max: 31 }}
          />

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Atualizar">
            <IconButton onClick={carregarProcessos} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tabela */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cota</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Consultor</TableCell>
                    <TableCell>Dia Vencimento</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhum processo encontrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    processos.map((processo) => (
                      <TableRow key={processo.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {processo.cota?.cota || '-'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Grupo: {processo.cota?.grupo || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {processo.cota?.cliente?.nome || '-'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {processo.cota?.cliente?.telefone || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {processo.cota?.consultor?.nome || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          Dia {processo.diaVencimento}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={inadimplentesApi.getStatusLabel(processo.status)}
                            color={inadimplentesApi.getStatusColor(processo.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {!podeGerenciarProcessos ? (
                            <Typography variant="caption" color="textSecondary">
                              Ações restritas
                            </Typography>
                          ) : (
                            <>
                              <Tooltip title="Visualizar">
                                <IconButton
                                  size="small"
                                  onClick={() => navigate(`/app/inadimplentes/processos/${processo.id}`)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              {processo.status !== 'encerrado' && (
                                <Tooltip title="Editar">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => navigate(`/app/inadimplentes/processos/${processo.id}/editar`)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}

                              {processo.status === 'ativo' && (
                                <Tooltip title="Pausar">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => handlePausar(processo)}
                                      color="warning"
                                    >
                                      <PauseIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}

                              {processo.status === 'pausado' && (
                                <Tooltip title="Reativar">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleReativar(processo)}
                                      color="success"
                                    >
                                      <PlayArrowIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}

                              {processo.status !== 'encerrado' && (
                                <Tooltip title="Encerrar">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEncerrar(processo)}
                                      color="error"
                                    >
                                      <StopIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}

                              {processo.status !== 'encerrado' && (
                                <Tooltip title="Excluir">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleExcluir(processo)}
                                      color="error"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalProcessos}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </>
        )}
      </PapperBlock>

      {/* Dialog de Progresso da Importação */}
      <Dialog
        open={progressoImportacao.open}
        onClose={fecharDialogImportacao}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Importação de Processos</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {progressoImportacao.emAndamento
              ? 'Importação em andamento...'
              : 'Importação concluída.'}
          </Typography>

          <LinearProgress
            variant="determinate"
            value={percentualImportacao}
            sx={{ mb: 1 }}
          />

          <Typography variant="caption" color="textSecondary">
            {progressoImportacao.linhasProcessadas} de {progressoImportacao.totalLinhas} linhas processadas ({percentualImportacao}%)
          </Typography>

          <Box sx={{ mt: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="body2">
              Sucessos: <strong>{progressoImportacao.sucessos}</strong>
            </Typography>
            <Typography variant="body2">
              Erros: <strong>{progressoImportacao.erros.length}</strong>
            </Typography>
          </Box>

          {progressoImportacao.erros.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Linhas com erro
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 260 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Linha</TableCell>
                      <TableCell>Grupo</TableCell>
                      <TableCell>Cota</TableCell>
                      <TableCell>Data Aquisição</TableCell>
                      <TableCell>Motivo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {progressoImportacao.erros.map((erroImportacao) => (
                      <TableRow key={`${erroImportacao.numeroLinha}-${erroImportacao.motivo}`}>
                        <TableCell>{erroImportacao.numeroLinha}</TableCell>
                        <TableCell>{erroImportacao.dadosOriginais?.grupo || '-'}</TableCell>
                        <TableCell>{erroImportacao.dadosOriginais?.cota || '-'}</TableCell>
                        <TableCell>{erroImportacao.dadosOriginais?.data_aquisicao || '-'}</TableCell>
                        <TableCell>{erroImportacao.motivo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!progressoImportacao.emAndamento && progressoImportacao.erros.length > 0 && (
            <Button onClick={baixarErrosImportacao} startIcon={<DownloadIcon />}>
              Baixar Erros
            </Button>
          )}
          <Button onClick={fecharDialogImportacao} disabled={progressoImportacao.emAndamento}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Dialog de Confirmação */}
      <Dialog open={dialogConfirmacao.open} onClose={fecharDialogConfirmacao}>
        <DialogTitle>{dialogConfirmacao.titulo}</DialogTitle>
        <DialogContent>
          <Typography>{dialogConfirmacao.mensagem}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialogConfirmacao}>Cancelar</Button>
          <Button onClick={confirmarAcao} color="primary" variant="contained">
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default ListaProcessos;
