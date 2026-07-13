import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  FileText, 
  Download, 
  Filter, 
  Plus, 
  UserPlus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  History,
  Briefcase,
  Users,
  ShieldCheck,
  Settings2,
  Trash2,
  Edit,
  IndianRupee,
  CalendarDays,
  Zap,
  TrendingUp,
  TrendingDown,
  LayoutDashboard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { 
  usePermanentStaff, 
  useTempWorkers, 
  useAttendance, 
  useSalaryRecords, 
  useWorkerLedger 
} from '../../hooks/queries/useWorkforce';
import { 
  useRecordSalary, 
  useAddLedgerEntry,
  useDeleteLedgerEntry,
  useAddPermanentStaff,
  useAddTempWorker,
  useUpdatePermanentStaff,
  useUpdateTempWorker,
  useDeletePermanentStaff,
  useDeleteTempWorker
} from '../../hooks/mutations/useWorkforce';
import { useStores } from '../../hooks/queries/useInventory';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "../../components/ui/dialog";

export default function SalaryManagement() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('payroll');
  const [personnelType, setPersonnelType] = useState<'permanent' | 'temporary'>('permanent');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStore, setSelectedStore] = useState('all');
  const [payrollSearch, setPayrollSearch] = useState('');
  const [tempSearch, setTempSearch] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');

  // Dialog states
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<any>(null);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [ledgerTarget, setLedgerTarget] = useState<{id: string, type: 'permanent' | 'temporary', name: string} | null>(null);
  const [newWorkerPin, setNewWorkerPin] = useState<string | null>(null);
  const [voidingEntryId, setVoidingEntryId] = useState<string | null>(null);

  // Data fetching
  const { data: stores = [] } = useStores();
  const { data: staff = [] } = usePermanentStaff(selectedStore);
  const { data: tempWorkers = [] } = useTempWorkers(selectedStore);
  const { data: attendance = [] } = useAttendance();
  const { data: existingSalaries = [] } = useSalaryRecords({ month: selectedMonth, year: selectedYear });
  
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const { data: lastMonthSalaries = [] } = useSalaryRecords({ month: prevMonth, year: prevYear });

  const { data: allLedgerEntries = [] } = useWorkerLedger();

  // Mutations
  const recordSalaryMutation = useRecordSalary();
  const addLedgerEntryMutation = useAddLedgerEntry();
  const deleteLedgerEntryMutation = useDeleteLedgerEntry();
  const addPermanentMutation = useAddPermanentStaff();
  const addTempMutation = useAddTempWorker();
  const updatePermanentMutation = useUpdatePermanentStaff();
  const updateTempMutation = useUpdateTempWorker();
  const deletePermanentMutation = useDeletePermanentStaff();
  const deleteTempMutation = useDeleteTempWorker();

  // Form states
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    role: '',
    basic_salary: '' as any,
    skill: '',
    daily_rate: '' as any,
    store_id: '',
    pin: '',
    joined_at: new Date().toISOString().split('T')[0]
  });

  const [ledgerFormData, setLedgerFormData] = useState({
    transaction_type: 'bonus_added', // Default for perm
    amount: '' as any,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Derived data
  const payrollData = useMemo(() => {
    return staff.filter(s => s.is_active).map(member => {
      const existing = existingSalaries.find((s: any) => s.staff_id === member.id);
      const prevExisting = lastMonthSalaries.find((s: any) => s.staff_id === member.id);
      
      const targetDate = new Date(selectedYear, selectedMonth, 0);
      // Format as YYYY-MM-DD
      const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
      
      const prevTargetDate = new Date(prevYear, prevMonth, 0);
      const prevTargetDateStr = `${prevTargetDate.getFullYear()}-${String(prevTargetDate.getMonth() + 1).padStart(2, '0')}-${String(prevTargetDate.getDate()).padStart(2, '0')}`;

      // Current Month OT
      const memberAttendance = attendance.filter((a: any) => 
        a.worker_id === member.id && 
        a.worker_type === 'permanent' &&
        new Date(a.date).getMonth() + 1 === selectedMonth &&
        new Date(a.date).getFullYear() === selectedYear
      );
      const totalOTHours = memberAttendance.reduce((sum: number, a: any) => sum + Number(a.overtime_hours || 0), 0);
      const otRate = (member.basic_salary / 30 / 8) * 1.5;
      const otAmount = totalOTHours * otRate;

      // Previous Month OT
      const prevMemberAttendance = attendance.filter((a: any) => 
        a.worker_id === member.id && 
        a.worker_type === 'permanent' &&
        new Date(a.date).getMonth() + 1 === prevMonth &&
        new Date(a.date).getFullYear() === prevYear
      );
      const prevTotalOTHours = prevMemberAttendance.reduce((sum: number, a: any) => sum + Number(a.overtime_hours || 0), 0);
      const prevOtAmount = prevTotalOTHours * otRate;

      // Calculate Advances/Bonus from ledger up to the selected month's end
      const memberLedger = allLedgerEntries.filter((e: any) => 
        e.worker_id === member.id && 
        e.worker_type === 'permanent' &&
        e.date <= targetDateStr
      );
      const balance = memberLedger.reduce((sum: number, e: any) => {
        if (['advance_given', 'payment_made'].includes(e.transaction_type)) return sum - Number(e.amount);
        if (['bonus_added', 'advance_recovered', 'wage_earned'].includes(e.transaction_type)) return sum + Number(e.amount);
        return sum;
      }, 0);

      const netPayable = member.basic_salary + otAmount + (balance > 0 ? balance : 0) - (balance < 0 ? Math.abs(balance) : 0);

      // Calculate Prev Month Advances/Bonus
      const prevMemberLedger = allLedgerEntries.filter((e: any) => 
        e.worker_id === member.id && 
        e.worker_type === 'permanent' &&
        e.date <= prevTargetDateStr
      );
      const prevBalance = prevMemberLedger.reduce((sum: number, e: any) => {
        if (['advance_given', 'payment_made'].includes(e.transaction_type)) return sum - Number(e.amount);
        if (['bonus_added', 'advance_recovered', 'wage_earned'].includes(e.transaction_type)) return sum + Number(e.amount);
        return sum;
      }, 0);

      const prevNetPayable = member.basic_salary + prevOtAmount + (prevBalance > 0 ? prevBalance : 0) - (prevBalance < 0 ? Math.abs(prevBalance) : 0);

      return {
        ...member,
        existing,
        prevExisting,
        otAmount,
        otHours: totalOTHours,
        ledgerBalance: balance,
        netPayable,
        prevNetPayable
      };
    });
  }, [staff, attendance, existingSalaries, lastMonthSalaries, allLedgerEntries, selectedMonth, selectedYear, prevMonth, prevYear]);

  // Comprehensive Summary Stats
  const stats = useMemo(() => {
    const totalBasic = staff.filter(s => s.is_active).reduce((s, m) => s + (Number(m.basic_salary) || 0), 0);
    const totalNetPayable = payrollData.reduce((s, m) => s + (m.netPayable || 0), 0);
    const totalPaid = payrollData
      .filter(m => !!m.existing)
      .reduce((s, m) => s + (Number(m.existing.net_payable) || 0), 0);
    const totalDue = payrollData
      .filter(m => !m.existing)
      .reduce((s, m) => s + (m.netPayable || 0), 0);
      
    return {
      totalBasic,
      totalNetPayable,
      totalPaid,
      totalDue,
      totalPersonnel: staff.length + tempWorkers.length
    };
  }, [staff, payrollData, tempWorkers]);

  const tempLedgerData = useMemo(() => {
    return tempWorkers.map(worker => {
      const workerLedger = allLedgerEntries
        .filter((e: any) => e.worker_id === worker.id && e.worker_type === 'temporary')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
      const totalEarned = workerLedger
        .filter((e: any) => e.transaction_type === 'wage_earned')
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      const totalAdvances = workerLedger
        .filter((e: any) => e.transaction_type === 'advance_given')
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        
      const totalPaidOut = workerLedger
        .filter((e: any) => e.transaction_type === 'payment_made')
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      const alreadyPaid = totalAdvances + totalPaidOut;
      const balance = totalEarned - alreadyPaid;

      const monthlyPaid = workerLedger
        .filter((e: any) => {
          const entryDate = new Date(e.date);
          return (e.transaction_type === 'payment_made' || e.transaction_type === 'advance_given') &&
                 (entryDate.getMonth() + 1 === selectedMonth) &&
                 (entryDate.getFullYear() === selectedYear);
        })
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      const monthlyPaidOut = workerLedger
        .filter((e: any) => {
          const entryDate = new Date(e.date);
          return e.transaction_type === 'payment_made' &&
                 (entryDate.getMonth() + 1 === selectedMonth) &&
                 (entryDate.getFullYear() === selectedYear);
        })
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

      const monthlyAdvances = workerLedger
        .filter((e: any) => {
          const entryDate = new Date(e.date);
          return e.transaction_type === 'advance_given' &&
                 (entryDate.getMonth() + 1 === selectedMonth) &&
                 (entryDate.getFullYear() === selectedYear);
        })
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0);
        
      const recentPayment = workerLedger.find((e: any) => e.transaction_type === 'payment_made' || e.transaction_type === 'advance_given');

      return {
        ...worker,
        totalEarned,
        totalAdvances,
        totalPaidOut,
        alreadyPaid,
        balance,
        monthlyPaid,
        monthlyPaidOut,
        monthlyAdvances,
        recentPayment,
        history: workerLedger
      };
    });
  }, [tempWorkers, allLedgerEntries, selectedMonth, selectedYear]);

  // Handlers
  const handleOpenStaffModal = (worker: any = null, type: 'permanent' | 'temporary' = 'permanent') => {
    setPersonnelType(type);
    if (worker) {
      setEditingStaff({ id: worker.id, type });
      setStaffFormData({
        name: worker.name,
        role: worker.role || '',
        basic_salary: worker.basic_salary?.toString() || '',
        skill: worker.skill || '',
        daily_rate: worker.daily_rate?.toString() || '',
        store_id: worker.store_id || '',
        pin: worker.pin || '',
        joined_at: worker.joined_at || new Date().toISOString().split('T')[0]
      });
    } else {
      setEditingStaff(null);
      setStaffFormData({
        name: '',
        role: '',
        basic_salary: '',
        skill: '',
        daily_rate: '',
        store_id: selectedStore !== 'all' ? selectedStore : '',
        pin: Math.floor(100000 + Math.random() * 900000).toString(),
        joined_at: new Date().toISOString().split('T')[0]
      });
    }
    setIsStaffModalOpen(true);
  };

  const handleDeleteStaff = async (id: string, type: 'permanent' | 'temporary', name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

    try {
      if (type === 'permanent') {
        await deletePermanentMutation.mutateAsync(id);
      } else {
        await deleteTempMutation.mutateAsync(id);
      }
      toast.success(`${name} deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure store_id is null if it's an empty string to avoid DB UUID errors
    const safeStoreId = staffFormData.store_id === '' ? null : staffFormData.store_id;
    
    const payload = personnelType === 'permanent' 
      ? { 
          name: staffFormData.name, 
          role: staffFormData.role, 
          basic_salary: parseFloat(staffFormData.basic_salary) || 0, 
          store_id: safeStoreId, 
          pin: staffFormData.pin || undefined,
          joined_at: staffFormData.joined_at,
          is_active: true
        }
      : { 
          name: staffFormData.name, 
          skill: staffFormData.skill, 
          daily_rate: parseFloat(staffFormData.daily_rate) || 0, 
          store_id: safeStoreId, 
          pin: staffFormData.pin || undefined, 
          joined_at: staffFormData.joined_at,
          is_active: true
        };

    const mutationOptions = {
      onSuccess: (data: any) => {
        toast.success(editingStaff ? 'Profile updated' : 'Personnel enrolled');
        if (!editingStaff && data.pin) {
          setNewWorkerPin(data.pin);
        } else {
          setIsStaffModalOpen(false);
        }
      },
      onError: (error: any) => {
        console.error('Staff save error:', error);
        toast.error(`Failed to save personnel: ${error.message || 'Unknown error'}`);
      }
    };

    if (editingStaff) {
      const updateMutation = editingStaff.type === 'permanent' ? updatePermanentMutation : updateTempMutation;
      updateMutation.mutate({ id: editingStaff.id, data: payload }, mutationOptions);
    } else {
      const createMutation = personnelType === 'permanent' ? addPermanentMutation : addTempMutation;
      createMutation.mutate(payload, mutationOptions);
    }
  };

  const handleOpenLedgerModal = (worker: any, type: 'permanent' | 'temporary') => {
    setLedgerTarget({ id: worker.id, type, name: worker.name });
    setLedgerFormData({
      transaction_type: type === 'permanent' ? 'bonus_added' : 'wage_earned',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsLedgerModalOpen(true);
  };

  const handleVoidAdvance = async (entryId: string, amount: number) => {
    if (!window.confirm(`Are you sure you want to void this advance of Rs ${amount}? This will permanently remove it from the ledger and it will NOT appear anywhere.`)) return;
    setVoidingEntryId(entryId);
    try {
      await deleteLedgerEntryMutation.mutateAsync(entryId);
      toast.success('Advance voided successfully — removed from ledger');
      // Update historyTarget locally so the modal refreshes without closing
      if (historyTarget) {
        setHistoryTarget((prev: any) => prev ? { ...prev, history: prev.history.filter((e: any) => e.id !== entryId) } : null);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to void advance');
    } finally {
      setVoidingEntryId(null);
    }
  };

  const handleAddLedgerEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerTarget) return;

    addLedgerEntryMutation.mutate({
      ...ledgerFormData,
      amount: parseFloat(ledgerFormData.amount) || 0,
      worker_id: ledgerTarget.id,
      worker_type: ledgerTarget.type,
      created_by: profile?.id
    }, {
      onSuccess: () => {
        toast.success('Ledger updated successfully');
        setIsLedgerModalOpen(false);
      },
      onError: (error: any) => {
        console.error('Ledger entry error:', error);
        toast.error(`Failed to update ledger: ${error.message || 'Unknown error'}`);
      }
    });
  };

  const handleProcessMonthlySalary = (member: any) => {
    const bonus = member.ledgerBalance > 0 ? member.ledgerBalance : 0;
    const advanceDeducted = member.ledgerBalance < 0 ? Math.abs(member.ledgerBalance) : 0;
    
    recordSalaryMutation.mutate({
      staff_id: member.id,
      month: selectedMonth,
      year: selectedYear,
      basic: member.basic_salary,
      overtime_amount: member.otAmount,
      bonus: bonus,
      deductions: 0,
      advance_deducted: advanceDeducted,
      net_payable: member.netPayable,
      status: 'paid'
    }, {
      onSuccess: () => {
        toast.success(`Salary processed for ${member.name}`);
        
        // Reset the ledger balance by injecting counter entries
        if (advanceDeducted > 0) {
           addLedgerEntryMutation.mutate({
             worker_id: member.id,
             worker_type: 'permanent',
             transaction_type: 'advance_recovered',
             amount: advanceDeducted,
             date: new Date().toISOString().split('T')[0],
             description: `Advance recovered via Salary (${selectedMonth}/${selectedYear})`,
             created_by: profile?.id
           });
        }
        if (bonus > 0) {
           addLedgerEntryMutation.mutate({
             worker_id: member.id,
             worker_type: 'permanent',
             transaction_type: 'payment_made', // Payout the bonus
             amount: bonus,
             date: new Date().toISOString().split('T')[0],
             description: `Bonus payout via Salary (${selectedMonth}/${selectedYear})`,
             created_by: profile?.id
           });
        }
      },
      onError: (error: any) => {
        console.error('Salary processing error:', error);
        toast.error(`Failed to process salary: ${error.message || 'Unknown error'}`);
      }
    });
  };

  const handleDownloadAllLedgers = () => {
    if (!allLedgerEntries || allLedgerEntries.length === 0) {
      toast.error('No ledger entries available to download');
      return;
    }

    // Filter month-wise based on selectedMonth and selectedYear
    const filteredEntries = allLedgerEntries.filter((entry: any) => {
      const entryDate = new Date(entry.date);
      return (entryDate.getMonth() + 1 === selectedMonth) && 
             (entryDate.getFullYear() === selectedYear);
    });

    if (filteredEntries.length === 0) {
      toast.error(`No ledger entries found for ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedMonth - 1]} ${selectedYear}`);
      return;
    }

    // Pre-populate workersMap with all present active employees
    const workersMap = new Map<string, { name: string; type: string; entries: any[] }>();

    // 1. Add all present permanent staff
    staff.forEach((s: any) => {
      if (s.is_active === false) return; // Skip inactive permanent employees
      workersMap.set(s.id, { name: s.name, type: 'Permanent', entries: [] });
    });

    // 2. Add all present temporary workers
    tempWorkers.forEach((w: any) => {
      if (w.is_active === false) return; // Skip inactive temporary employees
      workersMap.set(w.id, { name: w.name, type: 'Temporary', entries: [] });
    });

    // 3. Map filtered entries to their present employee
    filteredEntries.forEach((entry: any) => {
      const workerId = entry.worker_id;
      if (workersMap.has(workerId)) {
        workersMap.get(workerId)!.entries.push(entry);
      }
    });

    if (workersMap.size === 0) {
      toast.error(`No present employees found in the system.`);
      return;
    }

    const csvRows: string[] = [];

    // Monthly Report Header
    const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1];
    csvRows.push(`MONTHLY ROSTER LEDGER REPORT - ${monthName.toUpperCase()} ${selectedYear}`);
    csvRows.push(''); // blank row spacing

    workersMap.forEach((worker, workerId) => {
      csvRows.push(`EMPLOYEE:,"${worker.name.replace(/"/g, '""')}"`);
      csvRows.push(`CLASSIFICATION:,${worker.type}`);
      csvRows.push('Date,Transaction Type,Amount (Rs),Description');

      let totalEarned = 0;
      let totalAdvances = 0;
      let totalPayments = 0;

      // Sort entries chronologically for this worker
      const sortedEntries = [...worker.entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sortedEntries.forEach((entry: any) => {
        let txType = entry.transaction_type.replace(/_/g, ' ').toUpperCase();
        if (entry.transaction_type === 'wage_earned') {
          const isNight = entry.description?.toLowerCase().includes('night duty') || entry.description?.toLowerCase().includes('night allowance');
          txType = isNight ? 'NIGHT ALLOWANCE' : 'DAILY WAGE';
        }
        const amount = Number(entry.amount || 0);
        const desc = entry.description || '';

        if (entry.transaction_type === 'wage_earned' || entry.transaction_type === 'bonus_added') {
          totalEarned += amount;
        } else if (entry.transaction_type === 'advance_given') {
          totalAdvances += amount;
        } else if (entry.transaction_type === 'payment_made' || entry.transaction_type === 'advance_recovered') {
          totalPayments += amount;
        }

        csvRows.push(`${entry.date},${txType},${amount},"${desc.replace(/"/g, '""')}"`);
      });

      const finalBalance = totalEarned - (totalAdvances + totalPayments);
      csvRows.push(`SUMMARY:,Total Earned: Rs ${totalEarned} | Total Advances: Rs ${totalAdvances} | Total Paid: Rs ${totalPayments} | Balance: Rs ${finalBalance}`);
      csvRows.push(''); // Spacer between employees
      csvRows.push('');
    });

    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_wise_ledgers_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Successfully downloaded employee-wise ledgers');
  };

  return (
    <div className="space-y-6 lg:space-y-10 pb-20 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
                <Users size={24} strokeWidth={2.5} />
             </div>
             <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-neutral-900 dark:text-neutral-100 uppercase">
               Personnel <span className="text-orange-600">Executive</span>
             </h1>
          </div>
          <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.4em] ml-1 flex items-center gap-2">
            <Zap size={14} className="text-orange-600" /> Unified Human Resources & Payroll Intelligence
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

           <div className="h-14 flex items-center gap-2 bg-white dark:bg-neutral-900 p-2 rounded-2xl shadow-premium border border-white/50 dark:border-neutral-800">
              <Filter size={16} className="ml-3 text-muted-foreground" />
              <select 
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100 pr-6 outline-none appearance-none cursor-pointer"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                <option value="all">Global Roster</option>
                {stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
           </div>

           <div className="h-14 flex items-center gap-2 bg-white dark:bg-neutral-900 p-2 rounded-2xl shadow-premium border border-white/50 dark:border-neutral-800">
              <CalendarDays size={16} className="ml-3 text-orange-600" />
              <select 
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100 pr-4 outline-none appearance-none cursor-pointer"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <div className="w-px h-6 bg-neutral-100 dark:bg-neutral-800 mx-1" />
              <select 
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-neutral-900 dark:text-neutral-100 pr-4 outline-none appearance-none cursor-pointer pl-2"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
           </div>

           <Button 
             onClick={handleDownloadAllLedgers}
             variant="outline"
             className="h-11 lg:h-12 rounded-xl border-border hover:bg-muted font-black px-6 shadow-premium transition-all active:scale-95 text-[10px] uppercase tracking-widest text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 border"
           >
             <Download className="mr-2.5 h-4 w-4" strokeWidth={2.5} />
             Download Ledgers
           </Button>

           <Button 
             onClick={() => handleOpenStaffModal()}
             className="h-11 lg:h-12 rounded-xl bg-orange-600 text-white font-black px-8 shadow-xl shadow-orange-500/20 hover:bg-orange-700 transition-all active:scale-95"
           >
             <UserPlus className="mr-3 h-5 w-5" strokeWidth={3} />
             ENROLL STAFF
           </Button>
        </div>
      </div>

      {/* Simplified Financial & Workforce Command Hub */}
      <Card className="border-none shadow-premium rounded-[3rem] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white overflow-hidden relative group">
         <div className="absolute right-0 top-0 w-96 h-96 brand-gradient rounded-full blur-[120px] opacity-20 -mr-48 -mt-48 group-hover:opacity-30 transition-opacity hidden lg:block" />
         <CardContent className="p-6 lg:p-12 relative z-10">
            <div className="flex items-center justify-between mb-12">
               <div>
                  <p className="text-[11px] font-black text-orange-600 uppercase tracking-[0.4em] mb-2">Executive Overview</p>
                  <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">Financial & Personnel <span className="text-orange-600">Intelligence</span></h2>
               </div>
               <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                  <Users size={20} className="text-orange-600" />
                  <div>
                     <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Total Force</p>
                     <p className="text-xl font-black text-neutral-900 dark:text-white">{staff.length + tempWorkers.length} <span className="text-xs text-neutral-500 ml-1">Units</span></p>
                  </div>
               </div>
            </div>
            
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
                <div className="space-y-6">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                         <ShieldCheck size={20} strokeWidth={2.5} />
                      </div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Permanent Payroll</p>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="space-y-1">
                         <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Monthly Payout (Due)</p>
                         <h4 className="text-4xl font-black tabular-nums text-neutral-900 dark:text-white">
                            Rs {stats.totalDue.toLocaleString()}
                         </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-4 border-t border-black/5 dark:border-white/5">
                         <div>
                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Already Paid</p>
                            <p className="text-lg font-black text-neutral-900 dark:text-white tabular-nums">Rs {stats.totalPaid.toLocaleString()}</p>
                         </div>
                         <div>
                            <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Basic Salary</p>
                            <p className="text-lg font-black text-neutral-900 dark:text-white tabular-nums">Rs {stats.totalBasic.toLocaleString()}</p>
                         </div>
                      </div>
                   </div>

                   <div className="h-1.5 w-full bg-blue-900/30 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(stats.totalPaid / (stats.totalNetPayable || 1)) * 100}%` }} />
                   </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <TrendingUp size={20} strokeWidth={2.5} />
                     </div>
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Temp Monthly Expense</p>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="space-y-1">
                        <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Total Owed (Wallet Dues)</p>
                        <h4 className="text-4xl font-black tabular-nums text-neutral-900 dark:text-white">
                           Rs {tempLedgerData.reduce((s, w) => s + w.balance, 0).toLocaleString()}
                        </h4>
                     </div>

                     <div className="grid grid-cols-3 gap-2 py-4 border-t border-black/5 dark:border-white/5">
                        <div>
                           <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest mb-1 leading-tight">Total Paid</p>
                           <p className="text-sm font-black text-neutral-900 dark:text-white tabular-nums">
                              Rs {tempLedgerData.reduce((s, w) => s + w.monthlyPaidOut, 0).toLocaleString()}
                           </p>
                        </div>
                        <div>
                           <p className="text-[7px] font-black text-amber-500 uppercase tracking-widest mb-1 leading-tight">Total Advance</p>
                           <p className="text-sm font-black text-neutral-900 dark:text-white tabular-nums">
                              Rs {tempLedgerData.reduce((s, w) => s + w.monthlyAdvances, 0).toLocaleString()}
                           </p>
                        </div>
                        <div>
                           <p className="text-[7px] font-black text-blue-600 uppercase tracking-widest mb-1 leading-tight">Total Earned</p>
                           <p className="text-sm font-black text-neutral-900 dark:text-white tabular-nums">
                              Rs {tempLedgerData.reduce((s, w) => s + w.totalEarned, 0).toLocaleString()}
                           </p>
                        </div>
                     </div>
                  </div>

                  <div className="h-1.5 w-full bg-emerald-900/30 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(tempLedgerData.reduce((s, w) => s + w.monthlyPaid, 0) / (tempLedgerData.reduce((s, w) => s + w.totalEarned, 0) || 1)) * 100}%` }} />
                  </div>
               </div>

               <div className="space-y-4 p-8 rounded-[2.5rem] bg-orange-600/5 border border-orange-600/20 relative overflow-hidden group/card">
                  <div className="absolute right-0 bottom-0 opacity-10 -mr-4 -mb-4 group-hover/card:scale-110 transition-transform">
                     <Zap size={100} />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/40">
                        <Wallet size={20} strokeWidth={2.5} />
                     </div>
                     <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">Ready to Disburse</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-2">Manual Payment Control</p>
                     <h4 className="text-2xl font-black text-neutral-900 dark:text-white italic tracking-tighter">
                        Record Payments Directly
                     </h4>
                  </div>
               </div>
            </div>
         </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-16 bg-neutral-100 dark:bg-neutral-800 p-2 rounded-[2rem] mb-10 w-full lg:w-auto shadow-inner flex overflow-x-auto no-scrollbar justify-start lg:justify-center whitespace-nowrap">
           <TabsTrigger value="payroll" className="rounded-[1.5rem] px-10 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:text-orange-600 data-[state=active]:shadow-premium transition-all">
             <LayoutDashboard size={16} className="mr-2" /> Permanent Employee Salary
           </TabsTrigger>
           <TabsTrigger value="temp" className="rounded-[1.5rem] px-10 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:text-orange-600 data-[state=active]:shadow-premium transition-all">
             <TrendingUp size={16} className="mr-2" /> Temporary Employee Salary
           </TabsTrigger>
           <TabsTrigger value="roster" className="rounded-[1.5rem] px-10 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:text-orange-600 data-[state=active]:shadow-premium transition-all">
             <Users size={16} className="mr-2" /> Active Roster
           </TabsTrigger>
        </TabsList>

        {/* 1. Permanent Payroll Tab */}
        <TabsContent value="payroll" className="space-y-6">
           <Card className="border-none shadow-premium rounded-[3rem] bg-white dark:bg-neutral-900 overflow-hidden">
              <CardHeader className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-neutral-50/50 dark:bg-neutral-800/30">
                 <div>
                    <CardTitle className="text-2xl font-black tracking-tight">Monthly Salary Processing</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">
                       Authorizing compensation for {payrollData.length} permanent staff members
                    </CardDescription>
                 </div>
                 <div className="flex items-center gap-3 bg-white dark:bg-neutral-900 px-6 py-3 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800">
                    <CalendarDays size={18} className="text-orange-600" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-900 dark:text-neutral-100">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedMonth - 1]} {selectedYear}
                    </span>
                 </div>
              </CardHeader>
               <CardContent className="p-0">
                  {/* Payroll Search */}
                  <div className="px-10 pt-6 pb-2">
                    <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 max-w-sm">
                      <Search size={14} className="text-neutral-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search employee name..."
                        className="bg-transparent text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none w-full"
                        value={payrollSearch}
                        onChange={(e) => setPayrollSearch(e.target.value)}
                      />
                      {payrollSearch && (
                        <button onClick={() => setPayrollSearch('')} className="text-neutral-400 hover:text-red-500 font-black text-xs ml-1 transition-colors">✕</button>
                      )}
                    </div>
                  </div>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/20">
                          <th className="px-10 py-6 text-left text-[11px] font-black uppercase tracking-widest text-muted-foreground">Personnel</th>
                          <th className="px-10 py-6 text-right text-[11px] font-black uppercase tracking-widest text-muted-foreground">Basic Monthly</th>
                          <th className="px-10 py-6 text-right text-[11px] font-black uppercase tracking-widest text-muted-foreground">Last Month's Pay</th>
                          <th className="px-10 py-6 text-right text-[11px] font-black uppercase tracking-widest text-muted-foreground">This Month's Pay</th>
                          <th className="px-10 py-6 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                       <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                         {payrollData.filter(m => payrollSearch === '' || m.name.toLowerCase().includes(payrollSearch.toLowerCase())).map((member) => (
                          <tr key={member.id} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-all">
                            <td className="px-10 py-8">
                               <div className="flex items-center gap-4">
                                  <div className="relative group/avatar">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 font-black text-lg group-hover:scale-110 transition-transform">
                                      {member.name[0]}
                                    </div>
                                    <button 
                                      onClick={() => handleOpenStaffModal(member, 'permanent')}
                                      className="absolute inset-0 bg-orange-600/80 rounded-2xl opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity"
                                    >
                                      <Edit size={14} />
                                    </button>
                                  </div>
                                  <div>
                                    <p className="font-black text-lg text-neutral-900 dark:text-neutral-100">{member.name}</p>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">{member.role}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-8 text-right font-black text-neutral-600 dark:text-muted-foreground tabular-nums">
                               Rs {member.basic_salary.toLocaleString()}
                            </td>
                            
                            <td className="px-10 py-8 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-xl font-black text-neutral-700 dark:text-neutral-300 tabular-nums">Rs {member.prevNetPayable.toLocaleString()}</span>
                                {member.prevExisting ? (
                                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Paid</span>
                                ) : (
                                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest mt-1">Due</span>
                                )}
                              </div>
                            </td>

                            <td className="px-10 py-8 text-right">
                               <span className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tabular-nums">Rs {member.netPayable.toLocaleString()}</span>
                            </td>
                            <td className="px-10 py-8 text-center">
                               {member.existing ? (
                                 <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 text-[11px] font-black uppercase tracking-[0.2em] border border-emerald-100 dark:border-emerald-900/30">
                                   <CheckCircle size={16} strokeWidth={3} />
                                   Paid
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-3">
                                   <Button
                                     variant="outline"
                                     onClick={() => {
                                       const memberLedger = allLedgerEntries
                                         .filter((e: any) => e.worker_id === member.id && e.worker_type === 'permanent')
                                         .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                       setHistoryTarget({ ...member, history: memberLedger });
                                       setIsHistoryModalOpen(true);
                                     }}
                                     className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                   >
                                     Advances
                                   </Button>
                                   <Button
                                     variant="ghost"
                                     size="icon"
                                     onClick={() => handleDeleteStaff(member.id, 'permanent', member.name)}
                                     className="h-11 w-11 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                   >
                                     <Trash2 size={18} />
                                   </Button>
                                   <Button 
                                     size="lg" 
                                     onClick={() => handleProcessMonthlySalary(member)}
                                     className="h-11 px-8 rounded-xl bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-neutral-200 dark:shadow-none hover:bg-orange-600 hover:text-white transition-all"
                                   >
                                     Authorize
                                   </Button>
                                 </div>
                               )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>

                 {/* Mobile Card View */}
                  <div className="lg:hidden p-6 space-y-4">
                     {payrollData.filter(m => payrollSearch === '' || m.name.toLowerCase().includes(payrollSearch.toLowerCase())).map((member) => (
                      <div key={member.id} className="p-6 rounded-[2.5rem] bg-neutral-50 dark:bg-neutral-800/40 border border-white dark:border-white/5 shadow-sm">
                         <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                               <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 font-black text-lg">
                                  {member.name[0]}
                               </div>
                               <div>
                                  <p className="font-black text-neutral-900 dark:text-neutral-100">{member.name}</p>
                                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{member.role}</p>
                               </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenStaffModal(member, 'permanent')}
                              className="h-10 w-10 rounded-xl text-muted-foreground"
                            >
                               <Edit size={18} />
                            </Button>
                         </div>

                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Last Month's Pay</p>
                               <div className="flex items-center gap-2">
                                 <p className="text-sm font-black text-neutral-600 dark:text-muted-foreground tabular-nums">Rs {member.prevNetPayable.toLocaleString()}</p>
                                 {member.prevExisting ? (
                                    <span className="text-[8px] font-black text-emerald-500 uppercase">Paid</span>
                                 ) : (
                                    <span className="text-[8px] font-black text-orange-500 uppercase">Due</span>
                                 )}
                               </div>
                            </div>
                            <div className="space-y-1 text-right">
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">This Month's Pay</p>
                               <p className="text-xl font-black text-neutral-900 dark:text-neutral-100 tabular-nums">Rs {member.netPayable.toLocaleString()}</p>
                            </div>
                         </div>

                         {member.existing ? (
                            <div className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                               <CheckCircle size={14} strokeWidth={3} /> Paid
                            </div>
                         ) : (
                            <div className="flex flex-col gap-2">
                               <Button
                                 variant="outline"
                                 onClick={() => {
                                   const memberLedger = allLedgerEntries
                                     .filter((e: any) => e.worker_id === member.id && e.worker_type === 'permanent')
                                     .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                   setHistoryTarget({ ...member, history: memberLedger });
                                   setIsHistoryModalOpen(true);
                                 }}
                                 className="h-11 w-full rounded-xl text-[10px] font-black uppercase tracking-widest"
                               >
                                 View Advances
                               </Button>
                               <div className="flex gap-2">
                                 <Button
                                   variant="ghost"
                                   onClick={() => handleDeleteStaff(member.id, 'permanent', member.name)}
                                   className="h-11 flex-1 rounded-xl text-red-500 hover:bg-red-500/10 border border-red-500/10"
                                 >
                                    <Trash2 size={18} />
                                 </Button>
                                 <Button 
                                   onClick={() => handleProcessMonthlySalary(member)}
                                   className="h-11 flex-[2] rounded-xl bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest"
                                 >
                                    Authorize
                                 </Button>
                               </div>
                            </div>
                         )}
                      </div>
                    ))}
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        {/* 2. Temp Worker Ledger Tab */}
         <TabsContent value="temp" className="space-y-6">
           <Card className="border-none shadow-premium rounded-[3rem] bg-white dark:bg-neutral-900 overflow-hidden">
              <CardHeader className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-neutral-50/50 dark:bg-neutral-800/30">
                 <div>
                    <CardTitle className="text-2xl font-black tracking-tight">Temporary Workforce Ledger</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2">
                       Managing daily wages and advances for {tempLedgerData.length} active units
                    </CardDescription>
                 </div>
              </CardHeader>
               <CardContent className="p-0">
                  {/* Temp Search */}
                  <div className="px-10 pt-6 pb-2">
                    <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 max-w-sm">
                      <Search size={14} className="text-neutral-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search employee name..."
                        className="bg-transparent text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none w-full"
                        value={tempSearch}
                        onChange={(e) => setTempSearch(e.target.value)}
                      />
                      {tempSearch && (
                        <button onClick={() => setTempSearch('')} className="text-neutral-400 hover:text-red-500 font-black text-xs ml-1 transition-colors">✕</button>
                      )}
                    </div>
                  </div>
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/20">
                          <th className="px-10 py-6 text-left text-[11px] font-black uppercase tracking-widest text-muted-foreground">Personnel</th>
                          <th className="px-10 py-6 text-right text-[11px] font-black uppercase tracking-widest text-muted-foreground">Daily Rate</th>
                          <th className="px-10 py-6 text-right text-[11px] font-black uppercase tracking-widest text-muted-foreground">Wallet Balance</th>
                          <th className="px-10 py-6 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                       <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                         {tempLedgerData.filter(w => tempSearch === '' || w.name.toLowerCase().includes(tempSearch.toLowerCase())).map((worker) => (
                          <tr key={worker.id} className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-all">
                            <td className="px-10 py-8">
                               <div className="flex items-center gap-4">
                                  <div className="relative group/avatar">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 font-black text-lg group-hover:scale-110 transition-transform">
                                      {worker.name[0]}
                                    </div>
                                    <button 
                                      onClick={() => handleOpenStaffModal(worker, 'temporary')}
                                      className="absolute inset-0 bg-orange-600/80 rounded-2xl opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center text-white transition-opacity"
                                    >
                                      <Edit size={14} />
                                    </button>
                                  </div>
                                  <div>
                                    <p className="font-black text-lg text-neutral-900 dark:text-neutral-100">{worker.name}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                       <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md">
                                          {worker.skill || 'Temporary'}
                                       </span>
                                    </div>
                                  </div>
                               </div>
                            </td>
                            <td className="px-10 py-8 text-right">
                               <p className="text-xl font-black text-neutral-900 dark:text-neutral-100 tabular-nums">
                                  Rs {Number(worker.daily_rate).toLocaleString()}
                               </p>
                            </td>
                            <td className="px-10 py-8 text-right">
                               <p className={`text-2xl font-black tabular-nums ${worker.balance > 0 ? 'text-emerald-500' : worker.balance < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                                  Rs {worker.balance.toLocaleString()}
                               </p>
                            </td>
                            <td className="px-10 py-8 text-center">
                               <div className="flex gap-2 justify-center">
                                 <Button 
                                   onClick={() => {
                                     setHistoryTarget(worker);
                                     setIsHistoryModalOpen(true);
                                   }}
                                   variant="outline"
                                   className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                 >
                                   View Wallet
                                 </Button>
                                 <Button 
                                   onClick={() => {
                                     setLedgerTarget({ id: worker.id, type: 'temporary', name: worker.name });
                                     setLedgerFormData({ transaction_type: 'advance_given', amount: 0, description: 'Advance Payment', date: new Date().toISOString().split('T')[0] });
                                     setIsLedgerModalOpen(true);
                                   }}
                                   variant="outline"
                                   className="h-11 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                 >
                                   Advance
                                 </Button>
                                 <Button 
                                   onClick={() => {
                                     setLedgerTarget({ id: worker.id, type: 'temporary', name: worker.name });
                                     setLedgerFormData({ transaction_type: 'payment_made', amount: worker.balance > 0 ? worker.balance : 0, description: 'Final Settlement', date: new Date().toISOString().split('T')[0] });
                                     setIsLedgerModalOpen(true);
                                   }}
                                   disabled={worker.balance <= 0}
                                   className="h-11 rounded-xl bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-orange-700"
                                 >
                                   Settle Wallet
                                 </Button>
                                 <Button
                                   variant="ghost"
                                   size="icon"
                                   onClick={() => handleDeleteStaff(worker.id, 'temporary', worker.name)}
                                   className="h-11 w-11 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all border border-transparent hover:border-red-500/10"
                                 >
                                   <Trash2 size={18} />
                                 </Button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>

                 {/* Mobile Card View */}
                  <div className="lg:hidden p-6 space-y-4">
                     {tempLedgerData.filter(w => tempSearch === '' || w.name.toLowerCase().includes(tempSearch.toLowerCase())).map((worker) => (
                      <div key={worker.id} className="p-6 rounded-[2.5rem] bg-neutral-50 dark:bg-neutral-800/40 border border-white dark:border-white/5 shadow-sm">
                         <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                               <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 font-black text-lg">
                                  {worker.name[0]}
                               </div>
                               <div>
                                  <p className="font-black text-neutral-900 dark:text-neutral-100">{worker.name}</p>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md mt-1 inline-block">
                                     {worker.skill || 'Temporary'}
                                  </span>
                               </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenStaffModal(worker, 'temporary')}
                              className="h-10 w-10 rounded-xl text-muted-foreground"
                            >
                               <Edit size={18} />
                            </Button>
                         </div>

                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="space-y-1">
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Daily Rate</p>
                               <p className="text-sm font-black text-neutral-600 dark:text-muted-foreground tabular-nums">Rs {Number(worker.daily_rate).toLocaleString()}</p>
                            </div>
                            <div className="space-y-1 text-right">
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Wallet Balance</p>
                               <p className={`text-xl font-black tabular-nums ${worker.balance > 0 ? 'text-emerald-500' : worker.balance < 0 ? 'text-red-500' : 'text-neutral-400'}`}>Rs {worker.balance.toLocaleString()}</p>
                            </div>
                         </div>

                         <div className="flex flex-col gap-2">
                           <Button 
                             onClick={() => {
                               setHistoryTarget(worker);
                               setIsHistoryModalOpen(true);
                             }}
                             variant="outline"
                             className="h-11 w-full rounded-xl text-[10px] font-black uppercase tracking-widest"
                           >
                             View Wallet
                           </Button>
                           <div className="flex gap-2">
                             <Button 
                               onClick={() => {
                                 setLedgerTarget({ id: worker.id, type: 'temporary', name: worker.name });
                                 setLedgerFormData({ transaction_type: 'advance_given', amount: 0, description: 'Advance Payment', date: new Date().toISOString().split('T')[0] });
                                 setIsLedgerModalOpen(true);
                               }}
                               variant="outline"
                               className="h-11 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest"
                             >
                               Advance
                             </Button>
                             <Button 
                               onClick={() => {
                                 setLedgerTarget({ id: worker.id, type: 'temporary', name: worker.name });
                                 setLedgerFormData({ transaction_type: 'payment_made', amount: worker.balance > 0 ? worker.balance : 0, description: 'Final Settlement', date: new Date().toISOString().split('T')[0] });
                                 setIsLedgerModalOpen(true);
                               }}
                               disabled={worker.balance <= 0}
                               className="h-11 flex-[1.5] rounded-xl bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest"
                             >
                               Settle Wallet
                             </Button>
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => handleDeleteStaff(worker.id, 'temporary', worker.name)}
                               className="h-11 w-11 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-500/10"
                             >
                               <Trash2 size={18} />
                             </Button>
                           </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </CardContent>
           </Card>
         </TabsContent>

        {/* 3. Personnel Roster Tab */}
        <TabsContent value="roster" className="space-y-6">
           {/* Roster Search */}
           <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-4 py-2.5 w-full max-w-sm shadow-sm">
               <Search size={15} className="text-neutral-400 shrink-0" />
               <input
                 type="text"
                 placeholder="Search staff by name..."
                 className="bg-transparent text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none w-full"
                 value={rosterSearch}
                 onChange={(e) => setRosterSearch(e.target.value)}
               />
               {rosterSearch && (
                 <button onClick={() => setRosterSearch('')} className="text-neutral-400 hover:text-red-500 font-black text-xs ml-1 transition-colors">✕</button>
               )}
             </div>
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
               {[...staff, ...tempWorkers].filter(p => rosterSearch === '' || p.name.toLowerCase().includes(rosterSearch.toLowerCase())).length} personnel
             </p>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...staff, ...tempWorkers].filter((p: any) => rosterSearch === '' || p.name.toLowerCase().includes(rosterSearch.toLowerCase())).map((person: any) => (
                <Card 
                  key={person.id} 
                  className="group relative overflow-hidden rounded-[2.5rem] border-none shadow-premium bg-white dark:bg-neutral-900 hover:scale-[1.03] transition-all duration-500"
                >
                   <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-white/90 backdrop-blur shadow-lg text-muted-foreground hover:text-orange-600" onClick={() => handleOpenStaffModal(person, person.basic_salary ? 'permanent' : 'temporary')}>
                         <Edit size={16} />
                      </Button>
                   </div>
                   
                   <div className="p-8">
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-16 h-16 rounded-2xl brand-gradient flex items-center justify-center text-white font-black text-2xl border-4 border-white/30 shadow-xl">
                            {person.name[0]}
                         </div>
                         <div className="flex items-center justify-between w-full">
                          <div className="flex-1">
                             <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 truncate w-32">{person.name}</h3>
                             <div className="inline-flex px-3 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[9px] font-black uppercase tracking-widest text-neutral-500 mt-1">
                                {person.basic_salary ? 'Permanent' : 'Temporary'}
                             </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStaff(person.id, person.basic_salary ? 'permanent' : 'temporary', person.name)}
                            className="h-10 w-10 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                          >
                             <Trash2 size={18} />
                          </Button></div>
                      </div>

                      <div className="space-y-4 pt-6 border-t border-neutral-50 dark:border-neutral-800">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Role/Skill</span>
                            <span className="text-xs font-black text-neutral-700 dark:text-neutral-300">{person.role || person.skill || '-'}</span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rate</span>
                            <span className="text-xs font-black text-neutral-700 dark:text-neutral-300">Rs {Number(person.basic_salary || person.daily_rate).toLocaleString()}</span>
                         </div>
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deployment</span>
                            <span className="text-xs font-black text-orange-600">{person.stores?.name || 'Central'}</span>
                         </div>
                      </div>
                   </div>
                </Card>
              ))}
           </div>
        </TabsContent>
      </Tabs>

      {/* Staff Enrollment Modal */}
      <Dialog open={isStaffModalOpen} onOpenChange={setIsStaffModalOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-md bg-white dark:bg-neutral-900 border-none shadow-premium p-0 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="brand-gradient p-6 lg:p-8 text-white">
             <DialogHeader>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                   <UserPlus size={24} strokeWidth={2.5} />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase">{editingStaff ? 'Update Profile' : 'Enroll Personnel'}</DialogTitle>
                <DialogDescription className="text-orange-50/80 text-[9px] font-black uppercase tracking-[0.2em] mt-1">
                   High-performance talent synchronization
                </DialogDescription>
             </DialogHeader>
          </div>
          <form onSubmit={handleSaveStaff} className="p-10 space-y-8">
            <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl shadow-inner">
               <button 
                 type="button"
                 onClick={() => setPersonnelType('permanent')}
                 className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${personnelType === 'permanent' ? 'bg-white dark:bg-neutral-900 text-orange-600 shadow-premium' : 'text-muted-foreground'}`}
               >
                 Permanent
               </button>
               <button 
                 type="button"
                 onClick={() => setPersonnelType('temporary')}
                 className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${personnelType === 'temporary' ? 'bg-white dark:bg-neutral-900 text-orange-600 shadow-premium' : 'text-muted-foreground'}`}
               >
                 Temporary
               </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Identity Name</Label>
                <Input 
                  required 
                  className="h-11 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold px-6 shadow-inner"
                  value={staffFormData.name}
                  onChange={(e) => setStaffFormData({...staffFormData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {personnelType === 'permanent' ? 'Role' : 'Skill'}
                  </Label>
                  <Input 
                    required 
                    className="h-11 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold px-4 shadow-inner"
                    value={personnelType === 'permanent' ? staffFormData.role : staffFormData.skill}
                    onChange={(e) => personnelType === 'permanent' ? setStaffFormData({...staffFormData, role: e.target.value}) : setStaffFormData({...staffFormData, skill: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    {personnelType === 'permanent' ? 'Basic' : 'Daily'}
                  </Label>
                  <Input 
                    type="number"
                    required 
                    className="h-11 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold px-4 shadow-inner"
                    value={personnelType === 'permanent' ? staffFormData.basic_salary : staffFormData.daily_rate}
                    onChange={(e) => personnelType === 'permanent' ? setStaffFormData({...staffFormData, basic_salary: e.target.value}) : setStaffFormData({...staffFormData, daily_rate: e.target.value})}
                  />
                </div>
              </div>

               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Access PIN</Label>
                 <div className="relative">
                   <Input 
                     className="h-11 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold px-6 shadow-inner tracking-[0.5em] text-orange-600"
                     value={staffFormData.pin || ''}
                     maxLength={6}
                     placeholder="Auto-generated"
                     onChange={(e) => setStaffFormData({...staffFormData, pin: e.target.value})}
                   />
                   <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <ShieldCheck size={18} className="text-orange-500/30" />
                   </div>
                 </div>
               </div>

               <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Deployment Location</Label>
                <select 
                  className="w-full h-11 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold px-6 shadow-inner outline-none appearance-none cursor-pointer text-xs"
                  value={staffFormData.store_id}
                  onChange={(e) => setStaffFormData({...staffFormData, store_id: e.target.value})}
                >
                  <option value="">Central Hub</option>
                  {stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button type="button" variant="ghost" className="h-11 rounded-xl font-black text-[10px] uppercase tracking-widest flex-1" onClick={() => setIsStaffModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addPermanentMutation.isPending || addTempMutation.isPending || updatePermanentMutation.isPending || updateTempMutation.isPending} className="h-11 rounded-xl bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white font-black text-[10px] uppercase tracking-widest flex-1 shadow-xl">
                {(addPermanentMutation.isPending || addTempMutation.isPending || updatePermanentMutation.isPending || updateTempMutation.isPending) 
                  ? 'Processing...' 
                  : (editingStaff ? 'Update' : 'Deploy')}
              </Button>
            </DialogFooter>
          </form>

          {/* PIN Display overlay */}
          {newWorkerPin && (
            <div className="absolute inset-0 bg-white dark:bg-neutral-900 z-50 flex flex-col items-center justify-center p-10 text-center animate-in fade-in zoom-in-95 duration-500">
               <div className="w-20 h-20 rounded-[2rem] bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 mb-8">
                  <ShieldCheck size={40} strokeWidth={2.5} />
               </div>
               <h3 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight mb-2">Enrollment Success</h3>
               <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-10">Secure Access PIN Generated</p>
               
               <div className="w-full p-8 rounded-[2.5rem] bg-neutral-50 dark:bg-neutral-800 border-2 border-dashed border-neutral-200 dark:border-neutral-700 mb-10">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] mb-4">Worker Login PIN</p>
                  <div className="flex gap-3 justify-center">
                    {newWorkerPin.split('').map((digit, i) => (
                      <div key={i} className="w-12 h-14 rounded-xl bg-white dark:bg-neutral-900 shadow-lg flex items-center justify-center text-2xl font-black text-orange-600 border border-neutral-100 dark:border-neutral-800">
                        {digit}
                      </div>
                    ))}
                  </div>
               </div>

               <p className="text-[10px] font-black text-muted-foreground uppercase leading-relaxed max-w-[280px] mb-10">
                 Provide this 6-digit PIN to the worker. They can use it to login and track their specific work ledger.
               </p>

               <Button 
                onClick={() => {
                  setNewWorkerPin(null);
                  setIsStaffModalOpen(false);
                }}
                className="w-full h-16 rounded-[1.5rem] bg-orange-600 text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-orange-500/20"
               >
                 Acknowledge & Close
               </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ledger Transaction Modal */}
      <Dialog open={isLedgerModalOpen} onOpenChange={setIsLedgerModalOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-md bg-white dark:bg-neutral-900 border-none shadow-premium p-0 overflow-hidden">
          <div className="bg-white dark:bg-neutral-900 p-10 text-neutral-900 dark:text-white">
             <DialogHeader>
                <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-orange-600/30">
                   <History size={32} strokeWidth={2.5} />
                </div>
                <DialogTitle className="text-3xl font-black tracking-tight uppercase">Ledger Adjustment</DialogTitle>
                <DialogDescription className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                   Recording financial activity for <span className="text-orange-500">{ledgerTarget?.name}</span>
                </DialogDescription>
             </DialogHeader>
          </div>
          <form onSubmit={handleAddLedgerEntry} className="p-10 space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Activity Type</Label>
                <select 
                  className="w-full h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold px-6 shadow-inner outline-none appearance-none cursor-pointer"
                  value={ledgerFormData.transaction_type}
                  onChange={(e) => setLedgerFormData({...ledgerFormData, transaction_type: e.target.value})}
                >
                  {ledgerTarget?.type === 'permanent' ? (
                    <>
                      <option value="bonus_added">Extra Bonus / Incentive</option>
                      <option value="advance_given">Advance Withdrawal</option>
                      <option value="advance_recovered">Advance Recovery</option>
                      <option value="payment_made">Direct Payment</option>
                    </>
                  ) : (
                    <>
                      <option value="advance_given">Give Advance (Deducted from Pay)</option>
                      <option value="payment_made">Final Payout / Wage Settlement</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Value (Rs)</Label>
                    <Input 
                      type="number"
                      required 
                      className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold px-6 shadow-inner"
                      value={ledgerFormData.amount}
                      onChange={(e) => setLedgerFormData({...ledgerFormData, amount: e.target.value})}
                    />
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Execution Date</Label>
                  <Input 
                    type="date"
                    required 
                    className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold px-6 shadow-inner"
                    value={ledgerFormData.date}
                    onChange={(e) => setLedgerFormData({...ledgerFormData, date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Transaction Brief</Label>
                <Input 
                  className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold px-6 shadow-inner"
                  placeholder="e.g. Festival bonus, Overtime adjustment..."
                  value={ledgerFormData.description}
                  onChange={(e) => setLedgerFormData({...ledgerFormData, description: e.target.value})}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-4">
              <Button type="button" variant="ghost" className="h-16 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest flex-1" onClick={() => setIsLedgerModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-16 rounded-[1.5rem] bg-orange-600 text-white font-black text-[11px] uppercase tracking-widest flex-1 shadow-2xl hover:bg-orange-700 transition-all">Synchronize Ledger</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Wallet History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-md bg-white dark:bg-neutral-900 border-none shadow-premium p-0 overflow-hidden">
          <div className="bg-white dark:bg-neutral-900 p-10 text-neutral-900 dark:text-white">
             <DialogHeader>
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-600/30">
                   <Wallet size={32} strokeWidth={2.5} />
                </div>
                <DialogTitle className="text-3xl font-black tracking-tight uppercase">Wallet History</DialogTitle>
                <DialogDescription className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                   Financial history for <span className="text-blue-500">{historyTarget?.name}</span>
                   <span className="ml-2 text-orange-500">• Tap 🗑 to void a mistaken advance</span>
                </DialogDescription>
             </DialogHeader>
          </div>
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
             {historyTarget?.history?.length > 0 ? Object.entries(
               historyTarget.history.reduce((acc: any, entry: any) => {
                 const date = new Date(entry.date);
                 const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                 if (!acc[monthKey]) acc[monthKey] = { label: date.toLocaleString('default', { month: 'long', year: 'numeric' }), entries: [] };
                 acc[monthKey].entries.push(entry);
                 return acc;
               }, {})
             ).sort((a: any, b: any) => b[0].localeCompare(a[0])).map(([monthKey, group]: any) => (
               <div key={monthKey} className="space-y-3">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-neutral-100 dark:border-neutral-800 pb-2">{group.label}</h4>
                 {group.entries.map((entry: any) => {
                    const isNight = entry.transaction_type === 'wage_earned' && (entry.description?.toLowerCase().includes('night duty') || entry.description?.toLowerCase().includes('night allowance'));
                    const label = isNight ? 'NIGHT ALLOWANCE' : entry.transaction_type === 'wage_earned' ? 'DAILY WAGE' : entry.transaction_type.replace(/_/g, ' ').toUpperCase();
                    const isAdvanceEntry = entry.transaction_type === 'advance_given';
                    return (
                       <div key={entry.id} className={`p-4 rounded-2xl border flex justify-between items-center gap-3 transition-all ${
                         isAdvanceEntry
                           ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40'
                           : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'
                       }`}>
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 flex-wrap">
                               <p className="text-sm font-bold text-neutral-900 dark:text-white">{label}</p>
                               {isAdvanceEntry && (
                                 <span className="text-[8px] font-black uppercase tracking-widest bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md">Advance</span>
                               )}
                             </div>
                             <p className="text-[10px] text-muted-foreground mt-1 truncate">{new Date(entry.date).toLocaleDateString()} • {entry.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className={`font-black text-base tabular-nums ${['advance_given', 'payment_made'].includes(entry.transaction_type) ? 'text-red-500' : 'text-emerald-500'}`}>
                               {['advance_given', 'payment_made'].includes(entry.transaction_type) ? '-' : '+'}Rs {entry.amount}
                            </p>
                            {isAdvanceEntry && (
                              <button
                                onClick={() => handleVoidAdvance(entry.id, entry.amount)}
                                disabled={voidingEntryId === entry.id}
                                title="Void this mistaken advance — removes it from the ledger completely"
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-red-500/30"
                              >
                                {voidingEntryId === entry.id
                                  ? <span className="text-[9px] font-black animate-pulse">…</span>
                                  : <Trash2 size={13} strokeWidth={3} />}
                              </button>
                            )}
                          </div>
                       </div>
                    );
                 })}
               </div>
             )) : (
                <div className="text-center py-10 text-muted-foreground">
                   No wallet entries found.
                </div>
             )}
          </div>
          <DialogFooter className="p-6 pt-0">
             <Button className="w-full h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200" onClick={() => setIsHistoryModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
