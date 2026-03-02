import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  company_id: string | null;
  full_name: string | null;
  email: string | null;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: string | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use refs to track initialization and prevent duplicate processing
  const initializedRef = useRef(false);
  const fetchingRoleRef = useRef(false);
  // Track current session token to prevent unnecessary updates
  const currentTokenRef = useRef<string | null>(null);

  const fetchUserRole = useCallback(async (userId: string) => {
    // Prevent duplicate role fetches
    if (fetchingRoleRef.current) return;
    fetchingRoleRef.current = true;
    
    try {
      // Fetch role and profile in parallel
      const [roleResult, profileResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('id, company_id, full_name, email').eq('id', userId).maybeSingle(),
      ]);

      if (roleResult.error) {
        console.error('Error fetching user role:', roleResult.error);
        setUserRole(null);
      } else {
        setUserRole(roleResult.data?.role || null);
      }

      if (profileResult.data) {
        setProfile(profileResult.data as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
      setProfile(null);
    } finally {
      setLoading(false);
      fetchingRoleRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Only process after initialization
        if (!initializedRef.current) return;
        
        // Skip TOKEN_REFRESHED if session hasn't actually changed
        if (event === 'TOKEN_REFRESHED') {
          const newToken = currentSession?.access_token ?? null;
          if (newToken === currentTokenRef.current) {
            return; // No real change, skip update
          }
          currentTokenRef.current = newToken;
        }
        
        // Only update on actual auth changes
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          
          if (currentSession?.user) {
            // Defer Supabase call to prevent deadlock
            setTimeout(() => {
              fetchUserRole(currentSession.user.id);
            }, 0);
          } else {
            setUserRole(null);
            setLoading(false);
          }
        }
      }
    );

    // THEN check for existing session (initial load)
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      // Store initial token
      currentTokenRef.current = existingSession?.access_token ?? null;
      // Mark as initialized before setting state
      initializedRef.current = true;
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        fetchUserRole(existingSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole]);

  // signIn apenas faz autenticação - redirecionamento é feito via SPA no Login.tsx
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserRole(null);
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    session,
    userRole,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }), [user, session, userRole, profile, loading, signIn, signUp, signOut, resetPassword, updatePassword]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
