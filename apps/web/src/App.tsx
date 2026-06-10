import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Candidatas } from './pages/Candidatas';
import { Dashboard } from './pages/Dashboard';
import { Fornecedores } from './pages/Fornecedores';
import { Linhas } from './pages/Linhas';
import { Mapeamentos } from './pages/Mapeamentos';
import { Upload } from './pages/Upload';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'linhas', element: <Linhas /> },
      { path: 'candidatas', element: <Candidatas /> },
      { path: 'upload', element: <Upload /> },
      { path: 'fornecedores', element: <Fornecedores /> },
      { path: 'mapeamentos', element: <Mapeamentos /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
