import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

/**
 * Componente para gerenciar múltiplas cotas em um processo
 */
function GerenciadorCotasProcesso({ 
  cotas = [], 
  onChange, 
  cotasDisponiveis = [],
  onBuscarCotas,
  loadingCotas = false
}) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [cotaEditando, setCotaEditando] = useState(null);
  const [formCota, setFormCota] = useState({
    cotaId: '',
    cotaSelecionada: null,
    valor: '',
    diaVencimento: 10,
    quantidadeMeses: '',
    mesesPagosRetroativo: 0,
    dataInicioCobranca: new Date().toISOString().split('T')[0],
    observacao: ''
  });

  const abrirDialog = (cota = null) => {
    if (cota) {
      // Modo edição
      setCotaEditando(cota);
      setFormCota({
        cotaId: cota.cotaId,
        cotaSelecionada: cota.cotaSelecionada,
        valor: cota.valor,
        diaVencimento: cota.diaVencimento,
        quantidadeMeses: cota.quantidadeMeses || '',
        mesesPagosRetroativo: cota.mesesPagosRetroativo || 0,
        dataInicioCobranca: cota.dataInicioCobranca,
        observacao: cota.observacao || ''
      });
    } else {
      // Modo criação
      setCotaEditando(null);
      setFormCota({
        cotaId: '',
        cotaSelecionada: null,
        valor: '',
        diaVencimento: 10,
        quantidadeMeses: '',
        mesesPagosRetroativo: 0,
        dataInicioCobranca: new Date().toISOString().split('T')[0],
        observacao: ''
      });
    }
    setDialogAberto(true);
  };

  const fecharDialog = () => {
    setDialogAberto(false);
    setCotaEditando(null);
  };

  const handleChangeCota = (event, novaCota) => {
    if (novaCota) {
      const valorCota = parseFloat(novaCota.valor) || 0;
      setFormCota({
        ...formCota,
        cotaId: novaCota.id,
        cotaSelecionada: novaCota,
        valor: valorCota,
        dataInicioCobranca: novaCota.dtaquisicao 
          ? new Date(novaCota.dtaquisicao).toISOString().split('T')[0]
          : formCota.dataInicioCobranca
      });
    } else {
      setFormCota({
        ...formCota,
        cotaId: '',
        cotaSelecionada: null
      });
    }
  };

  const handleSalvarCota = () => {
    // Validações
    if (!formCota.cotaId) {
      alert('Selecione uma cota');
      return;
    }

    if (!formCota.valor || formCota.valor <= 0) {
      alert('Informe um valor válido');
      return;
    }

    if (!formCota.diaVencimento || formCota.diaVencimento < 1 || formCota.diaVencimento > 31) {
      alert('Dia de vencimento deve estar entre 1 e 31');
      return;
    }

    // Verificar se a cota já foi adicionada (exceto se estiver editando)
    const cotaJaExiste = cotas.some(c => 
      c.cotaId === formCota.cotaId && 
      (!cotaEditando || c.cotaId !== cotaEditando.cotaId)
    );

    if (cotaJaExiste) {
      alert('Esta cota já foi adicionada ao processo');
      return;
    }

    const novaCota = {
      ...formCota,
      quantidadeMeses: formCota.quantidadeMeses === '' ? null : parseInt(formCota.quantidadeMeses, 10)
    };

    if (cotaEditando) {
      // Atualizar cota existente
      const novasCotas = cotas.map(c => 
        c.cotaId === cotaEditando.cotaId ? novaCota : c
      );
      onChange(novasCotas);
    } else {
      // Adicionar nova cota
      onChange([...cotas, novaCota]);
    }

    fecharDialog();
  };

  const handleRemoverCota = (cotaId) => {
    if (window.confirm('Deseja realmente remover esta cota do processo?')) {
      const novasCotas = cotas.filter(c => c.cotaId !== cotaId);
      onChange(novasCotas);
    }
  };

  const formatarValor = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Cotas do Processo ({cotas.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => abrirDialog()}
        >
          Adicionar Cota
        </Button>
      </Box>

      {cotas.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
          <Typography color="textSecondary">
            Nenhuma cota adicionada. Clique em "Adicionar Cota" para começar.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cota</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell align="right">Valor</TableCell>
                <TableCell align="center">Vencimento</TableCell>
                <TableCell align="center">Meses</TableCell>
                <TableCell align="center">Retroativo</TableCell>
                <TableCell align="center">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cotas.map((cota) => (
                <TableRow key={cota.cotaId}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {cota.cotaSelecionada?.cota || cota.cotaId}
                      {cota.cotaSelecionada?.digito && `-${cota.cotaSelecionada.digito}`}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Grupo: {cota.cotaSelecionada?.grupo || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {cota.cotaSelecionada?.cliente?.nome || 
                       cota.cotaSelecionada?.Cliente?.nome || 
                       'Sem cliente'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="medium">
                      {formatarValor(cota.valor)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={`Dia ${cota.diaVencimento}`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {cota.quantidadeMeses ? (
                      <Chip label={`${cota.quantidadeMeses}x`} size="small" />
                    ) : (
                      <Chip label="Ilimitado" size="small" color="success" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {cota.mesesPagosRetroativo > 0 ? (
                      <Chip 
                        label={`${cota.mesesPagosRetroativo} meses`} 
                        size="small" 
                        color="info"
                        icon={<CheckIcon />}
                      />
                    ) : (
                      <Typography variant="body2" color="textSecondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => abrirDialog(cota)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleRemoverCota(cota.cotaId)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog para adicionar/editar cota */}
      <Dialog 
        open={dialogAberto} 
        onClose={fecharDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {cotaEditando ? 'Editar Cota' : 'Adicionar Cota ao Processo'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Seleção de Cota */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Cota *"
                value={formCota.cotaId}
                onChange={(e) => {
                  const cota = cotasDisponiveis.find(c => c.id === e.target.value);
                  handleChangeCota(null, cota);
                }}
                disabled={!!cotaEditando}
                helperText={cotaEditando ? 'Não é possível alterar a cota' : 'Selecione a cota'}
              >
                {cotasDisponiveis.map((cota) => (
                  <option key={cota.id} value={cota.id}>
                    {cota.cota}{cota.digito && `-${cota.digito}`} - {cota.cliente?.nome || cota.Cliente?.nome} (Grupo: {cota.grupo})
                  </option>
                ))}
              </TextField>
            </Grid>

            {/* Valor */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Valor da Cobrança *"
                value={formCota.valor}
                onChange={(e) => setFormCota({ ...formCota, valor: parseFloat(e.target.value) })}
                inputProps={{ min: 0, step: 0.01 }}
                helperText="Valor mensal da cobrança"
              />
            </Grid>

            {/* Dia de Vencimento */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Dia de Vencimento *"
                value={formCota.diaVencimento}
                onChange={(e) => setFormCota({ ...formCota, diaVencimento: parseInt(e.target.value, 10) })}
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
                value={formCota.dataInicioCobranca}
                onChange={(e) => setFormCota({ ...formCota, dataInicioCobranca: e.target.value })}
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
                value={formCota.quantidadeMeses}
                onChange={(e) => setFormCota({ 
                  ...formCota, 
                  quantidadeMeses: e.target.value === '' ? '' : parseInt(e.target.value, 10) 
                })}
                inputProps={{ min: 1 }}
                helperText="Deixe vazio para ilimitado"
              />
            </Grid>

            {/* Meses Pagos (Retroativo) */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Meses Já Pagos (Retroativo)"
                value={formCota.mesesPagosRetroativo}
                onChange={(e) => setFormCota({ 
                  ...formCota, 
                  mesesPagosRetroativo: parseInt(e.target.value, 10) || 0
                })}
                inputProps={{ min: 0 }}
                helperText="Quantidade de meses já pagos"
              />
            </Grid>

            {/* Observação */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Observação"
                value={formCota.observacao}
                onChange={(e) => setFormCota({ ...formCota, observacao: e.target.value })}
                helperText="Observações específicas desta cota"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={fecharDialog} startIcon={<CancelIcon />}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSalvarCota} 
            variant="contained"
            startIcon={<CheckIcon />}
          >
            {cotaEditando ? 'Atualizar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GerenciadorCotasProcesso;
