import React, { useState } from 'react';
import { Coins, Lock, Mail, ArrowRight, AlertCircle, Loader2, User as UserIcon } from 'lucide-react';
import { AuthCredentials } from '../../types';
import { RegisterData } from '../../services/AuthService';

interface LoginScreenProps {
  onLogin: (credentials: AuthCredentials) => Promise<unknown>;
  onRegister?: (data: RegisterData) => Promise<unknown>;
  isLoading: boolean;
  error: string | null;
  onClearError: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onRegister,
  isLoading,
  error,
  onClearError
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localValidation, setLocalValidation] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidation(null);
    onClearError();

    if (!email.trim() || !password.trim()) {
      setLocalValidation('Por favor ingresa tu correo y contraseña.');
      return;
    }

    if (isRegisterMode && password.length < 6) {
      setLocalValidation('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      if (isRegisterMode && onRegister) {
        await onRegister({ email, password, name });
      } else {
        await onLogin({ email, password });
      }
    } catch {
      // Error handled in hook/props
    }
  };

  const handleDemoFill = () => {
    setEmail('usuario@centavo.app');
    setPassword('centavo123');
    setLocalValidation(null);
    onClearError();
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setLocalValidation(null);
    onClearError();
  };

  const activeError = localValidation || error;

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-badge">
            <Coins size={32} className="icon-emerald" />
          </div>
          <h1 className="login-title">Centavo</h1>
          <p className="login-subtitle">
            {isRegisterMode
              ? 'Crea tu cuenta para comenzar a gestionar tus finanzas personales.'
              : 'Control de gastos, presupuestos y alertas financieras tempranas.'}
          </p>
        </div>

        {activeError && (
          <div className="alert-error" role="alert">
            <AlertCircle size={18} />
            <span>{activeError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {isRegisterMode && (
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Nombre completo
              </label>
              <div className="input-wrapper">
                <UserIcon className="input-icon" size={18} />
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  placeholder="Tu Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Correo electrónico
            </label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
            </div>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>{isRegisterMode ? 'Creando cuenta...' : 'Iniciando sesión...'}</span>
              </>
            ) : (
              <>
                <span>{isRegisterMode ? 'Crear mi cuenta en Centavo' : 'Ingresar al Dashboard'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="demo-text">
            {isRegisterMode ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta aún?'}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="btn-link"
              style={{ fontWeight: 600 }}
            >
              {isRegisterMode ? 'Inicia sesión' : 'Regístrate aquí'}
            </button>
          </p>

          {!isRegisterMode && (
            <p className="demo-text" style={{ marginTop: '0.5rem' }}>
              ¿Probando el scaffold?{' '}
              <button
                type="button"
                onClick={handleDemoFill}
                className="btn-link"
              >
                Usar credenciales de prueba
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
