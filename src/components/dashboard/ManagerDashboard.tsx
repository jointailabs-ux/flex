import React, { useMemo } from 'react';
import { TrendingUp, ShoppingCart, CreditCard, FileText, Box, Layers, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useStores, useProducts, useSales } from '../../hooks/queries/useInventory';
import { motion } from 'motion/react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function ManagerDashboard() {
  const { profile, navigateTo } = useAuth();
  const { data: stores = [] } = useStores();
  const { data: sales = [] } = useSales(profile?.store_id || '');
  const store = (stores as any[]).find((item: any) => item.id === profile?.store_id);
  
  const revenue = useMemo(() => 
    (sales as any[]).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0),
    [sales]
  );

  const todaySales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (sales as any[])
      .filter(sale => sale.created_at.startsWith(today))
      .reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
  }, [sales]);

  const todayOrders = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (sales as any[]).filter(sale => sale.created_at.startsWith(today)).length;
  }, [sales]);

  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    (sales as any[]).forEach((sale) => {
      const day = new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      grouped[day] = (grouped[day] || 0) + Number(sale.total_amount || 0);
    });
    return Object.entries(grouped).slice(-7).map(([name, sales]) => ({ name, sales }));
  }, [sales]);

  const stats = useMemo(() => [
    { label: 'Today\'s Collection', value: `₹${todaySales.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Today\'s Orders', value: String(todayOrders), icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Total Sales', value: `₹${revenue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  ], [todaySales, todayOrders, revenue]);

  return (
    <div className="space-y-8 md:space-y-12 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-2">
           <motion.div 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="flex items-center gap-3"
           >
              <div className="w-1.5 h-10 brand-gradient rounded-full" />
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground uppercase">
                {store?.name || 'Manager Hub'}
              </h1>
           </motion.div>
           <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] ml-4">
             Welcome, {profile?.name || 'Manager'}
           </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button 
            className="flex-1 sm:flex-none h-14 rounded-full brand-gradient text-white font-black px-8 shadow-2xl shadow-orange-500/30 hover:scale-105 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
            onClick={() => navigateTo('/pos')}
          >
            <CreditCard className="mr-2 h-5 w-5" strokeWidth={2.5} />
            Open Billing
          </Button>
          <Button 
            variant="outline"
            className="flex-1 sm:flex-none h-14 rounded-full font-black px-8 border-border/50 hover:bg-muted hover:border-orange-500 hover:text-orange-600 transition-all active:scale-95 uppercase tracking-widest text-[10px] bg-background/50 backdrop-blur-sm shadow-xl"
            onClick={() => navigateTo('/transactions')}
          >
            <FileText className="mr-2 h-5 w-5" strokeWidth={2.5} />
            Transactions
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="group relative"
          >
            <Card className={`border-2 ${stat.border} shadow-2xl rounded-[2.5rem] bg-card/40 backdrop-blur-3xl hover:bg-card/60 transition-all duration-500 relative overflow-hidden h-full flex flex-col p-8`}>
              {/* Glow Effect */}
              <div className={`absolute -right-10 -top-10 w-32 h-32 ${stat.bg} rounded-full blur-[60px] opacity-30 group-hover:opacity-60 transition-opacity duration-700`} />
              
              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} shadow-inner`}>
                     <stat.icon size={28} strokeWidth={2.5} />
                  </div>
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
                     <Activity size={50} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</h4>
                  <div className="flex items-baseline">
                    <span className={`text-4xl md:text-5xl font-black tabular-nums tracking-tighter ${stat.color}`}>
                      {stat.value}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-10">
         {/* Chart Section */}
         <Card className="xl:col-span-8 border-none shadow-premium rounded-[3.5rem] bg-card/60 backdrop-blur-2xl overflow-hidden flex flex-col group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-blue-500/5 pointer-events-none" />
            <CardHeader className="p-8 md:p-10 pb-6 relative z-10">
               <CardTitle className="text-3xl font-black tracking-tighter uppercase">Daily Sales Trend</CardTitle>
               <CardDescription className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500 mt-1">Last 7 Days Revenue</CardDescription>
            </CardHeader>
            <CardContent className="p-8 md:p-10 pt-0 flex-1 relative z-10">
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.length ? chartData : [{ name: 'No Data', sales: 0 }]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ea580c" />
                          <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 900 }} 
                        dy={15} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 900 }} 
                        tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                      />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))', 
                          borderRadius: '1.5rem', 
                          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', 
                          padding: '1.5rem' 
                        }}
                        itemStyle={{ fontSize: '14px', fontWeight: 900, color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                        labelStyle={{ fontSize: '10px', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', fontWeight: 900, marginBottom: '8px' }}
                      />
                      <Bar dataKey="sales" radius={[8, 8, 0, 0]} maxBarSize={50}>
                        {(chartData.length ? chartData : [{ name: 'No Data', sales: 0 }]).map((_, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={index === chartData.length - 1 ? "url(#barGradient)" : "hsl(var(--muted))"} 
                            opacity={index === chartData.length - 1 ? 1 : 0.6}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>

         {/* Quick Actions */}
         <div className="xl:col-span-4 space-y-6">
            <h3 className="text-xl font-black uppercase tracking-tight text-foreground ml-4 mb-2">Quick Actions</h3>
            {[
              { title: 'View Transactions', desc: 'Day-wise sales & collections', icon: FileText, color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20', path: '/transactions' },
              { title: 'Product Catalog', desc: 'Check prices and details', icon: Box, color: 'bg-orange-500', shadow: 'shadow-orange-500/20', path: '/products' },
              { title: 'Material Requests', desc: 'Order central stock', icon: Layers, color: 'bg-blue-500', shadow: 'shadow-blue-500/20' },
            ].map((task, i) => (
              <motion.button
                key={task.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="w-full text-left group bg-card/60 backdrop-blur-md p-6 rounded-[2.5rem] shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-between cursor-pointer border border-border/50 hover:border-border hover:-translate-y-1"
                onClick={() => {
                  if (task.path) {
                    navigateTo(task.path);
                  }
                }}
              >
                 <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 ${task.color} rounded-2xl flex items-center justify-center text-white shadow-xl ${task.shadow} group-hover:scale-110 transition-transform duration-500`}>
                       <task.icon size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                       <h4 className="font-black text-foreground uppercase tracking-tight text-lg">{task.title}</h4>
                       <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{task.desc}</p>
                    </div>
                 </div>
              </motion.button>
            ))}
         </div>
      </div>
    </div>
  );
}
