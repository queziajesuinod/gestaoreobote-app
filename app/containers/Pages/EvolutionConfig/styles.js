import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  card: {
    padding: theme.spacing(2)
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap',
    marginTop: theme.spacing(2)
  }
}));

export default useStyles;
