import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { 
  Activity,
  ShieldCheck, 
  Fingerprint,
  Delete,
  Loader2,
  Monitor,
  Database,
  Lock,
  Zap,
  Cpu
} from 'lucide-react';
import { signInWithPin } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const { mockLogin } = useAuth();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const getDemoProfiles = () => {
    const baseProfiles = [
      { id: '00000000-0000-0000-0000-000000000001', email: 'admin@flexstock.com', name: 'System Admin', role: 'owner', pin: '123456' },
      { id: '00000000-0000-0000-0000-000000000002', email: 'managerA@flexstock.com', name: 'Store A Manager', role: 'store_manager', store_id: '00000000-0000-0000-0000-000000000005', pin: '111111' },
      { id: '00000000-0000-0000-0000-000000000003', email: 'managerB@flexstock.com', name: 'Store B Manager', role: 'store_manager', store_id: '00000000-0000-0000-0000-000000000006', pin: '222222' }
    ];
    try {
      const mockPins = JSON.parse(localStorage.getItem('mockPins') || '{}');
      return baseProfiles.map(p => ({
        ...p,
        pin: mockPins[p.id] || p.pin
      }));
    } catch {
      return baseProfiles;
    }
  };

  const handleAuth = async (finalPin: string) => {
    setLoading(true);
    try {
      const { user, error } = await signInWithPin(finalPin);
      
      const profiles = getDemoProfiles();
      const demoUser = profiles.find(p => p.pin === finalPin);

      if (error) {
        if (demoUser) {
          mockLogin(demoUser);
          toast.success(`Demo Access: ${demoUser.name}`);
        } else {
          toast.error('Access Denied: Invalid Terminal PIN');
          setPin('');
        }
      } else if (user) {
        mockLogin(user as any); 
        toast.success(`Welcome Back, ${user.name}`);
      }
    } catch (err) {
      const profiles = getDemoProfiles();
      const demoUser = profiles.find(p => p.pin === finalPin);
      if (demoUser) {
        mockLogin(demoUser);
        toast.success(`Demo Access: ${demoUser.name}`);
      } else {
        toast.error('Terminal Authentication Error');
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        const digit = e.key;
        setPin(prev => {
          if (prev.length >= 6) return prev;
          const newPin = prev + digit;
          if (newPin.length === 6) {
            handleAuth(newPin);
          }
          return newPin;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        e.preventDefault();
        setPin('');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [loading]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('flexflow-theme') || 'dark';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    document.body.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const handleDigitInput = (digit: string) => {
    if (loading) return;
    setPin(prev => {
      if (prev.length >= 6) return prev;
      const newPin = prev + digit;
      if (newPin.length === 6) {
        handleAuth(newPin);
      }
      return newPin;
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-2 sm:p-4 relative overflow-hidden font-sans bg-background text-foreground">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 hidden lg:block">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[150px] rounded-full animate-pulse hidden lg:block" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 blur-[150px] rounded-full animate-pulse hidden lg:block" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] dark:opacity-[0.05]" />
      </div>

      <div className="w-full max-w-[1100px] grid lg:grid-cols-2 gap-0 items-stretch relative z-10 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-md lg:backdrop-blur-3xl rounded-[2rem] sm:rounded-[4rem] border border-black/5 dark:border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Branding Info */}
        <div className="hidden lg:flex flex-col justify-between p-20 relative overflow-hidden bg-neutral-50/50 dark:bg-neutral-950/50">
           <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_20%,rgba(249,115,22,0.1),transparent_50%)]" />
           
           <div className="relative z-10">
              <div className="flex items-center gap-5 mb-24">
                <div className="w-16 h-16 bg-orange-600 rounded-[1.5rem] flex items-center justify-center shadow-[0_20px_50px_rgba(234,88,12,0.4)] border-2 border-white/10">
                  <Activity size={36} className="text-white" strokeWidth={3} />
                </div>
                <h1 className="text-5xl font-black tracking-tighter uppercase italic">Chatterjee <span className="text-orange-600">Enterprize</span></h1>
              </div>
              
              <div className="space-y-8">
                <h2 className="text-7xl font-black leading-[0.95] tracking-tight italic uppercase text-neutral-900 dark:text-white">
                   Business <br />
                   <span className="text-orange-600">Printing</span> <br />
                   Manager.
                </h2>
                <div className="flex items-center gap-4 py-6 border-l-4 border-orange-600/30 pl-8">
                   <Lock className="text-orange-600" size={32} />
                   <p className="text-neutral-400 text-lg font-bold max-w-sm leading-snug">
                     Enter your 6-digit security PIN to access the management dashboard and POS system.
                   </p>
                </div>
              </div>
           </div>

           <div className="relative z-10 grid grid-cols-2 gap-10 pt-16 border-t border-white/5">
              {[
                { icon: ShieldCheck, label: 'SECURE PIN', desc: 'Protected Access' },
                { icon: Database, label: 'INVENTORY', desc: 'Real-time Stock' },
                { icon: Cpu, label: 'FLEX ERP', desc: 'Business System' },
                { icon: Zap, label: 'EASY POS', desc: 'Quick Billing' }
              ].map((item, i) => (
                <div key={i} className="space-y-2 group">
                   <div className="flex items-center gap-3 text-orange-500 group-hover:text-orange-400 transition-colors">
                      <item.icon size={20} strokeWidth={3} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">{item.label}</span>
                   </div>
                   <p className="text-xs font-bold text-neutral-600 pl-8">{item.desc}</p>
                </div>
              ))}
           </div>
        </div>

        {/* PIN Entry Area */}
        <div className="flex flex-col items-center justify-center p-6 sm:p-8 lg:p-24 bg-white/50 dark:bg-white/[0.02]">
          <div className="w-full max-w-[340px] space-y-8 sm:space-y-12">
            <div className="text-center space-y-3">
               <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/5 dark:bg-white/5 rounded-2xl sm:rounded-[2rem] border border-black/10 dark:border-white/10 flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner">
                  <Fingerprint className="text-orange-600 size-8 sm:size-10" strokeWidth={2.5} />
               </div>
               <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white uppercase italic">Staff Login</h2>
               <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em]">Secure Security PIN Access</p>
            </div>

            {/* PIN Display Nodes */}
            <div className="flex justify-between gap-2 sm:gap-3 px-1 sm:px-2">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={pin[i] ? { scale: [1, 1.1, 1], rotate: [0, 5, 0] } : {}}
                  className={`w-10 sm:w-12 h-14 sm:h-16 rounded-xl sm:rounded-2xl border-2 flex items-center justify-center text-2xl sm:text-3xl font-black transition-all duration-300 ${
                    pin[i] 
                      ? 'border-orange-500 bg-orange-500/10 text-orange-500 shadow-[0_0_30px_rgba(234,88,12,0.3)]' 
                      : 'border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] text-neutral-700 dark:text-neutral-500'
                  }`}
                >
                  {pin[i] ? (
                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(234,88,12,1)]" />
                  ) : ''}
                </motion.div>
              ))}
            </div>

            {/* Virtual Keypad */}
            <div className="space-y-8">
               <div className="grid grid-cols-3 gap-3 sm:gap-4 md:hidden">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'DEL'].map((key) => (
                    <Button
                      key={key}
                      variant="ghost"
                      className={`h-16 sm:h-20 rounded-xl sm:rounded-[1.5rem] text-xl sm:text-2xl font-black transition-all active:scale-95 border border-black/5 dark:border-white/5 ${
                        typeof key === 'number' 
                          ? 'bg-black/5 dark:bg-white/5 text-neutral-900 dark:text-white hover:bg-orange-600 hover:text-white' 
                          : key === 'DEL' ? 'text-red-500 bg-red-500/5' : 'text-neutral-500 bg-black/5 dark:bg-white/5'
                      }`}
                      onClick={() => {
                        if (key === 'C') setPin('');
                        else if (key === 'DEL') setPin(pin.slice(0, -1));
                        else handleDigitInput(key.toString());
                      }}
                      disabled={loading}
                    >
                      {key === 'DEL' ? <Delete size={24} strokeWidth={3} /> : key}
                    </Button>
                  ))}
               </div>

               <div className="hidden md:flex flex-col items-center gap-4 text-center">
                  <div className="flex items-center gap-4 px-6 py-3 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/10 dark:border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 dark:text-neutral-400">
                     <Monitor size={16} className="text-orange-600" />
                     Keyboard Input Active
                  </div>
                  <p className="text-[10px] font-bold text-neutral-600 italic">
                     Type your security code using the numeric keypad.
                  </p>
               </div>
            </div>

            {loading && (
               <div className="flex flex-col items-center gap-4 py-4 animate-pulse">
                  <Loader2 className="animate-spin text-orange-600" size={32} strokeWidth={3} />
                  <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.6em]">Verifying PIN...</span>
               </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-30">
         <ShieldCheck size={16} className="text-orange-600" />
         <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.8em]">
            CHATTERJEE ENTERPRIZE BUSINESS MANAGEMENT SYSTEM
         </p>
      </div>
    </div>
  );
}
