import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useCorporateLedgerAnalytics } from '@/hooks/queries/useCorporateClients';
import { Calendar, TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CorporateAnalyticsChartProps {
  clientId?: string | null;
}

export function CorporateAnalyticsChart({ clientId = null }: CorporateAnalyticsChartProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const { data: ledgerData, isLoading } = useCorporateLedgerAnalytics(clientId);

  const chartData = useMemo(() => {
    if (!ledgerData) return [];

    const groupedData: Record<string, { period: string; owed: number; cleared: number }> = {};

    ledgerData.forEach((entry) => {
      const date = new Date(entry.date || entry.created_at);
      let periodKey = '';

      if (period === 'week') {
        // Group by ISO week
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        periodKey = `W${weekNum}, ${date.getFullYear()}`;
      } else {
        // Group by Month
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        periodKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      }

      if (!groupedData[periodKey]) {
        groupedData[periodKey] = { period: periodKey, owed: 0, cleared: 0 };
      }

      if (entry.transaction_type === 'order') {
        groupedData[periodKey].owed += Number(entry.amount);
      } else if (entry.transaction_type === 'payment' || entry.transaction_type === 'advance') {
        groupedData[periodKey].cleared += Number(entry.amount);
      }
    });

    // Convert to array and take the last 12 periods to avoid overcrowding
    return Object.values(groupedData).slice(-12);
  }, [ledgerData, period]);

  const totalOwed = chartData.reduce((sum, item) => sum + item.owed, 0);
  const totalCleared = chartData.reduce((sum, item) => sum + item.cleared, 0);

  if (isLoading) {
    return (
      <Card className="w-full h-[400px] flex items-center justify-center bg-card border-border/50">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading Analytics...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-card border-border/50 shadow-xl overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 gap-4 border-b border-border/10">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Financial Overview
          </CardTitle>
          <CardDescription>
            {clientId ? 'Tracking owed vs cleared amounts for this group.' : 'Market overview of all corporate client transactions.'}
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50">
          <Button
            variant={period === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('week')}
            className={`rounded-md px-4 transition-all ${period === 'week' ? 'shadow-md' : 'hover:bg-muted'}`}
          >
            Weekly
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('month')}
            className={`rounded-md px-4 transition-all ${period === 'month' ? 'shadow-md' : 'hover:bg-muted'}`}
          >
            Monthly
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex flex-col items-start">
            <div className="flex items-center gap-2 text-destructive/80 mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Total Billed / Owed</span>
            </div>
            <div className="text-2xl font-bold text-destructive flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {totalOwed.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col items-start">
            <div className="flex items-center gap-2 text-emerald-500/80 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Total Received / Cleared</span>
            </div>
            <div className="text-2xl font-bold text-emerald-500 flex items-center">
              <IndianRupee className="h-5 w-5 mr-1" />
              {totalCleared.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
