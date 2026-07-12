import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * OAuthCallback
 * Mounted at /oauth/callback
 * Reads ?token=JWT&email=xxx from URL (set by backend after Google OAuth)
 * Calls loginWithToken() to set auth state, then navigates to /
 */
const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token    = searchParams.get('token');
    const email    = searchParams.get('email');
    const oauthErr = searchParams.get('error');

    if (oauthErr) {
      const messages = {
        oauth_failed:          'Google sign-in was cancelled or failed.',
        token_exchange_failed: 'Failed to exchange credentials with Google.',
        no_email:              'Google did not return an email address.',
        server_error:          'An internal server error occurred.',
      };
      setErrorMsg(messages[oauthErr] || 'An unknown OAuth error occurred.');
      setStatus('error');
      return;
    }

    if (!token || !email) {
      setErrorMsg('Missing authentication data from OAuth callback.');
      setStatus('error');
      return;
    }

    // Set auth state and enter the app
    loginWithToken(token, email);
    navigate('/', { replace: true });
  }, []);

  if (status === 'error') {
    return (
      <div className="min-h-screen w-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center space-y-4"
        >
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-red-950/30 border border-red-900/40 flex items-center justify-center">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100 font-mono">Authentication Failed</h2>
            <p className="text-xs text-zinc-400 mt-1">{errorMsg}</p>
          </div>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full bg-teal-400 hover:bg-teal-300 text-zinc-950 font-bold py-2.5 rounded-lg text-sm transition-all cursor-pointer"
          >
            Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  // Loading state while useEffect runs
  return (
    <div className="min-h-screen w-screen bg-zinc-950 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <svg className="animate-spin h-8 w-8 text-teal-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-xs font-mono text-zinc-500">Completing Google sign-in…</p>
      </motion.div>
    </div>
  );
};

export default OAuthCallback;
