import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Tarefas = lazy(() => import('./pages/Tarefas'));
const Projetos = lazy(() => import('./pages/Projetos'));
const ProjetoDetalhe = lazy(() => import('./pages/ProjetoDetalhe'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Documentos = lazy(() => import('./pages/Documentos'));
const GeradorEmail = lazy(() => import('./pages/GeradorEmail'));
const DesignSystem = lazy(() => import('./pages/DesignSystem'));

import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { CommandPalette } from './components/ui/CommandPalette';
import { Toaster } from './components/ui/Toaster';
import { useAuthListener } from './hooks/useAuth';

function AppRoutes() {
    useAuthListener();

    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
                    <span className="text-sm font-medium text-gray-500">Carregando vFlow...</span>
                </div>
            </div>
        }>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/tarefas" element={<Tarefas />} />
                        <Route path="/documentos" element={<Documentos />} />
                        <Route path="/documentos/:id" element={<Documentos />} />
                        <Route path="/projetos" element={<Projetos />} />
                        <Route path="/projetos/:id" element={<ProjetoDetalhe />} />
                        <Route path="/agenda" element={<Agenda />} />
                        <Route path="/configuracoes" element={<Configuracoes />} />
                        <Route path="/gerador-email" element={<GeradorEmail />} />
                        <Route path="/design-system" element={<DesignSystem />} />
                    </Route>
                </Route>
            </Routes>
        </Suspense>
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
