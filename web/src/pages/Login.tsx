import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth';
import { useFavoritesStore } from '@/stores/favorites';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type Values = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const loadFavorites = useFavoritesStore((state) => state.load);

  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => clearError, [clearError]);

  const onSubmit = async (values: Values): Promise<void> => {
    await login(values.email, values.password);
    await loadFavorites();
    navigate(params.get('next') ?? '/dashboard');
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-bold text-ink-900 dark:text-white">Welcome back</h1>
      <p className="mt-2 text-ink-500 dark:text-ink-400">
        Sign in to reach your saved cards and recommendation history.
      </p>

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-8 space-y-4">
        <Input
          type="email"
          label="Email"
          autoComplete="email"
          error={formState.errors.email?.message}
          {...register('email')}
        />
        <Input
          type="password"
          label="Password"
          autoComplete="current-password"
          error={formState.errors.password?.message}
          {...register('password')}
        />

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <Button type="submit" fullWidth size="lg" loading={formState.isSubmitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        New here?{' '}
        <Link to="/register" className="link font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
