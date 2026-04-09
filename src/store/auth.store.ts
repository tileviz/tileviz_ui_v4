// ============================================================
//  store/auth.store.ts — Auth state (Issue #12)
//  Session persist fix (#10): rehydrates from SecureStore on boot.
// ============================================================

import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user:    User | null;
  setUser: (u: User | null) => void;
  isReady: boolean;          // true once boot check complete
  setReady: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:     null,
  setUser:  (user)    => set({ user }),
  isReady:  false,
  setReady: (isReady) => set({ isReady }),
}));
