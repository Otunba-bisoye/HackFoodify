import type { ReactNode } from 'react';
import { useAuth, SignIn } from '@clerk/react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './ProtectedRoute.css';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectUrl?: string;
}

export const ProtectedRoute = ({
  children,
  redirectUrl,
}: ProtectedRouteProps) => {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  const resolvedRedirectUrl =
    redirectUrl ?? `${location.pathname}${location.search}`;

  if (!isLoaded) {
    return (
      <div className="protected-gate">
        <div className="protected-spinner" />
        <p>Checking your session...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="protected-gate">
        <div className="protected-gate-topbar">
          <Link to="/discover" className="protected-back-link">
            <ArrowLeft size={18} />
            <span>Back to Discover</span>
          </Link>
        </div>

        <div className="protected-gate-card">
          <h2>Sign in to continue</h2>
          <p>Log in or create a Foodify account to access this page.</p>
          <SignIn routing="hash" fallbackRedirectUrl={resolvedRedirectUrl} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};