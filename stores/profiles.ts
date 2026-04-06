import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PrintSettings, DEFAULT_PRINT_SETTINGS } from '@/types';

export interface Profile {
  id: string;
  name: string;
  settings: PrintSettings;
  createdAt: string;
}

interface ProfilesState {
  profiles: Profile[];
  activeProfileId: string | null;
  
  // Actions
  saveProfile: (name: string, settings: PrintSettings) => void;
  loadProfile: (id: string) => PrintSettings | null;
  deleteProfile: (id: string) => void;
  updateProfile: (id: string, settings: PrintSettings) => void;
  setActiveProfile: (id: string | null) => void;
  getActiveProfile: () => Profile | null;
}

export const useProfiles = create<ProfilesState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,

      saveProfile: (name, settings) => {
        const newProfile: Profile = {
          id: `profile-${Date.now()}`,
          name,
          settings: { ...settings },
          createdAt: new Date().toISOString(),
        };
        
        set((state) => ({
          profiles: [...state.profiles, newProfile],
          activeProfileId: newProfile.id,
        }));
      },

      loadProfile: (id) => {
        const profile = get().profiles.find((p) => p.id === id);
        if (profile) {
          set({ activeProfileId: id });
          return { ...profile.settings };
        }
        return null;
      },

      deleteProfile: (id) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },

      updateProfile: (id, settings) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, settings: { ...settings } } : p
          ),
        }));
      },

      setActiveProfile: (id) => {
        set({ activeProfileId: id });
      },

      getActiveProfile: () => {
        const { profiles, activeProfileId } = get();
        if (!activeProfileId) return null;
        return profiles.find((p) => p.id === activeProfileId) || null;
      },
    }),
    {
      name: 'proxidex-profiles',
    }
  )
);
