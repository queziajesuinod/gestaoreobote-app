import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControlLabel,
  Checkbox,
  Typography
} from '@mui/material';
import useStyles from './styles';

const emptyForm = {
  nome: '',
  cpf: '',
  dataNascimento: '',
  cidade: '',
  estado: '',
  profissao: '',
  criarCota: false,
  grupo: '',
  cota: '',
  valor: ''
};

function PromoverClienteDialog({ open, lead, onClose, onConfirm }) {
  const { classes } = useStyles();
  const [form, setForm] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      nome: lead?.nome || '',
      cpf: lead?.cpf || '',
      dataNascimento: lead?.dataNascimento || '',
      cidade: lead?.cidade || '',
      estado: lead?.estado || '',
      profissao: lead?.profissao || ''
    });
  }, [open, lead]);

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!onConfirm) {
      onClose();
      return;
    }
    setSalvando(true);
    try {
      await onConfirm(form);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Promover Lead a Cliente</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nome"
              value={form.nome}
              onChange={handleChange('nome')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="CPF"
              value={form.cpf}
              onChange={handleChange('cpf')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Data de nascimento"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.dataNascimento}
              onChange={handleChange('dataNascimento')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Cidade"
              value={form.cidade}
              onChange={handleChange('cidade')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Estado"
              value={form.estado}
              onChange={handleChange('estado')}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Profissao"
              value={form.profissao}
              onChange={handleChange('profissao')}
              fullWidth
            />
          </Grid>
        </Grid>

        <FormControlLabel
          control={
            <Checkbox
              checked={form.criarCota}
              onChange={handleChange('criarCota')}
            />
          }
          label="Criar cota junto"
        />

        {form.criarCota && (
          <>
            <Typography variant="subtitle2" className={classes.sectionTitle}>
              Dados da cota
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Grupo"
                  value={form.grupo}
                  onChange={handleChange('grupo')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Cota"
                  value={form.cota}
                  onChange={handleChange('cota')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Valor"
                  value={form.valor}
                  onChange={handleChange('valor')}
                  fullWidth
                />
              </Grid>
            </Grid>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={salvando}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Promover'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

PromoverClienteDialog.propTypes = {
  open: PropTypes.bool,
  lead: PropTypes.shape({
    nome: PropTypes.string,
    cpf: PropTypes.string,
    dataNascimento: PropTypes.string,
    cidade: PropTypes.string,
    estado: PropTypes.string,
    profissao: PropTypes.string
  }),
  onClose: PropTypes.func,
  onConfirm: PropTypes.func
};

PromoverClienteDialog.defaultProps = {
  open: false,
  lead: null,
  onClose: () => {},
  onConfirm: null
};

export default PromoverClienteDialog;
