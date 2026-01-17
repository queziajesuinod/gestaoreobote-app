import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  messageCard: {
    padding: theme.spacing(2)
  },
  analysisRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  timeline: {
    padding: 0
  }
}));

export default useStyles;
