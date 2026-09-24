import { create } from 'zustand';

interface AuthState {
  isLoggedIn: boolean;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ isLoggedIn: true });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ isLoggedIn: false });
  },
  hydrate: () => {
    set({ isLoggedIn: Boolean(localStorage.getItem('accessToken')) });
  },
}));
