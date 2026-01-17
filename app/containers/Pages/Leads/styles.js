import { makeStyles } from 'tss-react/mui';

const useStyles = makeStyles()((theme) => ({
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing(2)
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(1),
    flexWrap: 'wrap'
  },
  filters: {
    marginTop: theme.spacing(2)
  },
  sectionTitle: {
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(2)
  }
}));

export default useStyles;
