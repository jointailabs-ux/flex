import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Layers,
  Box,
  Store,
  CreditCard,
  Truck,
  BookOpen,
  Menu,
  Moon,
  Sun,
  Calculator,
  Activity,
  ArrowLeftRight,
  Wallet,
  ChevronRight,
  Search,
  Clock as ClockIcon,
  X,
  Building2,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "../ui/sheet";
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const Clock = React.memo(function Clock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex flex-col items-end mr-1">
      <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1 text-right">Local Time</span>
      <span className="text-xs font-bold text-foreground tabular-nums">
        {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
});

const menuItems = [
  { title: 'Hub', icon: LayoutDashboard, role: ['owner', 'store_manager'], path: '/', mobile: true },
  { title: 'POS', icon: CreditCard, role: ['owner', 'store_manager'], path: '/pos', mobile: true },
  { title: 'Materials', icon: Layers, role: ['owner', 'store_manager'], path: '/inventory', mobile: true },
  { title: 'Catalog', icon: Box, role: ['owner', 'store_manager'], path: '/products', mobile: true },
  { title: 'Ledger', icon: ArrowLeftRight, role: ['owner', 'store_manager'], path: '/transactions', mobile: true },
  { title: 'Corporate', icon: Building2, role: ['owner'], path: '/corporate-clients', mobile: false },
  { title: 'Vendors', icon: Truck, role: ['owner'], path: '/vendors', mobile: false },
  { title: 'Outlets', icon: Store, role: ['owner'], path: '/stores', mobile: false },
  { title: 'Attendance', icon: Calendar, role: ['owner', 'store_manager'], path: '/attendance', mobile: true },
  { title: 'Expenses', icon: Calculator, role: ['owner'], path: '/expenses', mobile: false },
  { title: 'Payroll', icon: Wallet, role: ['owner'], path: '/salary', mobile: false },
  { title: 'Setup', icon: Settings, role: ['owner'], path: '/settings', mobile: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut, currentPath, navigateTo } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('flexflow-theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('flexflow-theme', theme);
  }, [theme]);

  const filteredItems = useMemo(() => 
    menuItems.filter(item => item.role.includes(profile?.role || '')),
    [profile?.role]
  );

  const mobileItems = useMemo(() => 
    filteredItems.filter(item => item.mobile).slice(0, 4),
    [filteredItems]
  );

  const handleSystemReset = async () => {
    if (window.confirm('CRITICAL ACTION: This will permanently delete ALL transaction history, sales, purchases, and ledger entries. Inventory levels will be reset to zero. Master data (Materials, Vendors, Stores) will remain. Are you absolutely sure?')) {
      try {
        const res = await fetch('/api/system/clear-transactions', { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
          toast.success('System Reset Complete. Reloading...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.error('Error: ' + (data.error || 'Operation failed'));
        }
      } catch (err) {
        toast.error('Network Error: Failed to reset system');
      }
    }
  };

  return (
    <div className="min-h-screen w-full font-sans bg-background selection:bg-orange-500/30">
      
      {/* 1. Desktop Nav Rail */}
      <div className="hidden lg:block">
        <nav 
          className="nav-rail group flex"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
        <div className="flex flex-col h-full w-full px-4">
          {/* Logo */}
          <div 
            className="flex items-center gap-4 mb-12 ml-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigateTo('/')}
          >
            <div className="w-12 h-12 brand-gradient rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20 shrink-0">
              <Activity size={24} strokeWidth={3} className="animate-pulse" />
            </div>
            <motion.div 
              initial={false}
              animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
              className="flex flex-col whitespace-nowrap"
            >
              <span className="font-black text-xl tracking-tight leading-none text-foreground">CHATTERJEE <span className="text-orange-600">ENTERPRIZE</span></span>
              <span className="text-[8px] font-black text-orange-600/60 uppercase tracking-[0.3em] mt-1">Intelligence OS</span>
            </motion.div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 -mr-2">
            {filteredItems.map((item) => {
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.title}
                  onClick={() => navigateTo(item.path)}
                  className={`w-full h-12 rounded-2xl flex items-center gap-4 transition-all duration-300 relative group/btn ${
                    isActive 
                      ? 'brand-gradient text-white shadow-lg shadow-orange-500/20' 
                      : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                  }`}
                >
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    <item.icon size={20} strokeWidth={isActive ? 3 : 2} />
                  </div>
                  <motion.span 
                    initial={false}
                    animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                    className="font-bold text-sm tracking-tight whitespace-nowrap"
                  >
                    {item.title}
                  </motion.span>
                  {isActive && !isHovered && (
                    <div className="absolute right-0 w-1.5 h-6 bg-white rounded-l-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="space-y-4 pt-6 border-t border-white/10">
            {profile?.role === 'owner' && (
              <button 
                onClick={handleSystemReset}
                className="w-full h-12 rounded-2xl flex items-center gap-4 text-orange-600/60 hover:text-orange-500 hover:bg-orange-500/10 transition-all duration-300 overflow-hidden"
              >
                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                  <Activity size={20} strokeWidth={2} />
                </div>
                <motion.span 
                  initial={false}
                  animate={{ opacity: isHovered ? 1 : 0 }}
                  className="font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
                >
                  System Reset
                </motion.span>
              </button>
            )}
            <button 
              onClick={() => signOut()}
              className="w-full h-12 rounded-2xl flex items-center gap-4 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all duration-300 overflow-hidden"
            >
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <LogOut size={20} strokeWidth={2} />
              </div>
              <motion.span 
                initial={false}
                animate={{ opacity: isHovered ? 1 : 0 }}
                className="font-black text-[10px] uppercase tracking-widest whitespace-nowrap"
              >
                Logout
              </motion.span>
            </button>
          </div>
        </div>
      </nav>
    </div>

      {/* 2. Mobile Bottom Nav */}
      <nav className="bottom-nav lg:hidden">
        {mobileItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <button
              key={item.title}
              onClick={() => navigateTo(item.path)}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 relative flex-1 ${
                isActive ? 'text-orange-500' : 'text-muted-foreground'
              }`}
            >
              <item.icon size={isActive ? 22 : 20} strokeWidth={isActive ? 3 : 2} className="transition-all duration-500" />
              <span className={`text-[7px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-0.5'}`}>
                {item.title}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="active-nav-dot"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl text-muted-foreground hover:bg-white/10">
              <Menu size={22} strokeWidth={2} />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[3rem] p-0 border-none glass-card max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-foreground uppercase">Main Menu</h3>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">Control Center</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-2xl h-12 w-12 glass-panel">
                  <X size={20} />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {filteredItems.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => { navigateTo(item.path); setIsMobileMenuOpen(false); }}
                    className={`flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-2xl sm:rounded-3xl transition-all ${
                      currentPath === item.path ? 'brand-gradient text-white shadow-xl shadow-orange-500/20' : 'glass-panel text-foreground/80'
                    }`}
                  >
                    <item.icon size={20} className="sm:size-6" strokeWidth={currentPath === item.path ? 3 : 2} />
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider sm:tracking-widest">{item.title}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 sm:pt-4 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full h-14 sm:h-16 rounded-2xl sm:rounded-3xl border-white/10 text-red-500 font-black uppercase tracking-widest text-[10px]"
                  onClick={() => signOut()}
                >
                  <LogOut size={18} className="mr-3" />
                  Terminate Session
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>

      {/* 3. Main Content Area */}
      <main className={`flex flex-col min-h-screen transition-all duration-500 ${isHovered ? 'lg:pl-[280px]' : 'lg:pl-[120px]'} pb-32 lg:pb-0`}>
        {/* Universal Header */}
        <header className="h-20 lg:h-28 flex items-center justify-between px-6 lg:px-12 sticky top-0 z-40 backdrop-blur-xl bg-background/50 border-b border-white/5 lg:border-none">
          <div className="flex items-center gap-4">
            <div 
              className="lg:hidden flex items-center gap-3 cursor-pointer active:scale-95 transition-transform"
              onClick={() => navigateTo('/')}
            >
               <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <Activity size={20} strokeWidth={3} />
               </div>
               <div className="flex flex-col">
                 <span className="font-black text-base tracking-tight text-foreground leading-none">CHATTERJEE <span className="text-orange-600">ENTERPRIZE</span></span>
                 <span className="text-[7px] font-black text-orange-600/60 uppercase tracking-widest mt-0.5">Mobile Terminal</span>
               </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-3 px-6 py-3 glass-card rounded-2xl border-white/50 dark:border-white/5 shadow-premium">
              <Search size={16} className="text-orange-600" />
              <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">
                 Terminal Scope: {currentPath === '/' ? 'Central Hub' : currentPath.substring(1).replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-8">
            <div className="flex items-center gap-3 px-4 py-2 glass-card rounded-[2rem] border-white/50 dark:border-white/5">
              <Clock />
              <div className="hidden md:block w-px h-8 bg-neutral-200 dark:bg-neutral-800/50" />
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl glass-card hover:bg-orange-50 dark:hover:bg-orange-950/20 group"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-black text-foreground">{profile?.name}</span>
                <span className="text-[9px] text-orange-600 font-black uppercase tracking-[0.2em]">{profile?.role?.replace('_', ' ')}</span>
              </div>
              <div className="relative group">
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-neutral-900 shadow-[0_0_8px_rgba(34,197,94,0.6)] z-10" />
                <Avatar className="h-10 w-10 lg:h-14 lg:w-14 rounded-2xl border-2 border-white dark:border-neutral-800 shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <AvatarFallback className="brand-gradient text-white text-base font-black">{profile?.name?.[0]}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 px-4 lg:px-12 py-6">
          <div className="max-w-7xl mx-auto h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
