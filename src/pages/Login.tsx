import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginForm) => {
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
        });

        if (error) {
            setError('Email ou senha incorretos.');
            return;
        }

        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-main p-4 fade-in">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center text-white font-bold text-xl">
                        FD
                    </div>
                </div>
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">Bem-vindo ao FlowDesk</CardTitle>
                        <p className="text-sm text-gray-500 mt-2">Faça login na sua conta da agência</p>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700" htmlFor="email">Email</label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nome@agencia.com"
                                    {...register('email')}
                                />
                                {errors.email && (
                                    <p className="text-xs text-red-600">{errors.email.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-700" htmlFor="password">Senha</label>
                                    <a href="#" className="text-xs text-brand hover:underline">Esqueceu?</a>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    {...register('password')}
                                />
                                {errors.password && (
                                    <p className="text-xs text-red-600">{errors.password.message}</p>
                                )}
                            </div>
                            {error && (
                                <p className="text-xs text-red-600 text-center">{error}</p>
                            )}
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? 'Entrando...' : 'Entrar'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
