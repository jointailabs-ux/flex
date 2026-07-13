import React, { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Plus, Minus, CreditCard, Loader2, Store, ArrowRight, Ruler, IndianRupee, Package, Search, ChevronRight, Calculator, User, Phone, Settings2, Maximize2, Layers, Trash2, Square, Hash, Box, ArrowLeft, ArrowLeftRight, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useProducts, useStores, useRawMaterials } from '../hooks/queries/useInventory';
import { useTransactions } from '../hooks/queries/useTransactions';
import { usePOSSale } from '../hooks/mutations/usePOS';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '../lib/constants';

export default function POSPage() {
  const { profile } = useAuth();
  const { data: products = [], isLoading: productsLoading, isError: pError, error: pErrorObj } = useProducts();
  const { data: stores = [], isLoading: storesLoading, isError: sError, error: sErrorObj } = useStores();
  const { data: rawMaterials = [], isLoading: materialsLoading } = useRawMaterials();
  const { data: recentSales = [], isLoading: recentSalesLoading } = useTransactions({ 
    storeId: profile?.store_id || 'all'
  });
  const posSaleMutation = usePOSSale();
  
  const [cart, setCart] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLineEditorOpen, setIsLineEditorOpen] = useState(false);
  const [isCartMobileOpen, setIsCartMobileOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', paymentMethod: 'Cash' });
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [lineDraft, setLineDraft] = useState<{
    widthFt: string;
    heightFt: string;
    quantity: string;
    rate: string;
    inventoryDeductions: Array<{ materialId: string; name: string; quantity: number }>;
  }>({
    widthFt: '10',
    heightFt: '10',
    quantity: '1',
    rate: '',
    inventoryDeductions: []
  });
  
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [deductionQty, setDeductionQty] = useState('');
  const [calcWidth, setCalcWidth] = useState('');
  const [calcHeight, setCalcHeight] = useState('');

  useEffect(() => {
    if (selectedMaterialId) {
      const mat = rawMaterials.find((m: any) => m.id === selectedMaterialId);
      if (mat && ['flex', 'vinyl'].includes(mat.material_kind || '')) {
        setCalcWidth(lineDraft.widthFt || '4');
        setCalcHeight(lineDraft.heightFt || '6');
      }
    } else {
      setCalcWidth('');
      setCalcHeight('');
    }
  }, [selectedMaterialId, lineDraft.widthFt, lineDraft.heightFt, rawMaterials]);

  useEffect(() => {
    const mat = rawMaterials.find((m: any) => m.id === selectedMaterialId);
    if (mat && ['flex', 'vinyl'].includes(mat.material_kind || '')) {
      const w = parseFloat(calcWidth || '0');
      const h = parseFloat(calcHeight || '0');
      const qty = parseInt(lineDraft.quantity || '1');
      const calculated = (w * h * qty).toFixed(2);
      setDeductionQty(calculated);
    }
  }, [calcWidth, calcHeight, selectedMaterialId, lineDraft.quantity, rawMaterials]);
  
  const [saleDetailsModalOpen, setSaleDetailsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [saleDetails, setSaleDetails] = useState<any[]>([]);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  const dataLoading = productsLoading || storesLoading;
  const loading = posSaleMutation.isPending;
  const salesOnly = recentSales?.filter((s: any) => s.type === 'SALE') || [];

  const handleViewSale = async (sale: any) => {
    setSelectedSale(sale);
    setSaleDetailsModalOpen(true);
    setFetchingDetails(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      
      const mockProfile = localStorage.getItem('mockProfile');
      if (mockProfile && mockProfile !== 'null') {
        headers['x-mock-profile'] = mockProfile;
      } else if (profile) {
        headers['x-mock-profile'] = JSON.stringify(profile);
      }

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/transactions/sale-details/${sale.id}`, { headers });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSaleDetails(data);
      } else {
        setSaleDetails([]);
        toast.error(data?.error || 'Failed to load details');
      }
    } catch (err) {
      setSaleDetails([]);
      toast.error('Failed to load bill details');
    } finally {
      setFetchingDetails(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'store_manager' && profile.store_id) {
      setSelectedStoreId(profile.store_id);
    } else if (profile?.role === 'owner' && stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [profile, stores]);

  const selectedStore = useMemo(
    () => stores.find((store: any) => store.id === selectedStoreId),
    [stores, selectedStoreId]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredProducts = useMemo(() => {
    return (products || []).filter((p: any) => 
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [products, debouncedSearch]);

  const openLineEditor = (product: any) => {
    if (!selectedStoreId) {
      toast.error('Select a store before billing');
      return;
    }
    setSelectedProduct(product);
    setLineDraft({
      widthFt: '4',
      heightFt: '6',
      quantity: '1',
      rate: '', 
      inventoryDeductions: []
    });
    setIsLineEditorOpen(true);
  };

  const addLineToCart = () => {
    const width = parseFloat(lineDraft.widthFt) || 0;
    const height = parseFloat(lineDraft.heightFt) || 0;
    const qty = parseInt(lineDraft.quantity) || 0;
    const rate = parseFloat(lineDraft.rate) || 0;

    if (!selectedProduct || qty <= 0 || rate <= 0) {
      toast.error('Invalid quantity or rate');
      return;
    }

    const chargedArea = width * height || 1;
    const lineTotal = (width && height) ? (chargedArea * rate * qty) : (rate * qty);

    let finalDeductions = [...lineDraft.inventoryDeductions];
    if (selectedMaterialId && deductionQty) {
      const material = rawMaterials.find((m: any) => m.id === selectedMaterialId);
      const currentStock = material?.central_stock?.[0]?.quantity || 0;
      const requestedQty = parseFloat(deductionQty);

      if (material && requestedQty > currentStock) {
        toast.error(`INSUFFICIENT STOCK for ${material.name}! Available: ${currentStock} ${material.unit}`);
        return;
      }

      if (material && !finalDeductions.find(d => d.materialId === selectedMaterialId)) {
        finalDeductions.push({ 
          materialId: selectedMaterialId, 
          name: material.name, 
          quantity: requestedQty,
          unit: material.unit 
        });
      }
    }

    setCart(prev => [...prev, {
      ...selectedProduct,
      lineId: `${selectedProduct.id}-${Date.now()}`,
      widthFt: width,
      heightFt: height,
      quantity: qty,
      rate: rate,
      chargedAreaSqft: chargedArea,
      lineTotal: lineTotal,
      inventoryDeductions: finalDeductions
    }]);

    setSelectedMaterialId('');
    setDeductionQty('');
    setIsLineEditorOpen(false);
    toast.success('Added to queue');
  };

  const addDeduction = () => {
    if (!selectedMaterialId || !deductionQty) {
      toast.error('Select material and enter quantity');
      return;
    }
    const material = rawMaterials.find((m: any) => m.id === selectedMaterialId);
    if (!material) return;

    const currentStock = material.central_stock?.[0]?.quantity || 0;
    const requestedQty = parseFloat(deductionQty);

    if (requestedQty > currentStock) {
      toast.error(`INSUFFICIENT STOCK! Available: ${currentStock} ${material.unit}`);
      return;
    }

    setLineDraft(prev => ({
      ...prev,
      inventoryDeductions: [
        ...prev.inventoryDeductions,
        { 
          materialId: selectedMaterialId, 
          name: material.name, 
          quantity: requestedQty,
          unit: material.unit 
        }
      ]
    }));
    setSelectedMaterialId('');
    setDeductionQty('');
  };

  const removeDeduction = (materialId: string) => {
    setLineDraft(prev => ({
      ...prev,
      inventoryDeductions: prev.inventoryDeductions.filter(d => d.materialId !== materialId)
    }));
  };

  const removeFromCart = (lineId: string) => {
    setCart(prev => prev.filter(item => item.lineId !== lineId));
  };

  const handleCheckout = async () => {
    if (!profile || !selectedStoreId) return;
    
    posSaleMutation.mutate({
      storeId: selectedStoreId,
      userId: profile.id,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      paymentMode: customerInfo.paymentMethod,
      totalAmount: cart.reduce((sum, item) => sum + item.lineTotal, 0),
      items: cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        rate: item.rate,
        width_ft: item.widthFt,
        height_ft: item.heightFt,
        charged_area_sqft: item.chargedAreaSqft,
        inventory_deductions: item.inventoryDeductions?.map((d: any) => ({
          material_id: d.materialId,
          quantity: d.quantity
        }))
      }))
    }, {
      onSuccess: () => {
        toast.success('Sale completed successfully');
        setCart([]);
        setIsCheckoutOpen(false);
        setIsCartMobileOpen(false);
      },
      onError: (error: any) => {
        toast.error(error.message);
      }
    });
  };

  if (dataLoading && stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-20 h-20 brand-gradient rounded-3xl animate-spin mb-8 flex items-center justify-center shadow-2xl shadow-orange-500/20">
           <div className="w-10 h-10 bg-background rounded-2xl" />
        </div>
        <div className="space-y-4">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">Initializing Billing Terminal...</p>
          <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest max-w-[200px]">Synchronizing services and store configuration</p>
          
          <div className="pt-8">
            <Button 
              variant="ghost" 
              className="text-[9px] font-black uppercase tracking-widest text-orange-600/60 hover:text-orange-600 hover:bg-orange-500/5 rounded-xl px-6"
              onClick={() => window.location.reload()}
            >
              Stuck? Force Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  const cartContent = (
    <div className="flex flex-col h-full overflow-hidden bg-card/60 backdrop-blur-3xl lg:bg-transparent">
       <div className="p-4 lg:p-8 border-b border-border/50 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-3 lg:gap-4">
             <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl brand-gradient flex items-center justify-center text-white shadow-lg">
                <ShoppingCart size={20} strokeWidth={2.5} />
             </div>
             <h3 className="font-black text-base lg:text-xl tracking-tight uppercase">Cart</h3>
          </div>
          <span className="bg-orange-500/10 text-orange-600 px-3 lg:px-4 py-1 lg:py-1.5 rounded-full text-[8px] lg:text-[10px] font-black border border-orange-500/20 uppercase tracking-widest">
            {cart.length} Items
          </span>
       </div>

       <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3 lg:space-y-4 custom-scrollbar pb-32 lg:pb-6">
          <AnimatePresence mode="popLayout">
            {cart.map(item => (
              <motion.div 
                key={item.lineId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 lg:p-6 glass-panel rounded-[1.5rem] lg:rounded-[2rem] flex items-center justify-between group border border-white/20 hover:border-orange-500/30 transition-all shadow-sm"
              >
                <div className="space-y-1">
                   <p className="font-black text-xs lg:text-base text-foreground/90 tracking-tight uppercase">{item.name}</p>
                   <p className="text-[7px] lg:text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Ruler size={10} /> {item.widthFt}x{item.heightFt} ft • Qty {item.quantity}
                   </p>
                </div>
                <div className="flex items-center gap-3 lg:gap-5">
                    <span className="font-black text-xs lg:text-lg tabular-nums tracking-tighter">₹{item.lineTotal.toFixed(2)}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 lg:h-10 lg:w-10 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all" 
                      onClick={() => removeFromCart(item.lineId)}
                    >
                       <Trash2 size={14} className="lg:hidden" strokeWidth={3} />
                       <Trash2 size={16} className="hidden lg:block" strokeWidth={3} />
                    </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 lg:p-12 opacity-40">
               <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-2xl lg:rounded-[2.5rem] bg-muted/50 flex items-center justify-center mb-4 lg:mb-6">
                  <ShoppingCart size={32} className="lg:hidden" strokeWidth={1} />
                  <ShoppingCart size={48} className="hidden lg:block" strokeWidth={1} />
               </div>
               <p className="font-black text-[8px] lg:text-xs uppercase tracking-[0.3em]">Cart Empty</p>
            </div>
          )}
       </div>

       <div className="fixed lg:relative bottom-0 inset-x-0 p-4 lg:p-10 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white space-y-4 lg:space-y-8 relative overflow-hidden rounded-t-[2rem] lg:rounded-none shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.1)] dark:shadow-none">
          <div className="absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 brand-gradient opacity-10 rounded-full blur-2xl lg:blur-3xl -mr-12 lg:-mr-16 -mt-12 lg:-mt-16" />
          <div className="flex justify-between items-center relative z-10">
             <div className="space-y-0.5 lg:space-y-1">
                <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500 dark:text-white/40">Settlement Total</span>
                <h3 className="text-xl lg:text-4xl font-black tabular-nums tracking-tighter">₹{totalAmount.toFixed(2)}</h3>
             </div>
             <div className="w-10 h-10 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center text-orange-500">
                <Calculator size={20} className="lg:hidden" />
                <Calculator size={32} className="hidden lg:block" />
             </div>
          </div>
          <Button 
            className="w-full h-11 lg:h-14 rounded-xl lg:rounded-2xl brand-gradient text-white font-black text-xs lg:text-lg shadow-2xl shadow-orange-500/40 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest relative z-10"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
          >
            Proceed to Checkout
            <ChevronRight className="ml-2 lg:ml-3 h-4 w-4 lg:h-6 lg:w-6" strokeWidth={3} />
          </Button>
       </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] lg:h-[calc(100vh-120px)] gap-4 lg:gap-5 overflow-hidden">
      {/* COMPACT MOBILE HEADER / FULL DESKTOP HEADER */}
      <div className="flex items-center justify-between gap-3 glass-card p-3 lg:p-4 rounded-2xl lg:rounded-2xl shadow-premium">
        <div className="flex items-center gap-3 lg:gap-4">
           <div className="w-10 h-10 lg:w-12 lg:h-12 brand-gradient rounded-xl lg:rounded-[1.2rem] flex items-center justify-center text-white shadow-xl">
              <Store size={20} className="lg:hidden" strokeWidth={2.5} />
              <Store size={24} className="hidden lg:block" strokeWidth={2.5} />
           </div>
           <div>
              <p className="text-[7px] lg:text-[9px] font-black uppercase tracking-[0.3em] lg:tracking-[0.4em] text-orange-600/60 hidden sm:block">Billing Counter</p>
              <h2 className="text-sm lg:text-xl font-black tracking-tighter text-foreground uppercase truncate max-w-[120px] lg:max-w-none">{selectedStore?.name || 'Active Store'}</h2>
           </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4 bg-muted/40 p-1 lg:p-1.5 rounded-full border border-border/50">
          {profile?.role === 'owner' && (
            <div className="flex items-center gap-2 lg:gap-3 px-2 lg:px-4 border-r border-border/50">
               <Store size={12} className="text-orange-600" />
               <select 
                className="bg-transparent text-[8px] lg:text-sm font-black outline-none cursor-pointer uppercase tracking-widest"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
              >
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-4">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest hidden sm:block">Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 overflow-hidden relative">
         {/* CATALOG SECTION */}
        <div className="lg:col-span-8 flex flex-col gap-3 lg:gap-6 overflow-hidden">
           {/* SEARCH - STICKY FOR MOBILE */}
           <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              <div className="relative group flex-1">
                 <div className="absolute inset-y-0 left-4 lg:left-6 flex items-center pointer-events-none">
                   <Search className="text-muted-foreground group-focus-within:text-orange-600 transition-all duration-300" size={20} strokeWidth={3} />
                 </div>
                 <Input 
                   placeholder="Search products by name or type..." 
                   className="pl-12 lg:pl-14 h-12 lg:h-14 rounded-2xl lg:rounded-2xl border-none shadow-premium bg-card/60 backdrop-blur-2xl font-black text-sm lg:text-base focus:ring-4 focus:ring-orange-500/5 transition-all placeholder:text-muted-foreground/30 uppercase tracking-tight"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
           </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-2 p-1.5 bg-muted/30 backdrop-blur-md rounded-2xl border border-white/5 w-fit">
               <button 
                 onClick={() => { setActiveCategory(null); setSearchTerm(''); }}
                 className={`h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${!activeCategory && !searchTerm ? 'brand-gradient text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
               >
                 Catalog
               </button>
               <button 
                 onClick={() => { setActiveCategory('HISTORY'); setSearchTerm(''); }}
                 className={`h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeCategory === 'HISTORY' ? 'brand-gradient text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
               >
                 Recent Sales
               </button>
            </div>

            {/* Quick Category Ribbon */}
            {(searchTerm || (activeCategory && activeCategory !== 'HISTORY')) && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar"
              >
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setActiveCategory(null); setSearchTerm(''); }}
                  className={`h-10 px-4 rounded-full font-black uppercase text-[9px] tracking-widest transition-all ${!activeCategory ? 'bg-orange-600 text-white' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
                >
                  All
                </Button>
                {CATEGORIES.map(cat => (
                  <Button 
                    key={cat.id}
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setActiveCategory(cat.id); setSearchTerm(''); }}
                    className={`h-10 px-4 rounded-full font-black uppercase text-[9px] tracking-widest whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-orange-600 text-white' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
                  >
                    {cat.label}
                  </Button>
                ))}
              </motion.div>
            )}

           <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeCategory === 'HISTORY' ? (
                  <motion.div 
                    key="history"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-6 pb-44 lg:pb-6"
                  >
                     <div className="grid grid-cols-1 gap-4">
                        {recentSalesLoading ? (
                           Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="h-24 rounded-[2rem] bg-muted/20 animate-pulse" />
                           ))
                        ) : salesOnly.length === 0 ? (
                           <div className="h-64 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 text-muted-foreground bg-muted/5">
                              <History size={40} className="opacity-20" />
                              <span className="text-[10px] font-black uppercase tracking-widest">No recent sales recorded</span>
                           </div>
                        ) : (
                           salesOnly.map((sale: any) => (
                              <motion.div 
                                key={sale.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={() => handleViewSale(sale)}
                                className="glass-card p-4 lg:p-5 rounded-[1.5rem] border-white/5 flex items-center justify-between hover:bg-white/5 transition-all group cursor-pointer"
                              >
                                 <div className="flex items-center gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600 shrink-0">
                                       <ArrowLeftRight size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-xs font-black uppercase tracking-tight">{sale.entity || 'Walk-in Customer'}</span>
                                       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{new Date(sale.date).toLocaleString()}</span>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-1">
                                    <span className="text-sm font-black text-foreground">₹{(sale.amount || 0).toLocaleString()}</span>
                                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em]">Completed</span>
                                 </div>
                              </motion.div>
                           ))
                        )}
                     </div>
                  </motion.div>
                ) : !activeCategory && !searchTerm ? (
                  <motion.div 
                    key="categories"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4 pb-44 lg:pb-6"
                  >
                    {CATEGORIES.map((cat, idx) => {
                      const itemCount = products.filter(p => cat.regex.test(p.name)).length;
                      return (
                        <motion.div
                          key={cat.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setActiveCategory(cat.id)}
                          className="group vibrant-glass border-none relative h-24 lg:h-36 flex flex-col justify-between p-4 lg:p-5 overflow-hidden cursor-pointer shadow-premium rounded-2xl lg:rounded-3xl"
                        >
                          <div className={`absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 ${cat.gradient} opacity-10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-all duration-700`} />
                          <div className={`w-8 h-8 lg:w-12 lg:h-12 ${cat.gradient} rounded-lg lg:rounded-xl flex items-center justify-center text-white shadow-lg`}>
                            {cat.icon}
                          </div>
                          <div>
                             <h3 className="text-sm lg:text-lg font-black tracking-tight uppercase text-foreground leading-tight">{cat.label}</h3>
                             <p className="text-[7px] lg:text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">
                               {itemCount} {itemCount === 1 ? 'Service' : 'Services'}
                             </p>
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-orange-600">Explore Catalog</span>
                             <ChevronRight size={12} className="text-orange-600 group-hover:translate-x-1 transition-transform" strokeWidth={4} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="products"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 pb-44 lg:pb-6"
                  >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center text-white shadow-lg ${activeCategory ? CATEGORIES.find(c => c.id === activeCategory)?.gradient : 'brand-gradient'}`}>
                              {activeCategory ? CATEGORIES.find(c => c.id === activeCategory)?.icon : <Search size={24} />}
                           </div>
                           <div>
                              <p className="text-[7px] lg:text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em]">Viewing Cluster</p>
                              <h3 className="text-sm lg:text-xl font-black text-foreground uppercase tracking-tight">{searchTerm ? 'Search Results' : CATEGORIES.find(c => c.id === activeCategory)?.label}</h3>
                           </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setActiveCategory(null); setSearchTerm(''); }}
                          className="h-10 lg:h-12 px-4 rounded-xl bg-muted/40 text-muted-foreground font-black uppercase tracking-widest text-[8px] lg:text-xs hover:bg-muted transition-all flex items-center gap-2 group"
                        >
                           <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={14} strokeWidth={3} />
                           Back
                        </Button>
                     </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 lg:gap-4">
                      {(searchTerm ? filteredProducts : filteredProducts.filter(p => {
                        if (!activeCategory) return true;
                        const cat = CATEGORIES.find(c => c.id === activeCategory);
                        return cat ? cat.regex.test(p.name) : true;
                      })).map((p, i) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                        >
                          <Card className="vibrant-card group border-none shadow-premium bg-card/60 backdrop-blur-xl overflow-hidden rounded-xl lg:rounded-2xl cursor-pointer" onClick={() => openLineEditor(p)}>
                            <CardContent className="p-3 lg:p-5 flex items-center justify-between relative">
                              <div className="flex items-center gap-3 lg:gap-4">
                                 <div className="w-10 h-10 lg:w-12 lg:h-12 glass-panel rounded-lg lg:rounded-xl flex items-center justify-center text-orange-600 group-hover:brand-gradient group-hover:text-white transition-all duration-500 shadow-md">
                                    <Package size={20} className="lg:hidden" strokeWidth={2.5} />
                                    <Package size={24} className="hidden lg:block" strokeWidth={2.5} />
                                 </div>
                                 <div className="space-y-0.5 lg:space-y-1">
                                    <h4 className="text-xs lg:text-xl font-black text-foreground tracking-tight group-hover:text-orange-600 transition-colors uppercase truncate max-w-[140px] lg:max-w-none">{p.name}</h4>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[7px] lg:text-[9px] font-black bg-orange-600/10 text-orange-600 px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-orange-600/20">{p.unit}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-orange-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg shrink-0">
                                 <Plus size={16} strokeWidth={4} />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>

        {/* CART SECTION - DESKTOP ONLY */}
        <div className="hidden lg:flex lg:col-span-4 flex-col glass-card rounded-[3.5rem] shadow-premium overflow-hidden border border-white/20">
           {cartContent}
        </div>
      </div>

      {/* MOBILE FLOATING ACTION BAR */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="lg:hidden fixed bottom-[110px] inset-x-6 z-40"
          >
            <div className="brand-gradient rounded-2xl shadow-2xl shadow-orange-500/40 p-1 flex items-center">
               <button 
                onClick={() => setIsCartMobileOpen(true)}
                className="flex-1 px-6 py-4 flex items-center justify-between text-white font-black"
               >
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <ShoppingCart size={20} strokeWidth={3} />
                     </div>
                     <div className="text-left">
                        <p className="text-[7px] uppercase tracking-widest opacity-70 leading-none">Cart Total</p>
                        <p className="text-lg tabular-nums tracking-tighter">₹{totalAmount.toFixed(2)}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-xl">
                     <span className="text-[10px] uppercase">Checkout</span>
                     <ChevronRight size={16} strokeWidth={4} />
                  </div>
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE CART OVERLAY */}
      <Dialog open={isCartMobileOpen} onOpenChange={setIsCartMobileOpen}>
        <DialogContent className="lg:hidden max-w-full h-[90vh] bottom-0 top-auto translate-y-0 rounded-t-[2.5rem] bg-neutral-950 border-none p-0 overflow-hidden">
           {cartContent}
        </DialogContent>
      </Dialog>

      {/* Line Editor Modal */}
      <Dialog open={isLineEditorOpen} onOpenChange={setIsLineEditorOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-3xl border-black/5 dark:border-white/5 p-0 overflow-hidden rounded-[2rem] lg:rounded-[3.5rem] shadow-2xl dark:shadow-[0_0_100px_rgba(0,0,0,0.8)]">
          <div className="brand-gradient h-2 w-full" />
          
          <div className="p-6 lg:p-10 space-y-6 lg:space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="text-lg lg:text-3xl font-black tracking-tighter uppercase text-neutral-900 dark:text-white leading-none">
                    Item <span className="text-orange-600">Details</span>
                  </DialogTitle>
                  <p className="text-[7px] lg:text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">Size & Quantity</p>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-orange-600/10 border border-orange-600/20 flex items-center justify-center text-orange-600">
                  <Settings2 size={18} className="lg:size-6" strokeWidth={2.5} />
                </div>
              </div>
            </DialogHeader>

            <div className="p-4 lg:p-6 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
              <p className="text-[7px] lg:text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Selected Product</p>
              <h3 className="text-base lg:text-2xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight">{selectedProduct?.name}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-2 group">
                <Label className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                   <Maximize2 size={12} className="text-orange-600" /> Dimension (W)
                </Label>
                <div className="relative">
                    <Input 
                      type="number"
                      value={lineDraft.widthFt}
                      onChange={e => setLineDraft({...lineDraft, widthFt: e.target.value})}
                      className="h-11 lg:h-14 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border-black/10 dark:border-white/10 font-black text-sm lg:text-xl text-neutral-900 dark:text-white focus:ring-4 focus:ring-orange-600/20 transition-all pr-12"
                    />
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground uppercase">FT</span>
                </div>
              </div>
              <div className="space-y-2 group">
                <Label className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                   <Maximize2 size={12} className="text-orange-600" /> Dimension (H)
                </Label>
                <div className="relative">
                    <Input 
                      type="number"
                      value={lineDraft.heightFt}
                      onChange={e => setLineDraft({...lineDraft, heightFt: e.target.value})}
                      className="h-11 lg:h-14 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border-black/10 dark:border-white/10 font-black text-sm lg:text-xl text-neutral-900 dark:text-white focus:ring-4 focus:ring-orange-600/20 transition-all pr-12"
                    />
                   <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground uppercase">FT</span>
                </div>
              </div>
              <div className="space-y-2 group">
                <Label className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                   <Hash size={12} className="text-orange-600" /> Unit Count
                </Label>
                <Input 
                  type="number"
                  value={lineDraft.quantity}
                  onChange={e => setLineDraft({...lineDraft, quantity: e.target.value})}
                  className="h-11 lg:h-14 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border-black/10 dark:border-white/10 font-black text-sm lg:text-xl text-neutral-900 dark:text-white focus:ring-4 focus:ring-orange-600/20 transition-all"
                />
              </div>
              <div className="space-y-2 group">
                <Label className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                   <IndianRupee size={12} className="text-orange-600" /> Rate per Foot
                </Label>
                <div className="relative">
                   <Input 
                     type="number"
                     value={lineDraft.rate}
                     onChange={e => setLineDraft({...lineDraft, rate: e.target.value})}
                     className="h-11 lg:h-14 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border-black/10 dark:border-white/10 font-black text-sm lg:text-xl text-neutral-900 dark:text-white focus:ring-4 focus:ring-orange-600/20 transition-all pl-10"
                   />
                   <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="bg-orange-600 p-4 lg:p-6 rounded-xl text-white shadow-xl">
               <p className="text-[8px] font-black uppercase opacity-70 mb-1">Total Value</p>
               <h3 className="text-2xl lg:text-4xl font-black tabular-nums tracking-tighter">
                  ₹{((parseFloat(lineDraft.widthFt) || 0) * (parseFloat(lineDraft.heightFt) || 0) * (parseFloat(lineDraft.rate) || 0) * (parseInt(lineDraft.quantity) || 0)).toFixed(2)}
               </h3>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Stock Removal</Label>
              <div className="flex gap-2">
                <select
                  className="flex-1 h-12 rounded-xl bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-neutral-900 dark:text-white font-black text-[10px] px-4 outline-none"
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                >
                  <option value="">Material</option>
                  {rawMaterials.map((m: any) => {
                    const stock = m.central_stock?.[0]?.quantity || 0;
                    return (
                      <option key={m.id} value={m.id} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                        {m.name} ({stock} {m.unit} avail)
                      </option>
                    );
                  })}
                </select>
                <Input 
                  type="number"
                  placeholder="Qty"
                  value={deductionQty}
                  onChange={(e) => setDeductionQty(e.target.value)}
                  className="h-12 w-20 rounded-xl bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 font-black text-center text-neutral-900 dark:text-white placeholder:text-neutral-500"
                />
                <Button onClick={addDeduction} className="h-12 w-12 rounded-xl brand-gradient text-white">
                  <Plus size={20} strokeWidth={3} />
                </Button>
              </div>

              {selectedMaterialId && (
                <div className="px-1 flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    (rawMaterials.find(m => m.id === selectedMaterialId)?.central_stock?.[0]?.quantity || 0) > 0 
                    ? 'bg-emerald-500' 
                    : 'bg-red-500'
                  } animate-pulse`} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Available Stock: {rawMaterials.find(m => m.id === selectedMaterialId)?.central_stock?.[0]?.quantity || 0} {rawMaterials.find(m => m.id === selectedMaterialId)?.unit}
                  </span>
                </div>
              )}

              {selectedMaterialId && ['flex', 'vinyl'].includes(rawMaterials.find(m => m.id === selectedMaterialId)?.material_kind || '') && (
                <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 space-y-3 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-orange-600 tracking-widest">Roll Dimension Calculator</span>
                    <span className="text-[8px] font-black text-muted-foreground uppercase">Unit: Feet</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Width (ft)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={calcWidth}
                        onChange={e => setCalcWidth(e.target.value)}
                        className="h-10 rounded-lg text-xs font-bold bg-neutral-100 dark:bg-neutral-900 border-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[8px] font-black uppercase text-muted-foreground ml-1">Height/Length (ft)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={calcHeight}
                        onChange={e => setCalcHeight(e.target.value)}
                        className="h-10 rounded-lg text-xs font-bold bg-neutral-100 dark:bg-neutral-900 border-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-orange-600 border-t border-orange-500/10 pt-2">
                    <span>Deduction (SQFT):</span>
                    <span>
                      {calcWidth || 0} &times; {calcHeight || 0} &times; {lineDraft.quantity || 1} = {((parseFloat(calcWidth || '0') * parseFloat(calcHeight || '0') * parseFloat(lineDraft.quantity || '1'))).toFixed(2)} sqft
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {lineDraft.inventoryDeductions.map((d: any) => (
                  <div key={d.materialId} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-[8px] font-black text-neutral-900 dark:text-white uppercase">
                    {d.name}: {d.quantity}
                    <button onClick={() => removeDeduction(d.materialId)}><Trash2 size={10} className="text-orange-600" /></button>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={addLineToCart}
              className="w-full h-12 lg:h-16 rounded-xl brand-gradient text-white text-xs lg:text-lg font-black uppercase tracking-widest shadow-2xl"
            >
              Add to Cart
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1" strokeWidth={3} />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="rounded-[2rem] sm:max-w-xl p-0 overflow-hidden bg-white dark:bg-neutral-950 border-none shadow-2xl h-[95vh] sm:h-auto overflow-y-auto">
           <div className="p-6 lg:p-12 space-y-6 lg:space-y-10">
              <DialogHeader>
                <DialogTitle className="text-2xl lg:text-4xl font-black tracking-tighter uppercase text-neutral-900 dark:text-white">
                  FINAL <span className="text-orange-600">SETTLEMENT</span>
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-6 lg:gap-10">
                 <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                       <Input 
                        placeholder="Customer Name" 
                        className="h-14 lg:h-16 rounded-xl bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 font-black text-neutral-900 dark:text-white px-6 placeholder:text-neutral-500" 
                        value={customerInfo.name} 
                        onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} 
                       />
                       <Input 
                        placeholder="Phone Number" 
                        className="h-14 lg:h-16 rounded-xl bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 font-black text-neutral-900 dark:text-white px-6 placeholder:text-neutral-500" 
                        value={customerInfo.phone} 
                        onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} 
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-2">
                    {['Cash', 'UPI', 'Card'].map((m) => (
                       <button
                         key={m}
                         onClick={() => setCustomerInfo({...customerInfo, paymentMethod: m})}
                         className={`h-12 lg:h-16 rounded-xl font-black uppercase text-[8px] lg:text-xs transition-all border ${
                           customerInfo.paymentMethod === m 
                            ? 'bg-orange-600 border-orange-500 text-white shadow-lg' 
                            : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-neutral-500 dark:text-white/40'
                         }`}
                       >
                          {m}
                       </button>
                    ))}
                 </div>

                 <div className="p-6 lg:p-10 rounded-3xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex items-center justify-between">
                    <div>
                       <p className="text-[8px] font-black uppercase text-neutral-500 dark:text-white/30 mb-1">Grand Total</p>
                       <h3 className="text-3xl lg:text-5xl font-black tabular-nums tracking-tighter text-neutral-900 dark:text-white">₹{totalAmount.toFixed(2)}</h3>
                    </div>
                    <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-2xl bg-orange-600 flex items-center justify-center text-white">
                       <IndianRupee size={24} className="lg:size-9" strokeWidth={3} />
                    </div>
                 </div>
              </div>

              <DialogFooter className="mt-8 pb-6 lg:pb-0">
                 <Button 
                   className="w-full h-14 lg:h-16 rounded-xl brand-gradient text-white font-black text-sm lg:text-lg shadow-2xl" 
                   onClick={handleCheckout} 
                   disabled={loading}
                 >
                    {loading ? 'Processing Payment...' : 'Finalize Transaction'}
                 </Button>
              </DialogFooter>
           </div>
        </DialogContent>
       </Dialog>

      {/* Sale Details Modal */}
      <Dialog open={saleDetailsModalOpen} onOpenChange={setSaleDetailsModalOpen}>
        <DialogContent className="max-w-xl p-0 bg-white dark:bg-[#0a0a0a] border-none rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                <History className="text-orange-500" />
                Bill Details
              </DialogTitle>
              {selectedSale && (
                <div className="mt-4 flex flex-col gap-1">
                  <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Customer: {selectedSale.entity || 'Walk-in'}</span>
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Date: {new Date(selectedSale.date).toLocaleString()}</span>
                  <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Total: ₹{(selectedSale.amount || 0).toLocaleString()}</span>
                </div>
              )}
            </DialogHeader>

            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {fetchingDetails ? (
                <div className="flex flex-col items-center justify-center py-10 opacity-50">
                  <Loader2 className="animate-spin mb-4 text-orange-500" size={32} />
                  <span className="text-xs font-black uppercase tracking-widest">Loading details...</span>
                </div>
              ) : saleDetails.length === 0 ? (
                <div className="text-center py-10 opacity-50 text-xs font-black uppercase tracking-widest">
                  No items found.
                </div>
              ) : (
                saleDetails.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-neutral-100 dark:bg-white/5 border border-black/5 dark:border-white/5 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-black text-foreground uppercase">{item.finished_products?.name || 'Unknown Product'}</span>
                      <span className="text-sm font-black text-emerald-600">₹{(item.quantity * item.unit_price).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-black text-muted-foreground">
                      <span>Rate: ₹{item.unit_price} &times; {item.quantity}</span>
                      <span>{item.width_ft && item.height_ft ? `${item.width_ft}ft × ${item.height_ft}ft` : ''}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <DialogFooter className="mt-8">
               <Button 
                 className="w-full h-14 rounded-xl bg-neutral-200 dark:bg-white/10 text-foreground font-black text-sm shadow-sm hover:bg-neutral-300 dark:hover:bg-white/20 transition-all" 
                 onClick={() => setSaleDetailsModalOpen(false)} 
               >
                 Close
               </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
