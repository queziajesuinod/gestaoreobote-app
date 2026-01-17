import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, Typography, Chip, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CloudIcon from '@mui/icons-material/Cloud';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useStyles from './styles';

const getTemperaturaMeta = (temperatura = 0) => {
  const valor = Number(temperatura) || 0;
  if (valor >= 70) {
    return {
      label: 'QUENTE',
      color: '#f44336',
      icon: <LocalFireDepartmentIcon fontSize="small" sx={{ color: '#f44336' }} />
    };
  }
  if (valor >= 40) {
    return {
      label: 'MORNO',
      color: '#ff9800',
      icon: <CloudIcon fontSize="small" sx={{ color: '#ff9800' }} />
    };
  }
  return {
    label: 'FRIO',
    color: '#2196f3',
    icon: <AcUnitIcon fontSize="small" sx={{ color: '#2196f3' }} />
  };
};

const formatarUltimaMensagem = (data) => {
  if (!data) return 'Sem mensagens';
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return 'Sem mensagens';
  return formatDistanceToNow(parsed, { locale: ptBR, addSuffix: true });
};

function LeadCard({ lead, onClick }) {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const meta = getTemperaturaMeta(lead?.temperaturaLead);

  const handleClick = () => {
    if (onClick) {
      onClick(lead);
      return;
    }
    if (lead?.id) {
      navigate(`/app/leads/${lead.id}`);
    }
  };

  return (
    <Card
      onClick={handleClick}
      className={classes.card}
      style={{ borderLeftColor: meta.color }}
      elevation={2}
    >
      <CardContent>
        <Typography variant="h6">{lead?.nome || 'Lead sem nome'}</Typography>

        <Box className={classes.temperatureRow}>
          {meta.icon}
          <Typography variant="h4" style={{ color: meta.color, fontWeight: 600 }}>
            {Number.isFinite(Number(lead?.temperaturaLead)) ? lead.temperaturaLead : '--'}
          </Typography>
          <Chip
            label={meta.label}
            size="small"
            className={classes.chip}
            style={{ backgroundColor: meta.color }}
          />
        </Box>

        <Box className={classes.infoRow}>
          <Typography variant="body2" color="textSecondary">
            Tel: {lead?.telefone || '--'}
          </Typography>
        </Box>
        <Box className={classes.infoRow}>
          <Typography variant="body2" color="textSecondary">
            Mensagens: {lead?.totalMensagens ?? 0}
          </Typography>
        </Box>
        <Box className={classes.infoRow}>
          <Typography variant="body2" color="textSecondary">
            Ultima: {formatarUltimaMensagem(lead?.ultimaMensagem)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

LeadCard.propTypes = {
  lead: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    nome: PropTypes.string,
    telefone: PropTypes.string,
    temperaturaLead: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    ultimaMensagem: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    totalMensagens: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
  }).isRequired,
  onClick: PropTypes.func
};

LeadCard.defaultProps = {
  onClick: null
};

export default LeadCard;
