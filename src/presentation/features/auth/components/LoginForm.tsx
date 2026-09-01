import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/presentation/features/auth/context/AuthContext';
import crestLogo from '@/assets/logo_cai.jpg';

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-sm mx-auto gap-0 overflow-visible border-none bg-transparent shadow-none ring-0 sm:rounded-xl sm:bg-card sm:shadow-lg sm:ring-1 sm:ring-black/5">
      <div className="hidden h-1.5 w-full rounded-t-xl bg-[var(--brand-red)] sm:block" />
      <CardHeader className="flex flex-col items-center pt-5 text-center">
        <img src={crestLogo} alt="Escudo del Club Atlético Independiente" className="mx-auto mb-2 h-16 w-auto" />
        <CardTitle className="text-xl font-bold">Iniciar sesión</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ingresá con tu cuenta del club para continuar.
        </p>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              placeholder="nombre@club.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Contraseña</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t-0 bg-transparent sm:border-t sm:bg-muted/50">
          <Button
            type="submit"
            className="w-full bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-dark)]"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
