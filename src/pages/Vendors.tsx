import React, { useState } from 'react';
import { Building2, Phone, Mail, MapPin, Plus, Edit, Trash2, FileText, ChevronRight, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import VendorLedgerPage from './VendorLedger';
import { useVendors } from '../hooks/queries/useInventory';
import { useAddVendor } from '../hooks/mutations/useInventory';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { motion, AnimatePresence } from 'motion/react';

export default function VendorsPage() {
  const { data: vendors = [], isLoading: dataLoading, isError, error } = useVendors();
  const addVendorMutation = useAddVendor();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: ''
  });

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    addVendorMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Vendor added successfully');
        setIsAddOpen(false);
        setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
      },
      onError: (error: any) => {
        toast.error(error.message);
      }
    });
  };

  if (selectedVendor) {
    return <VendorLedgerPage vendor={selectedVendor} onBack={() => setSelectedVendor(null)} />;
  }

  if (dataLoading && vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 brand-gradient rounded-3xl animate-spin mb-6 flex items-center justify-center">
           <div className="w-8 h-8 bg-background rounded-2xl" />
        </div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">Scanning Partner Matrix...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-neutral-900 rounded-[3rem] border border-dashed border-red-200 dark:border-red-900/30 mx-6">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-3xl flex items-center justify-center mb-6 text-red-500 shadow-xl shadow-red-500/10">
          <Building2 size={40} strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">Network Disconnected</h3>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-2 mb-8 max-w-sm text-center">
          {(error as Error)?.message || 'Failed to establish connection with partner node'}
        </p>
        <Button onClick={() => window.location.reload()} className="h-14 px-10 rounded-2xl brand-gradient text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-orange-500/20">
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase">Partner <span className="text-orange-600">Nodes</span></h2>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] ml-1">Supply Chain Infrastructure</p>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)} 
          className="w-full md:w-auto h-14 rounded-2xl brand-gradient text-white shadow-2xl shadow-orange-500/30 font-black border-none hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs px-8"
        >
          <Plus className="mr-3 h-5 w-5" strokeWidth={4} />
          Register New Node
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-border/80 shadow-premium overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-24 h-24 brand-gradient opacity-10 rounded-full blur-3xl -mr-12 -mt-12 hidden lg:block" />
           <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center text-white shadow-lg">
                    <Building2 size={24} strokeWidth={2.5} />
                 </div>
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Entities</p>
              </div>
              <h3 className="text-4xl font-black tracking-tighter">{vendors.length}</h3>
           </CardContent>
        </Card>

        <Card className="glass-card border-red-500/20 shadow-premium overflow-hidden relative group bg-red-500/[0.02]">
           <div className="absolute top-0 right-0 w-24 h-24 bg-red-500 opacity-10 rounded-full blur-3xl -mr-12 -mt-12 hidden lg:block" />
           <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg">
                    <FileText size={24} strokeWidth={2.5} />
                 </div>
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Liability</p>
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-red-500">
                ₹{vendors.reduce((acc: number, v: any) => acc + (v.current_balance || 0), 0).toLocaleString()}
              </h3>
           </CardContent>
        </Card>

        <Card className="glass-card border-blue-500/20 shadow-premium overflow-hidden relative group bg-blue-500/[0.02]">
           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 opacity-10 rounded-full blur-3xl -mr-12 -mt-12 hidden lg:block" />
           <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg">
                    <MapPin size={24} strokeWidth={2.5} />
                 </div>
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Supply Zones</p>
              </div>
              <h3 className="text-4xl font-black tracking-tighter text-blue-500">
                {new Set(vendors.map((v: any) => v.address?.split(',').pop()?.trim())).size}
              </h3>
           </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {vendors.map((vendor, i) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              layout
            >
              <Card className="group overflow-hidden rounded-[3rem] border-2 border-border/80 shadow-premium hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 bg-card/60 backdrop-blur-xl relative h-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-all hidden lg:block" />
                
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="w-16 h-16 brand-gradient rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border border-white/20">
                      {vendor.name[0].toUpperCase()}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-orange-500/10 text-muted-foreground hover:text-orange-600">
                        <Edit size={18} strokeWidth={2.5} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500">
                        <Trash2 size={18} strokeWidth={2.5} />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="mt-6 text-2xl font-black text-foreground group-hover:text-orange-600 transition-colors truncate tracking-tight">
                    {vendor.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 group/item">
                      <div className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center shrink-0 border border-white/20 group-hover/item:border-orange-500/50 transition-all">
                        <User className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Liaison Officer</p>
                         <p className="text-sm font-bold truncate text-foreground/80">{vendor.contact_person || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group/item">
                      <div className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center shrink-0 border border-white/20 group-hover/item:border-blue-500/50 transition-all">
                        <Phone className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Comm Protocol</p>
                         <p className="text-sm font-bold truncate text-foreground/80">{vendor.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group/item">
                      <div className="w-10 h-10 rounded-xl glass-panel flex items-center justify-center shrink-0 border border-white/20 group-hover/item:border-indigo-500/50 transition-all">
                        <MapPin className="h-5 w-5 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Physical Node</p>
                         <p className="text-sm font-bold line-clamp-1 text-foreground/80">{vendor.address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border/50">
                    <div className="flex items-end justify-between gap-6">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Financial Liability</span>
                        <span className={`text-3xl font-black tabular-nums tracking-tighter ${vendor.current_balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          ₹{vendor.current_balance?.toLocaleString() || 0}
                        </span>
                      </div>
                      <Button 
                        variant="outline" 
                        className="h-12 px-6 rounded-2xl border-2 border-border font-black uppercase tracking-widest text-[10px] hover:brand-gradient hover:border-transparent hover:text-white transition-all shadow-xl shadow-black/5"
                        onClick={() => setSelectedVendor(vendor)}
                      >
                        <FileText className="mr-2 h-4 w-4" strokeWidth={3} />
                        Ledger
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Register Vendor Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-lg glass-panel border-white/20 p-0 overflow-hidden">
          <div className="brand-gradient h-2 w-full" />
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase">
                Establish <span className="text-orange-600">Connection</span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddVendor} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Company / Entity Name</Label>
                <Input 
                  required 
                  placeholder="e.g. GLOBAL FLEX SOLUTIONS"
                  className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6 focus:ring-4 focus:ring-orange-500/10 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Lead Contact</Label>
                  <Input 
                    placeholder="Representative Name"
                    className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Phone Matrix</Label>
                  <Input 
                    placeholder="+91 XXXXX XXXXX"
                    className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Email Access</Label>
                <Input 
                  type="email"
                  placeholder="partner@enterprise.com"
                  className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Geo Location</Label>
                <Input 
                  placeholder="Full Business Address"
                  className="h-14 rounded-2xl bg-muted/40 border-border font-black text-foreground px-6"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <DialogFooter className="pt-6">
                <Button type="submit" className="w-full h-14 rounded-2xl brand-gradient text-white font-black shadow-2xl shadow-orange-500/20 uppercase tracking-widest text-[10px]">
                  Authorize Partner Connection
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {vendors.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-32 glass-card rounded-[4rem] border-2 border-dashed border-border"
        >
          <div className="w-32 h-32 bg-muted/50 rounded-[3rem] flex items-center justify-center mb-8 relative">
            <Building2 className="h-16 w-16 text-muted-foreground" strokeWidth={1} />
            <div className="absolute inset-0 brand-gradient rounded-[3rem] opacity-10 animate-pulse" />
          </div>
          <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Zero Node Matrix</h3>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.4em] mt-3 mb-10 text-center px-10">No supply chain partners detected in current database</p>
          <Button onClick={() => setIsAddOpen(true)} className="h-16 px-12 rounded-3xl brand-gradient text-white shadow-2xl shadow-orange-500/20 font-black uppercase tracking-widest text-xs hover:scale-105 transition-all">
            Initiate Partner Protocol
          </Button>
        </motion.div>
      )}
    </div>
  );
}
