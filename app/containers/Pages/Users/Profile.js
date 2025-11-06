import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet';
import imageCompression from 'browser-image-compression';
import dummyContents from 'dan-api/dummy/dummyContents';
import { setStoredUser, getStoredUser } from '../../../utils/userStorage';
import { PapperBlock, Notification } from 'dan-components';
import {
  Paper,
  Typography,
  Box,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Button,
  TextField
} from '@mui/material';
import {
  Email,
  AccountCircle,
  VerifiedUser,
  CalendarToday,
  Delete as DeleteIcon
} from '@mui/icons-material';
import Webcam from 'react-webcam';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedImage, setCapturedImage] = useState('');
  const [formName, setFormName] = useState('');
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [saving, setSaving] = useState(false);
  const webcamRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';
  const storedUserSnapshot = getStoredUser();
  const id = storedUserSnapshot?.id;
  
  // ⚠️ Função helper para obter o token atualizado
  const getToken = () => localStorage.getItem('token');

  const formatDate = (dateString) => {
    if (!dateString) return 'Não informado';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCPF = (cpf) => {
    if (!cpf) return 'Não informado';
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  };

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 500,
      useWebWorker: true
    };
    try {
      const compressedFile = await imageCompression(file, options);
      return await imageCompression.getDataUrlFromFile(compressedFile);
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      return null;
    }
  };

  const fetchUser = async () => {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        }
      });
      if (!response.ok) throw new Error('Erro ao carregar os detalhes do usuário');
      const data = await response.json();
      setUser(data);
      setCapturedImage(data.image || '');
      setFormName(data.name || '');
      setPasswords({ current: '', new: '', confirm: '' });

      const currentStored = getStoredUser();
      let shouldUpdateStored = false;
      const mergedUser = { ...currentStored };
      if (data.name && data.name !== currentStored.name) {
        mergedUser.name = data.name;
        shouldUpdateStored = true;
      }
      if (data.username && data.username !== currentStored.username) {
        mergedUser.username = data.username;
        shouldUpdateStored = true;
      }
      if (Object.prototype.hasOwnProperty.call(data, 'image')) {
        const normalizedImage = data.image || null;
        if (normalizedImage !== currentStored.image) {
          mergedUser.avatar = normalizedImage;
          mergedUser.image = normalizedImage;
          shouldUpdateStored = true;
        }
      }
      if (shouldUpdateStored) {
        setStoredUser(mergedUser);
      }
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
    }
  };

  const updateImage = async (base64Image) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ image: base64Image })
      });

      const data = await response.json();

      if (response.ok) {
        setNotification('Imagem atualizada com sucesso!');
        setUser((prev) => ({ ...prev, image: base64Image }));

        const currentStored = getStoredUser();
        const normalizedImage = base64Image || null;
        const updatedUser = {
          ...currentStored,
          avatar: normalizedImage,
          image: normalizedImage
        };
        setStoredUser(updatedUser);
      } else {
        setNotification(`Erro: ${data.message || 'Não foi possível atualizar a imagem'}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar imagem:', error);
      setNotification('Erro ao conectar com o servidor.');
    }
  };

  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        updateImage(imageSrc);
        setCapturedImage(imageSrc);
        setShowWebcam(false);
      }
    }
  };

  const resetPhoto = () => {
    updateImage('');
    setCapturedImage('');
    setShowWebcam(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressedBase64 = await compressImage(file);
      if (compressedBase64) {
        setCapturedImage(compressedBase64);
        updateImage(compressedBase64);
      }
    }
  };

  const handlePasswordChange = (field) => (event) => {
    const { value } = event.target;
    setPasswords((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) {
      setNotification('Dados do usuário ainda não carregados.');
      return;
    }

    const trimmedName = formName.trim();
    const wantsPasswordChange = Boolean(passwords.current || passwords.new || passwords.confirm);

    if (!trimmedName) {
      setNotification('O nome não pode ficar vazio.');
      return;
    }

    if (wantsPasswordChange) {
      if (!passwords.current) {
        setNotification('Informe a senha atual para alterar a senha.');
        return;
      }
      if (!passwords.new) {
        setNotification('Informe a nova senha.');
        return;
      }
      if (passwords.new.length < 6) {
        setNotification('A nova senha deve conter ao menos 6 caracteres.');
        return;
      }
      if (passwords.new !== passwords.confirm) {
        setNotification('A confirmação da senha não confere.');
        return;
      }
    }

    const payload = {};
    if (trimmedName !== user.name) {
      payload.name = trimmedName;
    }
    if (wantsPasswordChange) {
      payload.currentPassword = passwords.current;
      payload.newPassword = passwords.new;
    }

    if (Object.keys(payload).length === 0) {
      setNotification('Nenhuma alteração para salvar.');
      return;
    }

    try {
      setSaving(true);
      setNotification('');
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Não foi possível atualizar o perfil.');
      }

      setUser(data);
      setFormName(data.name || '');
      setPasswords({ current: '', new: '', confirm: '' });
      if (Object.prototype.hasOwnProperty.call(data, 'image')) {
        setCapturedImage(data.image || '');
      }

      const currentStored = getStoredUser();
      const updatedStored = {
        ...currentStored,
        name: data.name || currentStored.name
      };
      if (Object.prototype.hasOwnProperty.call(data, 'image')) {
        const normalizedImage = data.image || null;
        updatedStored.avatar = normalizedImage;
        updatedStored.image = normalizedImage;
      }
      setStoredUser(updatedStored);

      setNotification('Dados atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setNotification(error.message || 'Falha ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (id) fetchUser();
  }, [id]);

  const passwordMismatch = Boolean(passwords.new && passwords.confirm && passwords.new !== passwords.confirm);
  const passwordTooShort = Boolean(passwords.new && passwords.new.length > 0 && passwords.new.length < 6);

  if (!user) {
    return <Typography color="error">Erro ao carregar os dados. Verifique a conexão.</Typography>;
  }

  return (
    <div>
      <Helmet>
        <title>Detalhes de {user.name}</title>
      </Helmet>

      <PapperBlock title="Detalhes do Usuário" desc="Informações completas">
        <Paper sx={{ p: 3, mt: 3 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showWebcam ? (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Foto do usuário"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <AccountCircle style={{ width: '80%', height: '80%', color: '#ccc' }} />
                )}
              </div>

              <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                {!showWebcam && (
                  <Button variant="outlined" size="small" onClick={() => setShowWebcam(true)}>
                    Webcam
                  </Button>
                )}
                {showWebcam && (
                  <Button variant="contained" size="small" onClick={capturePhoto}>
                    Capturar
                  </Button>
                )}
                <Button variant="outlined" size="small" component="label">
                  Upload
                  <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                </Button>
                {capturedImage && (
                  <IconButton onClick={resetPhoto} size="small" color="error">
                    <DeleteIcon />
                  </IconButton>
                )}
              </Box>
            </div>

            <Box>
              <Typography variant="h5" fontWeight="bold">
                {formName || user.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {user.username}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Nome completo"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                value={user.email || ''}
                fullWidth
                disabled
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Senha atual"
                type="password"
                value={passwords.current}
                onChange={handlePasswordChange('current')}
                fullWidth
                autoComplete="current-password"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Nova senha"
                type="password"
                value={passwords.new}
                onChange={handlePasswordChange('new')}
                fullWidth
                autoComplete="new-password"
                error={passwordTooShort}
                helperText={passwordTooShort ? 'Mínimo de 6 caracteres.' : ' '}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Confirmar nova senha"
                type="password"
                value={passwords.confirm}
                onChange={handlePasswordChange('confirm')}
                fullWidth
                autoComplete="new-password"
                error={passwordMismatch}
                helperText={passwordMismatch ? 'As senhas não conferem.' : ' '}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">
                Deixe os campos de senha em branco para manter a senha atual.
              </Typography>
            </Grid>
          </Grid>

          <Box display="flex" justifyContent="flex-end" mb={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </Box>

          <List>
            <ListItem>
              <ListItemIcon>
                <AccountCircle />
              </ListItemIcon>
              <ListItemText primary="Nome completo" secondary={user.name || 'Não informado'} />
            </ListItem>


            <ListItem>
              <ListItemIcon>
                <Email />
              </ListItemIcon>
              <ListItemText primary="Email" secondary={user.email || 'Não informado'} />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <VerifiedUser />
              </ListItemIcon>
              <ListItemText primary="Ativo" secondary={user.active ? 'Sim' : 'Não'} />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <AccountCircle />
              </ListItemIcon>
              <ListItemText primary="Perfil" secondary={user.Perfil?.descricao || 'N/A'} />
            </ListItem>
          </List>
        </Paper>
      </PapperBlock>

      <Notification message={notification} close={() => setNotification('')} />
    </div>
  );
};

export default ProfilePage;
