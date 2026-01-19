import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
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
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
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
  Delete as DeleteIcon,
  Edit as EditIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { PapperBlock } from 'dan-components';
import brand from 'dan-api/dummy/brand';
import * as inadimplentesApi from '../../../services/inadimplentesApi';

function ListaProcessos() {
  const title = `${brand.name} - Processos de Cobrança`;
  const description = 'Gestão de processos de cobrança de inadimplentes';

  // Estados
  const [loading, setLoading] = useState(false);
  const [processos, setProcessos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
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

  // Carregar processos
  useEffect(() => {
    carregarProcessos();
  }, [filtroStatus]);

  const carregarProcessos = async () => {
    try {
      setLoading(true);
      const filtros = {};
      if (filtroStatus) filtros.status = filtroStatus;
      
      const response = await inadimplentesApi.listarProcessos(filtros);
      setProcessos(response.dados || []);
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
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Processos paginados
  const processosPaginados = processos.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

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
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            href="/app/inadimplentes/processos/novo"
          >
            Novo Processo
          </Button>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filtrar por Status</InputLabel>
            <Select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              label="Filtrar por Status"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="ativo">Ativo</MenuItem>
              <MenuItem value="pausado">Pausado</MenuItem>
              <MenuItem value="encerrado">Encerrado</MenuItem>
            </Select>
          </FormControl>

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
                  {processosPaginados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Nenhum processo encontrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    processosPaginados.map((processo) => (
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
                          <Tooltip title="Visualizar">
                            <IconButton
                              size="small"
                              href={`/app/inadimplentes/${processo.id}`}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              href={`/app/inadimplentes/${processo.id}/editar`}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          {processo.status === 'ativo' && (
                            <Tooltip title="Pausar">
                              <IconButton
                                size="small"
                                onClick={() => handlePausar(processo)}
                                color="warning"
                              >
                                <PauseIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {processo.status === 'pausado' && (
                            <Tooltip title="Reativar">
                              <IconButton
                                size="small"
                                onClick={() => handleReativar(processo)}
                                color="success"
                              >
                                <PlayArrowIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {processo.status !== 'encerrado' && (
                            <Tooltip title="Encerrar">
                              <IconButton
                                size="small"
                                onClick={() => handleEncerrar(processo)}
                                color="error"
                              >
                                <StopIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              onClick={() => handleExcluir(processo)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={processos.length}
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
