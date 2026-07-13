import React, { useState } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Calendar as CalendarIcon,
  ChevronDown,
  TrendingUp,
  Receipt,
  Wallet,
  ArrowUpRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from '../contexts/AuthContext';

export default function ExpensesPage() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'General',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: ''
  });

  // Queries
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await fetch('/api/expenses', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-mock-profile': JSON.stringify(profile)
        }
      });
      if (!res.ok) throw new Error('Failed to fetch expenses');
      return res.json();
    }
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (newData: any) => {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'x-mock-profile': JSON.stringify(profile)
        },
        body: JSON.stringify(newData)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense recorded successfully');
      setIsAddOpen(false);
      setFormData({
        description: '',
        amount: '',
        category: 'General',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        notes: ''
      });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-mock-profile': JSON.stringify(profile)
        }
      });
      if (!res.ok) throw new Error('Failed to delete expense');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense removed');
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  const filteredExpenses = expenses.filter((ex: any) => {
    const exDate = ex.date;
    const matchesMonth = exDate.substring(0, 7) === monthFilter;
    const matchesRange = (!startDate || exDate >= startDate) && (!endDate || exDate <= endDate);
    
    // If range is set, use range. Otherwise use month filter.
    return (startDate || endDate) ? matchesRange : matchesMonth;
  });

  const dailyTotal = expenses
    .filter((ex: any) => ex.date === filterDate)
    .reduce((sum: number, ex: any) => sum + Number(ex.amount), 0);

  const monthlyTotal = filteredExpenses.reduce((sum: number, ex: any) => sum + Number(ex.amount), 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase">Operating <span className="text-orange-600">Expenses</span></h2>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] ml-1">Overhead Ledger & Audit</p>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)} 
          className="w-full md:w-auto h-14 rounded-2xl brand-gradient text-white shadow-2xl shadow-orange-500/30 font-black border-none hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs px-8"
        >
          <Plus className="mr-3 h-5 w-5" strokeWidth={4} />
          Record New Expense
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-border/80 shadow-premium overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-24 h-24 brand-gradient opacity-10 rounded-full blur-3xl -mr-12 -mt-12 hidden lg:block" />
           <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center text-white shadow-lg">
                    <TrendingUp size={24} strokeWidth={2.5} />
                 </div>
                 <div className="flex flex-col">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Daily Spend</p>
                    <input 
                      type="date" 
                      value={filterDate} 
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-[10px] font-bold text-orange-600 outline-none cursor-pointer"
                    />
                 </div>
              </div>
              <h3 className="text-4xl font-black tracking-tighter">₹{dailyTotal.toLocaleString()}</h3>
           </CardContent>
        </Card>

        <Card className="glass-card border-orange-500/20 shadow-premium overflow-hidden relative group bg-orange-500/[0.02]">
           <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500 opacity-10 rounded-full blur-3xl -mr-12 -mt-12 hidden lg:block" />
           <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg">
                    <Wallet size={24} strokeWidth={2.5} />
                 </div>
                 <div className="flex flex-col">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Monthly Aggregate</p>
                    <input 
                      type="month" 
                      value={monthFilter} 
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="bg-transparent border-none p-0 text-[10px] font-bold text-orange-600 outline-none cursor-pointer"
                    />
                 </div>
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-orange-600">₹{monthlyTotal.toLocaleString()}</h3>
           </CardContent>
        </Card>

        <Card className="glass-card border-blue-500/20 shadow-premium overflow-hidden relative group bg-blue-500/[0.02]">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-10 rounded-full blur-3xl -mr-12 -mt-12 hidden lg:block" />
           <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg">
                    <Receipt size={24} strokeWidth={2.5} />
                 </div>
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Entry Volume ({monthFilter})</p>
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-blue-500">{filteredExpenses.length}</h3>
           </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-border/80 shadow-premium overflow-hidden rounded-[3rem]">
        <CardHeader className="p-8 border-b border-border/50 bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Calculator size={24} strokeWidth={2.5} />
            </div>
            <div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight">Expense Ledger</CardTitle>
              <p className="text-[10px] font-black text-orange-200/60 uppercase tracking-widest mt-1">
                {(startDate || endDate) 
                  ? `Audit Stream: ${startDate || '...'} ➜ ${endDate || '...'}`
                  : `Audit Stream for ${new Date(monthFilter + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
                }
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
              <div className="flex flex-col px-2">
                <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter">From</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none p-0 text-[10px] font-bold text-neutral-900 dark:text-white outline-none cursor-pointer w-24"
                />
              </div>
              <div className="w-[1px] h-6 bg-black/10 dark:bg-white/10" />
              <div className="flex flex-col px-2">
                <span className="text-[8px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter">To</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none p-0 text-[10px] font-bold text-neutral-900 dark:text-white outline-none cursor-pointer w-24"
                />
              </div>
              {(startDate || endDate) && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="h-8 w-8 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-neutral-500 dark:text-white/40 hover:text-neutral-900 dark:hover:text-white"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 h-4 w-4" />
                <Input 
                  placeholder="Search ledger..." 
                  className="h-12 w-full md:w-64 pl-12 rounded-xl bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-neutral-900 dark:text-white font-bold text-xs placeholder:text-neutral-400"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="divide-y divide-border/50">
             <AnimatePresence mode="popLayout">
               {filteredExpenses.length === 0 ? (
                 <div className="py-32 flex flex-col items-center justify-center text-center px-10">
                   <div className="w-20 h-20 bg-muted/50 rounded-[2rem] flex items-center justify-center mb-6">
                      <Calculator size={32} className="text-muted-foreground" />
                   </div>
                   <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Zero Expenditure Matrix</h3>
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] mt-3">No operational costs detected for the selected period</p>
                 </div>
               ) : (
                 filteredExpenses.map((ex: any, i: number) => (
                   <motion.div 
                     key={ex.id}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.05 }}
                     className="group flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 hover:bg-muted/30 transition-all cursor-default"
                   >
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-neutral-800 border-2 border-border flex flex-col items-center justify-center shrink-0 group-hover:border-orange-500/50 transition-colors">
                           <span className="text-[10px] font-black text-muted-foreground uppercase leading-none">{new Date(ex.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                           <span className="text-2xl font-black text-foreground tabular-nums leading-none mt-1">{new Date(ex.date).getDate()}</span>
                        </div>
                        <div className="min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="px-3 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-[9px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest border border-orange-200 dark:border-orange-900/50">
                                 {ex.category}
                              </span>
                              <span className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border border-blue-200 dark:border-blue-900/50">
                                 {ex.payment_method}
                              </span>
                           </div>
                           <h4 className="text-xl font-black text-foreground tracking-tight group-hover:text-orange-600 transition-colors">{ex.description}</h4>
                           {ex.notes && <p className="text-xs font-bold text-muted-foreground mt-1 line-clamp-1">{ex.notes}</p>}
                        </div>
                     </div>
                     <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto pt-6 md:pt-0 border-t md:border-none border-border/50">
                        <div className="text-right">
                           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Transaction Value</p>
                           <p className="text-3xl font-black tracking-tighter tabular-nums">₹{Number(ex.amount).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-12 w-12 rounded-xl bg-muted/50 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                             onClick={() => {
                               if (window.confirm('Delete this expense record?')) {
                                 deleteMutation.mutate(ex.id);
                               }
                             }}
                           >
                             <Trash2 size={20} strokeWidth={2.5} />
                           </Button>
                           <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-muted/50 hover:bg-orange-500 hover:text-white transition-all shadow-sm">
                             <ArrowUpRight size={20} strokeWidth={2.5} />
                           </Button>
                        </div>
                     </div>
                   </motion.div>
                 ))
               )}
             </AnimatePresence>
           </div>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-xl glass-panel border-white/20 p-0 overflow-hidden">
          <div className="brand-gradient h-2 w-full" />
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase">
                Record <span className="text-orange-600">Expenditure</span>
              </DialogTitle>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Financial Outflow Protocol</p>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Description / Entity</Label>
                <Input 
                  required 
                  placeholder="e.g. Electricity Bill, Shop Rent, Tea & Snacks"
                  className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Amount (₹)</Label>
                  <Input 
                    required 
                    type="number"
                    placeholder="0.00"
                    className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Expense Date</Label>
                  <Input 
                    required 
                    type="date"
                    className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                    <SelectTrigger className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border bg-card font-black uppercase tracking-widest text-[10px]">
                      <SelectItem value="Utilities">UTILITIES</SelectItem>
                      <SelectItem value="Rent">RENT</SelectItem>
                      <SelectItem value="Maintenance">MAINTENANCE</SelectItem>
                      <SelectItem value="Staff Welfare">STAFF WELFARE</SelectItem>
                      <SelectItem value="Marketing">MARKETING</SelectItem>
                      <SelectItem value="General">GENERAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Channel</Label>
                  <Select value={formData.payment_method} onValueChange={(val) => setFormData({...formData, payment_method: val})}>
                    <SelectTrigger className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border bg-card font-black uppercase tracking-widest text-[10px]">
                      <SelectItem value="cash">CASH</SelectItem>
                      <SelectItem value="upi">UPI / QR</SelectItem>
                      <SelectItem value="bank_transfer">BANK TRANSFER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Internal Notes</Label>
                <Input 
                  placeholder="Additional context or reference ID..."
                  className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <DialogFooter className="pt-6">
                <Button 
                  type="submit" 
                  disabled={addMutation.isPending}
                  className="w-full h-16 rounded-3xl brand-gradient text-white font-black shadow-2xl shadow-orange-500/20 uppercase tracking-widest text-[10px]"
                >
                  {addMutation.isPending ? 'Synchronizing Audit Matrix...' : 'Authorize Expenditure'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
