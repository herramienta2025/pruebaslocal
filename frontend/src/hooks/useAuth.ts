import { useState, useEffect, useCallback } from 'react';
import { AuthCredentials, AuthSession } from '../types';
import { AuthService, RegisterData } from '../services/AuthService';

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkExistingSession() {
      const saved = AuthService.getStoredSession();
      if (saved && saved.token) {
        // Validación de sesión a través del módulo central del microservicio
        const verified = await AuthService.verifySession(saved.token);
        if (isMounted) {
          if (verified) {
            setSession(verified);
          } else {
            AuthService.logout();
            setSession(null);
          }
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    }

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: AuthCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await AuthService.login(credentials);
      setSession(newSession);
      return newSession;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al iniciar sesión';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await AuthService.register(data);
      setSession(newSession);
      return newSession;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al registrarse';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    AuthService.logout();
    setSession(null);
    setError(null);
  }, []);

  return {
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: !!session,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError: () => setError(null)
  };
}
