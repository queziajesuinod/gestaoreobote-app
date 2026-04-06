/* eslint-disable */

import React from 'react';
import Loading from 'dan-components/Loading';
import loadable from '../utils/loadable';


export const BlankPage = loadable(() =>
  import('./Pages/BlankPage'), {
    fallback: <Loading />,
  });
export const DashboardPage = loadable(() =>
  import('./Pages/Dashboard'), {
    fallback: <Loading />,
  });
export const Form = loadable(() =>
  import('./Pages/Forms/FormikForm'), {
    fallback: <Loading />,
  });

  export const LoginDedicated = loadable(() =>
  import('./Pages/Standalone/LoginDedicated'), {
    fallback: <Loading />,
  });
  
export const Table = loadable(() =>
  import('./Pages/Table/BasicTable'), {
    fallback: <Loading />,
  });
export const Login = loadable(() =>
  import('./Pages/Users/Login'), {
    fallback: <Loading />,
  });
export const Register = loadable(() =>
  import('./Pages/Users/Register'), {
    fallback: <Loading />,
  });
export const ResetPassword = loadable(() =>
  import('./Pages/Users/ResetPassword'), {
    fallback: <Loading />,
  });
export const NotFound = loadable(() =>
  import('./NotFound/NotFound'), {
  fallback: <Loading />,
});
export const NotFoundDedicated = loadable(() =>
  import('./Pages/Standalone/NotFoundDedicated'), {
    fallback: <Loading />,
  });
export const Error = loadable(() =>
  import('./Pages/Error'), {
    fallback: <Loading />,
  });
export const Maintenance = loadable(() =>
  import('./Pages/Maintenance'), {
    fallback: <Loading />,
  });
export const ComingSoon = loadable(() =>
  import('./Pages/ComingSoon'), {
    fallback: <Loading />,
  });
export const Parent = loadable(() =>
  import('./Parent'), {
    fallback: <Loading />,
  });


export const Gestao = loadable(() =>
  import('./Pages/Gestao'), {
    fallback: <Loading />,
  });

export const Clientes = loadable(() =>
  import('./Pages/Clientes'), {
    fallback: <Loading />,
  });

export const Cotas = loadable(() =>
  import('./Pages/Cotas'), {
    fallback: <Loading />,
  });

export const Metas = loadable(() =>
  import('./Pages/Metas'), {
    fallback: <Loading />,
  });

export const ProfilePage = loadable(() =>
  import('./Pages/Users/Profile'), {
    fallback: <Loading />,
  });

export const UsersAdmin = loadable(() =>
  import('./Pages/Users/UsersManagement'), {
    fallback: <Loading />,
  });

export const PerfisAdmin = loadable(() =>
  import('./Pages/Users/PerfisManagement'), {
    fallback: <Loading />,
  });

<<<<<<< HEAD
export const LeadsPage = loadable(() =>
  import('./Pages/Leads'), {
    fallback: <Loading />,
  });

export const LeadDetalhes = loadable(() =>
  import('./Pages/Leads/LeadDetalhes'), {
    fallback: <Loading />,
  });

export const LeadsInsights = loadable(() =>
  import('./Pages/Leads/LeadsInsights'), {
    fallback: <Loading />,
  });

export const EvolutionConfig = loadable(() =>
  import('./Pages/EvolutionConfig'), {
=======
// Módulo de Inadimplentes
export const InadimplentesProcessos = loadable(() =>
  import('./Pages/Inadimplentes/ListaProcessos'), {
    fallback: <Loading />,
  });

export const InadimplentesFormulario = loadable(() =>
  import('./Pages/Inadimplentes/FormularioProcesso'), {
    fallback: <Loading />,
  });

export const InadimplentesDetalhes = loadable(() =>
  import('./Pages/Inadimplentes/DetalhesProcesso'), {
    fallback: <Loading />,
  });

export const InadimplentesWebhook = loadable(() =>
  import('./Pages/Inadimplentes/ConfiguracoesWebhook'), {
    fallback: <Loading />,
  });

export const InadimplenteDashboard = loadable(() =>
  import('./Pages/Inadimplentes/DashboardInadiplentes'), {
    fallback: <Loading />,
  });

export const InadimplentesCobrancas = loadable(() =>
  import('./Pages/Inadimplentes/ListaCobrancas'), {
>>>>>>> main
    fallback: <Loading />,
  });
