/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppShell } from './components/layout/Shell';
import { Toaster, toast } from 'sonner';
import { ShieldCheck, Activity } from 'lucide-react';

// Lazy load pages for performance
const LoginPage = lazy(() => import('./pages/Login'));
const SetupPage = lazy(() => import('./pages/Setup'));
const OwnerDashboard = lazy(() => import('./components/dashboard/OwnerDashboard'));
const ManagerDashboard = lazy(() => import('./components/dashboard/ManagerDashboard'));
const RawMaterialsPage = lazy(() => import('./pages/RawMaterials'));
const PurchasesPage = lazy(() => import('./pages/Purchases'));
const ProductsPage = lazy(() => import('./pages/Products'));
const POSPage = lazy(() => import('./pages/POS'));
const VendorsPage = lazy(() => import('./pages/Vendors'));
const PurchaseEntryPage = lazy(() => import('./pages/PurchaseEntry'));
const TransactionsPage = lazy(() => import('./pages/Transactions'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const StoresPage = lazy(() => import('./pages/Stores'));
const TempWorkerDashboard = lazy(() => import('./components/dashboard/TempWorkerDashboard'));
const PermanentStaffDashboard = lazy(() => import('./components/dashboard/PermanentStaffDashboard'));
const AttendancePage = lazy(() => import('./pages/workforce/Attendance'));

const ExpensesPage = lazy(() => import('./pages/Expenses'));
const StoreHistory = lazy(() => import('./pages/StoreHistory'));
const SalaryManagementPage = lazy(() => import('./pages/workforce/SalaryManagement'));
const CorporateClientsPage = lazy(() => import('./pages/CorporateClients'));

function LoadingScreen() {
  const handleClear = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/?logout=true';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-neutral-950 p-6">
      <div className="flex flex-col items-center gap-8 max-w-xs w-full">
         <div className="w-20 h-20 brand-gradient rounded-[2rem] flex items-center justify-center text-white shadow-2xl animate-pulse ring-8 ring-orange-500/5">
            <Activity size={36} strokeWidth={3} />
         </div>
         
         <div className="flex flex-col items-center gap-3 w-full">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">Loading App</p>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-neutral-900 rounded-full overflow-hidden">
               <div className="h-full bg-orange-600 animate-loading-bar w-1/2" />
            </div>
         </div>

         <div className="pt-8 flex flex-col items-center gap-4">
             <p className="text-xs font-bold text-muted-foreground text-center leading-relaxed">
              Connecting to server and synchronizing store data...
            </p>
            <button 
              onClick={handleClear}
              className="mt-4 px-6 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all border border-neutral-100 dark:border-neutral-800"
            >
              Stuck? Force Reset
            </button>
         </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, profile, loading, signOut, currentPath, navigateTo } = useAuth();

  // Theme Initialization
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('flexflow-theme') || 'dark';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    document.body.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  // Auto-logout: 30 minutes of inactivity
  React.useEffect(() => {
    if (!user) return;
    
    let timer: NodeJS.Timeout;
    let lastActivity = Date.now();
    
    const resetTimer = () => {
       const now = Date.now();
       // Throttle: only reset if >1s since last reset
       if (now - lastActivity < 1000) return;
       lastActivity = now;
       clearTimeout(timer);
       timer = setTimeout(() => {
          signOut();
          toast.warning('Session expired due to inactivity');
       }, 30 * 60 * 1000); // 30 minutes
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll'] as const;
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
       clearTimeout(timer);
       events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, signOut]);


  React.useEffect(() => {
    const managerAllowedPaths = new Set(['/', '/inventory', '/products', '/pos', '/transactions']);
    if (profile?.role === 'store_manager' && !managerAllowedPaths.has(currentPath)) {
      navigateTo('/');
    }
  }, [currentPath, profile?.role, navigateTo]);

  if (loading) return <LoadingScreen />;

  const renderContent = () => {
    const managerAllowedPaths = new Set(['/', '/inventory', '/products', '/pos', '/transactions']);
    if (profile?.role === 'store_manager' && !managerAllowedPaths.has(currentPath)) {
      return <ManagerDashboard />;
    }

    if (profile?.role === 'temp_worker') {
      return <TempWorkerDashboard />;
    }

    if (profile?.role === 'permanent_staff') {
      return <PermanentStaffDashboard />;
    }

    switch (currentPath) {
      case '/inventory':
        return <RawMaterialsPage />;
      case '/vendors':
        return <VendorsPage />;
      case '/purchase-entry':
        return <PurchaseEntryPage />;
      case '/purchases':
        return <PurchasesPage />;
      case '/products':
        return <ProductsPage />;
      case '/transactions':
        return profile?.role === 'store_manager' ? <StoreHistory /> : <TransactionsPage />;
      case '/pos':
        return <POSPage />;
      case '/settings':
        return <SettingsPage />;
      case '/stores':
        return <StoresPage />;
      case '/expenses':
        return <ExpensesPage />;
      case '/salary':
        return <SalaryManagementPage />;
      case '/attendance':
        return <AttendancePage />;
      case '/corporate-clients':
        return <CorporateClientsPage />;
      case '/':
      default:
        return profile.role === 'owner' ? <OwnerDashboard /> : <ManagerDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {currentPath === '/setup' ? (
        <Suspense fallback={<LoadingScreen />}>
          <SetupPage />
        </Suspense>
      ) : !user ? (
        <Suspense fallback={<LoadingScreen />}>
          <LoginPage />
        </Suspense>
      ) : !profile ? (
        <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center text-foreground">
          <div className="max-w-md space-y-8 p-12 bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-black/10 dark:border-white/10 shadow-2xl">
             <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-600/20">
                <ShieldCheck size={40} />
             </div>
             <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight">Profile Pending</h1>
                <p className="text-neutral-400 font-medium leading-relaxed">Your account exists but your profile data hasn't been synced. Please contact the system administrator.</p>
             </div>
             <div className="pt-4 flex flex-col gap-3">
                <button onClick={() => window.location.reload()} className="h-14 rounded-2xl bg-orange-600 text-white font-black uppercase tracking-widest text-xs hover:bg-orange-500 transition-colors shadow-lg shadow-orange-600/20">
                   Retry Connection
                </button>
                <button onClick={() => signOut()} className="h-14 rounded-2xl bg-black/5 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 font-black uppercase tracking-widest text-xs hover:text-neutral-900 dark:hover:text-white transition-colors border border-black/10 dark:border-white/10">
                   Sign Out
                </button>
             </div>
          </div>
        </div>
      ) : (
        <AppShell>
          <Suspense fallback={<LoadingScreen />}>
            {renderContent()}
          </Suspense>
        </AppShell>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
