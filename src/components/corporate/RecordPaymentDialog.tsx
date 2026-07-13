import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRecordCorporatePayment } from '@/hooks/mutations/useCorporateClients';
import { CorporateBranch } from '@/hooks/queries/useCorporateClients';
import { formatCurrency } from '@/lib/utils';
import { Banknote, Calendar, IndianRupee, NotebookPen, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { toast } from 'sonner';

interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  branch: CorporateBranch | null;
}

export function RecordPaymentDialog({ isOpen, onClose, branch }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'payment' | 'advance'>('payment');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const recordPayment = useRecordCorporatePayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch || !amount || !date) return;

    try {
      await recordPayment.mutateAsync({
        branch_id: branch.id,
        amount: Number(amount),
        transaction_type: type,
        notes: notes || undefined,
        date: date,
      });
      toast.success('Payment recorded successfully');
      setAmount('');
      setNotes('');
      setType('payment');
      onClose();
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      toast.error(error.message || 'Failed to record payment');
    }
  };

  const currentBalance = branch?.currentBalance || 0;
  const isDue = currentBalance < 0;
  const isAdvance = currentBalance > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Banknote className="h-5 w-5 text-green-600" />
            Record Payment - {branch?.name}
          </DialogTitle>
          <DialogDescription>
            Log a received payment or an advance deposit.
          </DialogDescription>
        </DialogHeader>

        {branch && (
          <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center border border-border/50 my-2">
            <span className="text-sm font-medium text-muted-foreground">Current Balance</span>
            <span className={`font-bold ${isDue ? 'text-destructive' : isAdvance ? 'text-green-600' : ''}`}>
              {formatCurrency(Math.abs(currentBalance))}
              <span className="text-xs ml-1 font-normal">{isDue ? 'DUE' : isAdvance ? 'ADVANCE' : ''}</span>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Payment Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-background"
              required
            />
          </div>
          
          <div className="space-y-3">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${type === 'payment' ? 'border-green-500 bg-green-500/10' : 'border-border/50 hover:border-border'}`}>
                <input
                  type="radio"
                  name="type"
                  value="payment"
                  className="sr-only"
                  checked={type === 'payment'}
                  onChange={() => setType('payment')}
                />
                <ArrowDownToLine className={`h-6 w-6 ${type === 'payment' ? 'text-green-600' : 'text-muted-foreground'}`} />
                <span className={`font-semibold ${type === 'payment' ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>Payment</span>
                <span className="text-[0.7rem] text-center text-muted-foreground leading-tight">Clear outstanding due</span>
              </label>

              <label className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${type === 'advance' ? 'border-purple-500 bg-purple-500/10' : 'border-border/50 hover:border-border'}`}>
                <input
                  type="radio"
                  name="type"
                  value="advance"
                  className="sr-only"
                  checked={type === 'advance'}
                  onChange={() => setType('advance')}
                />
                <ArrowUpFromLine className={`h-6 w-6 ${type === 'advance' ? 'text-purple-600' : 'text-muted-foreground'}`} />
                <span className={`font-semibold ${type === 'advance' ? 'text-purple-700 dark:text-purple-400' : 'text-muted-foreground'}`}>Advance</span>
                <span className="text-[0.7rem] text-center text-muted-foreground leading-tight">Pre-payment for future</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2 font-bold text-green-600 dark:text-green-400">
              <IndianRupee className="h-4 w-4" /> Amount Received
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-background pl-8 text-lg font-bold"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-muted-foreground" /> Notes / Reference
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. UTR: 1234567890 / Cheque"
              className="bg-background"
            />
            <p className="text-[0.8rem] text-muted-foreground">Optional reference number for tracking.</p>
          </div>
          
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={recordPayment.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending} className="font-bold bg-green-600 hover:bg-green-700 text-white">
              {recordPayment.isPending ? 'Saving...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
