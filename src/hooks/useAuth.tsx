import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null; // ADICIONADO
  cpf_cnpj: string | null;
  phone: string | null;
  instagram_handle: string | null;
  role: 'user' | 'producer' | 'admin';
  iugu_customer_id: string | null;
  created_at: string;
  updated_at: string;
  verification_status: 'pending_submission' | 'pending_approval' | 'approved' | 'rejected';
  person_type: 'PF' | 'PJ' | null;
  cpf: string | null;
  birth_date: string | null;
  cnpj: string | null;
  company_name: string | null;
  trading_name: string | null;
  opening_date: string | null;
  company_phone: string | null;
  responsible_name: string | null;
  responsible_cpf: string | null;
  responsible_birth_date: string | null;
  document_front_url: string | null;
  document_back_url: string | null;
  selfie_url: string | null;
  social_contract_url: string | null;
}

type ActiveView = 'producer' | 'student';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isGoogleUser: boolean;
  activeView: ActiveView;
  toggleView: () => void;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('producer');
  const navigate = useNavigate();
  const location = useLocation();

  const isGoogleUser = user?.app_metadata?.provider === 'google';

  // Efeito para redirecionar o usuário após o login, se necessário
  useEffect(() => {
    if (!loading && profile && (location.pathname === '/login' || location.pathname === '/register')) {
      const roleRedirects = {
        'producer': '/dashboard',
        'admin': '/admin/dashboard',
        'user': '/members'
      };
      navigate(roleRedirects[profile.role] || '/', { replace: true });
    }
  }, [profile, loading, location, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          if (event === 'SIGNED_IN' && session.user.app_metadata.provider === 'google') {
            const googleFullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
            const googleAvatarUrl = session.user.user_metadata?.avatar_url;
            const googleEmail = session.user.email;

            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .single();

            if (!existingProfile && googleEmail) {
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  id: session.user.id,
                  email: googleEmail,
                  full_name: googleFullName,
                  avatar_url: googleAvatarUrl, // MODIFICADO
                  verification_status: 'pending_submission'
                });
              
              if (profileError) {
                console.error('Error creating Google profile:', profileError);
              }
            }
          }
          
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      const profileData: Profile = {
        ...data,
        role: data.role as 'user' | 'producer' | 'admin',
        verification_status: data.verification_status as 'pending_submission' | 'pending_approval' | 'approved' | 'rejected',
        person_type: data.person_type as 'PF' | 'PJ' | null
      };

      setProfile(profileData);
      
      if (profileData.role === 'producer') {
        setActiveView('producer');
      } else {
        setActiveView('student');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: fullName, email: email }
        }
      });
      if (error) return { error: error.message };
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          verification_status: 'pending_submission'
        });
      }
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` }
      });
      if (error) return { error: error.message };
      return {};
    } catch (error: any) {
      console.error('Google sign in error:', error);
      return { error: error.message };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      navigate('/login', { replace: true });
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      // MODIFICADO
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setProfile(data as Profile); // Atualiza o estado local imediatamente
      return {};
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const toggleView = () => {
    if (profile?.role === 'producer') {
      setActiveView(prevView => prevView === 'producer' ? 'student' : 'producer');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      isGoogleUser,
      activeView,
      toggleView,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
