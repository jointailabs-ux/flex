import React, { useMemo } from 'react';
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
  TrendingDown
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useSalaryRecords } from '../../hooks/queries/useWorkforce';

const getMonthName = (monthNumber: number) => {
  const date = new Date();
  date.setMonth(monthNumber - 1);
  return date.toLocaleString('default', { month: 'long' });
};

export default function PermanentStaffDashboard() {
  const { profile, signOut } = useAuth();
  const { data: allSalaryRecords = [], isLoading } = useSalaryRecords();

  const paymentStats = useMemo(() => {
    if (!profile) return { totalPaid: 0, payouts: [], recentPayment: null };

    const staffSalaryRecords = allSalaryRecords
      .filter((e: any) => e.staff_id === profile.id)
      .sort((a: any, b: any) => {
         if (b.year !== a.year) return b.year - a.year;
         return b.month - a.month;
      });
      
    // Only count 'paid' salaries towards lifetime earnings
    const totalPaid = staffSalaryRecords
      .filter((e: any) => e.status === 'paid')
      .reduce((sum: number, e: any) => sum + Number(e.net_payable), 0);
      
    const recentPayment = staffSalaryRecords.length > 0 ? staffSalaryRecords[0] : null;

    return {
      totalPaid,
      payouts: staffSalaryRecords,
      recentPayment
    };
  }, [allSalaryRecords, profile]);

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
           <p className="text-xs font-black text-neutral-500 uppercase tracking-[0.5em] animate-pulse">Accessing Payroll Records</p>
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

      {/* Modern Top Header */}
      <div className="relative z-10 flex items-center justify-between bg-neutral-50/50 dark:bg-white/[0.02] backdrop-blur-3xl p-4 rounded-[2.5rem] border border-black/5 dark:border-white/5 shadow-2xl">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center text-white border border-white/20 shadow-lg">
               <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <div>
               <h3 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight leading-none uppercase italic">{profile?.name}</h3>
               <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mt-1 italic opacity-80">Permanent Workforce Unit</p>
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

      {/* Main Impact Hero - Total Received */}
      <Card className="relative z-10 border-none shadow-[0_40px_100px_-20px_rgba(234,88,12,0.4)] rounded-[4rem] bg-white dark:bg-neutral-950 overflow-hidden border border-black/5 dark:border-white/5 group">
         <div className="absolute inset-0 brand-gradient opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
         <div className="absolute -right-20 -top-20 w-80 h-80 bg-orange-600/20 blur-[100px] rounded-full hidden lg:block" />
         
         <CardContent className="p-10 lg:p-16 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 border border-orange-500/20">
                        <IndianRupee size={20} strokeWidth={3} />
                     </div>
                     <p className="text-xs font-black text-orange-500 uppercase tracking-[0.4em]">Lifetime Earnings Received</p>
                  </div>
                  <div className="space-y-2">
                     <h1 className="text-6xl lg:text-9xl font-black text-neutral-900 dark:text-white tracking-tighter leading-none italic drop-shadow-2xl">
                        Rs {paymentStats.totalPaid.toLocaleString()}
                     </h1>
                     <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.5em] ml-2 flex items-center gap-3">
                        <Zap size={14} className="text-orange-600 animate-pulse" /> Verified Net Disbursements
                     </p>
                  </div>
               </div>

                {paymentStats.recentPayment && (
                 <div className="bg-neutral-50 dark:bg-white/[0.03] backdrop-blur-2xl p-8 rounded-[3rem] border border-black/10 dark:border-white/10 flex items-center gap-6 shadow-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
                       <CheckCircle2 size={32} strokeWidth={2.5} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Most Recent Salary</p>
                       <h4 className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums">+Rs {Number(paymentStats.recentPayment.net_payable).toLocaleString()}</h4>
                       <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1 opacity-80 italic">
                         {getMonthName(paymentStats.recentPayment.month)} {paymentStats.recentPayment.year}
                       </p>
                    </div>
                 </div>
               )}
            </div>
         </CardContent>
      </Card>

      {/* Payment Matrix Section */}
      <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-between px-6">
             <div className="space-y-1">
                <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white uppercase italic leading-none">
                   Monthly <span className="text-orange-600">Payroll</span>
                </h2>
               <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] mt-2">Transparent record of all monthly payouts</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-neutral-500">
               <History size={24} />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paymentStats.payouts.length === 0 ? (
               <div className="col-span-full py-20 flex flex-col items-center gap-6 bg-white/[0.02] rounded-[3rem] border border-dashed border-white/10">
                  <Receipt size={64} strokeWidth={1} className="text-neutral-700" />
                  <p className="text-xs font-black text-neutral-500 uppercase tracking-[0.4em]">No salary records found yet</p>
               </div>
             ) : paymentStats.payouts.map((entry: any) => (
               <Card key={entry.id} className="border-none bg-white dark:bg-neutral-900/40 backdrop-blur-xl rounded-[2.5rem] border border-black/5 dark:border-white/5 overflow-hidden group hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-all duration-500">
                  <CardContent className="p-8">
                     <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-6">
                               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110 ${entry.status === 'paid' ? 'bg-orange-600 shadow-orange-600/20' : 'bg-neutral-700 shadow-neutral-900/20'}`}>
                                 {entry.status === 'paid' ? <ArrowDownLeft size={28} strokeWidth={3} /> : <Clock size={28} strokeWidth={3} />}
                              </div>
                              <div>
                                 <p className="text-xl font-black text-neutral-900 dark:text-white tracking-tight uppercase italic leading-none">Salary Payout</p>
                                 <div className="flex items-center gap-3 mt-2">
                                    <Calendar size={12} className="text-neutral-500" />
                                    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest italic">
                                       {getMonthName(entry.month)} {entry.year}
                                    </span>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <h4 className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums italic tracking-tighter">Rs {Number(entry.net_payable).toLocaleString()}</h4>
                              <div className={`flex items-center justify-end gap-2 mt-1 text-[8px] font-black uppercase tracking-[0.2em] italic ${entry.status === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                 {entry.status === 'paid' ? <><CheckCircle2 size={10} /> Paid</> : <><Clock size={10} /> Pending</>}
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-black/5 dark:border-white/5">
                           <div>
                              <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Basic + OT</p>
                              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Rs {Number(entry.basic + entry.overtime_amount).toLocaleString()}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Bonus</p>
                              <p className="text-xs font-bold text-emerald-400">+ Rs {Number(entry.bonus).toLocaleString()}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Deductions</p>
                              <p className="text-xs font-bold text-red-400">- Rs {Number(entry.deductions).toLocaleString()}</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-1">Advances</p>
                              <p className="text-xs font-bold text-red-400">- Rs {Number(entry.advance_deducted).toLocaleString()}</p>
                           </div>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            ))}
         </div>
      </div>

      {/* Security Footer */}
      <div className="relative z-10 pt-10 flex flex-col items-center gap-6 opacity-40 grayscale group-hover:grayscale-0 transition-all">
         <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 px-6 py-3 rounded-full border border-black/10 dark:border-white/10">
            <ShieldCheck size={16} className="text-orange-500" />
            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.5em]">
               CHATTERJEE ENTERPRIZE SECURE PAYROLL SYSTEM // DATA ENCRYPTED
            </p>
         </div>
      </div>
    </div>
  );
}
