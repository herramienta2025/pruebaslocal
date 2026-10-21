import bcrypt from 'bcryptjs';

/**
 * Módulo Central de Hashing de Contraseñas
 * 
 * ============================================================================
 * JUSTIFICACIÓN EXPLÍCITA DE LA LÓGICA DE HASHING (Requerida por AGENTS.MD):
 * ============================================================================
 * 1. Algoritmo: bcrypt
 *    - Incorpora de forma nativa la generación de sal criptográfica aleatoria
 *      por cada contraseña, neutralizando ataques basados en tablas precalculadas (rainbow tables).
 *    - Posee un coste computacional adaptativo (key derivation) que ralentiza de manera efectiva
 *      los ataques masivos de fuerza bruta y cracking por hardware especializado (GPU/ASIC).
 * 
 * 2. Factor de coste (Salt Rounds): 10 rondas
 *    - 10 rondas representan 2^10 iteraciones, logrando un balance óptimo de seguridad industrial
 *      frente a fuerza bruta mientras mantiene la latencia por request en ~60-90ms en Node.js,
 *      garantizando una experiencia fluida al usuario final.
 * 
 * 3. Prevención de Timing Attacks:
 *    - Toda comparación de credenciales utiliza `bcrypt.compare`, que realiza comparaciones
 *      en tiempo constante para contraseñas de longitud similar, previniendo ataques de canal lateral.
 * ============================================================================
 */
const SALT_ROUNDS = 10;

export class PasswordHasher {
  /**
   * Genera un hash seguro para la contraseña en texto plano utilizando bcrypt con 10 rondas de sal.
   */
  static async hash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compara una contraseña candidata en texto plano contra el hash almacenado.
   * La contraseña en texto plano NUNCA se persiste ni se retorna.
   */
  static async compare(candidatePassword: string, hash: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, hash);
  }
}
