'use client';

import type { Admin } from '@/types/aams';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ADMIN_USER_KEY = 'admin_user';

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setAdminUser(admin: Admin): void {
  localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(admin));
}

export function getAdminUser(): Admin | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? (JSON.parse(raw) as Admin) : null;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USER_KEY);
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
}
