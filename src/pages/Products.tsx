import React, { useState, useMemo, useEffect } from 'react';
import { Package, Plus, Box, Info, Edit, Trash2, Hash, Search, Filter, ChevronRight, Layers, Square, LayoutGrid, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../hooks/queries/useInventory';
import { useAddProduct } from '../hooks/mutations/useInventory';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { motion, AnimatePresence } from 'motion/react';

import { CATEGORIES } from '../lib/constants';

export default function ProductsPage() {
  const { profile } = useAuth();
  const { data: products = [], isLoading: productsLoading, isError, error } = useProducts();
  const addProductMutation = useAddProduct();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    unit: 'SQFT',
    description: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => 
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [products, debouncedSearch]);

  const categories = CATEGORIES.map(cat => ({
    ...cat,
    items: products.filter(p => cat.regex.test(p.name)).length
  }));


  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    addProductMutation.mutate({
      ...formData,
      selling_price: 0
    }, {
      onSuccess: () => {
        toast.success('Product Spec Initialized');
        setIsAddOpen(false);
        setFormData({ name: '', unit: 'SQFT', description: '' });
      },
      onError: (error: any) => {
        toast.error('Failed to add product: ' + error.message);
      }
    });
  };

  if (productsLoading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 brand-gradient rounded-3xl animate-spin mb-6 flex items-center justify-center">
           <div className="w-8 h-8 bg-background rounded-2xl" />
        </div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">Syncing Catalog...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-neutral-900 rounded-[3rem] border border-dashed border-red-200 dark:border-red-900/30 mx-6">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-3xl flex items-center justify-center mb-6 text-red-500 shadow-xl shadow-red-500/10">
          <Package size={40} strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">Catalog Offline</h3>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-2 mb-8 max-w-sm text-center">
          {(error as Error)?.message || 'Failed to connect to service catalog'}
        </p>
        <Button onClick={() => window.location.reload()} className="h-14 px-10 rounded-2xl brand-gradient text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-orange-500/20">
          Retry Sync
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-10 pb-20">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl lg:text-4xl font-black tracking-tighter text-foreground uppercase">Service <span className="text-orange-600">Catalog</span></h2>
          <p className="text-[8px] lg:text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] lg:tracking-[0.5em] ml-1">Comprehensive Product List</p>
        </div>
        {profile?.role === 'owner' && (
          <Button 
            onClick={() => setIsAddOpen(true)} 
            className="w-full lg:w-auto h-12 lg:h-14 rounded-xl lg:rounded-2xl brand-gradient text-white shadow-2xl shadow-orange-500/30 font-black border-none hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-[10px] lg:text-xs px-6 lg:px-8"
          >
            <Plus className="mr-2 lg:mr-3 h-4 w-4 lg:h-5 lg:w-5" strokeWidth={4} />
            Add New Service
          </Button>
        )}
      </div>

      {/* Redesigned Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4 p-2 lg:p-3 bg-card/60 backdrop-blur-2xl rounded-2xl lg:rounded-[3rem] border border-white/10 shadow-premium">
         <div className="relative group flex-1">
            <div className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-orange-500 transition-colors pointer-events-none">
               <Search size={16} className="lg:hidden" strokeWidth={2.5} />
               <Search size={20} className="hidden lg:block" strokeWidth={2.5} />
            </div>
            <Input 
               placeholder="Search Catalog..." 
               className="h-12 lg:h-14 rounded-full bg-white/5 border-none pl-12 lg:pl-14 pr-6 lg:pr-8 font-black text-[9px] lg:text-[10px] uppercase tracking-widest lg:tracking-[0.2em] focus:bg-white/10 focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-muted-foreground/50"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeCategory && !searchTerm ? (
          <motion.div 
            key="categories"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6"
          >
            {categories.map((cat, idx) => (
              <motion.div
                key={cat.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCategory(cat.id)}
                className="group relative h-40 lg:h-56 flex flex-col justify-between p-4 lg:p-6 cursor-pointer shadow-premium rounded-2xl lg:rounded-[2.5rem] bg-card/60 backdrop-blur-xl border border-white/10 overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 lg:w-32 lg:h-32 ${cat.gradient} opacity-10 rounded-full blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-all duration-700 hidden lg:block`} />
                <div className={`w-10 h-10 lg:w-14 lg:h-14 ${cat.gradient} rounded-xl lg:rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                  {cat.icon}
                </div>
                <div>
                   <h3 className="text-sm lg:text-xl font-black tracking-tight uppercase text-foreground leading-tight">{cat.label}</h3>
                   <p className="text-[8px] lg:text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">
                     {cat.items} Products
                   </p>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-widest text-orange-600">View Details</span>
                   <ChevronRight size={14} className="text-orange-600 group-hover:translate-x-1 transition-transform" strokeWidth={4} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="products"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 lg:space-y-8"
          >
            <div className="flex items-center justify-between">
               <Button 
                variant="ghost" 
                onClick={() => { setActiveCategory(null); setSearchTerm(''); }}
                className="h-10 lg:h-12 px-4 lg:px-6 rounded-xl bg-orange-600/10 text-orange-600 font-black uppercase tracking-widest text-[9px] lg:text-xs hover:bg-orange-600 hover:text-white transition-all flex items-center gap-2 group"
               >
                  <ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={14} strokeWidth={4} />
                  Back to Catalog
               </Button>
               <div className="px-4 py-2 rounded-xl bg-muted/40 border border-border/50">
                  <p className="text-[10px] lg:text-xs font-black text-foreground uppercase tracking-tight">{searchTerm ? 'Search Results' : activeCategory?.toUpperCase()}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-8">
              {(searchTerm ? filteredProducts : filteredProducts.filter(p => {
                if (!activeCategory) return true;
                const cat = categories.find(c => c.id === activeCategory);
                return cat ? cat.regex.test(p.name) : true;
              })).map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <Card className="group overflow-hidden rounded-2xl lg:rounded-[2.5rem] border-2 border-border/60 shadow-premium bg-card/20 backdrop-blur-3xl relative h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/10 transition-all hidden lg:block" />
                    <CardHeader className="p-4 lg:p-6 pb-2">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 glass-panel rounded-xl flex items-center justify-center text-orange-600 border border-white/20 shadow-lg group-hover:brand-gradient group-hover:text-white transition-all duration-500">
                          <Box size={20} className="lg:size-6" strokeWidth={2.5} />
                        </div>
                        <div className="flex gap-2">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-orange-500/10 text-muted-foreground">
                              <Edit size={16} strokeWidth={2.5} />
                           </Button>
                        </div>
                      </div>
                      <CardTitle className="mt-3 text-base lg:text-xl font-black text-foreground group-hover:text-orange-600 transition-colors tracking-tight line-clamp-1 uppercase">
                        {product.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[8px] lg:text-[9px] font-black bg-orange-600/10 text-orange-600 px-2 py-0.5 rounded-full uppercase tracking-widest border border-orange-600/20">{product.unit}</span>
                        <span className="text-[8px] font-black text-muted-foreground uppercase opacity-40">ID: {product.id.slice(0, 6)}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 lg:p-6 pt-0 space-y-4">
                      <div className="p-3 lg:p-4 bg-muted/20 rounded-xl lg:rounded-[1.5rem] border border-border/40">
                        <p className="text-[9px] lg:text-[10px] font-bold text-muted-foreground italic leading-relaxed line-clamp-2">
                           {product.description || 'Professional service specification for high-quality production.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[2rem] lg:rounded-[3.5rem] sm:max-w-lg glass-panel border-white/20 p-0 overflow-hidden bg-white dark:bg-neutral-950">
          <div className="brand-gradient h-2 w-full" />
          <div className="p-8 lg:p-12 space-y-8 lg:space-y-10">
            <DialogHeader>
              <DialogTitle className="text-2xl lg:text-3xl font-black tracking-tighter uppercase italic">
                NEW <span className="text-orange-600 not-italic">PRODUCT</span>
              </DialogTitle>
              <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mt-1">Add to Catalog System</p>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-6 lg:space-y-8">
              <div className="space-y-2">
                <Label className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Service Identity</Label>
                <Input 
                  required 
                  placeholder="e.g. STAR FLEX 340GSM"
                  className="h-14 lg:h-16 rounded-xl lg:rounded-[1.8rem] bg-muted/40 border-border font-black text-foreground px-6 lg:px-8 focus:ring-4 focus:ring-orange-500/10 transition-all text-sm lg:text-base"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Measurement Logic</Label>
                <select 
                  required
                  className="w-full h-14 lg:h-16 rounded-xl lg:rounded-[1.8rem] bg-muted/40 border-border font-black px-6 lg:px-8 text-foreground outline-none appearance-none cursor-pointer text-sm lg:text-base"
                  value={formData.unit}
                  onChange={(e) => setFormData({...formData, unit: e.target.value})}
                >
                  <option value="SQFT">SQFT (Square Feet)</option>
                  <option value="PCS">PIECE (Unit Count)</option>
                  <option value="SET">SET (Batch)</option>
                  <option value="RFT">RFT (Running Feet)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Technical Description</Label>
                <Input 
                  placeholder="Service operational details..."
                  className="h-14 lg:h-16 rounded-xl lg:rounded-[1.8rem] bg-muted/40 border-border font-black text-foreground px-6 lg:px-8 text-sm lg:text-base"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <DialogFooter className="pt-4 lg:pt-6">
                <Button type="submit" className="w-full h-16 lg:h-20 rounded-2xl lg:rounded-[2.5rem] brand-gradient text-white font-black shadow-2xl shadow-orange-500/30 uppercase tracking-[0.2em] text-xs lg:text-sm hover:scale-[1.02] active:scale-95 transition-all">
                  Publish to Catalog
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
