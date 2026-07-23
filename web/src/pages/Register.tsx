import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(10, 'Use at least 10 characters')
      .regex(/[a-z]/, 'Include a lowercase letter')
      .regex(/[A-Z]/, 'Include an uppercase letter')
      .regex(/[0-9]/, 'Include a number'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Values = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((state) => state.register);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => clearError, [clearError]);

  const onSubmit = async (values: Values): Promise<void> => {
    await registerUser(values.name, values.email, values.password);
    navigate('/dashboard');
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-bold text-ink-900 dark:text-white">Create your account</h1>
      <p className="mt-2 text-ink-500 dark:text-ink-400">
        Save cards you like and keep a history of every recommendation run.
      </p>

      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="mt-8 space-y-4">
        <Input
          label="Name"
          autoComplete="name"
          error={formState.errors.name?.message}
          {...register('name')}
        />
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
          autoComplete="new-password"
          hint="At least 10 characters, with upper case, lower case and a number."
          error={formState.errors.password?.message}
          {...register('password')}
        />
        <Input
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          error={formState.errors.confirmPassword?.message}
          {...register('confirmPassword')}
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
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">
        Already have an account?{' '}
        <Link to="/login" className="link font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
