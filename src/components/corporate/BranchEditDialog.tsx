import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateCorporateBranch } from '@/hooks/mutations/useCorporateClients';
import { CorporateBranch } from '@/hooks/queries/useCorporateClients';
import { MapPin, User, Phone, Mail, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface BranchEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  branch: CorporateBranch | null;
}

export function BranchEditDialog({ isOpen, onClose, branch }: BranchEditDialogProps) {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const updateBranch = useUpdateCorporateBranch();

  useEffect(() => {
    if (branch) {
      setName(branch.name || '');
      setContactPerson(branch.contact_person || '');
      setPhone(branch.phone || '');
      setEmail(branch.email || '');
      setAddress(branch.address || '');
    }
  }, [branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !branch) return;

    try {
      await updateBranch.mutateAsync({
        id: branch.id,
        data: {
          name,
          contact_person: contactPerson || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
        }
      });
      toast.success('Branch updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Failed to update branch:', error);
      toast.error(error.message || 'Failed to update branch');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Edit Branch
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update details for {branch?.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="branchName" className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Branch Name *
            </Label>
            <Input
              id="branchName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Branch, City Center"
              className="bg-background border-input/50 focus:border-primary/50 transition-colors h-11"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="branchAddress" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Complete Address
            </Label>
            <Textarea
              id="branchAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Business Park, Block A, Floor 2"
              className="bg-background border-input/50 focus:border-primary/50 transition-colors resize-none h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="branchContactPerson" className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Branch Manager / Contact Person
            </Label>
            <Input
              id="branchContactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Amit Kumar"
              className="bg-background border-input/50 focus:border-primary/50 transition-colors h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branchPhone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="branchPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="bg-background border-input/50 focus:border-primary/50 transition-colors h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="branchEmail" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="branchEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="branch@company.com"
                className="bg-background border-input/50 focus:border-primary/50 transition-colors h-11"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
              disabled={updateBranch.isPending}
            >
              {updateBranch.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
