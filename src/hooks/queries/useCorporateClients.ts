import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CorporateClient {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
}

export interface CorporateBranch {
  id: string;
  client_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  corporate_clients?: CorporateClient;
  currentBalance?: number;
}

export interface CorporateOrder {
  id: string;
  branch_id: string;
  invoice_number?: string | null;
  description: string;
  total_amount: number;
  status: string;
  order_date: string;
  created_at: string;
}

export interface CorporateLedger {
  id: string;
  branch_id: string;
  transaction_type: 'order' | 'payment' | 'advance';
  amount: number;
  balance: number;
  reference_id: string | null;
  invoice_number?: string | null;
  notes: string | null;
  date: string;
  created_at: string;
}

export function useCorporateClients() {
  return useQuery({
    queryKey: ['corporate_clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corporate_clients')
        .select(`
          *,
          branches:corporate_branches (
            id,
            name,
            ledger:corporate_ledger (
              id,
              amount,
              balance,
              transaction_type,
              invoice_number,
              date
            )
          )
        `)
        .order('name');

      if (error) throw error;
      
      // Calculate derived totals for the group
      return data.map(client => {
        let totalBalance = 0;
        let totalOrders = 0;
        
        const branches = client.branches || [];
        branches.forEach((branch: any) => {
          // The most recent ledger entry has the current balance
          if (branch.ledger && branch.ledger.length > 0) {
            // Assuming ledger is ordered by date descending in the DB or we find the latest
            // For now, let's just get the last balance from the array if ordered by insertion
            const latestLedger = branch.ledger[branch.ledger.length - 1];
            totalBalance += Number(latestLedger?.balance || 0);
          }
          
          // Calculate total orders
          const orders = branch.ledger?.filter((l: any) => l.transaction_type === 'order') || [];
          totalOrders += orders.reduce((sum: number, l: any) => sum + Number(l.amount), 0);
        });

        return {
          ...client,
          totalBalance,
          totalOrders,
          branchesCount: branches.length
        };
      });
    },
  });
}

export function useCorporateBranches(clientId: string | null) {
  return useQuery({
    queryKey: ['corporate_branches', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('corporate_branches')
        .select('*')
        .eq('client_id', clientId)
        .order('name');

      if (error) throw error;
      
      // Fetch latest balance for each branch
      const branchesWithBalance = await Promise.all(data.map(async (branch) => {
        const { data: ledgerData } = await supabase
          .from('corporate_ledger')
          .select('balance')
          .eq('branch_id', branch.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        return {
          ...branch,
          currentBalance: ledgerData?.[0]?.balance || 0
        };
      }));
      
      return branchesWithBalance;
    },
    enabled: !!clientId,
  });
}

export function useCorporateBranchLedger(branchId: string | null) {
  return useQuery({
    queryKey: ['corporate_ledger', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data, error } = await supabase
        .from('corporate_ledger')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });
}

export function useCorporateLedgerAnalytics(clientId: string | null) {
  return useQuery({
    queryKey: ['corporate_ledger_analytics', clientId],
    queryFn: async () => {
      let query = supabase
        .from('corporate_ledger')
        .select(`
          *,
          corporate_branches!inner(client_id)
        `)
        .order('date', { ascending: true });

      if (clientId) {
        query = query.eq('corporate_branches.client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}
