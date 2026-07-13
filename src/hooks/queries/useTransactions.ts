import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function useTransactions(filters: { storeId?: string; startDate?: string; endDate?: string } = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const params = new URLSearchParams();
      if (filters.storeId && filters.storeId !== 'all') params.append('storeId', filters.storeId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        // Fallback: send mock profile for demo/PIN-based auth
        const mockProfile = localStorage.getItem('mockProfile');
        if (mockProfile) {
          headers['x-mock-profile'] = mockProfile;
        }
      }

      const response = await fetch(`/api/transactions?${params.toString()}`, { headers });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch transactions');
      }
      return response.json();
    },
    retry: 1,
  });
}
