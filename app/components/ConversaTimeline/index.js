import React from 'react';
import PropTypes from 'prop-types';
import {
  Typography,
  Paper,
  Box,
  Chip
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent,
  TimelineDot
} from '@mui/lab';
import useStyles from './styles';

const formatarDataHora = (value) => {
  if (!value) return '--';
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return '--';
  return data.toLocaleString('pt-BR');
};

const formatarRemetente = (remetente = '') => {
  const chave = remetente.toLowerCase();
  if (chave === 'lead') return 'Lead';
  if (chave === 'consultor' || chave === 'agente' || chave === 'user') return 'Voce';
  return remetente || 'Sistema';
};

function ConversaTimeline({ mensagens }) {
  const { classes } = useStyles();

  if (!mensagens || mensagens.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        Sem mensagens.
      </Typography>
    );
  }

  // Inverter ordem: mais recente (topo) para mais antigo (final)
  const mensagensOrdenadas = [...mensagens].reverse();

  return (
    <Timeline className={classes.timeline}>
      {mensagensOrdenadas.map((mensagem, index) => {
        const isLead = (mensagem?.remetente || '').toLowerCase() === 'lead';
        const sinais = mensagem?.analise?.sinaisCompra || [];
        const objecoes = mensagem?.analise?.objecoes || [];
        const sentimento = mensagem?.analise?.sentimento || null;

        return (
          <TimelineItem key={mensagem?.id || `${mensagem?.timestamp || 'msg'}-${index}`}>
            <TimelineOppositeContent color="textSecondary" sx={{ flex: 0.2 }}>
              <Typography variant="caption">
                {formatarDataHora(mensagem?.timestamp)}
              </Typography>
            </TimelineOppositeContent>
            <TimelineSeparator>
              <TimelineDot color={isLead ? 'primary' : 'secondary'} />
              {index < mensagensOrdenadas.length - 1 && <TimelineConnector />}
            </TimelineSeparator>
            <TimelineContent>
              <Paper elevation={1} className={classes.messageCard}>
                <Typography variant="subtitle2">
                  {formatarRemetente(mensagem?.remetente)}
                </Typography>
                <Typography variant="body1" style={{ marginTop: 6 }}>
                  {mensagem?.conteudo || '--'}
                </Typography>
                {(sinais.length > 0 || objecoes.length > 0 || sentimento) && (
                  <Box className={classes.analysisRow}>
                    {sinais.map((sinal) => (
                      <Chip key={`sinal-${sinal}`} label={`Sinal: ${sinal}`} size="small" color="success" />
                    ))}
                    {objecoes.map((objecao) => (
                      <Chip key={`obj-${objecao}`} label={`Objecao: ${objecao}`} size="small" color="warning" />
                    ))}
                    {sentimento && (
                      <Chip label={`Sentimento: ${sentimento}`} size="small" color="info" />
                    )}
                  </Box>
                )}
              </Paper>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}

ConversaTimeline.propTypes = {
  mensagens: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    remetente: PropTypes.string,
    conteudo: PropTypes.string,
    timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    analise: PropTypes.shape({
      sinaisCompra: PropTypes.arrayOf(PropTypes.string),
      objecoes: PropTypes.arrayOf(PropTypes.string),
      sentimento: PropTypes.string
    })
  }))
};

ConversaTimeline.defaultProps = {
  mensagens: []
};

export default ConversaTimeline;
