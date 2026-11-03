/**
 * CivicGuard Identity & Access Management (IAM) Provider
 * Comprehensive Role-Based Access Control (RBAC) & Authentication Context
 * Supports Supabase Auth with seamless Offline & Demo Persona Fallback
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '../types';
import { SEED_USERS } from '../data/seedData';
import { isSupabaseConfigured, supabase } from '../services/supabase';

const STORAGE_KEY_AUTH_PROFILE = 'civicguard_active_profile_v1';
const STORAGE_KEY_CUSTOM_USERS = 'civicguard_custom_users_v1';

export interface SignUpParams {
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  badgeNumber?: string;
  stationId?: string;
  phone?: string;
}

export interface AuthContextType {
  user: { id: string; email: string } | null;
  session: any | null;
  profile: UserProfile | null;
  availableUsers: UserProfile[];
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;
  authModalMode: 'signin' | 'signup';
  signIn: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchPersona: (persona: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTH_PROFILE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    // Default to Detective Marcus Walker for high-stakes operational demonstration
    return SEED_USERS[0];
  });

  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_USERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deduplicate against SEED_USERS
        const combined = [...SEED_USERS];
        parsed.forEach((custom: UserProfile) => {
          if (!combined.some((u) => u.id === custom.id)) {
            combined.push(custom);
          }
        });
        return combined;
      }
    } catch {
      // ignore
    }
    return [...SEED_USERS];
  });

  const [user, setUser] = useState<{ id: string; email: string } | null>(() => {
    return profile ? { id: profile.id, email: profile.email } : null;
  });
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  const openAuthModal = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Persist profile when changed
  useEffect(() => {
    if (profile) {
      localStorage.setItem(STORAGE_KEY_AUTH_PROFILE, JSON.stringify(profile));
      setUser({ id: profile.id, email: profile.email });
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH_PROFILE);
      setUser(null);
    }
  }, [profile]);

  // Sync with Supabase Auth state if configured
  useEffect(() => {
    let mounted = true;

    async function initSupabaseAuth() {
      const client = supabase;
      if (!isSupabaseConfigured || !client) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await client.auth.getSession();
        if (error) {
          console.warn('[CivicGuard Auth] Session retrieval error:', error.message);
        }

        if (data?.session && mounted) {
          setSession(data.session);
          // Fetch corresponding profile from profiles table
          const { data: profileRow } = await client
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          if (profileRow && mounted) {
            setProfile(profileRow as UserProfile);
            setUser({ id: profileRow.id, email: profileRow.email });
          }
        }

        // Listen for auth state changes
        const { data: authListener } = client.auth.onAuthStateChange(
          async (event, currentSession) => {
            if (!mounted) return;
            setSession(currentSession);

            if (currentSession?.user) {
              const { data: profileRow } = await client
                .from('profiles')
                .select('*')
                .eq('id', currentSession.user.id)
                .single();

              if (profileRow) {
                setProfile(profileRow as UserProfile);
                setUser({ id: profileRow.id, email: profileRow.email });
              }
            } else if (event === 'SIGNED_OUT') {
              // Reset to seed citizen or null
              setProfile(null);
              setUser(null);
            }
          }
        );

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err) {
        console.warn('[CivicGuard Auth] Initialization fallback:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initSupabaseAuth();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Switch persona instantly for RBAC multi-tenant simulation
   */
  const switchPersona = useCallback((persona: UserProfile) => {
    setProfile(persona);
    setUser({ id: persona.id, email: persona.email });
  }, []);

  /**
   * Sign In handler (dual mode: Supabase + Offline Demo match)
   */
  const signIn = useCallback(
    async (email: string, password?: string): Promise<{ error: Error | null }> => {
      setLoading(true);
      try {
        if (isSupabaseConfigured && supabase && password) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (error) throw error;

          if (data.user) {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profileError) throw profileError;

            setProfile(profileData as UserProfile);
            setUser({ id: profileData.id, email: profileData.email });
            setIsAuthModalOpen(false);
            return { error: null };
          }
        }

        // Offline / Demo Match fallback
        const normalizedEmail = email.trim().toLowerCase();
        const matched = availableUsers.find(
          (u) => u.email.toLowerCase() === normalizedEmail
        );

        if (matched) {
          switchPersona(matched);
          setIsAuthModalOpen(false);
          return { error: null };
        }

        // If not found among seed personas, create a citizen profile on the fly
        const newDemoCitizen: UserProfile = {
          id: `usr-citizen-${Date.now().toString(36)}`,
          email: email.trim(),
          role: UserRole.CITIZEN,
          badge_number: null,
          full_name: email.split('@')[0].replace(/[._]/g, ' '),
          phone: null,
          station_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedUsers = [...availableUsers, newDemoCitizen];
        setAvailableUsers(updatedUsers);
        localStorage.setItem(STORAGE_KEY_CUSTOM_USERS, JSON.stringify(updatedUsers.slice(SEED_USERS.length)));
        switchPersona(newDemoCitizen);
        setIsAuthModalOpen(false);
        return { error: null };
      } catch (err: any) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      } finally {
        setLoading(false);
      }
    },
    [availableUsers, switchPersona]
  );

  /**
   * Register / Onboard new user (Citizen or Verified Law Enforcement Officer)
   */
  const signUp = useCallback(
    async (params: SignUpParams): Promise<{ error: Error | null }> => {
      setLoading(true);
      try {
        // Validation check for Officer role
        if (params.role === UserRole.OFFICER) {
          if (!params.badgeNumber || params.badgeNumber.trim().length < 3) {
            throw new Error('Officers must provide a valid municipal badge number (e.g., CG-4081).');
          }
        }

        if (isSupabaseConfigured && supabase && params.password) {
          const { data, error } = await supabase.auth.signUp({
            email: params.email.trim(),
            password: params.password,
            options: {
              data: {
                full_name: params.fullName.trim(),
                role: params.role,
                badge_number: params.badgeNumber?.trim() || null,
                station_id: params.stationId || null,
              },
            },
          });

          if (error) throw error;

          if (data.user) {
            const newProfile: UserProfile = {
              id: data.user.id,
              email: params.email.trim(),
              role: params.role,
              badge_number: params.badgeNumber?.trim() || null,
              full_name: params.fullName.trim(),
              phone: params.phone?.trim() || null,
              station_id: params.stationId || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            await supabase.from('profiles').upsert(newProfile);
            setProfile(newProfile);
            setUser({ id: newProfile.id, email: newProfile.email });
            setIsAuthModalOpen(false);
            return { error: null };
          }
        }

        // Demo / Offline Storage fallback
        const newLocalProfile: UserProfile = {
          id: `usr-${params.role}-${Date.now().toString(36)}`,
          email: params.email.trim(),
          role: params.role,
          badge_number: params.role === UserRole.OFFICER ? params.badgeNumber?.trim() || 'CG-8800' : null,
          full_name: params.fullName.trim() || 'Anonymous User',
          phone: params.phone?.trim() || null,
          station_id: params.stationId || (params.role === UserRole.OFFICER ? 'st-001-central' : null),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const nextUsers = [...availableUsers, newLocalProfile];
        setAvailableUsers(nextUsers);
        localStorage.setItem(STORAGE_KEY_CUSTOM_USERS, JSON.stringify(nextUsers.slice(SEED_USERS.length)));
        switchPersona(newLocalProfile);
        setIsAuthModalOpen(false);
        return { error: null };
      } catch (err: any) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      } finally {
        setLoading(false);
      }
    },
    [availableUsers, switchPersona]
  );

  /**
   * Sign Out handler
   */
  const signOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setProfile(null);
      setUser(null);
      localStorage.removeItem(STORAGE_KEY_AUTH_PROFILE);
    }
  }, []);

  /**
   * Update Profile Details
   */
  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>): Promise<{ error: Error | null }> => {
      if (!profile) return { error: new Error('No active user profile') };

      try {
        const updated: UserProfile = {
          ...profile,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', profile.id);
          if (error) throw error;
        }

        setProfile(updated);
        setAvailableUsers((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u))
        );
        return { error: null };
      } catch (err: any) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [profile]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        availableUsers,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        signIn,
        signUp,
        signOut,
        switchPersona,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
