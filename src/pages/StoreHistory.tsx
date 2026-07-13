import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  Search, 
  Calendar, 
  ChevronRight, 
  CreditCard, 
  User, 
  Package, 
  TrendingUp,
  Receipt,
  Download,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/queries/useTransactions';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { supabase } from '../lib/supabase';

export default function StoreHistory() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [saleDetails, setSaleDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  const todayStr = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const startDate = dateRange === 'today' ? todayStr : dateRange === 'week' ? weekAgo : monthStart;

  const { data: allTransactions = [], isLoading } = useTransactions({
    storeId: profile?.store_id || 'all',
    startDate
  });

  // Filter only sales
  const sales = useMemo(() => 
    allTransactions.filter((tx: any) => tx.type === 'SALE' && 
    (tx.entity.toLowerCase().includes(searchTerm.toLowerCase()) || tx.ref.toLowerCase().includes(searchTerm.toLowerCase()))),
    [allTransactions, searchTerm]
  );

  const stats = useMemo(() => {
    const today = sales.filter((s: any) => s.date.startsWith(todayStr)).reduce((sum: number, s: any) => sum + s.amount, 0);
    const total = sales.reduce((sum: number, s: any) => sum + s.amount, 0);
    return { today, total, count: sales.length };
  }, [sales, todayStr]);

  const fetchSaleDetails = async (saleId: string) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          *,
          finished_products (name, category)
        `)
        .eq('sale_id', saleId);
      
      if (error) throw error;
      setSaleDetails(data || []);
    } catch (error) {
      toast.error('Failed to load sale details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewSale = (sale: any) => {
    setSelectedSale(sale);
    fetchSaleDetails(sale.id);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase italic">Store <span className="text-orange-600">Sales Audit</span></h2>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] ml-1">Real-time Transaction Matrix</p>
        </div>
        
        <div className="flex items-center gap-3 bg-muted/20 p-1.5 rounded-2xl border border-white/5 shadow-inner">
           {(['today', 'week', 'month'] as const).map((r) => (
             <Button
               key={r}
               variant="ghost"
               size="sm"
               onClick={() => setDateRange(r)}
               className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === r ? 'bg-orange-600 text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
             >
               {r}
             </Button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Selected Period Total", value: `₹${stats.total.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Today's Collection", value: `₹${stats.today.toLocaleString()}`, icon: CreditCard, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Order Volume", value: stats.count, icon: Receipt, color: "text-blue-500", bg: "bg-blue-500/10" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass-card border-none shadow-premium overflow-hidden relative group">
              <div className={`absolute top-0 right-0 w-24 h-24 ${stat.color.replace('text', 'bg')} opacity-5 rounded-full blur-3xl -mr-12 -mt-12`} />
              <CardContent className="p-8">
                 <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-lg`}>
                       <stat.icon size={24} strokeWidth={2.5} />
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                 </div>
                 <h3 className="text-4xl font-black tracking-tighter">{stat.value}</h3>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="glass-card border-none shadow-premium overflow-hidden rounded-[3rem]">
        <CardHeader className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 brand-gradient rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Receipt size={24} strokeWidth={2.5} />
            </div>
            <div>
              <CardTitle className="text-2xl font-black uppercase tracking-tight italic">Sales <span className="text-orange-600">Archive</span></CardTitle>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">Audit Trail & Customer Logs</p>
            </div>
          </div>
          
          <div className="relative group w-full md:w-96">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-orange-600 transition-colors" size={18} strokeWidth={3} />
              <Input 
                placeholder="Search Customer or Ref ID..." 
                className="h-14 pl-16 rounded-2xl bg-white/5 border-white/10 text-white font-black text-xs transition-all focus:ring-4 focus:ring-orange-500/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        </CardHeader>
        <CardContent className="p-0">
           <div className="divide-y divide-white/5">
             {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                 <div key={i} className="h-24 bg-white/5 animate-pulse" />
               ))
             ) : sales.length === 0 ? (
               <div className="py-32 flex flex-col items-center justify-center text-center opacity-40">
                  <Receipt size={64} className="mb-6" />
                  <h3 className="text-xl font-black uppercase italic">No Sales Found</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest mt-2">Try adjusting your filters or search term</p>
               </div>
             ) : (
               sales.map((sale: any) => (
                 <motion.div 
                   key={sale.id}
                   whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                   className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all group cursor-pointer"
                   onClick={() => handleViewSale(sale)}
                 >
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-orange-600/10 flex flex-col items-center justify-center text-orange-600 shrink-0 border border-orange-600/20 group-hover:bg-orange-600 group-hover:text-white transition-all">
                         <span className="text-[9px] font-black uppercase leading-none">{new Date(sale.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                         <span className="text-xl font-black tabular-nums mt-1">{new Date(sale.date).getDate()}</span>
                      </div>
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{sale.ref}</span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest">Completed</span>
                         </div>
                         <h4 className="text-xl font-black tracking-tight flex items-center gap-3">
                           {sale.entity}
                           <ChevronRight size={16} className="text-orange-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                         </h4>
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">
                            {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.method.toUpperCase()}
                         </p>
                      </div>
                   </div>
                   <div className="text-right w-full md:w-auto pt-6 md:pt-0 border-t md:border-none border-white/5">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 italic">Sale Total</p>
                      <p className="text-3xl font-black tracking-tighter tabular-nums">₹{sale.amount.toLocaleString()}</p>
                   </div>
                 </motion.div>
               ))
             )}
           </div>
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="rounded-[3rem] sm:max-w-2xl glass-panel border-white/10 p-0 overflow-hidden">
          <div className="brand-gradient h-2 w-full" />
          <div className="p-10">
            <DialogHeader className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">
                    Sale <span className="text-orange-600">Particulars</span>
                  </DialogTitle>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Ref: {selectedSale?.ref}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-orange-600 tabular-nums">₹{selectedSale?.amount.toLocaleString()}</p>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{selectedSale?.method.toUpperCase()} Payment</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6">
              <div className="glass-card rounded-[2rem] border-white/5 overflow-hidden">
                 <div className="p-6 bg-white/5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <User size={18} className="text-orange-600" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Customer Profile</span>
                    </div>
                    <span className="text-xs font-black">{selectedSale?.entity}</span>
                 </div>
                 <div className="p-8">
                    <div className="grid grid-cols-1 gap-4">
                       <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          <span>Items Sold</span>
                          <span>Line Total</span>
                       </div>
                       <div className="space-y-4">
                          {loadingDetails ? (
                             <div className="h-20 animate-pulse bg-white/5 rounded-xl" />
                          ) : saleDetails.length === 0 ? (
                             <p className="text-center py-4 text-xs font-bold text-muted-foreground italic">No line items recorded</p>
                          ) : (
                             saleDetails.map((item: any) => (
                               <div key={item.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-none">
                                  <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-600">
                                        <Package size={18} />
                                     </div>
                                     <div>
                                        <p className="text-sm font-black tracking-tight">{item.finished_products?.name}</p>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                           {item.quantity} {item.finished_products?.unit || 'units'} @ ₹{item.unit_price}
                                           {item.width_ft && ` • ${item.width_ft}x${item.height_ft}ft`}
                                        </p>
                                     </div>
                                  </div>
                                  <span className="text-sm font-black tabular-nums">₹{(item.quantity * item.unit_price).toLocaleString()}</span>
                               </div>
                             ))
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button className="flex-1 h-14 rounded-2xl brand-gradient text-white font-black shadow-xl uppercase tracking-widest text-[10px]">
                  <Download className="mr-2 h-4 w-4" /> Download PDF Receipt
                </Button>
                <Button variant="outline" className="flex-1 h-14 rounded-2xl border-white/10 font-black uppercase tracking-widest text-[10px] hover:bg-white/5">
                  Resend SMS Confirmation
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
