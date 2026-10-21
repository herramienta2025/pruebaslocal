import { AuthCredentials, AuthSession } from '../types';

const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001/api/auth';
const STORAGE_KEY = 'centavo_auth_session';

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export class AuthService {
  static async login(credentials: AuthCredentials): Promise<AuthSession> {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const session: AuthSession = await response.json();
        this.saveSession(session);
        return session;
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Credenciales inválidas.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== 'Failed to fetch' && !err.message.includes('NetworkError')) {
        throw err;
      }
      console.warn('Auth microservice not reachable, using local mock validation.');
    }

    // Mock funcional para desarrollo offline
    if (!credentials.email || !credentials.password) {
      throw new Error('Por favor completa todos los campos.');
    }

    if (credentials.password.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }

    const mockSession: AuthSession = {
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'usr_01',
        email: credentials.email,
        name: credentials.email.split('@')[0] || 'Usuario'
      }
    };

    this.saveSession(mockSession);
    return mockSession;
  }

  static async register(data: RegisterData): Promise<AuthSession> {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const session: AuthSession = await response.json();
        this.saveSession(session);
        return session;
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al registrar usuario.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message !== 'Failed to fetch' && !err.message.includes('NetworkError')) {
        throw err;
      }
      console.warn('Auth microservice not reachable, using local mock registration.');
    }

    // Mock funcional de registro para desarrollo offline
    if (!data.email || !data.password) {
      throw new Error('El correo y la contraseña son obligatorios.');
    }

    const mockSession: AuthSession = {
      token: 'mock-jwt-token-' + Date.now(),
      user: {
        id: 'usr_' + Date.now(),
        email: data.email,
        name: data.name || data.email.split('@')[0] || 'Usuario'
      }
    };

    this.saveSession(mockSession);
    return mockSession;
  }

  static async verifySession(token: string): Promise<AuthSession | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.user) {
          const updatedSession: AuthSession = {
            token,
            user: data.user
          };
          this.saveSession(updatedSession);
          return updatedSession;
        }
      }
      return null;
    } catch {
      // Si el microservicio no está disponible, mantenemos la sesión guardada localmente
      return this.getStoredSession();
    }
  }

  static logout(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  static getStoredSession(): AuthSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }

  private static saveSession(session: AuthSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}
