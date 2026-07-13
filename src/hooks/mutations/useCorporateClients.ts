import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useAddCorporateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; contact_person?: string; phone?: string; email?: string }) => {
      const { data: result, error } = await supabase
        .from('corporate_clients')
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error('Add Client Error:', error);
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate_clients'] });
    },
  });
}

export function useAddCorporateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { client_id: string; name: string; contact_person?: string; phone?: string; email?: string; address?: string }) => {
      const { data: result, error } = await supabase
        .from('corporate_branches')
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error('Add Branch Error:', error);
        throw error;
      }
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['corporate_branches', variables.client_id] });
      queryClient.invalidateQueries({ queryKey: ['corporate_clients'] });
    },
  });
}

export function useAddCorporateOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { branch_id: string; description: string; total_amount: number; order_date: string; invoice_number?: string }) => {
      // 1. Get current balance
      const { data: latestLedger, error: ledgerFetchError } = await supabase
        .from('corporate_ledger')
        .select('balance')
        .eq('branch_id', data.branch_id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (ledgerFetchError) {
        console.error('Failed to fetch latest ledger:', ledgerFetchError);
      }

      const currentBalance = latestLedger?.[0]?.balance || 0;
      
      // Order increases the amount they owe, so balance goes down (negative means they owe us)
      const newBalance = Number(currentBalance) - Number(data.total_amount);

      // 2. Insert Order
      const { data: order, error: orderError } = await supabase
        .from('corporate_orders')
        .insert([{
          branch_id: data.branch_id,
          invoice_number: data.invoice_number || null,
          description: data.description,
          total_amount: data.total_amount,
          order_date: data.order_date
        }])
        .select()
        .single();

      if (orderError) {
        console.error('Insert Order Error:', orderError);
        throw orderError;
      }

      // 3. Insert Ledger Entry
      const { error: ledgerError } = await supabase
        .from('corporate_ledger')
        .insert([{
          branch_id: data.branch_id,
          transaction_type: 'order',
          amount: data.total_amount,
          balance: newBalance,
          reference_id: order.id,
          invoice_number: data.invoice_number || null,
          notes: data.description,
          date: data.order_date
        }]);

      if (ledgerError) {
        console.error('Insert Ledger Error:', ledgerError);
        throw ledgerError;
      }

      return order;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['corporate_ledger', variables.branch_id] });
      queryClient.invalidateQueries({ queryKey: ['corporate_branches'] });
      queryClient.invalidateQueries({ queryKey: ['corporate_clients'] });
    },
  });
}

export function useRecordCorporatePayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { branch_id: string; amount: number; transaction_type: 'payment' | 'advance'; notes?: string; date: string }) => {
      // 1. Get current balance
      const { data: latestLedger, error: ledgerFetchError } = await supabase
        .from('corporate_ledger')
        .select('balance')
        .eq('branch_id', data.branch_id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (ledgerFetchError) {
        console.error('Failed to fetch latest ledger:', ledgerFetchError);
      }

      const currentBalance = latestLedger?.[0]?.balance || 0;
      
      // Payment increases balance (closer to 0 or positive for advance)
      const newBalance = Number(currentBalance) + Number(data.amount);

      // 2. Insert Ledger Entry
      const { data: ledger, error: ledgerError } = await supabase
        .from('corporate_ledger')
        .insert([{
          branch_id: data.branch_id,
          transaction_type: data.transaction_type,
          amount: data.amount,
          balance: newBalance,
          notes: data.notes,
          date: data.date
        }])
        .select()
        .single();

      if (ledgerError) {
        console.error('Record Payment Error:', ledgerError);
        throw ledgerError;
      }

      return ledger;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['corporate_ledger', variables.branch_id] });
      queryClient.invalidateQueries({ queryKey: ['corporate_branches'] });
      queryClient.invalidateQueries({ queryKey: ['corporate_clients'] });
    },
  });
}

export function useUpdateCorporateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; contact_person?: string; phone?: string; email?: string } }) => {
      const { data: result, error } = await supabase
        .from('corporate_clients')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update Client Error:', error);
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate_clients'] });
    },
  });
}

export function useDeleteCorporateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('corporate_clients')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete Client Error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate_clients'] });
      queryClient.invalidateQueries({ queryKey: ['corporate_branches'] });
    },
  });
}

export function useUpdateCorporateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; contact_person?: string; phone?: string; email?: string; address?: string } }) => {
      const { data: result, error } = await supabase
        .from('corporate_branches')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update Branch Error:', error);
        throw error;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate_branches'] });
    },
  });
}

export function useDeleteCorporateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('corporate_branches')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete Branch Error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate_branches'] });
    },
  });
}

export function useUpdateCorporateLedgerEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      branch_id, 
      data,
      reference_id
    }: { 
      id: string; 
      branch_id: string; 
      data: { date: string; invoice_number?: string };
      reference_id?: string | null;
    }) => {
      // 1. Update the ledger entry
      const { error: ledgerError } = await supabase
        .from('corporate_ledger')
        .update(data)
        .eq('id', id);

      if (ledgerError) throw ledgerError;

      // 2. If it's tied to an order, update the order as well
      if (reference_id) {
        const { error: orderError } = await supabase
          .from('corporate_orders')
          .update({
            order_date: data.date,
            invoice_number: data.invoice_number
          })
          .eq('id', reference_id);

        if (orderError) throw orderError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['corporate_ledger', variables.branch_id] });
      queryClient.invalidateQueries({ queryKey: ['corporate_branches'] });
    },
  });
}
