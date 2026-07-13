import React, { useState } from 'react';
import { Store, Plus, Trash2, Edit3, Globe, Zap, ArrowRight, Loader2, Activity, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useStores } from '../hooks/queries/useInventory';
import { useAddStore, useDeleteStore, useUpdateStore } from '../hooks/mutations/useInventory';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { motion, AnimatePresence } from 'motion/react';

export default function StoresPage() {
  const { data: stores = [], isLoading: dataLoading, isError, error } = useStores();
  const addStoreMutation = useAddStore();
  const deleteStoreMutation = useDeleteStore();
  const updateStoreMutation = useUpdateStore();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', code: '', pin: '' });

  const loading = addStoreMutation.isPending || updateStoreMutation.isPending;

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;
    
    addStoreMutation.mutate(formData, {
      onSuccess: () => {
        toast.success(`Store ${formData.name} added`);
        setFormData({ name: '', code: '', pin: '' });
        setIsAddOpen(false);
      },
      onError: (e: any) => {
        toast.error(e.message);
      }
    });
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStore || !formData.name || !formData.code) return;
    
    updateStoreMutation.mutate({ id: editingStore.id, ...formData }, {
      onSuccess: () => {
        toast.success(`Store ${formData.name} updated`);
        setEditingStore(null);
        setIsEditOpen(false);
        setFormData({ name: '', code: '', pin: '' });
      },
      onError: (e: any) => {
        toast.error(e.message);
      }
    });
  };

  const openEdit = (store: any) => {
    setEditingStore(store);
    setFormData({ name: store.name, code: store.code, pin: store.pin || '' });
    setIsEditOpen(true);
  };

  const handleDeleteStore = async (store: any) => {
    if (!confirm(`Are you sure you want to decommission "${store.name}"? This action cannot be undone.`)) return;

    deleteStoreMutation.mutate(store.id, {
      onSuccess: () => {
        toast.success('Node successfully decommissioned');
      },
      onError: (e: any) => {
        toast.error(e.message);
      }
    });
  };

  if (dataLoading && stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 brand-gradient rounded-3xl animate-spin mb-6 flex items-center justify-center">
           <div className="w-8 h-8 bg-background rounded-2xl" />
        </div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">Syncing Operational Matrix...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-neutral-900 rounded-[3rem] border border-dashed border-red-200 dark:border-red-900/30 mx-6">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-3xl flex items-center justify-center mb-6 text-red-500 shadow-xl shadow-red-500/10">
          <Store size={40} strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">Network Down</h3>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-2 mb-8 max-w-sm text-center">
          {(error as Error)?.message || 'Failed to sync with the operational network'}
        </p>
        <Button onClick={() => window.location.reload()} className="h-14 px-10 rounded-2xl brand-gradient text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-orange-500/20">
          Reconnect Network
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tighter text-foreground uppercase">Store <span className="text-orange-600">Outlets</span></h2>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] ml-1">Manage Business Branches</p>
        </div>
        <Button 
          onClick={() => {
            setFormData({ name: '', code: '', pin: '' });
            setIsAddOpen(true);
          }} 
          className="w-full md:w-auto h-14 rounded-2xl brand-gradient text-white shadow-2xl shadow-orange-500/30 font-black border-none hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs px-8"
        >
          <Plus className="mr-3 h-5 w-5" strokeWidth={4} />
          Add New Store
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {stores.map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              layout
            >
              <Card className="group overflow-hidden rounded-[3rem] border-none shadow-premium hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 bg-card/60 backdrop-blur-xl relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-all hidden lg:block" />
                
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="w-16 h-16 brand-gradient rounded-2xl flex items-center justify-center text-white shadow-lg border border-white/20">
                      <Store size={32} strokeWidth={2.5} />
                    </div>
                    <div className="flex gap-2">
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-xl hover:bg-orange-500/10 text-muted-foreground hover:text-orange-600 transition-all" 
                        onClick={() => openEdit(store)}
                       >
                         <Edit3 size={18} strokeWidth={2.5} />
                       </Button>
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all" 
                        onClick={() => handleDeleteStore(store)}
                       >
                         <Trash2 size={18} strokeWidth={2.5} />
                       </Button>
                    </div>
                  </div>
                  <div className="mt-6 space-y-1">
                    <CardTitle className="text-2xl font-black text-foreground tracking-tight group-hover:text-orange-600 transition-colors">
                      {store.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                       <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 text-[9px] font-black uppercase tracking-widest border border-orange-500/20">
                          STORE CODE: {store.code}
                       </span>
                    </div>
                    {store.pin && (
                      <div className="flex items-center gap-2 mt-2">
                         <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[8px] font-black uppercase tracking-widest border border-blue-500/20 flex items-center gap-1.5">
                            <ShieldCheck size={10} /> PIN: {store.pin}
                         </span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-8 pt-6 space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-2xl bg-muted/40 border border-border/50">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Telemetry</p>
                        <div className="flex items-center gap-2">
                           <Activity size={14} className="text-emerald-500" />
                           <span className="text-xs font-black text-foreground/80 uppercase">Active</span>
                        </div>
                     </div>
                     <div className="p-4 rounded-2xl bg-muted/40 border border-border/50">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Security</p>
                        <div className="flex items-center gap-2">
                           <ShieldCheck size={14} className="text-blue-500" />
                           <span className="text-xs font-black text-foreground/80 uppercase">Secured</span>
                        </div>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                        <span className="uppercase tracking-widest">Network Hash</span>
                        <span className="font-mono opacity-60">ID-{store.id.substring(0, 8)}</span>
                     </div>
                     <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full brand-gradient w-full opacity-30" />
                     </div>
                  </div>
                  
                  <Button variant="outline" onClick={() => window.location.href='/pos?store=' + store.id} className="w-full h-14 rounded-[1.8rem] border-2 border-border font-black uppercase tracking-widest text-[10px] hover:brand-gradient hover:border-transparent hover:text-white transition-all shadow-xl shadow-black/5 group/btn">
                     Open POS
                     <ArrowRight size={16} strokeWidth={3} className="ml-3 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Node Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-lg glass-panel border-white/20 p-0 overflow-hidden">
          <div className="brand-gradient h-2 w-full" />
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase">
                Add <span className="text-orange-600">New Store</span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStore} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Branch Identity (Name)</Label>
                <div className="relative">
                   <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                   <Input 
                     required 
                     placeholder="e.g. SOUTH TERMINAL ALPHA"
                     className="h-16 rounded-3xl bg-muted/40 border-none pl-14 font-black text-lg focus:ring-4 focus:ring-orange-500/10 transition-all"
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Protocol Identifier (Code)</Label>
                <div className="relative">
                   <Zap className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <Input 
                     required 
                     placeholder="e.g. LKO-X1"
                     className="h-16 rounded-3xl bg-muted/40 border-none pl-14 font-black text-lg uppercase focus:ring-4 focus:ring-orange-500/10 transition-all"
                     value={formData.code}
                     onChange={(e) => setFormData({...formData, code: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Manager PIN (6 Digits)</Label>
                <div className="relative">
                   <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                   <Input 
                     placeholder="e.g. 123456"
                     className="h-16 rounded-3xl bg-muted/40 border-none pl-14 font-black text-lg focus:ring-4 focus:ring-orange-500/10 transition-all font-mono tracking-widest"
                     value={formData.pin}
                     maxLength={6}
                     onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                   />
                </div>
              </div>
              <DialogFooter className="pt-6">
                <Button type="submit" disabled={loading} className="w-full h-16 rounded-3xl brand-gradient text-white font-black text-xl shadow-2xl shadow-orange-500/20 uppercase tracking-widest">
                  {loading ? 'Executing Protocol...' : 'Create Store'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Node Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-lg glass-panel border-white/20 p-0 overflow-hidden">
          <div className="bg-orange-600 h-2 w-full" />
          <div className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase">
                Update <span className="text-orange-600">Store Details</span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateStore} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Update Identity (Name)</Label>
                <div className="relative">
                   <Globe className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                   <Input 
                     required 
                     className="h-16 rounded-3xl bg-muted/40 border-none pl-14 font-black text-lg focus:ring-4 focus:ring-orange-500/10 transition-all"
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Update Identifier (Code)</Label>
                <div className="relative">
                   <Zap className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <Input 
                     required 
                     className="h-16 rounded-3xl bg-muted/40 border-none pl-14 font-black text-lg uppercase focus:ring-4 focus:ring-orange-500/10 transition-all"
                     value={formData.code}
                     onChange={(e) => setFormData({...formData, code: e.target.value})}
                   />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Update Manager PIN</Label>
                <div className="relative">
                   <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                   <Input 
                     className="h-16 rounded-3xl bg-muted/40 border-none pl-14 font-black text-lg focus:ring-4 focus:ring-orange-500/10 transition-all font-mono tracking-widest"
                     value={formData.pin}
                     maxLength={6}
                     onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                   />
                </div>
              </div>
              <DialogFooter className="pt-6">
                <Button type="submit" disabled={loading} className="w-full h-16 rounded-3xl bg-foreground text-background font-black text-xl shadow-2xl shadow-black/20 uppercase tracking-widest">
                  {loading ? 'Reconfiguring...' : 'Apply Update'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {stores.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-32 glass-card rounded-[4rem] border-2 border-dashed border-border"
        >
          <div className="w-32 h-32 bg-muted/50 rounded-[3rem] flex items-center justify-center mb-8 relative">
            <Store className="h-16 w-16 text-muted-foreground" strokeWidth={1} />
            <div className="absolute inset-0 brand-gradient rounded-[3rem] opacity-10 animate-pulse" />
          </div>
          <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Zero Network Matrix</h3>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.4em] mt-3 mb-10 text-center px-10">No operational nodes detected in current grid</p>
          <Button onClick={() => setIsAddOpen(true)} className="h-16 px-12 rounded-3xl brand-gradient text-white shadow-2xl shadow-orange-500/20 font-black uppercase tracking-widest text-xs hover:scale-105 transition-all">
            Initiate First Node
          </Button>
        </motion.div>
      )}
    </div>
  );
}
