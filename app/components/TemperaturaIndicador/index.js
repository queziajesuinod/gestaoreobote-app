import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Typography, Box, LinearProgress } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import CloudIcon from '@mui/icons-material/Cloud';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import useStyles from './styles';

const getTemperaturaMeta = (temperatura = 0) => {
  const valor = Number(temperatura) || 0;
  if (valor >= 70) {
    return {
      label: 'QUENTE',
      color: '#f44336',
      icon: <LocalFireDepartmentIcon sx={{ color: '#f44336' }} />
    };
  }
  if (valor >= 40) {
    return {
      label: 'MORNO',
      color: '#ff9800',
      icon: <CloudIcon sx={{ color: '#ff9800' }} />
    };
  }
  return {
    label: 'FRIO',
    color: '#2196f3',
    icon: <AcUnitIcon sx={{ color: '#2196f3' }} />
  };
};

function TemperaturaIndicador({ temperatura }) {
  const { classes } = useStyles();
  const valorNumerico = Number(temperatura) || 0;
  const valor = Math.max(0, Math.min(100, valorNumerico));
  const meta = getTemperaturaMeta(valor);

  return (
    <Paper elevation={2} className={classes.card}>
      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
        {meta.icon}
        <Typography variant="h4" className={classes.temperaturaValor} style={{ color: meta.color }}>
          {valor}
        </Typography>
      </Box>
      <Typography variant="subtitle1" style={{ color: meta.color, fontWeight: 600 }}>
        {meta.label}
      </Typography>
      <Box className={classes.progressWrapper}>
        <LinearProgress
          variant="determinate"
          value={valor}
          className={classes.progresso}
          sx={{
            '& .MuiLinearProgress-bar': {
              backgroundColor: meta.color
            }
          }}
        />
      </Box>
    </Paper>
  );
}

TemperaturaIndicador.propTypes = {
  temperatura: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

TemperaturaIndicador.defaultProps = {
  temperatura: 0
};

export default TemperaturaIndicador;
