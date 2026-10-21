/**
 * Lista de claves que contienen credenciales, tokens o datos sensibles
 * que NUNCA deben mostrarse en texto plano en logs.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'contrasena',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'jwtsecret',
  'credentials',
  'creditcard'
]);

/**
 * Sanitiza recursivamente cualquier objeto, valor o mensaje para eliminar
 * credenciales o tokens en texto plano antes de enviarlo al log.
 */
export function sanitizeData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Si la cadena luce como un Bearer token o JWT (ej. eyJhbGciOi...)
    if (/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/i.test(data)) {
      return data.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, 'Bearer [REDACTED_TOKEN]');
    }
    if (/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+$/.test(data)) {
      return '[REDACTED_TOKEN]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitizeData(value);
      }
    }
    return sanitizedObj;
  }

  return data;
}
