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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkerLedger } from '../../hooks/queries/useWorkforce';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function TempWorkerDashboard() {
  const { profile, signOut } = useAuth();
  const { data: allLedgerEntries = [], isLoading } = useWorkerLedger();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const { 
    monthEntries, 
    daysWorked, 
    baseWages, 
    extraAllowance, 
    grossEarned, 
    monthAdvances, 
    monthNetPayable 
  } = useMemo(() => {
    if (!profile) {
      return { 
        monthEntries: [], 
        daysWorked: 0, 
        baseWages: 0, 
        extraAllowance: 0, 
        grossEarned: 0, 
        monthAdvances: 0, 
        monthNetPayable: 0 
      };
    }

    const workerLedger = allLedgerEntries
      .filter((e: any) => e.worker_id === profile.id && e.worker_type === 'temporary')
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const inMonth = workerLedger.filter((e: any) => {
      const d = new Date(e.date);
      return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
    });

    let baseWages = 0;
    let extraAllowance = 0;
    let daysCount = 0;

    inMonth.forEach((e: any) => {
      if (e.transaction_type === 'wage_earned' || e.transaction_type === 'bonus_added') {
        const descLower = (e.description || '').toLowerCase();
        const isExtra = descLower.includes('night duty') || descLower.includes('night allowance') || descLower.includes('overtime');
        
        if (isExtra) {
          extraAllowance += Number(e.amount || 0);
        } else {
          baseWages += Number(e.amount || 0);
          daysCount += 1;
        }
      }
    });

    const grossEarned = baseWages + extraAllowance;

    const monthAdvances = inMonth
      .filter((e: any) => e.transaction_type === 'advance_given')
      .reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

    const monthNetPayable = grossEarned - monthAdvances;

    return {
      monthEntries: inMonth,
      daysWorked: daysCount,
      baseWages,
      extraAllowance,
      grossEarned,
      monthAdvances,
      monthNetPayable
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
           <p className="text-xs font-black text-neutral-500 uppercase tracking-[0.5em] animate-pulse">Accessing Monthly Payment Records</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 lg:p-12 space-y-8 font-sans selection:bg-orange-500/30 selection:text-orange-500 overflow-x-hidden">
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
               <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mt-1 italic opacity-80">Daily Wage Personnel</p>
            </div>
         </div>
         <Button 
           variant="ghost" 
           onClick={() => signOut()}
           className="h-12 w-12 rounded-2xl bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-95 cursor-pointer"
         >
           <LogOut size={20} strokeWidth={2.5} />
         </Button>
      </div>

      {/* Month Selector Pills & Navigation */}
      <div className="relative z-10 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-white/[0.02] backdrop-blur-xl p-2 rounded-[2rem] border border-black/5 dark:border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevMonth}
          className="h-10 px-3 rounded-xl text-neutral-600 dark:text-neutral-300 cursor-pointer"
        >
          <ChevronLeft size={18} />
        </Button>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(i + 1)}
              className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                selectedMonth === i + 1
                  ? 'brand-gradient text-white shadow-lg shadow-orange-500/20 scale-105'
                  : 'bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          className="h-10 px-3 rounded-xl text-neutral-600 dark:text-neutral-300 cursor-pointer"
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      {/* Hero — Selected Month Net Payout Card */}
      <Card className="relative z-10 border-none shadow-[0_40px_100px_-20px_rgba(234,88,12,0.35)] rounded-[3.5rem] bg-white dark:bg-neutral-950 overflow-hidden border border-black/5 dark:border-white/5 group">
         <div className="absolute inset-0 brand-gradient opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
         <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-600/20 blur-[100px] rounded-full hidden lg:block" />
         
         <CardContent className="p-8 lg:p-14 relative z-10 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                     <span className="px-3.5 py-1 rounded-xl bg-orange-600 text-white text-[9px] font-black uppercase tracking-widest shadow-md">
                        {FULL_MONTHS[selectedMonth - 1]} {selectedYear}
                     </span>
                     <p className="text-xs font-black text-orange-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Zap size={14} className="text-orange-600 animate-pulse" /> Monthly Payout Statement
                     </p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-xs font-black text-neutral-500 uppercase tracking-widest ml-1">
                        Net Payable for {FULL_MONTHS[selectedMonth - 1]}
                     </p>
                     <h1 className="text-5xl lg:text-8xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none italic drop-shadow-2xl tabular-nums">
                        Rs {monthNetPayable.toLocaleString()}
                     </h1>
                  </div>
               </div>

               {/* Status Badge */}
               <div className="bg-neutral-50 dark:bg-white/[0.03] backdrop-blur-2xl p-6 rounded-[2.5rem] border border-black/10 dark:border-white/10 flex items-center gap-4 shadow-xl">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    monthNetPayable > 0 ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald-500/20 text-emerald-500'
                  }`}>
                     {monthNetPayable > 0 ? <Clock size={26} strokeWidth={2.5} /> : <CheckCircle2 size={26} strokeWidth={2.5} />}
                  </div>
                  <div>
                     <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Disbursement Status</p>
                     <h4 className={`text-base font-black uppercase tracking-widest ${
                       monthNetPayable > 0 ? 'text-orange-500' : 'text-emerald-400'
                     }`}>
                        {monthNetPayable > 0 ? 'Monthly Net Due' : grossEarned > 0 ? 'Fully Settled' : 'No Work Logged'}
                     </h4>
                  </div>
               </div>
            </div>

            {/* 3 Financial Metrics Grid for Selected Month */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-black/5 dark:border-white/5">
               {/* 1. Days Worked */}
               <div className="p-5 rounded-[2rem] bg-neutral-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-blue-500 mb-2">
                     <Calendar size={16} strokeWidth={2.5} />
                     <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Days Worked</span>
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">{daysWorked} <span className="text-xs font-bold text-neutral-500">Days</span></h3>
                  <p className="text-[9px] font-bold text-blue-500">Base Pay: Rs {baseWages.toLocaleString()}</p>
               </div>

               {/* 2. Extra Time / Night Duty */}
               <div className="p-5 rounded-[2rem] bg-neutral-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-purple-500 mb-2">
                     <Zap size={16} strokeWidth={2.5} />
                     <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Extra / Night Duty</span>
                  </div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">Rs {extraAllowance.toLocaleString()}</h3>
                  <p className="text-[9px] font-bold text-purple-500">Overtime & Allowances</p>
               </div>

               {/* 3. Advances Taken */}
               <div className="p-5 rounded-[2rem] bg-neutral-50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-amber-500 mb-2">
                     <TrendingDown size={16} strokeWidth={2.5} />
                     <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Advances Taken</span>
                  </div>
                  <h3 className="text-2xl font-black text-amber-500 tabular-nums">− Rs {monthAdvances.toLocaleString()}</h3>
                  <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400">Deducted from Month Pay</p>
               </div>
            </div>
         </CardContent>
      </Card>

      {/* Daily Ledger & Transaction History for Selected Month */}
      <div className="relative z-10 space-y-6">
         <div className="flex items-center justify-between px-4">
            <div className="space-y-1">
               <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-neutral-900 dark:text-white uppercase italic leading-none">
                  {FULL_MONTHS[selectedMonth - 1]} <span className="text-orange-600">Work Ledger</span>
               </h2>
               <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em] mt-1">
                  Detailed logs of wages, extra duty & advances
               </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500">
               <History size={20} />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monthEntries.length === 0 ? (
               <div className="col-span-full py-16 flex flex-col items-center gap-4 bg-white/[0.02] rounded-[3rem] border border-dashed border-black/10 dark:border-white/10">
                  <Receipt size={56} strokeWidth={1} className="text-neutral-500" />
                  <p className="text-xs font-black text-neutral-500 uppercase tracking-[0.3em]">No records for {FULL_MONTHS[selectedMonth - 1]}</p>
                  <p className="text-xs text-neutral-600">Your daily wages and advances for this month will appear here.</p>
               </div>
            ) : monthEntries.map((entry: any) => {
               const isWage = entry.transaction_type === 'wage_earned' || entry.transaction_type === 'bonus_added';
               const isPayment = entry.transaction_type === 'payment_made';
               const isAdvance = entry.transaction_type === 'advance_given';
               
               const descLower = (entry.description || '').toLowerCase();
               const isNightAllowance = isWage && (descLower.includes('night duty') || descLower.includes('night allowance') || descLower.includes('overtime'));
               
               const IconComp = isNightAllowance ? Zap : isWage ? ArrowDownLeft : isPayment ? CheckCircle2 : TrendingDown;
               const label = isNightAllowance ? 'Night Duty / Overtime' : isWage ? 'Daily Wage Log' : isPayment ? 'Settlement Payment' : 'Advance Taken';
               const isDeduction = isAdvance;
               const prefix = isDeduction ? '−' : '+';
               const amountColor = isAdvance ? 'text-amber-500' : isPayment ? 'text-emerald-500' : isNightAllowance ? 'text-purple-500' : 'text-neutral-900 dark:text-white';

               return (
                 <Card key={entry.id} className="border-none bg-white dark:bg-neutral-900/40 backdrop-blur-xl rounded-[2rem] border border-black/5 dark:border-white/5 overflow-hidden group hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-all duration-300">
                    <CardContent className="p-6">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${
                               isAdvance 
                                 ? 'bg-amber-500 shadow-amber-500/20' 
                                 : isPayment 
                                 ? 'bg-emerald-600 shadow-emerald-600/20' 
                                 : isNightAllowance 
                                 ? 'bg-purple-600 shadow-purple-600/20' 
                                 : 'bg-orange-600 shadow-orange-600/20'
                             }`}>
                                <IconComp size={24} strokeWidth={2.5} />
                             </div>
                             <div>
                                <p className="text-base font-black text-neutral-900 dark:text-white tracking-tight uppercase italic leading-none">{label}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                   <Calendar size={12} className="text-neutral-400" />
                                   <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest italic">
                                      {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                   </span>
                                </div>
                                {entry.description && (
                                  <p className="text-[9px] text-neutral-500 mt-1 italic">{entry.description}</p>
                                )}
                             </div>
                          </div>
                          <div className="text-right">
                             <h4 className={`text-2xl font-black tabular-nums italic tracking-tighter ${amountColor}`}>
                               {prefix}Rs {Number(entry.amount).toLocaleString()}
                             </h4>
                             <div className="flex items-center justify-end gap-1 mt-1 text-[8px] font-black uppercase tracking-[0.2em] italic text-neutral-400">
                                {isAdvance ? 'Advance' : isPayment ? 'Settled' : 'Earned'}
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
      <div className="relative z-10 pt-6 flex flex-col items-center gap-4 opacity-40">
         <div className="flex items-center gap-4 bg-white/5 px-6 py-2.5 rounded-full border border-white/10">
            <ShieldCheck size={16} className="text-orange-500" />
            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.4em]">
               CHATTERJEE ENTERPRIZE SECURE PAYROLL SYSTEM // ENCRYPTED WORKER PORTAL
            </p>
         </div>
      </div>
    </div>
  );
}
