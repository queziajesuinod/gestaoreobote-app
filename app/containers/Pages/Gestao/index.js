import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import brand from 'dan-api/dummy/brand';
import { PapperBlock } from 'dan-components';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Box,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Group as GroupIcon
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

function Gestao() {
  const title = `${brand.name} - Gestão de Equipes`;
  const description = brand.desc;

  const userStorage = JSON.parse(localStorage.getItem('user'));
  
  // ⚠️ Função helper para obter o token atualizado
  const getToken = () => localStorage.getItem('token');

  // Estados principais
  const [tabValue, setTabValue] = useState(0);
  const [consultores, setConsultores] = useState([]);
  const [equipes, setEquipes] = useState([]);
  const [selectedEquipe, setSelectedEquipe] = useState(null);
  const [integrantes, setIntegrantes] = useState([]);

  // Estados de diálogos
  const [openConsultorDialog, setOpenConsultorDialog] = useState(false);
  const [openEquipeDialog, setOpenEquipeDialog] = useState(false);
  const [openIntegranteDialog, setOpenIntegranteDialog] = useState(false);

  // Estados de formulários
  const [consultorForm, setConsultorForm] = useState({
    id: null,
    nome: '',
    id_agendor: '',
    imagem_base64: '',
    ativo: true,
  });

  const [equipeForm, setEquipeForm] = useState({
    id: null,
    descricao: '',
  });

  const [integranteForm, setIntegranteForm] = useState({
    consultorId: '',
    funcao: '',
  });

  // Estados de feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Funções enum (adapte conforme seu enum real)
  const funcoes = ['Lider', 'Integrante'];

  // Carregar dados iniciais
  useEffect(() => {
    loadConsultores();
    loadEquipes();
  }, []);

  useEffect(() => {
    if (selectedEquipe) {
      loadIntegrantes(selectedEquipe.id);
    }
  }, [selectedEquipe]);

  // Funções de carregamento
  const loadConsultores = async () => {
    try {
      const response = await fetch(`${API_URL}/consultor`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) throw new Error('Erro ao carregar consultores');
      const data = await response.json();
      setConsultores(data);
    } catch (error) {
      showSnackbar('Erro ao carregar consultores', 'error');
    }
  };

  const loadEquipes = async () => {
    try {
      const response = await fetch(`${API_URL}/equipe`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) throw new Error('Erro ao carregar equipes');
      const data = await response.json();
      setEquipes(data);
    } catch (error) {
      showSnackbar('Erro ao carregar equipes', 'error');
    }
  };

  const loadIntegrantes = async (equipeId) => {
    try {
      const response = await fetch(`${API_URL}/integrante/equipe/${equipeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) throw new Error('Erro ao carregar integrantes');
      const data = await response.json();
      setIntegrantes(data);
    } catch (error) {
      showSnackbar('Erro ao carregar integrantes', 'error');
    }
  };

  // Funções de CRUD - Consultores
  const handleSaveConsultor = async () => {
    try {
      if (consultorForm.id) {
        await fetch(`${API_URL}/consultor/${consultorForm.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify(consultorForm),
        });
        showSnackbar('Consultor atualizado com sucesso', 'success');
      } else {
        await fetch(`${API_URL}/consultor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify(consultorForm),
        });
        showSnackbar('Consultor cadastrado com sucesso', 'success');
      }
      setOpenConsultorDialog(false);
      resetConsultorForm();
      loadConsultores();
    } catch (error) {
      showSnackbar('Erro ao salvar consultor', 'error');
    }
  };

  const handleEditConsultor = (consultor) => {
    setConsultorForm(consultor);
    setOpenConsultorDialog(true);
  };

  const handleDeleteConsultor = async (id) => {
    if (window.confirm('Deseja realmente excluir este consultor?')) {
      try {
        await fetch(`${API_URL}/consultor/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          }
        });
        showSnackbar('Consultor excluído com sucesso', 'success');
        loadConsultores();
      } catch (error) {
        showSnackbar('Erro ao excluir consultor', 'error');
      }
    }
  };

  const resetConsultorForm = () => {
    setConsultorForm({
      id: null,
      nome: '',
      id_agendor: '',
      imagem_base64: '',
      ativo: true,
    });
  };

  // Funções de CRUD - Equipes
  const handleSaveEquipe = async () => {
    try {
      if (equipeForm.id) {
        await fetch(`${API_URL}/equipe/${equipeForm.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify(equipeForm),
        });
        showSnackbar('Equipe atualizada com sucesso', 'success');
      } else {
        await fetch(`${API_URL}/equipe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify(equipeForm),
        });
        showSnackbar('Equipe criada com sucesso', 'success');
      }
      setOpenEquipeDialog(false);
      resetEquipeForm();
      loadEquipes();
    } catch (error) {
      showSnackbar('Erro ao salvar equipe', 'error');
    }
  };

  const handleEditEquipe = (equipe) => {
    setEquipeForm(equipe);
    setOpenEquipeDialog(true);
  };

  const handleDeleteEquipe = async (id) => {
    if (window.confirm('Deseja realmente excluir esta equipe?')) {
      try {
        await fetch(`${API_URL}/equipe/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          }
        });
        showSnackbar('Equipe excluída com sucesso', 'success');
        if (selectedEquipe?.id === id) {
          setSelectedEquipe(null);
        }
        loadEquipes();
      } catch (error) {
        showSnackbar('Erro ao excluir equipe', 'error');
      }
    }
  };

  const resetEquipeForm = () => {
    setEquipeForm({
      id: null,
      descricao: '',
    });
  };

  // Funções de CRUD - Integrantes
  const handleAddIntegrante = async () => {
    try {
      await fetch(`${API_URL}/integrante`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          ...integranteForm,
          equipeId: selectedEquipe.id,
        }),
      });
      showSnackbar('Integrante adicionado com sucesso', 'success');
      setOpenIntegranteDialog(false);
      resetIntegranteForm();
      loadIntegrantes(selectedEquipe.id);
    } catch (error) {
      showSnackbar('Erro ao adicionar integrante', 'error');
    }
  };

  const handleRemoveIntegrante = async (id) => {
    if (window.confirm('Deseja realmente remover este integrante da equipe?')) {
      try {
        await fetch(`${API_URL}/integrante/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`
          }
        });
        showSnackbar('Integrante removido com sucesso', 'success');
        loadIntegrantes(selectedEquipe.id);
      } catch (error) {
        showSnackbar('Erro ao remover integrante', 'error');
      }
    }
  };

  const resetIntegranteForm = () => {
    setIntegranteForm({
      consultorId: '',
      funcao: '',
    });
  };

  // Funções auxiliares
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getConsultorNome = (consultorId) => {
    const consultor = consultores.find(c => c.id === consultorId);
    return consultor ? consultor.nome : 'Desconhecido';
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
      </Helmet>

      <PapperBlock title="Gestão de Equipes" desc="Painel completo de gestão de equipes e consultores">
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          textColor="primary"
          indicatorColor="primary"
          variant="fullWidth"
        >
          <Tab icon={<GroupIcon />} label="Equipes" />
          <Tab icon={<PersonIcon />} label="Consultores" />
        </Tabs>

        {/* Tab: Equipes */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Lista de Equipes */}
            <Grid item xs={12} md={selectedEquipe ? 6 : 12}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => {
                  resetEquipeForm();
                  setOpenEquipeDialog(true);
                }}
                sx={{ marginBottom: 2 }}
                fullWidth
              >
                Nova Equipe
              </Button>

              <Grid container spacing={2}>
                {equipes.map((equipe) => (
                  <Grid item xs={12} sm={selectedEquipe ? 12 : 6} md={selectedEquipe ? 12 : 4} key={equipe.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        border: selectedEquipe?.id === equipe.id ? '2px solid' : '1px solid',
                        borderColor: selectedEquipe?.id === equipe.id ? 'primary.main' : 'grey.300',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 4,
                        }
                      }}
                      onClick={() => setSelectedEquipe(equipe)}
                      elevation={selectedEquipe?.id === equipe.id ? 8 : 1}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {equipe.descricao}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Criada em: {new Date(equipe.createdAt).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEquipe(equipe);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEquipe(equipe.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Detalhes da Equipe Selecionada */}
            {selectedEquipe && (
              <Grid item xs={12} md={6}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    <PeopleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Integrantes de {selectedEquipe.descricao}
                  </Typography>

                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      resetIntegranteForm();
                      setOpenIntegranteDialog(true);
                    }}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Adicionar Integrante
                  </Button>

                  <List>
                    {integrantes.map((integrante) => (
                      <ListItem key={integrante.id}>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 56, height: 56 }}>
                           {integrante.consultor.imagem_base64 ?  (
                             <img
                               src={`data:image/jpeg;base64,${integrante.consultor.imagem_base64}`}
                               alt={integrante.consultor.nome}
                               style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                             />
                           ) : (
                             <PersonIcon />
                           )}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={integrante.consultor.nome}
                          secondary={integrante.funcao}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            color="error"
                            onClick={() => handleRemoveIntegrante(integrante.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>

                  {integrantes.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                      Nenhum integrante cadastrado nesta equipe
                    </Typography>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Tab: Consultores */}
        <TabPanel value={tabValue} index={1}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              resetConsultorForm();
              setOpenConsultorDialog(true);
            }}
            sx={{ mb: 2 }}
          >
            Novo Consultor
          </Button>

          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>ID Agendor</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {consultores.map((consultor) => (
                  <TableRow key={consultor.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 1 }}>
                          {consultor.imagem_base64 ?  (
                             <img
                               src={`data:image/jpeg;base64,${consultor.imagem_base64}`}
                               alt={consultor.nome}
                               style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                             />
                           ) : (
                             <PersonIcon />
                           )}
                        </Avatar>
                        {consultor.nome}
                      </Box>
                    </TableCell>
                    <TableCell>{consultor.id_agendor}</TableCell>
                    <TableCell>
                      <Chip
                        label={consultor.ativo ? 'Ativo' : 'Inativo'}
                        color={consultor.ativo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditConsultor(consultor)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteConsultor(consultor.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </PapperBlock>

      {/* Dialog: Consultor */}
      <Dialog open={openConsultorDialog} onClose={() => setOpenConsultorDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{consultorForm.id ? 'Editar Consultor' : 'Novo Consultor'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome"
            type="text"
            fullWidth
            value={consultorForm.nome}
            onChange={(e) => setConsultorForm({ ...consultorForm, nome: e.target.value })}
          />
          <TextField
            margin="dense"
            label="ID Agendor"
            type="text"
            fullWidth
            value={consultorForm.id_agendor}
            onChange={(e) => setConsultorForm({ ...consultorForm, id_agendor: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Imagem Base64 (opcional)"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={consultorForm.imagem_base64}
            onChange={(e) => setConsultorForm({ ...consultorForm, imagem_base64: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Status</InputLabel>
            <Select
              value={consultorForm.ativo}
              label="Status"
              onChange={(e) => setConsultorForm({ ...consultorForm, ativo: e.target.value })}
            >
              <MenuItem value={true}>Ativo</MenuItem>
              <MenuItem value={false}>Inativo</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConsultorDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveConsultor} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Equipe */}
      <Dialog open={openEquipeDialog} onClose={() => setOpenEquipeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{equipeForm.id ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Descrição"
            type="text"
            fullWidth
            value={equipeForm.descricao}
            onChange={(e) => setEquipeForm({ ...equipeForm, descricao: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEquipeDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSaveEquipe} variant="contained" color="primary">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Adicionar Integrante */}
      <Dialog open={openIntegranteDialog} onClose={() => setOpenIntegranteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Integrante</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Consultor</InputLabel>
            <Select
              value={integranteForm.consultorId}
              label="Consultor"
              onChange={(e) => setIntegranteForm({ ...integranteForm, consultorId: e.target.value })}
            >
              {consultores
                .filter(c => c.ativo)
                .filter(c => !integrantes.some(i => i.consultorId === c.id))
                .map((consultor) => (
                  <MenuItem key={consultor.id} value={consultor.id}>
                    {consultor.nome}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Função</InputLabel>
            <Select
              value={integranteForm.funcao}
              label="Função"
              onChange={(e) => setIntegranteForm({ ...integranteForm, funcao: e.target.value })}
            >
              {funcoes.map((funcao) => (
                <MenuItem key={funcao} value={funcao}>
                  {funcao}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenIntegranteDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAddIntegrante} variant="contained" color="primary">
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default Gestao;

