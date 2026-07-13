import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Box, 
  CreditCard, 
  Store, 
  AlertTriangle, 
  Truck, 
  Activity, 
  Users, 
  Wallet, 
  Smartphone, 
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ShieldCheck,
  PieChart as PieChartIcon,
  Landmark
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useStores, useProducts, useRawMaterials, useVendors, useSales, useTopProducts } from '../../hooks/queries/useInventory';
import { usePermanentStaff, useTempWorkers, useSalaryRecords, useWorkerLedger, useOtherExpenses, useAttendance } from '../../hooks/queries/useWorkforce';
import { useCorporateClients } from '../../hooks/queries/useCorporateClients';
import { motion } from 'motion/react';
import { Badge } from '../ui/badge';

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

export default function OwnerDashboard() {
  const [selectedStoreId, setSelectedStoreId] = useState('all');
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { navigateTo } = useAuth();

  const { data: stores = [], isLoading: storesLoading } = useStores();
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: materials = [], isLoading: materialsLoading } = useRawMaterials();
  const { data: vendors = [], isLoading: vendorsLoading } = useVendors();
  const { data: sales = [], isLoading: salesLoading } = useSales(selectedStoreId);
  const { data: topProducts = [], isLoading: topProductsLoading } = useTopProducts(timeFilter);
  const { data: corporateClients = [], isLoading: corporateLoading } = useCorporateClients();
  
  // Workforce & Expense data
  const { data: permanentStaff = [] } = usePermanentStaff();
  const { data: tempWorkers = [] } = useTempWorkers();
  const { data: salaries = [] } = useSalaryRecords({ 
    month: selectedMonth, 
    year: selectedYear 
  });
  const { data: workerLedger = [] } = useWorkerLedger({}); 
  const { data: attendance = [] } = useAttendance({});
  const { data: expenses = [] } = useOtherExpenses({ 
    month: selectedMonth, 
    year: selectedYear 
  });

  const loading = storesLoading || productsLoading || materialsLoading || vendorsLoading || salesLoading || corporateLoading;

  // Time-based filtering logic
  const filteredSales = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return (sales as any[]).filter(sale => {
      const saleDate = new Date(sale.created_at);
      if (timeFilter === 'daily') {
        return saleDate >= today;
      } else if (timeFilter === 'weekly') {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        return saleDate >= lastWeek;
      } else if (timeFilter === 'monthly') {
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return saleDate >= thisMonth;
      }
      return true;
    });
  }, [sales, timeFilter]);

  const revenueStats = useMemo(() => {
    const stats = {
      total: 0,
      upi: 0,
      cash: 0,
      byStore: {} as Record<string, { upi: number; cash: number; total: number }>
    };

    filteredSales.forEach(sale => {
      const amount = Number(sale.total_amount || 0);
      const mode = (sale.payment_method || 'Cash').toLowerCase();
      const storeId = sale.store_id;

      stats.total += amount;
      if (mode === 'upi') stats.upi += amount;
      else stats.cash += amount;

      if (!stats.byStore[storeId]) {
        stats.byStore[storeId] = { upi: 0, cash: 0, total: 0 };
      }
      stats.byStore[storeId].total += amount;
      if (mode === 'upi') stats.byStore[storeId].upi += amount;
      else stats.byStore[storeId].cash += amount;
    });

    return stats;
  }, [filteredSales]);

  const vendorDues = useMemo(() => (vendors as any[]).reduce((sum: number, v: any) => sum + Number(v.current_balance || 0), 0), [vendors]);
  
  const corporateDues = useMemo(() => {
    return (corporateClients as any[]).reduce((sum: number, client: any) => {
      const bal = Number(client.totalBalance || 0);
      return bal < 0 ? sum + Math.abs(bal) : sum;
    }, 0);
  }, [corporateClients]);
  
  const workforceLiability = useMemo(() => {
    // 1. Permanent Staff Calculation (matches SalaryManagement logic - Global)
    const permanentLiability = permanentStaff
      .reduce((sum: number, member: any) => {
        // Check if salary record already exists for this month
        const existing = salaries.find((s: any) => s.staff_id === member.id && s.month === selectedMonth && s.year === selectedYear);
        if (existing) return sum + Number(existing.net_payable || 0);

        // Otherwise calculate like SalaryManagement
        const memberAttendance = attendance.filter((a: any) => 
          a.worker_id === member.id && 
          a.worker_type === 'permanent' &&
          new Date(a.date).getMonth() + 1 === selectedMonth &&
          new Date(a.date).getFullYear() === selectedYear
        );
        const totalOTHours = memberAttendance.reduce((acc: number, a: any) => acc + Number(a.overtime_hours || 0), 0);
        const otRate = (Number(member.basic_salary || 0) / 30 / 8) * 1.5;
        const otAmount = totalOTHours * otRate;

        const memberLedger = workerLedger.filter((e: any) => e.worker_id === member.id && e.worker_type === 'permanent');
        const balance = memberLedger.reduce((acc: number, e: any) => {
          if (['advance_given', 'payment_made'].includes(e.transaction_type)) return acc - Number(e.amount);
          if (['bonus_added', 'advance_recovered', 'wage_earned'].includes(e.transaction_type)) return acc + Number(e.amount);
          return acc;
        }, 0);

        const netPayable = Number(member.basic_salary || 0) + otAmount + (balance > 0 ? balance : 0) - (balance < 0 ? Math.abs(balance) : 0);
        return sum + netPayable;
      }, 0);
    
    // 2. Temp Workers Calculation (Global/Store-filtered)
    const tempLiability = tempWorkers
      .filter((worker: any) => selectedStoreId === 'all' || worker.store_id === selectedStoreId)
      .reduce((sum: number, worker: any) => {
        const workerLedgerEntries = workerLedger.filter((e: any) => e.worker_id === worker.id && e.worker_type === 'temporary');
        
        const totalEarned = workerLedgerEntries
          .filter((e: any) => e.transaction_type === 'wage_earned')
          .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);

        const alreadyPaid = workerLedgerEntries
          .filter((e: any) => ['payment_made', 'advance_given'].includes(e.transaction_type))
          .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);

        const balance = totalEarned - alreadyPaid;
        return sum + balance;
      }, 0);

    // 3. Operating Expenses Calculation
    const businessExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

    return { 
      total: permanentLiability + tempLiability + businessExpenses, 
      permanent: permanentLiability, 
      temp: tempLiability,
      operating: businessExpenses
    };
  }, [permanentStaff, tempWorkers, salaries, workerLedger, attendance, expenses, selectedMonth, selectedYear, selectedStoreId]);

  const lowStockItems = useMemo(() => (materials as any[]).flatMap((material: any) => {
    const threshold = Number(material.low_stock_threshold || 100);
    return (material.store_stock || [])
      .filter((stock: any) => selectedStoreId === 'all' || stock.store_id === selectedStoreId)
      .filter((stock: any) => Number(stock.quantity || 0) <= threshold)
      .map((stock: any) => ({
        material: material.name,
        store: (stores as any[]).find((store: any) => store.id === stock.store_id)?.name || 'Store',
        quantity: Number(stock.quantity || 0),
        threshold
      }));
  }), [materials, selectedStoreId, stores]);

  const performanceData = useMemo(() => {
    const grouped: Record<string, { name: string; revenue: number; upi: number; cash: number }> = {};
    filteredSales.forEach((sale) => {
      const date = new Date(sale.created_at);
      const label = timeFilter === 'daily' 
        ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      
      if (!grouped[label]) {
        grouped[label] = { name: label, revenue: 0, upi: 0, cash: 0 };
      }
      const amount = Number(sale.total_amount || 0);
      grouped[label].revenue += amount;
      if ((sale.payment_method || '').toLowerCase() === 'upi') grouped[label].upi += amount;
      else grouped[label].cash += amount;
    });
    return Object.values(grouped);
  }, [filteredSales, timeFilter]);

  const productStats = useMemo(() => {
    const stats: Record<string, number> = {};
    // Note: We need sale_items to accurately track this, but we can approximate if sales have item summaries
    // For now, let's assume we have products mapped in sales or we fetch sale_items
    return []; 
  }, [filteredSales]);

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6 md:space-y-12 pb-16">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 md:gap-8">
        <div className="space-y-1">
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="flex items-center gap-3 mb-1"
           >
              <div className="w-1.5 h-8 brand-gradient rounded-full" />
              <h1 className="text-2xl md:text-5xl font-black tracking-tighter text-foreground uppercase">
                Owner <span className="text-orange-600">Hub</span>
              </h1>
           </motion.div>
           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] ml-4 opacity-70">Strategic Command Center</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-muted/20 p-1.5 rounded-[2rem] lg:rounded-full backdrop-blur-xl border border-white/5">
           {/* Store Filter */}
           <div className="flex items-center gap-2 px-5 py-1.5 border-b md:border-b-0 md:border-r border-border/30">
              <Store size={14} className="text-orange-600" />
              <select
                className="bg-transparent text-[9px] font-black outline-none cursor-pointer uppercase tracking-widest"
                value={selectedStoreId}
                onChange={(event) => setSelectedStoreId(event.target.value)}
              >
                <option value="all">Global</option>
                {stores.map((store: any) => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
           </div>

           <div className="flex items-center gap-2 px-5 py-1.5 border-b md:border-b-0 md:border-r border-border/30">
              <Activity size={14} className="text-indigo-600" />
              <select 
                className="bg-transparent text-[9px] font-black outline-none cursor-pointer uppercase tracking-widest"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select 
                className="bg-transparent text-[9px] font-black outline-none cursor-pointer uppercase tracking-widest ml-1"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
           </div>

           {/* Time Filter */}
           <div className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-full">
              {(['daily', 'weekly', 'monthly'] as const).map((filter) => (
                <Button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  variant="ghost"
                  className={`h-8 px-4 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${
                    timeFilter === filter 
                    ? 'bg-orange-600 text-white shadow-lg' 
                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {filter}
                </Button>
              ))}
           </div>
           
           <Button
             className="rounded-full brand-gradient hover:scale-105 active:scale-95 text-white font-black px-6 h-10 shadow-xl shadow-orange-500/20 transition-all uppercase tracking-widest text-[8px]"
             onClick={() => navigateTo('/pos')}
           >
             Launch POS
           </Button>
        </div>
      </div>

      {/* Primary KPI Grid - Organized into logical groups */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 lg:gap-8">
        {[
          { 
            label: 'Total Revenue', 
            value: `₹${revenueStats.total.toLocaleString()}`, 
            icon: TrendingUp, 
            color: 'text-orange-600', 
            bg: 'bg-orange-500/10', 
            trend: `${filteredSales.length} Orders`, 
            up: true, 
            border: 'border-orange-500/20' 
          },
          { 
            label: 'Digital UPI', 
            value: `₹${revenueStats.upi.toLocaleString()}`, 
            icon: Smartphone, 
            color: 'text-blue-500', 
            bg: 'bg-blue-500/10', 
            trend: `${((revenueStats.upi / (revenueStats.total || 1)) * 100).toFixed(0)}% Share`, 
            up: true, 
            border: 'border-blue-500/20' 
          },
          { 
            label: 'Physical Cash', 
            value: `₹${revenueStats.cash.toLocaleString()}`, 
            icon: Banknote, 
            color: 'text-emerald-500', 
            bg: 'bg-emerald-500/10', 
            trend: `${((revenueStats.cash / (revenueStats.total || 1)) * 100).toFixed(0)}% Share`, 
            up: true, 
            border: 'border-emerald-500/20' 
          },
          { 
            label: 'Vendor Dues', 
            value: `₹${vendorDues.toLocaleString()}`, 
            icon: Truck, 
            color: 'text-red-600', 
            bg: 'bg-red-500/10', 
            trend: `${vendors.length} Vendors`, 
            up: false, 
            border: 'border-red-500/20' 
          },
          { 
            label: 'Corporate Dues', 
            value: `₹${corporateDues.toLocaleString()}`, 
            icon: Landmark, 
            color: 'text-red-500', 
            bg: 'bg-red-500/10', 
            trend: `${corporateClients.length} Groups`, 
            up: false, 
            border: 'border-red-500/20' 
          },
          { 
            label: 'Perm Salary', 
            value: `₹${workforceLiability.permanent.toLocaleString()}`, 
            icon: ShieldCheck, 
            color: 'text-indigo-600', 
            bg: 'bg-indigo-500/10', 
            trend: `${salaries.length} Staff`, 
            up: false, 
            border: 'border-indigo-500/20' 
          },
          { 
            label: 'Temp Wages', 
            value: `₹${workforceLiability.temp.toLocaleString()}`, 
            icon: Users, 
            color: 'text-pink-600', 
            bg: 'bg-pink-500/10', 
            trend: `${tempWorkers.length} Workers`, 
            up: false, 
            border: 'border-pink-500/20' 
          },
          { 
            label: 'Operating Exp', 
            value: `₹${workforceLiability.operating.toLocaleString()}`, 
            icon: Wallet, 
            color: 'text-orange-600', 
            bg: 'bg-orange-500/10', 
            trend: `${expenses.length} Entries`, 
            up: false, 
            border: 'border-orange-500/20'
          },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="group relative col-span-1"
          >
            <Card className={`border-2 ${kpi.border} shadow-2xl rounded-[2.5rem] bg-card/30 backdrop-blur-3xl hover:bg-card/50 transition-all duration-500 relative overflow-hidden h-full flex flex-col justify-between p-6 md:p-8`}>
              <div className={`absolute -right-10 -top-10 w-32 h-32 ${kpi.bg} rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-700`} />
              
              <div className="relative z-10 flex flex-col h-full gap-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl ${kpi.bg} ${kpi.color} shadow-inner`}>
                    <kpi.icon size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col items-end">
                    <Badge variant="outline" className="bg-background/40 backdrop-blur-md border-border/20 text-[9px] font-black tracking-tighter py-0 px-2 rounded-lg">
                      {kpi.trend}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{kpi.label}</h4>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl md:text-3xl lg:text-4xl font-black tabular-nums tracking-tight ${kpi.color}`}>
                      {kpi.value}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border/10 flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Status: Nominal</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${kpi.up ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'} `} />
                </div>
              </div>

              <div className="absolute bottom-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Activity size={40} className="rotate-12" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* Sales Performance Heatmap */}
        <Card className="xl:col-span-8 border-none shadow-premium rounded-[3.5rem] bg-card/60 backdrop-blur-2xl overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
          <CardHeader className="p-10 pb-0 flex flex-col md:flex-row items-center justify-between relative z-10 gap-4">
            <div className="space-y-1 text-center md:text-left">
              <CardTitle className="text-3xl font-black tracking-tighter uppercase">Revenue Heatmap</CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-600 mt-1">Transaction Intensity & Timing</CardDescription>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
               <div className="flex items-center gap-2.5 px-4 py-2 bg-blue-500/10 rounded-full border border-blue-500/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">UPI</span>
               </div>
               <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Cash</span>
               </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 relative z-10">
             <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData.length ? performanceData : [{ name: 'Empty', revenue: 0, upi: 0, cash: 0 }]}>
                    <defs>
                      <linearGradient id="colorUpi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: 'none', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', padding: '1.5rem' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                    />
                    <Area type="monotone" dataKey="upi" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorUpi)" stackId="1" />
                    <Area type="monotone" dataKey="cash" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorCash)" stackId="1" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
             
             <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 rounded-[2.5rem] bg-orange-500/5 border-2 border-orange-500/10 col-span-1 md:col-span-2">
                   <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4">Branch Liquidity Breakdown</p>
                   <div className="space-y-4">
                      {stores.map((store: any) => {
                         const s = revenueStats.byStore[store.id] || { upi: 0, cash: 0, total: 0 };
                         return (
                            <div key={store.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-white/50 dark:border-white/5">
                               <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-8 brand-gradient rounded-full" />
                                  <h4 className="text-sm font-black uppercase tracking-tight">{store.name}</h4>
                               </div>
                               <div className="flex items-center gap-6">
                                  <div className="text-right">
                                     <p className="text-[10px] font-black text-blue-500 tabular-nums">₹{s.upi.toLocaleString()}</p>
                                     <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">UPI</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-[10px] font-black text-emerald-500 tabular-nums">₹{s.cash.toLocaleString()}</p>
                                     <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Cash</p>
                                  </div>
                                  <div className="text-right border-l pl-6 border-border/50">
                                     <p className="text-xs font-black text-foreground tabular-nums">₹{s.total.toLocaleString()}</p>
                                     <p className="text-[7px] font-black text-orange-600 uppercase tracking-widest">Total</p>
                                  </div>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                </div>
                <div className="p-8 rounded-[2.5rem] bg-indigo-500/5 border-2 border-indigo-500/10 flex flex-col justify-center items-center text-center">
                   <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 mb-4">
                      <Users size={40} strokeWidth={2.5} />
                   </div>
                   <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Workforce Presence</p>
                   <h4 className="text-3xl font-black uppercase tracking-tighter">{(permanentStaff.length + tempWorkers.length)} Active</h4>
                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2">Spanning {stores.length} Locations</p>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Stock Health & Product Intelligence */}
        <div className="xl:col-span-4 space-y-10">
          <Card className="border-none shadow-premium rounded-[3.5rem] bg-card/60 backdrop-blur-2xl overflow-hidden flex flex-col">
            <CardHeader className="p-10 pb-6 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-3xl font-black tracking-tighter uppercase text-red-600">Stock Health</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mt-1">Re-order Intelligence</CardDescription>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center text-red-600 shadow-lg">
                 <Box size={28} />
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-0 flex-1 overflow-y-auto max-h-[400px] scrollbar-hide">
               <div className="space-y-4">
                  {lowStockItems.length === 0 ? (
                    <div className="py-20 text-center bg-white/40 dark:bg-black/20 rounded-[2.5rem] border-2 border-dashed border-border/50">
                      <ShieldCheck size={40} className="mx-auto text-emerald-500 mb-4 opacity-20" />
                      <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">All Levels Healthy</p>
                    </div>
                  ) : (
                    lowStockItems.map((item: any, i: number) => (
                      <div key={i} className="flex flex-col gap-3 p-6 rounded-[2.5rem] bg-white/40 dark:bg-black/20 border border-white/50 dark:border-white/5 group hover:bg-white dark:hover:bg-black/40 transition-all shadow-sm">
                         <div className="flex items-center justify-between">
                            <div className="max-w-[150px]">
                               <h4 className="text-sm font-black text-foreground uppercase tracking-tight truncate">{item.material}</h4>
                               <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">{item.store}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-base font-black text-red-600 tabular-nums">{item.quantity.toFixed(1)}</p>
                               <p className="text-[7px] font-black text-muted-foreground uppercase tracking-widest">Remaining</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                               <div 
                                 className="h-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]" 
                                 style={{ width: `${Math.max(10, Math.min(100, (item.quantity / item.threshold) * 100))}%` }} 
                               />
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </CardContent>
            <div className="p-10 pt-0">
               <Button 
                  variant="outline" 
                  className="w-full h-14 rounded-2xl border-2 border-red-500/20 text-red-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-xl"
                  onClick={() => navigateTo('/inventory')}
                >
                 Restock Protocol
               </Button>
            </div>
          </Card>

          <Card className="border-none shadow-premium rounded-[3.5rem] bg-card/60 backdrop-blur-2xl overflow-hidden p-10 flex flex-col">
             <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                   <h3 className="text-2xl font-black uppercase tracking-tight">Market Share</h3>
                   <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Revenue by Location</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center">
                   <PieChartIcon size={20} />
                </div>
             </div>
             <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <RechartsPieChart>
                      <Pie
                         data={stores.map(st => ({ name: st.name, value: revenueStats.byStore[st.id]?.total || 0 }))}
                         innerRadius={60}
                         outerRadius={80}
                         paddingAngle={5}
                         dataKey="value"
                      >
                         {stores.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={['#ea580c', '#3b82f6', '#10b981', '#f59e0b'][index % 4]} />
                         ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '1rem', color: '#fff' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 900 }}
                      />
                   </RechartsPieChart>
                </ResponsiveContainer>
             </div>
             <div className="mt-6 space-y-3">
                {stores.map((st, i) => (
                   <div key={st.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${['bg-orange-600', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'][i % 4]}`} />
                         <span className="text-[10px] font-black uppercase text-muted-foreground">{st.name}</span>
                      </div>
                      <span className="text-[10px] font-black tabular-nums">
                        {((revenueStats.byStore[st.id]?.total || 0) / (revenueStats.total || 1) * 100).toFixed(0)}%
                      </span>
                   </div>
                ))}
             </div>
          </Card>

          <Card className="border-none shadow-premium rounded-[3.5rem] bg-card/60 backdrop-blur-2xl overflow-hidden p-10 flex flex-col">
             <div className="flex items-center justify-between mb-8">
                <div className="space-y-1">
                   <h3 className="text-2xl font-black uppercase tracking-tight">Top Sellers</h3>
                   <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Leaderboard by Revenue</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                   <Activity size={20} />
                </div>
             </div>
             <div className="space-y-6">
                {topProductsLoading ? (
                   <div className="py-10 animate-pulse text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">Calculating Leaders...</div>
                ) : topProducts.length === 0 ? (
                   <div className="py-10 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">No data available</div>
                ) : topProducts.map((p: any, i: number) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                         <span className="text-[10px] font-black uppercase tracking-widest text-foreground truncate max-w-[150px]">{p.name}</span>
                         <span className="text-[10px] font-black tabular-nums text-orange-600">₹{p.total.toLocaleString()}</span>
                      </div>
                      <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${(p.total / (topProducts[0].total || 1)) * 100}%` }}
                           className={`h-full ${['bg-orange-600', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'][i % 5]} rounded-full`} 
                         />
                      </div>
                   </div>
                ))}
             </div>
          </Card>
        </div>
      </div>

      {loading && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-8 right-8 bg-card px-4 py-2 rounded-full border border-border shadow-2xl flex items-center gap-3 z-50"
        >
          <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Refreshing Data...</span>
        </motion.div>
      )}
    </div>
  );
}
