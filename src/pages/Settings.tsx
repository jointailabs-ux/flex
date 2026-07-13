import React, { useState } from 'react';
import { 
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Store,
  Crown,
  Briefcase,
  Loader2,
  Plus
} from 'lucide-react';
import { 
  Card, 
  CardContent
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { useStores, useUsers } from '../hooks/queries/useInventory';
import { useUpdateUser, useUpdateStorePin, useAddStore } from '../hooks/mutations/useInventory';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";

export default function SettingsPage() {
  const { data: allUsers = [], isLoading: usersLoading } = useUsers();
  const { data: stores = [], isLoading: storesLoading } = useStores();
  const updateUserMutation = useUpdateUser();
  const updateStorePinMutation = useUpdateStorePin();
  const addStoreMutation = useAddStore();
  const queryClient = useQueryClient();

  // State
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<{id: string, name: string, type: 'user' | 'store' | 'temp_worker'} | null>(null);
  const [newPin, setNewPin] = useState('');
  const [newStore, setNewStore] = useState({ name: '', code: '', pin: '' });

  const loading = usersLoading || storesLoading;

  // Derived
  const tempWorkers = (allUsers as any[]).filter(u => u.role === 'temp_worker');
  const adminManagers = (allUsers as any[]).filter(u => u.role === 'owner' || u.role === 'store_manager');

  // Actions
  const togglePinVisibility = (id: string) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyPin = (pin: string, id: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(id);
    toast.success('PIN copied');
    setTimeout(() => setCopiedPin(null), 2000);
  };

  const generateRandomPin = () => Math.floor(100000 + Math.random() * 900000).toString();

  const openResetModal = (id: string, name: string, type: 'user' | 'store' | 'temp_worker') => {
    setResetTarget({ id, name, type });
    setNewPin(generateRandomPin());
  };

  const handleResetPin = () => {
    if (!resetTarget || !newPin || newPin.length !== 6) {
      toast.error('Enter a valid 6-digit PIN');
      return;
    }
    
    // Handle mock profiles (IDs start with lots of zeros)
    if (resetTarget.id.startsWith('00000000-0000-0000')) {
      const mockPins = JSON.parse(localStorage.getItem('mockPins') || '{}');
      mockPins[resetTarget.id] = newPin;
      localStorage.setItem('mockPins', JSON.stringify(mockPins));
      
      queryClient.setQueryData(['system', 'users'], (old: any) => {
        if (!old) return old;
        return old.map((u: any) => u.id === resetTarget.id ? { ...u, pin: newPin } : u);
      });
      
      toast.success(`PIN updated for ${resetTarget.name}`);
      setResetTarget(null);
      setNewPin('');
      return;
    }
    
    if (resetTarget.type === 'store') {
      updateStorePinMutation.mutate({ id: resetTarget.id, pin: newPin }, {
        onSuccess: () => {
          toast.success(`Store PIN updated for ${resetTarget.name}`);
          setResetTarget(null);
          setNewPin('');
        },
        onError: (e: any) => toast.error(e.message)
      });
    } else {
      const url = resetTarget.type === 'temp_worker' ? `/api/workforce/temp/${resetTarget.id}` : `/api/users/${resetTarget.id}`;
      updateUserMutation.mutate({ id: resetTarget.id, data: { pin: newPin }, url }, {
        onSuccess: () => {
          toast.success(`PIN updated for ${resetTarget.name}`);
          setResetTarget(null);
          setNewPin('');
        },
        onError: (e: any) => toast.error(e.message)
      });
    }
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStore.name || !newStore.code) {
      toast.error('Store name and code are required');
      return;
    }
    const payload: any = { name: newStore.name, code: newStore.code };
    if (newStore.pin) payload.pin = newStore.pin;
    
    addStoreMutation.mutate(payload, {
      onSuccess: (data: any) => {
        toast.success(`Store "${newStore.name}" created with PIN: ${data.pin || 'auto-generated'}`);
        setNewStore({ name: '', code: '', pin: '' });
      },
      onError: (e: any) => toast.error(e.message)
    });
  };

  // Render helpers
  const PinDisplay = ({ pin, id, name, type }: { pin: string, id: string, name: string, type: 'user' | 'store' | 'temp_worker' }) => {
    const visible = visiblePins[id];
    const hasPIN = !!pin;

    return (
      <div className="flex items-center gap-2">
        {hasPIN ? (
          <>
            <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-xl px-3 py-2 border border-neutral-100 dark:border-neutral-700">
              <span className="font-black text-base tracking-[0.3em] tabular-nums text-neutral-900 dark:text-neutral-100 min-w-[80px] text-center font-mono">
                {visible ? pin : '••••••'}
              </span>
              <button onClick={() => togglePinVisibility(id)} className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-neutral-400 hover:text-neutral-600" title={visible ? 'Hide' : 'Show'}>
                {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => copyPin(pin, id)} className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-neutral-400 hover:text-emerald-500" title="Copy">
                {copiedPin === id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
            <Button variant="outline" size="sm" onClick={() => openResetModal(id, name, type)}
              className="h-9 rounded-lg border-neutral-200 dark:border-neutral-700 font-bold text-[9px] uppercase tracking-widest hover:border-orange-500 hover:text-orange-600 transition-all px-3">
              <RefreshCw size={12} className="mr-1" /> Reset
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700">No PIN</span>
            <Button variant="outline" size="sm" onClick={() => openResetModal(id, name, type)}
              className="h-9 rounded-lg border-neutral-200 dark:border-neutral-700 font-bold text-[9px] uppercase tracking-widest hover:border-orange-500 hover:text-orange-600 transition-all px-3">
              <Key size={12} className="mr-1" /> Set PIN
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={32} className="animate-spin text-orange-600" />
        <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
          <Shield size={28} />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">PIN Management</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-0.5">All System PINs — Owner Access Only</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stores" className="space-y-6">
        <TabsList className="bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl w-full grid grid-cols-3 gap-2">
          <TabsTrigger value="stores" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:shadow-sm font-bold text-[10px] sm:text-xs uppercase tracking-widest py-3 dark:text-neutral-400 dark:data-[state=active]:text-blue-500">
            Store PINs
          </TabsTrigger>
          <TabsTrigger value="workers" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:shadow-sm font-bold text-[10px] sm:text-xs uppercase tracking-widest py-3 dark:text-neutral-400 dark:data-[state=active]:text-purple-500">
            Worker PINs
          </TabsTrigger>
          <TabsTrigger value="admins" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:shadow-sm font-bold text-[10px] sm:text-xs uppercase tracking-widest py-3 dark:text-neutral-400 dark:data-[state=active]:text-orange-500">
            Admins & Managers
          </TabsTrigger>
        </TabsList>


        {/* ===== STORE PINs TAB ===== */}
        <TabsContent value="stores" className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-6">
          <Card className="rounded-[2rem] border-none shadow-sm bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="px-6 sm:px-8 py-4 bg-blue-50 dark:bg-blue-950/10 border-b border-blue-100 dark:border-blue-900/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store size={16} className="text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Store Access PINs ({(stores as any[]).length})</span>
              </div>
            </div>
            <CardContent className="p-0">
              {(stores as any[]).length === 0 ? (
                <div className="py-16 text-center">
                  <Store size={40} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
                  <p className="text-sm font-bold text-neutral-400">No stores yet.</p>
                  <p className="text-xs text-neutral-400 mt-1">Add a store below to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                  {(stores as any[]).map((s: any) => (
                    <div key={s.id} className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center text-blue-600">
                          <Store size={20} />
                        </div>
                        <div>
                          <p className="font-black text-neutral-900 dark:text-neutral-100 tracking-tight text-sm">{s.name}</p>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{s.code}</span>
                        </div>
                      </div>
                      <PinDisplay pin={s.pin || ''} id={s.id} name={s.name} type="store" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add New Store */}
          <Card className="rounded-[2rem] border-none shadow-sm bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="px-6 sm:px-8 py-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
              <Plus size={16} className="text-neutral-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Add New Store</span>
            </div>
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleAddStore} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Store Name</Label>
                    <Input className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold dark:text-neutral-100" value={newStore.name} onChange={(e) => setNewStore({...newStore, name: e.target.value})} placeholder="e.g. Main Branch" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Code</Label>
                    <Input className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none font-bold uppercase dark:text-neutral-100" value={newStore.code} onChange={(e) => setNewStore({...newStore, code: e.target.value})} placeholder="MBR" maxLength={10} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">
                      Store PIN
                      <span className="text-neutral-400 font-normal ml-1">(auto if empty)</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input className="h-12 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none font-black tracking-[0.3em] text-center text-orange-600 font-mono dark:text-orange-500" value={newStore.pin} maxLength={6} onChange={(e) => setNewStore({...newStore, pin: e.target.value.replace(/\D/g, '')})} placeholder="Auto" />
                      <Button type="button" variant="outline" onClick={() => setNewStore({...newStore, pin: generateRandomPin()})} className="h-12 w-12 rounded-xl border-neutral-200 dark:border-neutral-700 shrink-0" title="Generate PIN">
                        <RefreshCw size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button type="submit" disabled={addStoreMutation.isPending} className="h-12 w-full sm:w-auto px-8 rounded-xl bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 text-white font-black text-xs uppercase tracking-widest">
                  {addStoreMutation.isPending ? 'Creating...' : <><Plus size={16} className="mr-2" /> Add Store</>}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-sm bg-neutral-50 dark:bg-neutral-800/50 overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/30 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <Store size={18} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-neutral-900 dark:text-neutral-100 mb-1">Store PINs</h4>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Each store has its own PIN. The person with the store PIN can access that store's billing (POS), daily sales, and transaction history. Share the store PIN with the manager handling that branch.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== WORKER PINs TAB ===== */}
        <TabsContent value="workers" className="animate-in fade-in slide-in-from-left-4 duration-300">
          <Card className="rounded-[2rem] border-none shadow-sm bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="px-6 sm:px-8 py-4 bg-purple-50 dark:bg-purple-950/10 border-b border-purple-100 dark:border-purple-900/20 flex items-center gap-3">
              <Briefcase size={16} className="text-purple-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600">Temporary Worker PINs ({tempWorkers.length})</span>
            </div>
            <CardContent className="p-0">
              {tempWorkers.length === 0 ? (
                <div className="py-16 text-center">
                  <Briefcase size={40} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
                  <p className="text-sm font-bold text-neutral-400">No temporary workers.</p>
                  <p className="text-xs text-neutral-400 mt-1">Add workers through the Workforce section. Their PINs will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                  {tempWorkers.map((w: any) => (
                    <div key={w.id} className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center text-purple-600">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <p className="font-black text-neutral-900 dark:text-neutral-100 tracking-tight text-sm">{w.name}</p>
                          {w.store_name && (
                            <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1 mt-0.5">
                              <Store size={10} /> {w.store_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <PinDisplay pin={w.pin} id={w.id} name={w.name} type="temp_worker" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-sm bg-neutral-50 dark:bg-neutral-800/50 overflow-hidden mt-6">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/30 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
                  <Briefcase size={18} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-neutral-900 dark:text-neutral-100 mb-1">Worker PINs</h4>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Temporary workers use their PIN to log in and check their work ledger and payment history. PINs are auto-generated when you add a worker in the Workforce section.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ADMINS & MANAGERS PINs TAB ===== */}
        <TabsContent value="admins" className="animate-in fade-in slide-in-from-left-4 duration-300">
          <Card className="rounded-[2rem] border-none shadow-sm bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="px-6 sm:px-8 py-4 bg-orange-50 dark:bg-orange-950/10 border-b border-orange-100 dark:border-orange-900/20 flex items-center gap-3">
              <Crown size={16} className="text-orange-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Admin & Manager PINs ({adminManagers.length})</span>
            </div>
            <CardContent className="p-0">
              {adminManagers.length === 0 ? (
                <div className="py-16 text-center">
                  <Crown size={40} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
                  <p className="text-sm font-bold text-neutral-400">No admins or managers.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                  {adminManagers.map((u: any) => (
                    <div key={u.id} className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${u.role === 'owner' ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-600' : 'bg-blue-100 dark:bg-blue-950/30 text-blue-600'}`}>
                          {u.role === 'owner' ? <Crown size={18} /> : <Shield size={18} />}
                        </div>
                        <div>
                          <p className="font-black text-neutral-900 dark:text-neutral-100 tracking-tight text-sm">{u.name}</p>
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5 block">
                            {u.role === 'owner' ? 'System Administrator' : 'Store Manager'}
                          </span>
                        </div>
                      </div>
                      <PinDisplay pin={u.pin} id={u.id} name={u.name} type="user" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-sm bg-neutral-50 dark:bg-neutral-800/50 overflow-hidden mt-6">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950/30 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                  <Shield size={18} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-neutral-900 dark:text-neutral-100 mb-1">Admin & Manager Security</h4>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    System Administrators and Store Managers have higher-level access. Keep these PINs secure, as they provide access to sensitive business data and configuration options.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reset PIN Modal */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) setResetTarget(null); }}>
        <DialogContent className="rounded-[2rem] sm:max-w-sm bg-white dark:bg-neutral-900 border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-neutral-900 dark:bg-neutral-950 p-8 text-white">
             <DialogHeader>
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mb-4">
                   <RefreshCw size={24} />
                </div>
                <DialogTitle className="text-xl font-black tracking-tight">Reset PIN</DialogTitle>
                <DialogDescription className="text-neutral-400 text-xs font-bold mt-1">
                   New PIN for <span className="text-white">{resetTarget?.name}</span>
                </DialogDescription>
             </DialogHeader>
          </div>
          <div className="p-8 space-y-5">
             <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">New 6-Digit PIN</Label>
                <div className="flex items-center gap-3">
                   <Input 
                     className="h-14 rounded-xl bg-neutral-50 dark:bg-neutral-800 border-none font-black text-2xl tracking-[0.5em] text-center text-orange-600 font-mono" 
                     value={newPin} 
                     maxLength={6}
                     onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} 
                   />
                   <Button type="button" variant="outline" onClick={() => setNewPin(generateRandomPin())} className="h-14 w-14 rounded-xl border-neutral-200 dark:border-neutral-700 shrink-0" title="Generate random PIN">
                     <RefreshCw size={16} />
                   </Button>
                </div>
             </div>
             <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-1">
               <Button type="button" variant="ghost" className="h-12 rounded-xl font-bold text-xs flex-1" onClick={() => setResetTarget(null)}>Cancel</Button>
               <Button 
                 type="button" 
                 className="h-12 rounded-xl bg-orange-600 text-white font-black text-xs uppercase tracking-widest flex-1 shadow-lg"
                 onClick={handleResetPin}
                 disabled={updateUserMutation.isPending || updateStorePinMutation.isPending}
               >
                 {(updateUserMutation.isPending || updateStorePinMutation.isPending) ? 'Saving...' : 'Save New PIN'}
               </Button>
             </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
