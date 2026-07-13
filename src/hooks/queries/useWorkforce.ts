import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

async function fetchWithAuth(url: string) {
  const { data: { session } } = await supabase.auth.getSession();
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

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export function usePermanentStaff(storeId?: string) {
  return useQuery({
    queryKey: ['workforce', 'permanent', storeId || 'all'],
    queryFn: () => fetchWithAuth(`/api/workforce/permanent${storeId ? `?storeId=${storeId}` : ''}`),
  });
}

export function useTempWorkers(storeId?: string) {
  return useQuery({
    queryKey: ['workforce', 'temp', storeId || 'all'],
    queryFn: () => fetchWithAuth(`/api/workforce/temp${storeId ? `?storeId=${storeId}` : ''}`),
  });
}

export function useAttendance(filters?: { date?: string; workerId?: string; workerType?: string }) {
  const params = new URLSearchParams(filters as any).toString();
  return useQuery({
    queryKey: ['workforce', 'attendance', filters],
    queryFn: () => fetchWithAuth(`/api/workforce/attendance${params ? `?${params}` : ''}`),
  });
}

export function useSalaryRecords(filters?: { staffId?: string; month?: number; year?: number }) {
  const params = new URLSearchParams(filters as any).toString();
  return useQuery({
    queryKey: ['workforce', 'salary', filters],
    queryFn: () => fetchWithAuth(`/api/workforce/salary${params ? `?${params}` : ''}`),
  });
}

export function useWorkerLedger(filters?: { workerId?: string; workerType?: string }) {
  const params = new URLSearchParams(filters as any).toString();
  return useQuery({
    queryKey: ['workforce', 'ledger', filters],
    queryFn: () => fetchWithAuth(`/api/workforce/ledger${params ? `?${params}` : ''}`),
  });
}

export function useOtherExpenses(filters?: { date?: string; month?: number; year?: number }) {
  const params = new URLSearchParams(filters as any).toString();
  return useQuery({
    queryKey: ['workforce', 'expenses', filters],
    queryFn: () => fetchWithAuth(`/api/expenses${params ? `?${params}` : ''}`),
  });
}
