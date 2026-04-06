const GOOGLE_USER_KEY = 'architect_google_user';

export interface GoogleUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
}

export function storeGoogleUser(user: GoogleUser): void {
  localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(user));
}

export function getStoredGoogleUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(GOOGLE_USER_KEY);
    return raw ? (JSON.parse(raw) as GoogleUser) : null;
  } catch {
    return null;
  }
}

export function clearStoredGoogleUser(): void {
  localStorage.removeItem(GOOGLE_USER_KEY);
}

export function decodeGoogleCredential(credential: string): GoogleUser {
  // Google credential is a JWT; we only need the public payload (not signature)
  const parts = credential.split('.');
  if (parts.length < 2) throw new Error('Invalid Google credential');
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  if (!payload?.sub) throw new Error('Google credential missing sub');
  return {
    sub: payload.sub as string,
    email: (payload.email as string) || '',
    name: (payload.name as string) || payload.email || 'Player',
    picture: (payload.picture as string) || '',
  };
}

export function revokeGoogleSession(email: string): void {
  const g = (window as typeof window & { google?: { accounts?: { id?: { revoke?: (email: string, done: () => void) => void } } } }).google;
  g?.accounts?.id?.revoke?.(email, () => {});
}
