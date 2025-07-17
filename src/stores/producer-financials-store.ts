import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

// Define a interface para os nossos dados e ações
interface FinancialState {
  financialData: any | null;
  isLoading: boolean;
  fetchFinancialData: () => Promise<void>;
}

export const useProducerFinancialsStore = create<FinancialState>((set) => ({
  financialData: null,
  isLoading: true,
  fetchFinancialData: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.functions.invoke('get-producer-dashboard-v2', {
        body: { 
          date_filter: "last_30_days",
          product_id: null
        }
      });
      if (error) throw error;
      set({ financialData: data, isLoading: false });
    } catch (error) {
      console.error("Erro ao buscar dados financeiros:", error);
      set({ isLoading: false, financialData: null });
    }
  },
}));

// Iniciar a busca de dados imediatamente após a criação do store
useProducerFinancialsStore.getState().fetchFinancialData();