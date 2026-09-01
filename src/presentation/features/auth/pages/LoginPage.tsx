import { LoginForm } from '@/presentation/features/auth/components/LoginForm';

export function LoginPage() {
  return (
    <div className="flex min-h-[100svh] flex-1 items-center justify-center bg-background px-4 py-8">
      <LoginForm />
    </div>
  );
}
