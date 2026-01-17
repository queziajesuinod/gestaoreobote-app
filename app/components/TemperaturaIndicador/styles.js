import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  card: {
    padding: theme.spacing(2.5),
    textAlign: 'center'
  },
  temperaturaValor: {
    fontWeight: 700
  },
  progresso: {
    height: 10,
    borderRadius: 8,
    backgroundColor: theme.palette.grey[200]
  },
  progressWrapper: {
    marginTop: theme.spacing(2)
  }
}));

export default useStyles;
