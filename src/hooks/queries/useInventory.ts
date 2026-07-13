import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

function getMockProfile(): any | null {
  try {
    const stored = localStorage.getItem('mockProfile');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

async function fetchWithAuth(url: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {};
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    // Fallback: send mock profile for demo/PIN-based auth
    const mockProfile = getMockProfile();
    if (mockProfile) {
      headers['x-mock-profile'] = JSON.stringify(mockProfile);
    }
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export function useRawMaterials() {
  return useQuery({
    queryKey: ['inventory', 'raw-materials'],
    queryFn: () => fetchWithAuth('/api/inventory/raw-materials'),
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['inventory', 'products'],
    queryFn: () => fetchWithAuth('/api/inventory/products'),
  });
}

export function useVendors() {
  return useQuery({
    queryKey: ['inventory', 'vendors'],
    queryFn: () => fetchWithAuth('/api/inventory/vendors'),
  });
}

export function useStores() {
  return useQuery({
    queryKey: ['inventory', 'stores'],
    queryFn: () => fetchWithAuth('/api/inventory/stores'),
  });
}

export function useBatches() {
  return useQuery({
    queryKey: ['inventory', 'batches'],
    queryFn: () => fetchWithAuth('/api/inventory/batches'),
  });
}

export function useLedger() {
  return useQuery({
    queryKey: ['inventory', 'ledger'],
    queryFn: () => fetchWithAuth('/api/inventory/ledger'),
  });
}

export function useStorePrices(storeIds: string[]) {
  return useQuery({
    queryKey: ['store-prices', storeIds],
    queryFn: async () => {
      if (!storeIds.length) return [];
      const { data, error } = await supabase
        .from('store_product_prices')
        .select('*')
        .in('store_id', storeIds);
      if (error) throw error;
      return data || [];
    },
    enabled: storeIds.length > 0,
  });
}

export function usePurchases() {
  return useQuery({
    queryKey: ['inventory', 'purchases'],
    queryFn: async () => {
      // Fetch purchases without join (avoids schema cache issue)
      const { data: purchases, error: purchasesError } = await supabase
        .from('purchases')
        .select('*')
        .order('purchase_date', { ascending: false });
      if (purchasesError) throw purchasesError;

      // Fetch vendors separately
      const { data: vendors, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, name');
      if (vendorsError) throw vendorsError;

      // Merge vendor name into each purchase
      const vendorMap = new Map((vendors || []).map(v => [v.id, v.name]));
      return (purchases || []).map(p => ({
        ...p,
        vendors: { name: vendorMap.get(p.vendor_id) || 'Unknown Vendor' }
      }));
    },
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['system', 'users'],
    queryFn: async () => {
      const data = await fetchWithAuth('/api/inventory/users');
      
      const defaultProfiles = [
        { id: '00000000-0000-0000-0000-000000000001', name: 'System Admin', email: 'admin@flexstock.com', role: 'owner', pin: '123456', source: 'system' },
        { id: '00000000-0000-0000-0000-000000000002', name: 'Store A Manager', email: 'managerA@flexstock.com', role: 'store_manager', store_id: '00000000-0000-0000-0000-000000000005', pin: '111111', source: 'system' },
        { id: '00000000-0000-0000-0000-000000000003', name: 'Store B Manager', email: 'managerB@flexstock.com', role: 'store_manager', store_id: '00000000-0000-0000-0000-000000000006', pin: '222222', source: 'system' }
      ];
      
      const merged = [...(data || [])];
      try {
        const mockPins = JSON.parse(localStorage.getItem('mockPins') || '{}');
        for (const p of defaultProfiles) {
          if (!merged.find((u: any) => u.id === p.id)) {
            if (p.role === 'owner' && merged.some((u: any) => u.role === 'owner')) continue;
            merged.push({ ...p, pin: mockPins[p.id] || p.pin });
          }
        }
      } catch {}
      
      return merged;
    },
  });
}

export function useVendorTransactions(vendorId: string) {
  return useQuery({
    queryKey: ['vendors', vendorId, 'transactions'],
    queryFn: () => fetchWithAuth(`/api/inventory/vendors/${vendorId}/transactions`),
    enabled: !!vendorId,
  });
}

export function useSales(storeId?: string) {
  return useQuery({
    queryKey: ['sales', storeId || 'all'],
    queryFn: async () => {
      let query = supabase.from('sales').select('*').order('created_at');
      if (storeId && storeId !== 'all') {
        query = query.eq('store_id', storeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}
export function useTopProducts(timeRange: string) {
  return useQuery({
    queryKey: ['sales', 'top-products', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          total_amount,
          finished_products (name)
        `);
      if (error) throw error;
      
      const stats: Record<string, { name: string; value: number; total: number }> = {};
      (data || []).forEach((item: any) => {
        const name = item.finished_products?.name || 'Unknown';
        if (!stats[name]) stats[name] = { name, value: 0, total: 0 };
        stats[name].value += Number(item.quantity);
        stats[name].total += Number(item.total_amount);
      });

      return Object.values(stats)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
  });
}
