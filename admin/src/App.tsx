import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Login } from '@/pages/Login';
import { OAuthCallback } from '@/pages/OAuthCallback';
import { Dashboard } from '@/pages/Dashboard';
import { ApiKeys } from '@/pages/ApiKeys';
import { Collections } from '@/pages/Collections';
import { useAuthStore } from '@/store/auth';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/admin/login"
          element={isAuthenticated ? <Navigate to="/admin" replace /> : <Login />}
        />
        <Route path="/admin/auth/callback" element={<OAuthCallback />} />

        {/* Protected Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="api-keys" element={<ApiKeys />} />
          <Route path="collections" element={<Collections />} />
          <Route path="collections/:table" element={<Collections />} />
        </Route>

        {/* Default Redirect */}
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? '/admin' : '/admin/login'} replace />
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
