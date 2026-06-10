import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Mapeamentos } from './pages/Mapeamentos';
import { Upload } from './pages/Upload';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'upload', element: <Upload /> },
      { path: 'mapeamentos', element: <Mapeamentos /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
