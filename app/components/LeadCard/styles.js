import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  card: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    borderLeft: `4px solid ${theme.palette.divider}`,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4]
    }
  },
  temperatureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    margin: `${theme.spacing(1)} 0`
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1)
  },
  chip: {
    color: theme.palette.common.white,
    fontWeight: 600
  }
}));

export default useStyles;
