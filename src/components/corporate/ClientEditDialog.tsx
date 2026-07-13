import React, { useState, useEffect } from 'react';
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
import { useUpdateCorporateClient } from '@/hooks/mutations/useCorporateClients';
import { CorporateClient } from '@/hooks/queries/useCorporateClients';
import { Building2, User, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface ClientEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: CorporateClient | null;
}

export function ClientEditDialog({ isOpen, onClose, client }: ClientEditDialogProps) {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const updateClient = useUpdateCorporateClient();

  useEffect(() => {
    if (client) {
      setName(client.name || '');
      setContactPerson(client.contact_person || '');
      setPhone(client.phone || '');
      setEmail(client.email || '');
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !client) return;

    try {
      await updateClient.mutateAsync({
        id: client.id,
        data: {
          name,
          contact_person: contactPerson || undefined,
          phone: phone || undefined,
          email: email || undefined,
        }
      });
      toast.success('Client updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Failed to update client:', error);
      toast.error(error.message || 'Failed to update client');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Edit Client
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update details for {client?.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company / Group Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. State Bank of India"
              className="bg-background border-input/50 focus:border-primary/50 transition-colors h-11"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contactPerson" className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Primary Contact Person
            </Label>
            <Input
              id="contactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="bg-background border-input/50 focus:border-primary/50 transition-colors h-11"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="bg-background border-input/50 focus:border-primary/50 transition-colors h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.com"
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
              disabled={updateClient.isPending}
            >
              {updateClient.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
