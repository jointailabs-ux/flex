import React, { useState, useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Store, 
  User, 
  CreditCard,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  History,
  Activity,
  ArrowRight,
  Wallet,
  Briefcase,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/queries/useTransactions';
import { useStores } from '../hooks/queries/useInventory';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface Transaction {
  id: string;
  date: string;
  type: 'SALE' | 'PURCHASE' | 'PAYOUT';
  amount: number;
  entity: string;
  store: string;
  store_id: string | null;
  user: string;
  method: string;
  ref: string;
}

interface TransactionRowProps {
  tx: Transaction;
  idx: number;
  formatCurrency: (v: number) => string;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ tx, idx, formatCurrency }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDetails = async () => {
    if (isOpen || tx.type !== 'SALE') return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/sale-details/${tx.id}`);
      const data = await res.json();
      setDetails(data);
    } catch (err) {
      toast.error('Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = () => {
    switch (tx.type) {
      case 'SALE':
        return { 
          bg: 'bg-emerald-500/10', 
          text: 'text-emerald-600', 
          border: 'border-emerald-500/20', 
          icon: <ArrowDownLeft size={10} strokeWidth={4} />,
          prefix: '+'
        };
      case 'PURCHASE':
        return { 
          bg: 'bg-rose-500/10', 
          text: 'text-rose-600', 
          border: 'border-rose-500/20', 
          icon: <ArrowUpRight size={10} strokeWidth={4} />,
          prefix: ''
        };
      case 'PAYOUT':
        return { 
          bg: 'bg-orange-500/10', 
          text: 'text-orange-600', 
          border: 'border-orange-500/20', 
          icon: <Wallet size={10} strokeWidth={4} />,
          prefix: ''
        };
    }
  };

  const config = getStatusConfig();

  return (
    <>
      <motion.tr 
         initial={{ opacity: 0, x: -10 }}
         animate={{ opacity: 1, x: 0 }}
         transition={{ delay: idx * 0.02 }}
         className={`hover:bg-orange-500/[0.02] transition-colors group cursor-pointer ${isOpen ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}`}
         onClick={() => {
           if (tx.type === 'SALE') {
             fetchDetails();
             setIsOpen(!isOpen);
           }
         }}
      >
         <td className="px-4 md:px-10 py-6 md:py-10">
            <div className="flex flex-col">
               <span className="text-sm font-black text-foreground tracking-tight italic">
                  {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
               </span>
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-40">
                  {new Date(tx.date).getFullYear()}
               </span>
            </div>
         </td>
         <td className="px-4 md:px-10 py-6 md:py-10">
            <div className="flex items-center gap-3">
               <div className={`w-2 h-2 rounded-full ${tx.type === 'SALE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : tx.type === 'PURCHASE' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.5)]'}`} />
               <span className="text-[11px] font-black text-foreground/60 font-mono tracking-tighter uppercase">{tx.ref}</span>
            </div>
         </td>
         <td className="px-4 md:px-10 py-6 md:py-10">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-sm ${config.bg} ${config.text} ${config.border}`}>
               {config.icon}
               {tx.type}
            </div>
         </td>
         <td className="px-4 md:px-10 py-6 md:py-10">
            <div className="flex items-center gap-5">
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[11px] font-black border transition-all duration-500 group-hover:scale-110 shadow-sm ${
                 tx.type === 'SALE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                 tx.type === 'PURCHASE' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 
                 'bg-orange-500/10 text-orange-600 border-orange-500/20'
               }`}>
                  {tx.type === 'PAYOUT' ? <User size={18} /> : tx.entity[0]?.toUpperCase()}
               </div>
               <div className="flex flex-col">
                  <span className="text-base font-black text-foreground tracking-tight group-hover:text-orange-600 transition-colors">
                     {tx.entity}
                  </span>
                  <div className="flex items-center gap-2 mt-1.5">
                     <div className="px-3 py-1 rounded-lg bg-muted/50 text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-2 border border-border/40">
                        {tx.type === 'PAYOUT' ? <Briefcase size={10} /> : <Store size={10} />}
                        {tx.store}
                     </div>
                  </div>
               </div>
            </div>
         </td>
         <td className="px-10 py-10 text-right">
            <div className="flex flex-col items-end">
               <span className={`text-2xl font-black tabular-nums tracking-tighter italic ${tx.type === 'SALE' ? 'text-emerald-500' : tx.type === 'PURCHASE' ? 'text-rose-500' : 'text-orange-500'}`}>
                  {config.prefix}{formatCurrency(tx.amount)}
               </span>
               <div className="flex items-center gap-2 mt-1">
                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">{tx.method}</span>
                 {tx.type === 'SALE' && <ChevronRight size={14} className={`text-orange-600 transition-transform ${isOpen ? 'rotate-90' : ''}`} />}
               </div>
            </div>
         </td>
      </motion.tr>
      
      <AnimatePresence>
        {isOpen && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-muted/10 border-b border-orange-500/10"
          >
            <td colSpan={5} className="px-12 py-10">
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                   <div className="h-px flex-1 bg-orange-500/10" />
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600/60">Sale Items</p>
                   <div className="h-px flex-1 bg-orange-500/10" />
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Zap size={24} className="text-orange-600 animate-pulse" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {details.map((item: any) => (
                      <div key={item.id} className="bg-background/40 backdrop-blur-md p-6 rounded-[2rem] flex flex-col gap-3 border border-white/5 shadow-inner hover:border-orange-500/20 transition-all group/item">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-black uppercase tracking-tight group-hover/item:text-orange-600 transition-colors">{item.finished_products?.name || 'Unknown Product'}</span>
                          <span className="text-xs font-black text-emerald-500">{formatCurrency(item.unit_price * item.quantity)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                           <div className="flex items-center gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                             <span>Qty: {item.quantity}</span>
                             {item.width_ft && <span className="opacity-40">|</span>}
                             {item.width_ft && <span>{item.width_ft}x{item.height_ft} ft</span>}
                           </div>
                           <div className="w-8 h-8 rounded-full bg-emerald-500/5 flex items-center justify-center text-emerald-500">
                              <ArrowDownLeft size={12} strokeWidth={3} />
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function TransactionsPage() {
  const { profile } = useAuth();
  const { data: stores = [] } = useStores();
  const isManager = profile?.role === 'store_manager';
  const today = new Date().toISOString().split('T')[0];
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState(isManager ? (profile?.store_id || 'all') : 'all');
  const [startDate, setStartDate] = useState(isManager ? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] : today);
  const [endDate, setEndDate] = useState(today);
  const [filterType, setFilterType] = useState<'all' | 'SALE' | 'PURCHASE' | 'PAYOUT'>('all');

  React.useEffect(() => {
    if (isManager && profile?.store_id) {
      setSelectedStoreId(profile.store_id);
    }
  }, [profile, isManager]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: transactions = [], isLoading: loading, isError, error: txError } = useTransactions({
    storeId: selectedStoreId,
    startDate,
    endDate
  });

  const filteredTransactions = useMemo<Transaction[]>(() => {
    let list = transactions as Transaction[];
    
    if (filterType !== 'all') {
      list = list.filter(t => t.type === filterType);
    }

    return list.filter(t => 
      t.entity.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      t.ref.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      t.type.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [transactions, debouncedSearch, filterType]);

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'SALE').reduce((sum, t) => sum + t.amount, 0);
    const expense = Math.abs(transactions.filter(t => t.type === 'PURCHASE').reduce((sum, t) => sum + t.amount, 0));
    const payouts = Math.abs(transactions.filter(t => t.type === 'PAYOUT').reduce((sum, t) => sum + t.amount, 0));
    return { income, expense, payouts, net: income - expense - payouts };
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative">
           <div className="absolute inset-0 bg-orange-600 blur-3xl opacity-20 animate-pulse hidden lg:block" />
           <div className="w-20 h-20 brand-gradient rounded-[2.5rem] animate-spin mb-8 flex items-center justify-center relative z-10 shadow-2xl">
              <div className="w-10 h-10 bg-[#0a0a0a] rounded-2xl" />
           </div>
        </div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.5em] animate-pulse italic">Loading transactions...</p>
      </div>
    );
  }

  const storeName = isManager ? (stores as any[]).find((s: any) => s.id === profile?.store_id)?.name : null;

  return (
    <div className="space-y-12 pb-32">
      {/* Header & Search */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-10">
        <div className="space-y-2">
           <h2 className="text-5xl font-black tracking-tighter text-foreground uppercase italic leading-none">
             {isManager ? <>{storeName || 'Store'} <span className="text-orange-600">Sales</span></> : <>Business <span className="text-orange-600">Ledger</span></>}
           </h2>
           <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.6em]">{isManager ? 'Day-wise Sales & Collection' : 'Transaction History'}</p>
           </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 w-full xl:w-auto">
          <div className="relative flex-1 md:flex-none md:w-96 group">
             <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Search className="text-muted-foreground group-focus-within:text-orange-600 transition-colors" size={20} strokeWidth={3} />
             </div>
             <Input 
                placeholder="Find entity, ref or type..." 
                className="pl-16 h-16 rounded-3xl bg-card/40 backdrop-blur-2xl border-none shadow-2xl font-black text-sm transition-all focus:ring-2 focus:ring-orange-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          
          <div className="flex items-center gap-3 p-2 bg-muted/30 backdrop-blur-md rounded-[2.5rem] border border-white/5 shadow-inner">
             {profile?.role === 'owner' && (
                <div className="flex gap-1.5 px-2">
                  <button 
                   onClick={() => setSelectedStoreId('all')}
                   className={`h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedStoreId === 'all' ? 'brand-gradient text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    All
                  </button>
                  {stores.map(s => (
                    <button 
                     key={s.id}
                     onClick={() => setSelectedStoreId(s.id)}
                     className={`h-12 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedStoreId === s.id ? 'bg-orange-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {s.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
             )}
             <div className="w-px h-8 bg-white/5" />
             <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-white/5 text-muted-foreground hover:text-orange-600 transition-all">
                <Download size={22} strokeWidth={2.5} />
             </Button>
          </div>
        </div>
      </div>

      {/* Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {[
           { label: 'Inflow', value: stats.income, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
           { label: 'Outflow', value: stats.expense, icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10' },
           { label: 'Personnel', value: stats.payouts, icon: Wallet, color: 'text-orange-500', bg: 'bg-orange-500/10' },
         ].map((item, i) => (
           <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
           >
              <Card className="rounded-[3.5rem] border border-black/5 dark:border-white/5 shadow-2xl bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl overflow-hidden group hover:scale-[1.05] transition-all duration-500">
                 <CardContent className="p-10 relative">
                    <div className={`absolute top-0 right-0 w-32 h-32 ${item.bg} opacity-10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 hidden lg:block`} />
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.bg} ${item.color} mb-8 shadow-inner border border-black/5 dark:border-white/5`}>
                       <item.icon size={28} strokeWidth={3} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 mb-2">{item.label}</p>
                    <h3 className="text-3xl font-black text-foreground tracking-tighter tabular-nums italic">{formatCurrency(item.value)}</h3>
                 </CardContent>
              </Card>
           </motion.div>
         ))}
      </div>

      {/* Main Ledger Table */}
      <Card className="rounded-[4rem] border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl overflow-hidden relative border border-black/5 dark:border-white/5">
         <CardHeader className="p-12 pb-10 border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
               <div className="flex items-center gap-6">
                  <div className="w-18 h-18 brand-gradient rounded-[2rem] flex items-center justify-center text-white shadow-[0_20px_40px_rgba(234,88,12,0.3)] border-2 border-white/20">
                     <History size={36} strokeWidth={2.5} />
                  </div>
                  <div>
                     <CardTitle className="text-4xl font-black tracking-tighter uppercase italic leading-none">
                        Business <span className="text-orange-600">Ledger</span>
                     </CardTitle>
                     <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.5em] mt-2">All Recorded Transactions</p>
                  </div>
               </div>

               <div className="flex flex-wrap items-center gap-3 p-2 bg-black/5 dark:bg-neutral-950/40 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                  {[
                    { id: 'all', label: 'All', color: 'brand-gradient' },
                    { id: 'SALE', label: 'Sales', color: 'bg-emerald-600' },
                    ...(!isManager ? [
                      { id: 'PURCHASE', label: 'Purchases', color: 'bg-rose-600' },
                      { id: 'PAYOUT', label: 'Payouts', color: 'bg-orange-600' },
                    ] : []),
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setFilterType(tab.id as any)}
                      className={`h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === tab.id ? `${tab.color} text-white shadow-2xl scale-105` : 'text-neutral-500 hover:text-white'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
               </div>

               <div className="flex flex-wrap items-center gap-2 p-2 bg-black/5 dark:bg-neutral-950/40 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                  {[
                    { label: 'Today', getValue: () => ({ start: today, end: today }) },
                    { label: 'Yesterday', getValue: () => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      const s = d.toISOString().split('T')[0];
                      return { start: s, end: s };
                    }},
                    { label: 'Last 7 Days', getValue: () => {
                      const d = new Date();
                      d.setDate(d.getDate() - 7);
                      return { start: d.toISOString().split('T')[0], end: today };
                    }},
                    { label: 'This Month', getValue: () => ({ 
                      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
                      end: today 
                    })},
                  ].map(filter => (
                    <button 
                      key={filter.label}
                      onClick={() => {
                        const { start, end } = filter.getValue();
                        setStartDate(start);
                        setEndDate(end);
                      }}
                      className="h-10 px-4 rounded-xl text-[8px] font-black uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                      {filter.label}
                    </button>
                  ))}
               </div>

               <div className="flex items-center gap-4 p-2 bg-black/5 dark:bg-neutral-950/40 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
                  <div className="flex items-center gap-4 px-6 border-r border-black/5 dark:border-white/5">
                     <Calendar size={18} className="text-orange-600" />
                     <Input 
                        type="date" 
                        className="h-10 w-40 bg-transparent border-none text-xs font-black uppercase outline-none focus:ring-0 p-0 text-foreground"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                     />
                  </div>
                  <div className="flex items-center gap-4 px-6">
                     <ArrowRight size={18} className="text-neutral-600" />
                     <Input 
                        type="date" 
                        className="h-10 w-40 bg-transparent border-none text-xs font-black uppercase outline-none focus:ring-0 p-0 text-foreground"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                     />
                  </div>
               </div>
            </div>
         </CardHeader>

         <CardContent className="p-0">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="bg-black/[0.03] dark:bg-white/[0.03] border-b border-black/5 dark:border-white/5">
                        <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-neutral-500">Date</th>
                        <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-neutral-500">Reference</th>
                        <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-neutral-500">Type</th>
                        <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-neutral-500">Customer / Vendor</th>
                        <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-neutral-500 text-right">Amount</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                     <AnimatePresence mode="popLayout">
                        {filteredTransactions.length === 0 ? (
                           <tr>
                              <td colSpan={5} className="py-48 text-center bg-black/[0.01] dark:bg-white/[0.01]">
                                 <div className="flex flex-col items-center gap-6 opacity-20">
                                    <Activity size={80} strokeWidth={1} />
                                    <p className="text-xs font-black uppercase tracking-[0.8em]">No Transactions Found</p>
                                 </div>
                              </td>
                           </tr>
                        ) : (
                           filteredTransactions.map((tx, idx) => (
                              <TransactionRow key={tx.id} tx={tx} idx={idx} formatCurrency={formatCurrency} />
                           ))
                        )}
                     </AnimatePresence>
                  </tbody>
               </table>
            </div>
         </CardContent>
      </Card>
      
      <div className="text-center">
         <p className="text-[10px] font-black text-neutral-800 uppercase tracking-[0.6em]">
            Chatterjee Enterprize Business Manager
         </p>
      </div>
    </div>
  );
}
