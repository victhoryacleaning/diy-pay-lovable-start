
import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

// SUA INTERFACE ORIGINAL, PRESERVADA
interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
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

// SUA INTERFACE ORIGINAL, PRESERVADA
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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('producer');
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = session?.user ?? null;
  const isGoogleUser = user?.app_metadata?.provider === 'google';

  // Função de busca de perfil otimizada
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      console.log('Profile fetched successfully:', data);
      return data as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }, []);

  // Inicialização do auth - executado apenas uma vez
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // 1. Primeiro, configurar o listener de mudanças de auth
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log('Auth state changed:', event, currentSession?.user?.id);
            
            if (!isMounted) return;

            if (event === 'SIGNED_OUT') {
              setSession(null);
              setProfile(null);
              setLoading(false);
              navigate('/login', { replace: true });
              return;
            }

            if (currentSession) {
              setSession(currentSession);
              
              // Buscar perfil apenas se mudou de usuário
              if (currentSession.user) {
                const userProfile = await fetchUserProfile(currentSession.user.id);
                if (isMounted) {
                  setProfile(userProfile);
                  if (userProfile?.role === 'producer') {
                    setActiveView('producer');
                  } else {
                    setActiveView('student');
                  }
                }
              }
            } else {
              setSession(null);
              setProfile(null);
            }

            if (isMounted) {
              setLoading(false);
            }
          }
        );

        // 2. Depois, buscar a sessão atual
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log('Initial session:', initialSession?.user?.id);

        if (isMounted) {
          if (initialSession) {
            setSession(initialSession);
            
            if (initialSession.user) {
              const userProfile = await fetchUserProfile(initialSession.user.id);
              if (isMounted) {
                setProfile(userProfile);
                if (userProfile?.role === 'producer') {
                  setActiveView('producer');
                } else {
                  setActiveView('student');
                }
              }
            }
          }
          
          setLoading(false);
          setInitialized(true);
        }

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Sem dependências para executar apenas uma vez

  // Redirecionamento após login - separado e só executa quando não está loading
  useEffect(() => {
    if (!loading && initialized && profile && (location.pathname === '/login' || location.pathname === '/register')) {
      const roleRedirects = {
        'producer': '/dashboard',
        'admin': '/admin/dashboard',
        'user': '/members'
      };
      navigate(roleRedirects[profile.role] || '/', { replace: true });
    }
  }, [profile, loading, initialized, location.pathname, navigate]);

  // SEU CÓDIGO ORIGINAL E COMPLETO, PRESERVADO
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
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            email: email,
            full_name: fullName,
            verification_status: 'pending_submission'
          });
        if (profileError) console.error('Error creating profile:', profileError);
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao fazer logout.');
      console.error('Error signing out:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: 'Usuário não autenticado' };
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      setProfile(data as Profile);
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
    <AuthContext.Provider value={{ user, session, profile, loading, isGoogleUser, activeView, toggleView, signUp, signIn, signInWithGoogle, signOut, updateProfile }}>
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
