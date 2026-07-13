import React, { useMemo, useState } from 'react';
import { 
  Wallet, 
  History, 
  ArrowDownLeft, 
  Clock, 
  Activity,
  LogOut,
  IndianRupee,
  ShieldCheck,
  Zap,
  Calendar,
  Receipt,
  CheckCircle2,
  TrendingDown,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkerLedger } from '../../hooks/queries/useWorkforce';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function TempWorkerDashboard() {
  const { profile, signOut } = useAuth();
  const { data: allLedgerEntries = [], isLoading } = useWorkerLedger();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear] = useState(now.getFullYear());

  const { monthEntries, lifetimeBalance, monthWages, lifetimePaid } = useMemo(() => {
    if (!profile) return { monthEntries: [], lifetimeBalance: 0, monthWages: 0, lifetimePaid: 0 };

    const workerLedger = allLedgerEntries
      .filter((e: any) => e.worker_id === profile.id && e.worker_type === 'temporary')
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const inMonth = workerLedger.filter((e: any) => {
      const d = new Date(e.date);
      return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
    });

    const monthWages = inMonth
      .filter((e: any) => e.transaction_type === 'wage_earned')
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const lifetimeWages = workerLedger
      .filter((e: any) => e.transaction_type === 'wage_earned')
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const lifetimeAdvances = workerLedger
      .filter((e: any) => e.transaction_type === 'advance_given')
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const lifetimePaid = workerLedger
      .filter((e: any) => e.transaction_type === 'payment_made')
      .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    const lifetimeBalance = lifetimeWages - lifetimeAdvances - lifetimePaid;

    return {
      monthEntries: inMonth,
      lifetimeBalance,
      monthWages,
      lifetimePaid
    };
  }, [allLedgerEntries, profile, selectedMonth, selectedYear]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
           <div className="relative">
              <div className="absolute inset-0 bg-orange-600 blur-[40px] opacity-20 animate-pulse hidden lg:block" />
              <div className="w-20 h-20 brand-gradient rounded-3xl flex items-center justify-center text-white relative z-10 animate-bounce shadow-2xl">
                 <Activity size={40} strokeWidth={3} />
              </div>
           </div>
           <p className="text-xs font-black text-neutral-500 uppercase tracking-[0.5em] animate-pulse">Accessing Payment Records</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-12 space-y-10 font-sans selection:bg-orange-500/30 selection:text-orange-500 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed top-0 right-0 w-full h-full pointer-events-none z-0 hidden lg:block">
         <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-orange-600/10 blur-[150px] rounded-full animate-pulse hidden lg:block" />
         <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[120px] rounded-full hidden lg:block" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between bg-neutral-50/50 dark:bg-white/[0.02] backdrop-blur-3xl p-4 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-2xl">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center text-white border border-white/20 shadow-lg">
               <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <div>
               <h3 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight leading-none uppercase italic">{profile?.name}</h3>
               <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mt-1 italic opacity-80">Daily Wage Worker</p>
            </div>
         </div>
         <Button 
           variant="ghost" 
           onClick={() => signOut()}
           className="h-12 w-12 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-95"
         >
           <LogOut size={20} strokeWidth={2.5} />
         </Button>
      </div>

      {/* Month Selector */}
      <div className="relative z-10 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {MONTHS.map((m, i) => (
          <button
            key={m}
            onClick={() => setSelectedMonth(i + 1)}
            className={`shrink-0 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              selectedMonth === i + 1
                ? 'brand-gradient text-white shadow-lg shadow-orange-500/20'
                : 'bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-neutral-500 hover:bg-black/10 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Hero — This Month Earnings */}
      <Card className="relative z-10 border-none shadow-[0_40px_100px_-20px_rgba(234,88,12,0.4)] rounded-[4rem] bg-white dark:bg-neutral-950 overflow-hidden border border-black/5 dark:border-white/5 group">
         <div className="absolute inset-0 brand-gradient opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
         <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-600/20 blur-[100px] rounded-full hidden lg:block" />
         
         <CardContent className="p-10 lg:p-16 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 border border-orange-500/20">
                        <Wallet size={20} strokeWidth={3} />
                     </div>
                     <p className="text-xs font-black text-orange-500 uppercase tracking-[0.4em]">Current Wallet Balance</p>
                  </div>
                  <div className="space-y-2">
                     <h1 className="text-6xl lg:text-9xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none italic drop-shadow-2xl">
                        Rs {Math.max(0, lifetimeBalance).toLocaleString()}
                     </h1>
                     <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.5em] ml-2 flex items-center gap-3">
                        <Zap size={14} className="text-orange-600 animate-pulse" /> Available to settle
                     </p>
                  </div>
               </div>

                <div className="flex gap-4 flex-wrap">
                  <div className="bg-neutral-50 dark:bg-white/[0.03] backdrop-blur-2xl p-6 rounded-[2.5rem] border border-black/10 dark:border-white/10 flex items-center gap-4 shadow-2xl">
                     <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                        <IndianRupee size={24} strokeWidth={2.5} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Earned This Month</p>
                        <h4 className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">Rs {monthWages.toLocaleString()}</h4>
                     </div>
                  </div>
                  <div className="bg-emerald-500/10 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-emerald-500/20 flex items-center gap-4 shadow-2xl">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 size={24} strokeWidth={2.5} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Total Settled</p>
                        <h4 className="text-xl font-black text-emerald-400 tabular-nums">Rs {lifetimePaid.toLocaleString()}</h4>
                     </div>
                  </div>
               </div>
            </div>
         </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <div className="relative z-10 space-y-8">
         <div className="flex items-center justify-between px-6">
            <div className="space-y-1">
               <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white uppercase italic leading-none">
                  Wallet <span className="text-orange-600">History</span>
               </h2>
               <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] mt-2">
                  Every wage added and settled is recorded here in real-time
               </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500">
               <History size={24} />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {monthEntries.length === 0 ? (
               <div className="col-span-full py-20 flex flex-col items-center gap-6 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                  <Receipt size={64} strokeWidth={1} className="text-neutral-700" />
                  <p className="text-xs font-black text-neutral-500 uppercase tracking-[0.4em]">No records for this month yet</p>
                  <p className="text-xs text-neutral-600 mt-1">Your daily wages will appear here once attendance is marked.</p>
               </div>
            ) : monthEntries.map((entry: any) => {
               const isWage = entry.transaction_type === 'wage_earned';
               const isPayment = entry.transaction_type === 'payment_made';
               const isAdvance = entry.transaction_type === 'advance_given';
               const isNightAllowance = isWage && (entry.description?.toLowerCase().includes('night duty') || entry.description?.toLowerCase().includes('night allowance'));
               
               const IconComp = isWage ? ArrowDownLeft : isPayment ? CheckCircle2 : TrendingDown;
               const label = isNightAllowance ? 'Night Allowance' : isWage ? 'Daily Wage' : isPayment ? 'Salary Paid Out' : 'Advance Taken';
               const prefix = isAdvance ? '−' : '+';
               const amountClass = isAdvance ? 'text-red-400' : 'text-white';

               return (
                 <Card key={entry.id} className="border-none bg-white dark:bg-neutral-900/40 backdrop-blur-xl rounded-[2.5rem] border border-black/5 dark:border-white/5 overflow-hidden group hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-all duration-500">
                    <CardContent className="p-8">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110 ${
                               isAdvance ? 'bg-red-600 shadow-red-600/20' : 'bg-orange-600 shadow-orange-600/20'
                             }`}>
                                <IconComp size={28} strokeWidth={3} />
                             </div>
                             <div>
                                <p className="text-lg font-black text-neutral-900 dark:text-white tracking-tight uppercase italic leading-none">{label}</p>
                                <div className="flex items-center gap-3 mt-2">
                                   <Calendar size={12} className="text-neutral-500" />
                                   <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest italic">
                                      {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}
                                   </span>
                                </div>
                                {entry.description && (
                                  <p className="text-[9px] text-neutral-600 mt-1 italic">{entry.description}</p>
                                )}
                             </div>
                          </div>
                           <div className="text-right">
                             <h4 className={`text-3xl font-black tabular-nums italic tracking-tighter ${isAdvance ? 'text-red-400' : 'text-neutral-900 dark:text-white'}`}>
                               {prefix}Rs {Number(entry.amount).toLocaleString()}
                             </h4>
                             <div className={`flex items-center justify-end gap-2 mt-1 text-[8px] font-black uppercase tracking-[0.2em] italic ${
                               isAdvance ? 'text-red-400' : 'text-emerald-500'
                             }`}>
                                {isAdvance ? <TrendingDown size={10} /> : <CheckCircle2 size={10} />} 
                                {isAdvance ? 'Advance' : 'Confirmed'}
                             </div>
                          </div>
                       </div>
                    </CardContent>
                 </Card>
               );
            })}
         </div>
      </div>

      {/* Security Footer */}
      <div className="relative z-10 pt-10 flex flex-col items-center gap-6 opacity-40">
         <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-full border border-white/10">
            <ShieldCheck size={16} className="text-orange-500" />
            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.5em]">
               CHATTERJEE ENTERPRIZE SECURE PAYROLL SYSTEM // DATA ENCRYPTED
            </p>
         </div>
      </div>
    </div>
  );
}
