import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

async function mutateWithAuth(url: string, method: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    // Fallback: send mock profile for demo/PIN-based auth
    const mockProfile = localStorage.getItem('mockProfile');
    if (mockProfile) {
      headers['x-mock-profile'] = mockProfile;
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const error = await response.json();
    let errorMessage = 'Mutation failed';
    if (error.error) {
      errorMessage = typeof error.error === 'string' 
        ? error.error 
        : Array.isArray(error.error) 
          ? error.error.map((e: any) => e.message || JSON.stringify(e)).join(', ')
          : JSON.stringify(error.error);
    }
    throw new Error(errorMessage);
  }
  return response.json();
}


export function useAddPermanentStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any) => mutateWithAuth('/api/workforce/permanent', 'POST', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'permanent'] });
    },
  });
}

export function useAddTempWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any) => mutateWithAuth('/api/workforce/temp', 'POST', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'temp'] });
    },
  });
}

export function useUpdatePermanentStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => mutateWithAuth(`/api/workforce/permanent/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'permanent'] });
    },
  });
}

export function useUpdateTempWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => mutateWithAuth(`/api/workforce/temp/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'temp'] });
    },
  });
}

export function useDeletePermanentStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutateWithAuth(`/api/workforce/permanent/${id}`, 'DELETE', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'permanent'] });
    },
  });
}

export function useDeleteTempWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutateWithAuth(`/api/workforce/temp/${id}`, 'DELETE', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'temp'] });
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any) => mutateWithAuth('/api/workforce/attendance', 'POST', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'attendance'] });
    },
  });
}

export function useMarkBulkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any[]) => mutateWithAuth('/api/workforce/attendance/bulk', 'POST', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'attendance'] });
      queryClient.invalidateQueries({ queryKey: ['workforce', 'ledger'] }); // Invalidate ledger too because bulk attendance updates temp worker ledger
    },
  });
}

export function useRecordSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any) => mutateWithAuth('/api/workforce/salary', 'POST', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'salary'] });
    },
  });
}

export function useAddLedgerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: any) => mutateWithAuth('/api/workforce/ledger', 'POST', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'ledger'] });
    },
  });
}

export function useDeleteLedgerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mutateWithAuth(`/api/workforce/ledger/${id}`, 'DELETE', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce', 'ledger'] });
    },
  });
}
