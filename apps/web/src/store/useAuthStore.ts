import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  tenantId: string;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: {
    email: string;
    password: string;
    name: string;
    tenantId: string;
  }) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user }),

      setTokens: (tokens) => set({ tokens }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Gagal masuk');
          }

          const data = await response.json();
          set({
            user: data.data.user,
            tokens: {
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat masuk';
          set({
            error: message,
            isLoading: false,
            user: null,
            tokens: null,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
        });
        localStorage.removeItem('auth-storage');
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Gagal mendaftar');
          }

          const result = await response.json();
          set({
            user: result.data.user,
            tokens: {
              accessToken: result.data.accessToken,
              refreshToken: result.data.refreshToken,
            },
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat mendaftar';
          set({
            error: message,
            isLoading: false,
          });
          throw error;
        }
      },

      refreshAccessToken: async () => {
        const { tokens } = get();
        if (!tokens?.refreshToken) {
          set({ isAuthenticated: false, user: null, tokens: null });
          return;
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
          });

          if (!response.ok) {
            throw new Error('Gagal menyegarkan token');
          }

          const data = await response.json();
          set({
            tokens: {
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
            },
          });
        } catch (error) {
          set({
            isAuthenticated: false,
            user: null,
            tokens: null,
            error: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
          });
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { tokens } = get();
          if (!tokens?.accessToken) {
            throw new Error('Token tidak ditemukan');
          }

          const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokens.accessToken}`,
            },
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Gagal memperbarui profil');
          }

          const result = await response.json();
          set({
            user: result.data,
            isLoading: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Terjadi kesalahan saat memperbarui profil';
          set({
            error: message,
            isLoading: false,
          });
          throw error;
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const { tokens } = get();
          if (!tokens?.accessToken) {
            set({ isLoading: false, isAuthenticated: false });
            return;
          }

          const response = await fetch('/api/auth/me', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          });

          if (!response.ok) {
            if (response.status === 401) {
              await get().refreshAccessToken();
            } else {
              throw new Error('Gagal memverifikasi autentikasi');
            }
            set({ isLoading: false });
            return;
          }

          const data = await response.json();
          set({
            user: data.data,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            isAuthenticated: false,
            user: null,
            tokens: null,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);