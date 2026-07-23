import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

/** Gate for authenticated routes; waits for session bootstrap before redirecting. */
export function RequireAuth() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status !== 'ready') {
    return (
      <div
        className="grid min-h-[60vh] place-items-center"
        role="status"
        aria-label="Checking your session"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
}
