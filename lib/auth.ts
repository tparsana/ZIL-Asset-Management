const AUTH_EMAIL = process.env.BASIC_AUTH_EMAIL?.trim();
const AUTH_NAME = process.env.BASIC_AUTH_NAME?.trim();
const AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD;
const AUTH_SECRET = process.env.AUTH_SECRET?.trim();

export const AUTH_COOKIE_NAME = 'zil_assets_session';
export const AUTH_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function isAuthConfigured() {
  return Boolean(AUTH_EMAIL && AUTH_PASSWORD && AUTH_SECRET);
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signValue(value: string) {
  if (!AUTH_SECRET) return null;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export function getConfiguredAuthEmail() {
  return AUTH_EMAIL ?? null;
}

function humanizeAuthEmail(email: string) {
  const localPart = email.split('@')[0]?.trim();
  if (!localPart) return 'Authenticated User';

  const words = localPart
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return words.join(' ') || 'Authenticated User';
}

export function getConfiguredAuthName(email?: string | null) {
  if (AUTH_NAME) return AUTH_NAME;
  if (email) return humanizeAuthEmail(email);
  if (AUTH_EMAIL) return humanizeAuthEmail(AUTH_EMAIL);
  return 'Authenticated User';
}

export async function isValidLogin(email: string, password: string) {
  if (!AUTH_EMAIL || !AUTH_PASSWORD) return false;
  return email.trim().toLowerCase() === AUTH_EMAIL.toLowerCase() && password === AUTH_PASSWORD;
}

export async function createSessionToken(email: string) {
  if (!AUTH_EMAIL) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const signature = await signValue(normalizedEmail);
  if (!signature) return null;
  return `${normalizedEmail}|${signature}`;
}

export async function verifySessionToken(token?: string | null) {
  if (!AUTH_EMAIL || !AUTH_SECRET) return null;
  if (!token) return null;

  const [email, signature] = token.split('|');
  if (!email || !signature) return null;
  if (email !== AUTH_EMAIL.toLowerCase()) return null;

  const expectedSignature = await signValue(email);
  if (!expectedSignature) return null;
  if (signature !== expectedSignature) return null;

  return { email };
}
