import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Autocomplete,
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
  MenuItem,
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
  clientesDisponiveis = [],
  onBuscarCotas,
  loadingCotas = false,
  consultorId = null
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
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [clienteInputValue, setClienteInputValue] = useState('');
  const [cotaInputValue, setCotaInputValue] = useState('');
  const lastClienteQuery = useRef('');
  const lastCotaQuery = useRef('');
  useEffect(() => {
    setSelectedClienteId(null);
    setSelectedGroup('');
    setClienteInputValue('');
    setCotaInputValue('');
    setFormCota(prev => ({
      ...prev,
      cotaId: '',
      cotaSelecionada: null
    }));
    setCotaEditando(null);
    setDialogAberto(false);
  }, [consultorId]);

  const normalizeClienteId = (value) => {
    if (value === null || value === undefined) return null;
    return String(value);
  };

  const clientesUnicos = useMemo(() => {
    const map = new Map();
    clientesDisponiveis.forEach((cliente) => {
      const clienteId = normalizeClienteId(cliente?.id ?? cliente?.clienteId);
      if (clienteId && !map.has(clienteId)) {
        map.set(clienteId, { ...cliente, id: clienteId });
      }
    });
    return Array.from(map.values());
  }, [clientesDisponiveis]);

  const clienteSelecionado = useMemo(() => {
    if (!selectedClienteId) return null;
    return clientesUnicos.find(cliente => cliente.id === selectedClienteId) || null;
  }, [clientesUnicos, selectedClienteId]);

  const gruposDisponiveis = useMemo(() => {
    if (!selectedClienteId) return [];
    const grupos = new Set();
    cotasDisponiveis.forEach((cota) => {
      const rawId = cota.cliente?.id ?? cota.Cliente?.id ?? cota.clienteId;
      const clienteId = rawId !== null && rawId !== undefined ? String(rawId) : null;
      if (clienteId === selectedClienteId && cota.grupo) {
        grupos.add(cota.grupo);
      }
    });
    return Array.from(grupos);
  }, [cotasDisponiveis, selectedClienteId]);

  const cotasFiltradas = useMemo(() => {
    return cotasDisponiveis.filter((cota) => {
      const rawId = cota.cliente?.id ?? cota.Cliente?.id ?? cota.clienteId;
      const clienteId = rawId !== null && rawId !== undefined ? String(rawId) : null;
      if (selectedClienteId && clienteId !== selectedClienteId) {
        return false;
      }
      if (selectedGroup && cota.grupo !== selectedGroup) {
        return false;
      }
      return true;
    });
  }, [cotasDisponiveis, selectedClienteId, selectedGroup]);

  const formatCotaLabel = (cota) => {
    if (!cota) return '';
    const numero = `${cota.cota || ''}${cota.digito ? `-${cota.digito}` : ''}`;
    const nome = cota.cliente?.nome || cota.Cliente?.nome || 'Cliente sem nome';
    return `${numero} - ${nome} (Grupo: ${cota.grupo})`;
  };

  const formatClienteLabel = (cliente) => {
    if (!cliente) return '';
    const nome = cliente.nome || 'Cliente sem nome';
    const cpf = cliente.cpf ? ` • ${cliente.cpf}` : '';
    return `${nome}${cpf}`;
  };

  const handleSelectCliente = (_event, cliente) => {
    if (!cliente) {
      setSelectedClienteId(null);
      setSelectedGroup('');
      setFormCota({
        ...formCota,
        cotaId: '',
        cotaSelecionada: null
      });
      setCotaInputValue('');
      setClienteInputValue('');
      return;
    }
    const rawId = cliente?.id ?? cliente?.clienteId ?? null;
    const clienteId = rawId !== null && rawId !== undefined ? String(rawId) : null;
    setSelectedClienteId(clienteId);
    setSelectedGroup('');
    setFormCota({
      ...formCota,
      cotaId: '',
      cotaSelecionada: null
    });
    setCotaInputValue('');
    setClienteInputValue(formatClienteLabel(cliente));
    if (consultorId && clienteId && onBuscarCotas) {
      onBuscarCotas({ consultorId, clienteId });
    }
  };

  const handleSelectGroup = (event) => {
    setSelectedGroup(event.target.value);
    setFormCota({
      ...formCota,
      cotaId: '',
      cotaSelecionada: null
    });
    setCotaInputValue('');
    if (consultorId && selectedClienteId && onBuscarCotas) {
      onBuscarCotas({ consultorId, clienteId: selectedClienteId, grupo: event.target.value });
    }
  };

  const abrirDialog = (cota = null) => {
    if (cota) {
      const clienteAtual = cota.cotaSelecionada
        ? cota.cotaSelecionada.cliente || cota.cotaSelecionada.Cliente
        : null;
      // Modo edição
      setCotaEditando(cota);
      const clienteIdAtual = clienteAtual?.id ?? clienteAtual?.clienteId ?? null;
      setSelectedClienteId(clienteIdAtual);
      setSelectedGroup(cota.cotaSelecionada?.grupo || '');
      setClienteInputValue(formatClienteLabel(clienteAtual));
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
      setCotaInputValue(formatCotaLabel(cota.cotaSelecionada));
    } else {
      // Modo criação
      setCotaEditando(null);
      setSelectedClienteId(null);
      setSelectedGroup('');
      setClienteInputValue('');
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
      setCotaInputValue('');
    }
    setDialogAberto(true);
  };

  const fecharDialog = () => {
    setDialogAberto(false);
    setCotaEditando(null);
    setSelectedClienteId(null);
    setSelectedGroup('');
    setClienteInputValue('');
    setCotaInputValue('');
  };

  const handleChangeCota = (_event, novaCota) => {
    if (novaCota) {
      const valorCota = parseFloat(novaCota.valor) || 0;
      const cliente = novaCota.cliente || novaCota.Cliente || null;
      const rawId = cliente?.id ?? cliente?.clienteId ?? null;
      const clienteId = rawId !== null && rawId !== undefined ? String(rawId) : null;
      setSelectedClienteId(clienteId);
      setSelectedGroup(novaCota.grupo || '');
      setClienteInputValue(formatClienteLabel(cliente));
      setFormCota({
        ...formCota,
        cotaId: novaCota.id,
        cotaSelecionada: novaCota,
        valor: valorCota,
        dataInicioCobranca: novaCota.dtaquisicao 
          ? new Date(novaCota.dtaquisicao).toISOString().split('T')[0]
          : formCota.dataInicioCobranca
      });
      setCotaInputValue(formatCotaLabel(novaCota));
    } else {
      setFormCota({
        ...formCota,
        cotaId: '',
        cotaSelecionada: null
      });
      setCotaInputValue('');
    }
  };

  const triggerBusca = (query, queryRef) => {
    const normalized = (query || '').trim();
    if (!consultorId) return;
    if (normalized === queryRef.current) return;
    queryRef.current = normalized;
    if (onBuscarCotas) {
      onBuscarCotas({
        busca: normalized,
        consultorId,
        clienteId: selectedClienteId || undefined,
        grupo: selectedGroup || undefined
      });
    }
  };

  const handleClienteInputChange = (_event, newValue, reason) => {
    setClienteInputValue(newValue);
    if (!cotaEditando && reason === 'input') {
      triggerBusca(newValue, lastClienteQuery);
    }
  };

  const handleCotaInputChange = (_event, newValue, reason) => {
    setCotaInputValue(newValue);
    if (!cotaEditando && reason === 'input') {
      triggerBusca(newValue, lastCotaQuery);
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
          disabled={!consultorId}
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
            {/* Pesquisa de Cliente */}
            <Grid item xs={12}>
              <Autocomplete
                fullWidth
                options={clientesUnicos}
                getOptionLabel={(option) => formatClienteLabel(option)}
                value={clienteSelecionado}
                inputValue={clienteInputValue}
                onInputChange={handleClienteInputChange}
                onChange={(event, cliente) => handleSelectCliente(event, cliente)}
                disabled={!consultorId || !!cotaEditando}
                loading={loadingCotas}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cliente *"
                    helperText={
                      !consultorId
                        ? 'Selecione o consultor antes de buscar um cliente'
                        : cotaEditando
                          ? 'Não é possível alterar a cota'
                          : 'Pesquise e selecione o cliente'
                    }
                  />
                )}
              />
            </Grid>

            {/* Seleção de Grupo */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Grupo *"
                value={selectedGroup}
                onChange={handleSelectGroup}
                disabled={!consultorId || !clienteSelecionado || !!cotaEditando || gruposDisponiveis.length === 0}
                helperText={
                  !consultorId
                    ? 'Selecione o consultor primeiro'
                    : !clienteSelecionado
                      ? 'Selecione o cliente antes de escolher o grupo'
                      : gruposDisponiveis.length === 0
                        ? 'Nenhum grupo disponível para este cliente'
                        : 'Escolha o grupo do cliente'
                }
              >
                <MenuItem value="">
                  <em>Selecione</em>
                </MenuItem>
                {gruposDisponiveis.map((grupo) => (
                  <MenuItem key={grupo} value={grupo}>
                    {grupo}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Seleção de Cota */}
            <Grid item xs={12}>
              <Autocomplete
                fullWidth
                options={selectedGroup ? cotasFiltradas : []}
                getOptionLabel={(option) => formatCotaLabel(option)}
                value={formCota.cotaSelecionada}
                inputValue={cotaInputValue}
                onInputChange={handleCotaInputChange}
                onChange={(event, novaCota) => handleChangeCota(event, novaCota)}
                disabled={!consultorId || !clienteSelecionado || !selectedGroup || !!cotaEditando}
                loading={loadingCotas}
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cota *"
                    helperText={
                      cotaEditando
                        ? 'Não é possível alterar a cota'
                        : !consultorId
                          ? 'Escolha o consultor antes de selecionar uma cota'
                          : 'Selecione a cota no grupo escolhido'
                    }
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
