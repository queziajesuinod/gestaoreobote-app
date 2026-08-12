import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import {
  Grid,
  Button,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  CircularProgress
} from '@mui/material';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const getToken = () => localStorage.getItem('token');

// Rótulos amigáveis para os tipos de ação e de tarefa.
const ROTULO_ACAO = {
  negocio_criado: 'Negócio criado',
  tarefa_criada_concluida: 'Tarefa concluída (criada)',
  tarefa_concluida: 'Tarefa finalizada',
  tarefa_agendada: 'Tarefa agendada',
  etapa_movida: 'Etapa movida'
};
const COR_ACAO = {
  negocio_criado: 'primary',
  tarefa_criada_concluida: 'success',
  tarefa_concluida: 'success',
  tarefa_agendada: 'info',
  etapa_movida: 'warning'
};
const ROTULO_TIPO = {
  VISITA: 'Visita',
  REUNIAO: 'Reunião',
  LIGACAO: 'Ligação',
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  PROPOSTA: 'Proposta'
};

function formatarDataHora(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('pt-BR');
}

function descricaoDetalhe(row) {
  const det = row.detalhe || {};
  if (row.acao === 'etapa_movida') return `→ ${det.nome || det.para || ''}`;
  if (row.acao === 'negocio_criado') return det.etapa ? `(${det.etapa})` : '';
  if (row.acao === 'tarefa_agendada' && det.quando) return `p/ ${formatarDataHora(det.quando)}`;
  return '';
}

function AssistenteAuditoria() {
  const title = brand.name + ' - Auditoria do Assistente';
  const description = 'Ações do assistente Alô Reobote no Agendor';

  const [consultores, setConsultores] = useState([]);
  const [filtros, setFiltros] = useState({
    consultorId: '', cliente: '', tarefaTipo: '', acao: '', dataInicio: '', dataFim: ''
  });
  const [acoes, setAcoes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const carregarConsultores = async () => {
    try {
      const resp = await fetch(`${API_URL}/consultor`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
      });
      if (resp.ok) setConsultores(await resp.json());
    } catch (e) { /* silencioso */ }
  };

  const carregarAcoes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v); });
      const resp = await fetch(`${API_URL}/assistente/auditoria?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setAcoes(data.acoes || []);
        setTotal(data.total || 0);
      }
    } catch (e) { /* silencioso */ } finally { setLoading(false); }
  };

  useEffect(() => { carregarConsultores(); carregarAcoes(); }, []);

  const limparFiltros = () => {
    setFiltros({
      consultorId: '', cliente: '', tarefaTipo: '', acao: '', dataInicio: '', dataFim: ''
    });
    setTimeout(carregarAcoes, 0);
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>
      <PapperBlock title="Auditoria do Assistente" desc="Tudo que o Alô Reobote criou ou concluiu no Agendor">
        {/* Filtros */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Consultor</InputLabel>
              <Select
                label="Consultor"
                value={filtros.consultorId}
                onChange={(e) => setFiltros({ ...filtros, consultorId: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                {consultores.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth size="small" label="Cliente"
              value={filtros.cliente}
              onChange={(e) => setFiltros({ ...filtros, cliente: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de tarefa</InputLabel>
              <Select
                label="Tipo de tarefa"
                value={filtros.tarefaTipo}
                onChange={(e) => setFiltros({ ...filtros, tarefaTipo: e.target.value })}
              >
                <MenuItem value="">Todos</MenuItem>
                {Object.keys(ROTULO_TIPO).map((t) => (
                  <MenuItem key={t} value={t}>{ROTULO_TIPO[t]}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" type="date" label="De" InputLabelProps={{ shrink: true }}
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth size="small" type="date" label="Até" InputLabelProps={{ shrink: true }}
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={carregarAcoes} sx={{ mr: 1 }}>Filtrar</Button>
            <Button variant="outlined" onClick={limparFiltros}>Limpar</Button>
            <Typography variant="body2" component="span" sx={{ ml: 2, color: 'text.secondary' }}>
              {total} ação(ões)
            </Typography>
          </Grid>
        </Grid>

        {/* Tabela */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data/hora</TableCell>
                  <TableCell>Consultor</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Ação</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Detalhe</TableCell>
                  <TableCell>Negócio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {acoes.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">Nenhuma ação registrada.</TableCell></TableRow>
                ) : acoes.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{formatarDataHora(row.createdAt)}</TableCell>
                    <TableCell>{row.consultorNome || '-'}</TableCell>
                    <TableCell>{row.clienteNome || '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" color={COR_ACAO[row.acao] || 'default'} label={ROTULO_ACAO[row.acao] || row.acao} />
                    </TableCell>
                    <TableCell>{row.tarefaTipo ? (ROTULO_TIPO[row.tarefaTipo] || row.tarefaTipo) : '-'}</TableCell>
                    <TableCell>{descricaoDetalhe(row)}</TableCell>
                    <TableCell>{row.dealId || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </PapperBlock>
    </div>
  );
}

export default AssistenteAuditoria;
