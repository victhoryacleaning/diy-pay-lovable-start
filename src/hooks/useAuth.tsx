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
  const navigate = useNavigate();
  const location = useLocation();

  const user = session?.user ?? null;
  const isGoogleUser = user?.app_metadata?.provider === 'google';

  // 1. CORREÇÃO: Função de busca memoizada para estabilidade
  const fetchUserProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (error) throw error;
      setProfile(data as Profile);
      if (data.role === 'producer') setActiveView('producer');
      else setActiveView('student');
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  }, []);

  // 2. CORREÇÃO: useEffect principal refatorado para ser mais robusto
  useEffect(() => {
    setLoading(true);
    // Primeiro, tenta obter a sessão atual para resolver o F5 rapidamente
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      await fetchUserProfile(initialSession?.user?.id);
      setLoading(false); // Só termina o loading inicial aqui
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        // Se um evento de login ou logout acontecer, atualiza tudo
        setLoading(true);
        setSession(newSession);
        if (event === 'SIGNED_IN' && newSession?.user) {
          if (newSession.user.app_metadata.provider === 'google') {
            const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', newSession.user.id).single();
            if (!existingProfile) {
              await supabase.from('profiles').upsert({
                id: newSession.user.id,
                email: newSession.user.email,
                full_name: newSession.user.user_metadata?.full_name || newSession.user.user_metadata?.name,
                avatar_url: newSession.user.user_metadata?.avatar_url,
                verification_status: 'pending_submission'
              });
            }
          }
          await fetchUserProfile(newSession.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          navigate('/login', { replace: true });
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, navigate]);

  // 3. CORREÇÃO: useEffect de redirecionamento pós-login permanece separado
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
    // A limpeza agora é tratada pelo onAuthStateChange
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
