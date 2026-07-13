import React from 'react';
import { 
  ArrowLeft, 
  History, 
  FileSpreadsheet,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  Clock,
  Printer,
  Wallet,
  Calendar,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useVendorTransactions } from '../hooks/queries/useInventory';
import { useAddVendorPayment } from '../hooks/mutations/useInventory';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useState } from 'react';

export default function VendorLedgerPage({ vendor, onBack }: { vendor: any, onBack: () => void }) {
  const { profile } = useAuth();
  const { data: transactions = [], isLoading: loading, isError: txError } = useVendorTransactions(vendor.id);
  const addPaymentMutation = useAddVendorPayment();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'upi',
    reference_number: '',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    addPaymentMutation.mutate({
      ...paymentData,
      amount: parseFloat(paymentData.amount),
      vendor_id: vendor.id,
      created_by: profile?.id
    }, {
      onSuccess: () => {
        toast.success('Disbursement recorded successfully');
        setIsPayOpen(false);
        setPaymentData({
          amount: '',
          payment_method: 'upi',
          reference_number: '',
          notes: '',
          payment_date: new Date().toISOString().split('T')[0]
        });
      },
      onError: (err: any) => toast.error(err.message)
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (txError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4 text-red-500">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100 mb-2">Failed to Load Ledger</h3>
        <p className="text-sm font-bold text-neutral-400 text-center mb-6">Could not load transaction history for this vendor</p>
        <button onClick={() => window.location.reload()} className="h-12 px-8 rounded-2xl bg-orange-600 text-white font-bold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-12 w-12 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">
            <ArrowLeft className="h-5 w-5" strokeWidth={3} />
          </Button>
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">{vendor.name}</h2>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Financial Reconciliation Ledger</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Button 
            onClick={() => setIsPayOpen(true)}
            className="flex-1 sm:flex-none h-12 rounded-2xl brand-gradient text-white font-black px-8 shadow-xl shadow-orange-500/20 border-none uppercase tracking-widest text-[10px]"
          >
            <Wallet className="mr-2 h-4 w-4" strokeWidth={3} />
            Authorize Payment
          </Button>
          <div className="flex gap-2 flex-1 sm:flex-none">
            <Button variant="outline" className="flex-1 sm:flex-none h-12 rounded-2xl border-neutral-200 dark:border-neutral-800 font-bold px-6 shadow-sm dark:text-neutral-100 dark:hover:bg-neutral-800">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button className="flex-1 sm:flex-none h-12 rounded-2xl bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 text-white font-bold px-6 shadow-xl shadow-neutral-200 dark:shadow-none border-none">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
         <Card className="rounded-[2rem] border-none shadow-sm bg-white dark:bg-neutral-900 overflow-hidden">
            <CardContent className="p-6">
               <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Payables</p>
               <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">₹{transactions.reduce((acc, curr) => acc + curr.debit, 0).toLocaleString()}</h3>
            </CardContent>
         </Card>
         <Card className="rounded-[2rem] border-none shadow-sm bg-white dark:bg-neutral-900 overflow-hidden">
            <CardContent className="p-6">
               <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Settled Amount</p>
               <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">₹{transactions.reduce((acc, curr) => acc + curr.credit, 0).toLocaleString()}</h3>
            </CardContent>
         </Card>
         <Card className="rounded-[2rem] border-none shadow-sm bg-orange-600 text-white overflow-hidden">
            <CardContent className="p-6">
               <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest mb-1">Outstanding Risk</p>
               <h3 className="text-2xl font-black tracking-tight">
                  ₹{transactions.reduce((acc, curr) => acc + curr.debit - curr.credit, 0).toLocaleString()}
               </h3>
            </CardContent>
         </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white dark:bg-neutral-900 overflow-hidden">
        <CardHeader className="bg-neutral-900 dark:bg-neutral-950 text-white p-6 md:p-8 flex flex-row items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
                 <History size={20} strokeWidth={2.5} />
              </div>
              <CardTitle className="text-xl font-black">Transaction Stream</CardTitle>
           </div>
           <div className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Verified Ledger Sequence
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {transactions.length === 0 ? (
              <div className="py-24 text-center">
                 <Clock className="w-16 h-16 text-neutral-100 dark:text-neutral-800 mx-auto mb-4" />
                 <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">No transaction history detected</p>
              </div>
            ) : (
              transactions.map((t) => (
                <div 
                  key={t.id} 
                  onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  className={`group p-4 md:p-8 flex flex-col hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all cursor-pointer border-l-4 ${expandedId === t.id ? 'border-orange-600 bg-orange-50/10 dark:bg-orange-950/10' : 'border-transparent'}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
                        t.type === 'purchase' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border border-orange-100 dark:border-orange-900/40' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/40'
                      }`}>
                        {t.type === 'purchase' ? <TrendingDown size={24} /> : <TrendingUp size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                            t.type === 'purchase' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900/50' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                          }`}>
                            {t.type === 'purchase' ? 'STOCK IN' : 'PAYMENT'}
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400 tabular-nums">
                             {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="font-black text-neutral-900 dark:text-neutral-100 tracking-tight text-lg">{t.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">REF: {t.id.slice(0, 8).toUpperCase()}</p>
                          {t.notes && <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />}
                          {t.notes && <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest truncate max-w-[200px]">{t.notes}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-10 border-t md:border-none pt-6 md:pt-0 dark:border-neutral-800">
                      <div className="text-right flex flex-col">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Valuation</span>
                        <span className={`text-2xl font-black tabular-nums ${t.debit > 0 ? 'text-neutral-900 dark:text-neutral-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                           {t.debit > 0 ? `₹${t.debit.toLocaleString()}` : `₹${t.credit.toLocaleString()}`}
                        </span>
                      </div>
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${expandedId === t.id ? 'bg-orange-600 text-white rotate-45' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-400'}`}>
                        <ArrowUpRight size={20} />
                      </div>
                    </div>
                  </div>

                  {expandedId === t.id && (
                    <div className="mt-8 p-6 md:p-8 bg-neutral-100 dark:bg-neutral-950/50 rounded-[2rem] border border-neutral-200 dark:border-neutral-800 animate-in fade-in slide-in-from-top-4 duration-500">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-6">
                             <div>
                                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-3">Audit Trail Hash</p>
                                <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 font-mono text-[10px] text-neutral-500 break-all shadow-inner">
                                   {t.id}
                                </div>
                             </div>
                             {t.notes && (
                                <div>
                                   <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-3">Recorded Context</p>
                                   <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100/50 dark:border-orange-900/30">
                                      <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                                         "{t.notes}"
                                      </p>
                                   </div>
                                </div>
                             )}
                          </div>
                          <div className="flex flex-col justify-end items-end text-right space-y-4">
                             <div className="p-6 bg-neutral-900 dark:bg-neutral-100 rounded-3xl text-white dark:text-neutral-900 shadow-2xl">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Verified Amount</p>
                                <p className="text-4xl font-black tabular-nums tracking-tighter">₹{(t.debit || t.credit).toLocaleString()}</p>
                             </div>
                             <div className="flex gap-2">
                                <span className="px-3 py-1 bg-neutral-200 dark:bg-neutral-800 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500">Immutable Record</span>
                                <span className="px-3 py-1 bg-neutral-200 dark:bg-neutral-800 rounded-full text-[10px] font-black uppercase tracking-widest text-neutral-500">Synced</span>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-lg glass-panel border-white/20 p-0 overflow-hidden">
          <div className="brand-gradient h-2 w-full" />
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase">
                Record <span className="text-orange-600">Disbursement</span>
              </DialogTitle>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Financial Settlement Protocol</p>
            </DialogHeader>
            <form onSubmit={handleRecordPayment} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Settlement Amount (₹)</Label>
                <Input 
                  required 
                  type="number"
                  placeholder="0.00"
                  className="h-16 rounded-2xl bg-muted/40 border-border font-black text-2xl text-foreground px-6 focus:ring-4 focus:ring-orange-500/10 transition-all text-center"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Protocol Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      required 
                      type="date"
                      className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground pl-12 pr-6"
                      value={paymentData.payment_date}
                      onChange={(e) => setPaymentData({...paymentData, payment_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Channel</Label>
                  <Select 
                    value={paymentData.payment_method} 
                    onValueChange={(val) => setPaymentData({...paymentData, payment_method: val})}
                  >
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Ref Number / ID</Label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="TXN ID / CHEQUE NO"
                    className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground pl-12 pr-6 uppercase tracking-widest text-[10px]"
                    value={paymentData.reference_number}
                    onChange={(e) => setPaymentData({...paymentData, reference_number: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Notes / Context</Label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-4 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Context for this payment..."
                    className="h-24 rounded-2xl bg-muted/40 border-border font-black text-foreground pl-12 pr-6 py-4 items-start"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter className="pt-6">
                <Button 
                  type="submit" 
                  disabled={addPaymentMutation.isPending || !paymentData.amount}
                  className="w-full h-16 rounded-3xl brand-gradient text-white font-black shadow-2xl shadow-orange-500/20 uppercase tracking-widest text-[10px] disabled:opacity-50"
                >
                  {addPaymentMutation.isPending ? 'Syncing Financial Matrix...' : 'Authorize Disbursement'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
