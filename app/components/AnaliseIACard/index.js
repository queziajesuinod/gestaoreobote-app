import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Typography, Box, Chip } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import useStyles from './styles';

function AnaliseIACard({ resumo, sinaisCompra, objecoes, sentimento }) {
  const { classes } = useStyles();

  return (
    <Paper elevation={2} className={classes.card}>
      <Box display="flex" alignItems="center" gap={1}>
        <SmartToyIcon color="primary" />
        <Typography variant="h6">Analise da IA</Typography>
      </Box>
      <Typography variant="body2" color="textSecondary" className={classes.summary}>
        {resumo || 'Resumo indisponivel.'}
      </Typography>
      <Box className={classes.badges}>
        <Chip label={`Sinais: ${sinaisCompra}`} color="success" size="small" />
        <Chip label={`Objecoes: ${objecoes}`} color="warning" size="small" />
        {sentimento && <Chip label={`Sentimento: ${sentimento}`} color="info" size="small" />}
      </Box>
    </Paper>
  );
}

AnaliseIACard.propTypes = {
  resumo: PropTypes.string,
  sinaisCompra: PropTypes.number,
  objecoes: PropTypes.number,
  sentimento: PropTypes.string
};

AnaliseIACard.defaultProps = {
  resumo: '',
  sinaisCompra: 0,
  objecoes: 0,
  sentimento: ''
};

export default AnaliseIACard;
