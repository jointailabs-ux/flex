import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

function getMockProfile(): any | null {
  try {
    const stored = localStorage.getItem('mockProfile');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

async function mutateWithAuth(url: string, method: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 
    'Content-Type': 'application/json',
  };
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    // Fallback: send mock profile for demo/PIN-based auth
    const mockProfile = getMockProfile();
    if (mockProfile) {
      headers['x-mock-profile'] = JSON.stringify(mockProfile);
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const error = await response.json();
    const errorMsg = typeof error.error === 'string' 
      ? error.error 
      : JSON.stringify(error.error);
    throw new Error(errorMsg || 'Mutation failed');
  }
  return response.json();
}

export function useAddRawMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any) => mutateWithAuth('/api/inventory/raw-materials', 'POST', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'raw-materials'] });
    },
  });
}

export function useDeleteRawMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('raw_materials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'raw-materials'] });
    },
  });
}

export function useStockIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stockInData: any) => mutateWithAuth('/api/inventory/purchase', 'POST', stockInData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'purchases'] });
    },
  });
}

export function useAddVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any) => mutateWithAuth('/api/inventory/vendors', 'POST', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'vendors'] });
    },
  });
}

export function useAddProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any) => mutateWithAuth('/api/inventory/products', 'POST', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] });
    },
  });
}

export function useSaveStorePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ storeId, productId, sellingPrice, userId }: { storeId: string, productId: string, sellingPrice: number, userId: string }) => {
      const { data, error } = await supabase
        .from('store_product_prices')
        .upsert({
          store_id: storeId,
          finished_product_id: productId,
          selling_price: sellingPrice,
          updated_by: userId
        }, { onConflict: 'store_id,finished_product_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-prices'] });
    },
  });
}

export function useAddStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any) => mutateWithAuth('/api/inventory/stores', 'POST', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stores'] });
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...formData }: any) => mutateWithAuth(`/api/inventory/stores/${id}`, 'PUT', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stores'] });
    },
  });
}

export function useUpdateStorePin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, pin }: { id: string, pin: string }) => mutateWithAuth(`/api/inventory/stores/${id}/pin`, 'PUT', { pin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stores'] });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutateWithAuth(`/api/inventory/stores/${id}`, 'DELETE', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stores'] });
    },
  });
}

export function useAddUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userData: any) => mutateWithAuth('/api/users', 'POST', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, url }: { id: string, data: any, url?: string }) => mutateWithAuth(url || `/api/users/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutateWithAuth(`/api/users/${id}`, 'DELETE', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system', 'users'] });
    },
  });
}

export function useAddVendorPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any) => mutateWithAuth('/api/inventory/vendor-payments', 'POST', formData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors', variables.vendor_id, 'transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
