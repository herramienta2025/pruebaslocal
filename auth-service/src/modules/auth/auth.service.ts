import { UserRepository } from '../users/user.repository.js';
import { PasswordHasher } from '../../security/password.hasher.js';
import { SessionValidator } from '../session/session.validator.js';
import { toSafeUser, SafeUser } from '../users/user.model.js';
import { Logger } from '../../utils/logger.js';

export interface RegisterDTO {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export class AuthService {
  /**
   * Registro de un nuevo usuario en la plataforma.
   */
  static async register(dto: RegisterDTO): Promise<AuthResponse> {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;
    const name = dto.name?.trim() || email.split('@')[0] || 'Usuario';

    if (!email || !password) {
      throw new Error('El correo electrónico y la contraseña son obligatorios.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('El formato del correo electrónico no es válido.');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      Logger.warn('Intento de registro con correo ya existente', { email });
      throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
    }

    // Hash seguro con bcrypt (10 rondas de sal, justificado en AGENTS.MD y README.md)
    const passwordHash = await PasswordHasher.hash(password);

    const newUser = await UserRepository.create({
      email,
      name,
      passwordHash
    });

    const safeUser = toSafeUser(newUser);

    // Generación de token mediante el módulo central SessionValidator
    const token = SessionValidator.generateSessionToken(safeUser);

    Logger.info('Usuario registrado con éxito', {
      userId: safeUser.id,
      email: safeUser.email
    });

    return {
      user: safeUser,
      token
    };
  }

  /**
   * Inicio de sesión de un usuario existente.
   */
  static async login(dto: LoginDTO): Promise<AuthResponse> {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!email || !password) {
      throw new Error('Por favor completa todos los campos.');
    }

    const userRecord = await UserRepository.findByEmail(email);
    if (!userRecord) {
      Logger.warn('Intento de inicio de sesión fallido: usuario no encontrado', { email });
      throw new Error('Credenciales inválidas.');
    }

    // Comparación segura en tiempo constante contra hash bcrypt
    const isPasswordValid = await PasswordHasher.compare(password, userRecord.passwordHash);
    if (!isPasswordValid) {
      Logger.warn('Intento de inicio de sesión fallido: contraseña incorrecta', { email });
      throw new Error('Credenciales inválidas.');
    }

    const safeUser = toSafeUser(userRecord);

    // Emisión centralizada de token de sesión
    const token = SessionValidator.generateSessionToken(safeUser);

    Logger.info('Inicio de sesión exitoso', {
      userId: safeUser.id,
      email: safeUser.email
    });

    return {
      user: safeUser,
      token
    };
  }
}
