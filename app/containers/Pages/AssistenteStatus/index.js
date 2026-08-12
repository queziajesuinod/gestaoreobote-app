import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import {
  Grid,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
const getToken = () => localStorage.getItem('token');

const COR_RESULTADO = { processado: 'success', ignorado: 'default', erro: 'error' };
const ROTULO_MOTIVO = {
  from_me: 'Enviada pelo próprio número (ignorada)',
  grupo: 'Mensagem de grupo (ignorada)',
  duplicado: 'Mensagem repetida',
  audio: 'Áudio (v1 só texto)',
  vazio: 'Sem texto',
  nao_cadastrado: 'Número não cadastrado',
  sem_gatilho: 'Sem "Alô Reobote"',
  sem_resposta: 'Processada sem resposta',
  respondido: 'Respondida',
  excecao: 'Erro no processamento'
};

function fmt(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('pt-BR');
}

function Indicador({
  ok, label, okText = 'OK', offText = 'Faltando'
}) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1, mb: 0.5
    }}>
      <Chip size="small" color={ok ? 'success' : 'error'} label={ok ? okText : offText} />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}

Indicador.propTypes = {
  ok: PropTypes.bool,
  label: PropTypes.string,
  okText: PropTypes.string,
  offText: PropTypes.string
};

function AssistenteStatus() {
  const title = brand.name + ' - Status do Assistente';

  const [status, setStatus] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
      const [rs, re] = await Promise.all([
        fetch(`${API_URL}/assistente/status`, { headers }),
        fetch(`${API_URL}/assistente/eventos?limite=50`, { headers })
      ]);
      if (rs.ok) setStatus(await rs.json());
      if (re.ok) { const d = await re.json(); setEventos(d.eventos || []); }
    } catch (e) { /* silencioso */ } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const conexao = status?.conexao;
  const config = status?.config;
  const conectado = conexao?.ok && conexao?.state === 'open';

  return (
    <div>
      <Helmet><title>{title}</title></Helmet>
      <PapperBlock title="Status do Assistente" desc="Diagnóstico do Alô Reobote: conexão da Evolution, configuração e eventos recebidos">
        <Box sx={{ mb: 2 }}>
          <Button variant="contained" onClick={carregar} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>WhatsApp (Evolution)</Typography>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1, mb: 1
                }}>
                  <Chip color={conectado ? 'success' : 'error'} label={conectado ? 'Conectado' : (conexao?.state || 'Desconectado')} />
                  <Typography variant="body2">Instância: <b>{config?.evolutionInstance || '-'}</b></Typography>
                </Box>
                {!conexao?.ok && conexao?.motivo && (
                  <Typography variant="body2" color="error">Motivo: {String(conexao.motivo)}</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Configuração</Typography>
                <Indicador ok={config?.evolutionConfigurada} label="Evolution (URL + API key + instância)" />
                <Indicador ok={config?.iaConfigurada} label={`IA de extração${config?.iaModelo ? ` (${config.iaModelo})` : ''}`} />
                <Indicador ok={config?.webhookSecret} label="Secret do webhook" okText="Ativo" offText="Sem secret" />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Typography variant="h6" gutterBottom>Últimos eventos recebidos</Typography>
        {loading && eventos.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data/hora</TableCell>
                  <TableCell>De</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Texto</TableCell>
                  <TableCell>Resultado</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Respondeu</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eventos.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">Nenhum evento recebido ainda. Envie um &quot;Alô Reobote&quot; de um número cadastrado.</TableCell></TableRow>
                ) : eventos.map((ev) => (
                  <TableRow key={ev.id} hover>
                    <TableCell>{fmt(ev.createdAt)}</TableCell>
                    <TableCell>{ev.pushName ? `${ev.pushName} ` : ''}{ev.telefone || '-'}</TableCell>
                    <TableCell>{ev.tipo || '-'}</TableCell>
                    <TableCell sx={{
                      maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>{ev.texto || '-'}</TableCell>
                    <TableCell><Chip size="small" color={COR_RESULTADO[ev.resultado] || 'default'} label={ev.resultado} /></TableCell>
                    <TableCell>{ROTULO_MOTIVO[ev.motivo] || ev.motivo || '-'}</TableCell>
                    <TableCell>{ev.respondeu ? 'Sim' : 'Não'}</TableCell>
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

export default AssistenteStatus;
