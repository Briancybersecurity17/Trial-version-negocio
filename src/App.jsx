import { Toaster } from "@/components/ui/toaster"
import TrialGuard from "./TrialGuard";
import moment from "moment";
import "moment/locale/es";
moment.locale("es");
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import CalendarView from './pages/CalendarView';
import Gastos from './pages/Gastos';
import Inventario from './pages/Inventario';
import Mermas from './pages/Mermas';
import Opciones from './pages/Opciones';
import Account from './pages/Account';

// Rutas protegidas: redirige al login si no está autenticado
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Ruta de login: redirige al dashboard si ya está autenticado
function PublicRoute({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return null;
  return !isAuthenticated ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user } = useAuth();

  // Forzar cambio de contraseña si es admin con contraseña por defecto
  const mustChangePw = user?.mustChangePassword && user?.role === 'admin';

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/"            element={mustChangePw ? <Navigate to="/account" replace /> : <Dashboard />} />
          <Route path="/productos"   element={<Products />} />
          <Route path="/ventas"      element={<Sales />} />
          <Route path="/gastos"      element={<Gastos />} />
          <Route path="/inventario"  element={<Inventario />} />
          <Route path="/mermas"      element={<Mermas />} />
          <Route path="/calendario"  element={<CalendarView />} />
          <Route path="/opciones"    element={<Opciones />} />
          <Route path="/account"     element={<Account />} />
          <Route path="*"            element={<PageNotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <TrialGuard>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <QueryClientProvider client={queryClientInstance}>
              <AppRoutes />
              <Toaster />
              <SonnerToaster richColors position="top-right" />
            </QueryClientProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </TrialGuard>
  )
}

export default App