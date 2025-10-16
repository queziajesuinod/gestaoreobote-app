import React, { Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import Button from '@mui/material/Button';
import { NavLink } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import AllInclusive from '@mui/icons-material/AllInclusive';
import Brightness5 from '@mui/icons-material/Brightness5';
import People from '@mui/icons-material/People';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import Icon from '@mui/material/Icon';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useFormik } from 'formik';
import * as yup from 'yup';
import brand from 'dan-api/dummy/brand';
import logo from 'dan-images/logo.svg';
import useStyles from './user-jss';
import { ContentDivider } from '../Divider';

// validation functions
const validationSchema = yup.object({
  email: yup
    .string('Enter your email')
    .email('Enter a valid email')
    .required('Email is required'),
  password: yup
    .string('Enter your password')
    .required('Password is required'),
});

const LinkBtn = React.forwardRef(function LinkBtn(props, ref) { // eslint-disable-line
  return <NavLink to={props.to} {...props} />; // eslint-disable-line
});

function LoginForm({ onSubmit }) {
  const { classes, cx } = useStyles();
  const [showPassword, setShowPassword] = useState(false);

  const deco = useSelector((state) => state.ui.decoration);

  const formik = useFormik({
    initialValues: {
      email: 'admin@email.com',
      password: 'admin123',
    },
    validationSchema,
    onSubmit: async (values) => {
      console.log('You submitted:' + JSON.stringify(values, null, 2));
      if (onSubmit) {
        await onSubmit(values);
      }
    },
  });

  const handleClickShowPassword = () => {
    setShowPassword(show => !show);
  };

  const handleMouseDownPassword = event => {
    event.preventDefault();
  };

  const mdUp = useMediaQuery(theme => theme.breakpoints.up('md'));
  const mdDown = useMediaQuery(theme => theme.breakpoints.down('md'));

  return (
    <Fragment>
      {!mdUp && (
        <NavLink to="/" className={cx(classes.brand, classes.outer)}>
          <img src={logo} alt={brand.name} />
          {brand.name}
        </NavLink>
      )}
      <Paper className={cx(classes.paperWrap, deco && classes.petal)}>
        {!mdDown && (
          <div className={classes.topBar}>
            <NavLink to="/" className={classes.brand}>
              <img src={logo} alt={brand.name} />
              {brand.name}
            </NavLink>
    
          </div>
        )}
        <Typography variant="h4" className={classes.title} gutterBottom>
          Sign In
        </Typography>
        <Typography variant="caption" className={classes.subtitle} gutterBottom align="center">
          Bem-vindo ao Painel Reobote! Por favor, entre com suas credenciais.
        </Typography>
        <section className={classes.formWrap}>
          <form onSubmit={formik.handleSubmit}>
            <div>
              <FormControl variant="standard" className={classes.formControl}>
                <TextField
                  id="email"
                  name="email"
                  label="Your Email"
                  variant="standard"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                  className={classes.field}
                />
              </FormControl>
            </div>
            <div>
              <FormControl variant="standard" className={classes.formControl}>
                <TextField
                  id="password"
                  name="password"
                  label="Your Password"
                  type={showPassword ? 'text' : 'password'}
                  variant="standard"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  error={formik.touched.password && Boolean(formik.errors.password)}
                  helperText={formik.touched.password && formik.errors.password}
                  className={classes.field}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="Toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          size="large">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </FormControl>
            </div>
            
            <div className={classes.btnArea}>
              <Button variant="contained" color="primary" size="large" type="submit" disabled={formik.isSubmitting}>
                Entrar
                <ArrowForward className={cx(classes.rightIcon, classes.iconSmall)} />
              </Button>
            </div>
          </form>
        </section>
      </Paper>
    </Fragment>
  );
}

LoginForm.propTypes = {
  onSubmit: PropTypes.func
};

LoginForm.defaultProps = {
  onSubmit: null
};

export default LoginForm;
