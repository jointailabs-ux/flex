import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface SaleItem {
  product_id: string;
  quantity: number;
  rate: number;
  width_ft: number;
  height_ft: number;
  charged_area_sqft: number;
}

interface SaleData {
  storeId: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  paymentMode: string;
  totalAmount: number;
  items: SaleItem[];
}

export function usePOSSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleData: SaleData) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/pos/sale', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          ...(localStorage.getItem('mockProfile') ? { 'x-mock-profile': localStorage.getItem('mockProfile') as string } : {})
        },
        body: JSON.stringify(saleData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transaction failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}
