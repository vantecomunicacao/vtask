import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Tarefas from './pages/Tarefas';
import Projetos from './pages/Projetos';
import ProjetoDetalhe from './pages/ProjetoDetalhe';
import Agenda from './pages/Agenda';
import Configuracoes from './pages/Configuracoes';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { CommandPalette } from './components/ui/CommandPalette';
import { Toaster } from './components/ui/Toaster';
import { useAuthListener } from './hooks/useAuth';

function AppRoutes() {
    useAuthListener();

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/tarefas" element={<Tarefas />} />
                    <Route path="/projetos" element={<Projetos />} />
                    <Route path="/projetos/:id" element={<ProjetoDetalhe />} />
                    <Route path="/agenda" element={<Agenda />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <CommandPalette />
            <Toaster />
            <AppRoutes />
        </BrowserRouter>
    );
}
