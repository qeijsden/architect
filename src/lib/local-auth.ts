export type LocalAuthUser = {
  username: string;
  passwordHash?: string;
  salt?: string;
  totpEnabled: boolean;
  totpSecret?: string;
  createdAt: string;
};

export type AuthenticatorSetup = {
  manualCode: string;
  otpAuthUrl: string;
  qrDataUrl: string;
};

const USERS_KEY = 'architect_local_users';
const SESSION_KEY = 'architect_local_session_user';
const TOTP_PENDING_PREFIX = 'architect_totp_pending_';
const TOTP_PERIOD_SECONDS = 30;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const sanitizeUsername = (value: string): string => value.trim().toLowerCase();

const base32Encode = (bytes: Uint8Array): string => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (input: string): Uint8Array => {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of input.toUpperCase().replace(/=+$/g, '')) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
};

const generateSecret = (): string => base32Encode(crypto.getRandomValues(new Uint8Array(20)));

const deriveSecretFromUsername = async (username: string): Promise<string> => {
  const normalized = sanitizeUsername(username);
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`architect:${normalized}:totp`))
  );
  return base32Encode(digest.slice(0, 20));
};

const hotp = async (secret: string, counter: bigint): Promise<string> => {
  const keyBytes = base32Decode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i -= 1) {
    counterBytes[i] = Number(tmp & 255n);
    tmp >>= 8n;
  }

  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, counterBytes));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (codeInt % 1_000_000).toString().padStart(6, '0');
};

const verifyTotp = async (secret: string, token: string, skew = 1): Promise<boolean> => {
  const normalized = token.replace(/\s+/g, '');
  const currentCounter = BigInt(Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS));

  for (let i = -skew; i <= skew; i += 1) {
    const code = await hotp(secret, currentCounter + BigInt(i));
    if (code === normalized) return true;
  }
  return false;
};

const readUsers = (): LocalAuthUser[] => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as LocalAuthUser[]) : [];
  } catch {
    return [];
  }
};

const writeUsers = (users: LocalAuthUser[]): void => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const isValidUsername = (username: string): boolean => /^[a-z0-9_]{3,20}$/.test(sanitizeUsername(username));

export const createUsernameAccount = async (username: string): Promise<LocalAuthUser> => {
  const normalized = sanitizeUsername(username);
  if (!isValidUsername(normalized)) {
    throw new Error('Username must be 3-20 chars and contain only letters, numbers, or underscores');
  }

  const users = readUsers();
  if (users.some((u) => u.username === normalized)) {
    throw new Error('Username is already taken');
  }

  const nextUser: LocalAuthUser = {
    username: normalized,
    totpEnabled: false,
    createdAt: new Date().toISOString(),
  };

  users.push(nextUser);
  writeUsers(users);
  return nextUser;
};

export const setLocalSessionUser = (username: string): void => {
  localStorage.setItem(SESSION_KEY, sanitizeUsername(username));
};

export const getLocalSessionUser = (): string | null => {
  const value = localStorage.getItem(SESSION_KEY);
  return value ? sanitizeUsername(value) : null;
};

export const clearLocalSessionUser = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

export const getLocalUser = (username: string): LocalAuthUser | null => {
  const normalized = sanitizeUsername(username);
  return readUsers().find((u) => u.username === normalized) || null;
};

export const createAuthenticatorSetup = async (username: string): Promise<AuthenticatorSetup> => {
  const normalized = sanitizeUsername(username);
  const secret = (getLocalUser(normalized)?.totpSecret || await deriveSecretFromUsername(normalized) || generateSecret());
  const otpAuthUrl = `otpauth://totp/${encodeURIComponent(`Architect:${normalized}`)}?secret=${encodeURIComponent(secret)}&issuer=Architect&algorithm=SHA1&digits=6&period=${TOTP_PERIOD_SECONDS}`;
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpAuthUrl)}`;
  localStorage.setItem(`${TOTP_PENDING_PREFIX}${normalized}`, secret);

  return {
    manualCode: secret,
    otpAuthUrl,
    qrDataUrl,
  };
};

export const confirmAuthenticatorSetup = async (username: string, code: string): Promise<boolean> => {
  const normalized = sanitizeUsername(username);
  const pendingKey = `${TOTP_PENDING_PREFIX}${normalized}`;
  const secret = localStorage.getItem(pendingKey);
  if (!secret) return false;

  const ok = await verifyTotp(secret, code);
  if (!ok) return false;

  const users = readUsers();
  const idx = users.findIndex((u) => u.username === normalized);
  if (idx < 0) return false;

  users[idx] = { ...users[idx], totpEnabled: true, totpSecret: secret };
  writeUsers(users);
  localStorage.removeItem(pendingKey);
  return true;
};

export const isAuthenticatorEnabled = (username: string): boolean => {
  const user = getLocalUser(username);
  return Boolean(user?.totpEnabled && user?.totpSecret);
};

export const verifyAuthenticatorCode = async (username: string, code: string): Promise<boolean> => {
  const user = getLocalUser(username);
  if (user?.totpSecret && user?.totpEnabled) {
    return verifyTotp(user.totpSecret, code);
  }

  // New browser/device fallback: derive expected secret from username.
  const derivedSecret = await deriveSecretFromUsername(username);
  return verifyTotp(derivedSecret, code);
};

export const canSignInWithAuthenticator = (username: string): boolean => {
  return true;
};
