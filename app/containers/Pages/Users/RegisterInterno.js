import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { PapperBlock } from 'dan-components';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { getStoredUser } from '../../../utils/userStorage';

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';

// Validação
const validationSchema = yup.object({
  name: yup
    .string('Digite o nome completo')
    .required('Nome é obrigatório')
    .min(3, 'Nome deve ter pelo menos 3 caracteres'),
  username: yup
    .string('Digite o nome de usuário')
    .required('Nome de usuário é obrigatório')
    .min(3, 'Nome de usuário deve ter pelo menos 3 caracteres')
    .matches(/^[a-zA-Z0-9._]+$/, 'Use apenas letras, números, ponto e underscore'),
  email: yup
    .string('Digite o email')
    .email('Digite um email válido')
    .required('Email é obrigatório'),
  password: yup
    .string('Digite a senha')
    .required('Senha é obrigatória')
    .min(6, 'Senha deve ter pelo menos 6 caracteres'),
  passwordConfirmation: yup
    .string('Confirme a senha')
    .oneOf([yup.ref('password'), null], 'As senhas devem ser iguais')
    .required('Confirmação de senha é obrigatória'),
  perfilId: yup
    .string('Selecione um perfil')
    .required('Perfil é obrigatório')
});

function RegisterInterno() {
  const navigate = useNavigate();
  const title = 'Cadastrar Novo Usuário';
  const description = 'Adicione um novo usuário ao sistema';

  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [storedUser, setStoredUserState] = useState(() => getStoredUser());
  const perfilUsuario = storedUser?.perfil?.toUpperCase() || '';
  const ehMasterLogado = perfilUsuario === 'MASTER';

  useEffect(() => {
    const handleUserUpdated = (event) => {
      setStoredUserState(event?.detail || getStoredUser());
    };

    window.addEventListener('app:user-updated', handleUserUpdated);
    return () => window.removeEventListener('app:user-updated', handleUserUpdated);
  }, []);

  // Carregar perfis disponíveis
  useEffect(() => {
    async function carregarPerfis() {
      try {
        const token = localStorage.getItem('token'); // OK: dentro da função
        const response = await fetch(`${API_URL}/perfil`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const lista = Array.isArray(data) ? data : (data?.dados || data);
          const perfisFiltrados = lista.filter((perfil) => {
            const descricao = (perfil?.descricao || '').toUpperCase();
            if (!ehMasterLogado && descricao.includes('MASTER')) {
              return false;
            }
            return true;
          });
          setPerfis(perfisFiltrados);
          console.log('✅ Perfis carregados:', data);
        } else {
          console.error('Erro ao carregar perfis');
          setPerfis([{ id: 1, descricao: 'Usuário' }]);
        }
      } catch (err) {
        console.error('Erro ao carregar perfis:', err);
          setPerfis([{ id: 1, descricao: 'Usuário' }]);
      }
    }
    carregarPerfis();
  }, []);

  const formik = useFormik({
    initialValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      perfilId: ''
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError('');
      setSuccess(false);

      try {
        const token = localStorage.getItem('token'); // OK: dentro da função
        
        console.log('📤 Enviando dados de cadastro:', {
          name: values.name,
          username: values.username,
          email: values.email,
          perfilId: values.perfilId
        });

        const response = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        const perfilSelecionado = perfis.find((perfil) => String(perfil.id) === String(values.perfilId));

        if (!ehMasterLogado && perfilSelecionado) {
          const descricao = (perfilSelecionado.descricao || '').toUpperCase();
          if (descricao.includes('MASTER')) {
            throw new Error('Somente perfil MASTER pode criar outro MASTER.');
          }
        }

        const response = await fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: values.name,
            username: values.username,
            email: values.email,
            password: values.password,
            perfilId: parseInt(values.perfilId),
            active: true,
            image: null
          })
        });
        });

        const data = await response.json();

        if (response.ok) {
          console.log('✅ Usuário criado com sucesso:', data);
          setSuccess(true);

          // Redirecionar para lista de usuários após 2 segundos
          setTimeout(() => {
            navigate('/app/pages/user-list'); // Ajustar para a rota correta
          }, 2000);
        } else {
          console.error('❌ Erro ao criar usuário:', data);
          setError(data.message || 'Erro ao criar usuário. Tente novamente.');
        }
      } catch (err) {
        console.error('❌ Erro de rede:', err);
        setError('Erro de conexão com o servidor. Verifique se o backend está rodando.');
      } finally {
        setLoading(false);
      }
    }
  });

  const handleCancel = () => {
    navigate('/app/pages/user-list'); // Ajustar para a rota correta
  };

  return (
    <div>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <PapperBlock
        title="Cadastrar Novo Usuário"
        icon="ion-ios-person-add"
        desc="Preencha os dados abaixo para criar um novo usuário no sistema"
      >
        {/* Mensagens de Sucesso/Erro */}
        {success && (
          <Alert severity="success" style={{ marginBottom: 20 }}>
            ✅ Usuário criado com sucesso! Redirecionando...
          </Alert>
        )}

        {error && (
          <Alert severity="error" style={{ marginBottom: 20 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            {/* Nome Completo */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="name"
                name="name"
                label="Nome Completo *"
                value={formik.values.name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.name && Boolean(formik.errors.name)}
                helperText={formik.touched.name && formik.errors.name}
                disabled={loading || success}
              />
            </Grid>

            {/* Nome de Usuário */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="username"
                name="username"
                label="Nome de Usuário *"
                value={formik.values.username}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.username && Boolean(formik.errors.username)}
                helperText={formik.touched.username && formik.errors.username}
                disabled={loading || success}
                placeholder="ex: joao.silva"
              />
            </Grid>

            {/* Email */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email *"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                disabled={loading || success}
              />
            </Grid>

            {/* Perfil */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={formik.touched.perfilId && Boolean(formik.errors.perfilId)}>
                <InputLabel id="perfil-label">Perfil *</InputLabel>
                <Select
                  labelId="perfil-label"
                  id="perfilId"
                  name="perfilId"
                  value={formik.values.perfilId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  disabled={loading || success}
                  label="Perfil *"
                >
                  <MenuItem value="">
                    <em>Selecione um perfil</em>
                  </MenuItem>
                  {perfis.map(perfil => (
                    <MenuItem key={perfil.id} value={perfil.id}>
                      {perfil.descricao}
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.perfilId && formik.errors.perfilId && (
                  <Typography variant="caption" color="error" style={{ marginTop: 4 }}>
                    {formik.errors.perfilId}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Senha */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="password"
                name="password"
                label="Senha *"
                type="password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                disabled={loading || success}
              />
            </Grid>

            {/* Confirmar Senha */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="passwordConfirmation"
                name="passwordConfirmation"
                label="Confirmar Senha *"
                type="password"
                value={formik.values.passwordConfirmation}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.passwordConfirmation && Boolean(formik.errors.passwordConfirmation)}
                helperText={formik.touched.passwordConfirmation && formik.errors.passwordConfirmation}
                disabled={loading || success}
              />
            </Grid>

            {/* Botões */}
            <Grid item xs={12}>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleCancel}
                  disabled={loading || success}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={loading || success || !formik.isValid}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} style={{ marginRight: 10 }} />
                      Cadastrando...
                    </>
                  ) : success ? (
                    'Usuário Cadastrado ✓'
                  ) : (
                    'Cadastrar Usuário'
                  )}
                </Button>
              </div>
            </Grid>
          </Grid>
        </form>
      </PapperBlock>
    </div>
  );
}

export default RegisterInterno;
