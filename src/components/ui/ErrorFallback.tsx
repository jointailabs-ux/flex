import React from 'react';
import { AlertCircle, RotateCcw, Home, ShieldAlert } from 'lucide-react';
import { Button } from './button';

export function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  React.useEffect(() => {
    const isChunkError = 
      error.name === 'ChunkLoadError' || 
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk');

    if (isChunkError) {
      const hasReloaded = sessionStorage.getItem('last-chunk-error-reload');
      const now = Date.now();
      
      // Prevent infinite reload loops (only reload if it's been more than 30s since last reload)
      if (!hasReloaded || now - parseInt(hasReloaded) > 30000) {
        sessionStorage.setItem('last-chunk-error-reload', now.toString());
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 p-6 text-center text-white font-sans">
      <div className="max-w-xl w-full space-y-10 p-12 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-600/20 blur-[100px] rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />

        <div className="relative z-10 space-y-8">
          <div className="w-24 h-24 bg-orange-600/20 rounded-[2.5rem] flex items-center justify-center mx-auto border border-orange-600/30 animate-pulse">
            <ShieldAlert size={48} className="text-orange-500" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tight leading-tight">
              Protocol <span className="text-orange-600">Interrupted</span>
            </h1>
            <p className="text-neutral-400 font-bold uppercase tracking-[0.2em] text-[10px]">
              System level exception detected
            </p>
          </div>

          <div className="bg-black/40 rounded-3xl p-6 border border-white/5 text-left font-mono">
            <div className="flex items-center gap-2 text-rose-500 mb-2">
              <AlertCircle size={14} />
              <span className="text-[10px] font-black uppercase">Exception Log</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed break-words overflow-hidden line-clamp-3">
              {error.message || "An unspecified runtime error occurred within the core engine module."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              onClick={resetErrorBoundary}
              className="h-16 px-8 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-600/20 transition-all active:scale-95 flex-1 sm:flex-none"
            >
              <RotateCcw className="mr-3 h-4 w-4" strokeWidth={3} />
              Attempt Recovery
            </Button>
            
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="h-16 px-8 rounded-2xl bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 font-black uppercase tracking-widest text-xs flex-1 sm:flex-none"
            >
              <Home className="mr-3 h-4 w-4" />
              Return Home
            </Button>
          </div>
        </div>
      </div>

      <p className="absolute bottom-8 text-center text-[10px] font-black text-neutral-600 uppercase tracking-[0.5em]">
        Chatterjee Enterprize Terminal // Safe Mode v1.0
      </p>
    </div>
  );
}
