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
import { useAddCorporateOrder } from '@/hooks/mutations/useCorporateClients';
import { CorporateBranch } from '@/hooks/queries/useCorporateClients';
import { formatCurrency } from '@/lib/utils';
import { Receipt, Calendar, FileText, IndianRupee, Hash } from 'lucide-react';
import { toast } from 'sonner';

interface AddOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  branch: CorporateBranch | null;
}

export function AddOrderDialog({ isOpen, onClose, branch }: AddOrderDialogProps) {
  const [description, setDescription] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const addOrder = useAddCorporateOrder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch || !description || !amount || !date) return;

    try {
      await addOrder.mutateAsync({
        branch_id: branch.id,
        invoice_number: invoiceNumber,
        description,
        total_amount: Number(amount),
        order_date: date,
      });
      toast.success('Order added successfully');
      setDescription('');
      setInvoiceNumber('');
      setAmount('');
      onClose();
    } catch (error: any) {
      console.error('Failed to add order:', error);
      toast.error(error.message || 'Failed to add order');
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
            <Receipt className="h-5 w-5 text-orange-500" />
            New Order for {branch?.name}
          </DialogTitle>
          <DialogDescription>
            Record a new job or order. This will increase the outstanding amount due for this branch.
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
              <Calendar className="h-4 w-4 text-muted-foreground" /> Order Date
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
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber" className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" /> Invoice / Ref Number
            </Label>
            <Input
              id="invoiceNumber"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-2026-001"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" /> Description (Job Details)
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 50x Flex Banners (10x10)"
              className="bg-background"
              required
            />
            <p className="text-[0.8rem] text-muted-foreground">Provide a clear description for the ledger statement.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-2 font-bold text-orange-600 dark:text-orange-400">
              <IndianRupee className="h-4 w-4" /> Total Order Amount
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
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={addOrder.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={addOrder.isPending} className="font-bold">
              {addOrder.isPending ? 'Saving...' : 'Confirm Order Amount'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
