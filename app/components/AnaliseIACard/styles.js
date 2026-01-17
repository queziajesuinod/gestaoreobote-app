import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  card: {
    padding: theme.spacing(2.5),
    height: '100%'
  },
  summary: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2)
  },
  badges: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap'
  }
}));

export default useStyles;
