import { useState } from 'react';
import {
  Show,
  SignIn,
  SignUp,
  UserButton,
  useUser,
} from '@clerk/react';
import { LogIn, UserPlus, X } from 'lucide-react';
import './AuthControl.css';

export type AuthMode = 'sign-in' | 'sign-up' | null;

interface AuthControlsProps {
  redirectUrl?: string;
}

export const AuthControls = ({ redirectUrl = '/cart' }: AuthControlsProps) => {
  const { user } = useUser();
  const [authModal, setAuthModal] = useState<AuthMode>(null);

  return (
    <>
      <div className="auth-controls">
        <Show when="signed-out">
          <button
            type="button"
            className="auth-ctrl-btn secondary"
            onClick={() => setAuthModal('sign-in')}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className="auth-ctrl-btn primary"
            onClick={() => setAuthModal('sign-up')}
          >
            <UserPlus size={16} />
            <span>Sign Up</span>
          </button>
        </Show>

        <Show when="signed-in">
          <span className="auth-ctrl-greeting">
            {user?.firstName || user?.primaryEmailAddress?.emailAddress || 'Account'}
          </span>
          <UserButton />
        </Show>
      </div>

      {authModal !== null && (
        <div
          className="auth-modal-backdrop"
          onClick={() => setAuthModal(null)}
        >
          <div
            className="auth-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={authModal === 'sign-in' ? 'Sign In' : 'Sign Up'}
          >
            <div className="auth-modal-header">
              <div className="auth-modal-tabs">
                <button
                  type="button"
                  className={authModal === 'sign-in' ? 'active' : ''}
                  onClick={() => setAuthModal('sign-in')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={authModal === 'sign-up' ? 'active' : ''}
                  onClick={() => setAuthModal('sign-up')}
                >
                  Sign Up
                </button>
              </div>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setAuthModal(null)}
                aria-label="Close authentication modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="auth-modal-body">
              {authModal === 'sign-in' ? (
                <SignIn
                  routing="hash"
                  fallbackRedirectUrl={redirectUrl}
                />
              ) : (
                <SignUp
                  routing="hash"
                  fallbackRedirectUrl={redirectUrl}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};