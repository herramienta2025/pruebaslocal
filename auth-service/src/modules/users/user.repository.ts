import { UserRecord } from './user.model.js';
import { PasswordHasher } from '../../security/password.hasher.js';
import { Logger } from '../../utils/logger.js';

export class UserRepository {
  private static users: Map<string, UserRecord> = new Map();
  private static initialized: boolean = false;

  /**
   * Inicializa datos de prueba si el repositorio está vacío.
   */
  static async initSeed(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const demoEmail = 'usuario@centavo.app';
    const demoPassword = 'centavo123';
    const passwordHash = await PasswordHasher.hash(demoPassword);

    const demoUser: UserRecord = {
      id: 'usr_01',
      email: demoEmail.toLowerCase(),
      name: 'Usuario Demo',
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(demoUser.id, demoUser);
    Logger.info('Usuario inicial de desarrollo inicializado de forma segura', {
      userId: demoUser.id,
      email: demoUser.email
    });
  }

  static async findByEmail(email: string): Promise<UserRecord | null> {
    await this.initSeed();
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  static async findById(id: string): Promise<UserRecord | null> {
    await this.initSeed();
    return this.users.get(id) || null;
  }

  static async create(userData: { email: string; name: string; passwordHash: string }): Promise<UserRecord> {
    await this.initSeed();
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const newUser: UserRecord = {
      id,
      email: userData.email.trim().toLowerCase(),
      name: userData.name.trim(),
      passwordHash: userData.passwordHash,
      createdAt: now,
      updatedAt: now
    };

    this.users.set(newUser.id, newUser);
    return newUser;
  }

  static async count(): Promise<number> {
    await this.initSeed();
    return this.users.size;
  }
}
