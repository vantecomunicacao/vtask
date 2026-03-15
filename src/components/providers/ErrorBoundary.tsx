import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-full items-center justify-center bg-surface-1 p-6">
                    <div className="flex flex-col items-center gap-4 max-w-md text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                            <AlertTriangle size={28} className="text-red-500" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-primary">Algo deu errado</h1>
                            <p className="mt-1 text-sm text-secondary">
                                Ocorreu um erro inesperado. Tente recarregar a página.
                            </p>
                            {import.meta.env.DEV && this.state.error && (
                                <pre className="mt-3 rounded-lg bg-surface-2 p-3 text-left text-xs text-red-500 overflow-auto max-h-40">
                                    {this.state.error.message}
                                </pre>
                            )}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
                        >
                            <RefreshCw size={14} />
                            Recarregar página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
