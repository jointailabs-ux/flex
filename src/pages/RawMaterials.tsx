import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Edit, Trash2, AlertTriangle, Layers, PlusCircle, Ruler, History, ArrowDownRight, ArrowUpRight, Calculator, CheckCircle2, Info, Filter, Search, MinusCircle, ChevronRight, Hash, Loader2, Droplets } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useRawMaterials, useVendors } from '../hooks/queries/useInventory';
import { useAddRawMaterial, useDeleteRawMaterial, useStockIn } from '../hooks/mutations/useInventory';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { motion, AnimatePresence } from 'motion/react';

const CATEGORY_GROUPS = [
  {
    label: 'Rolls (Area Tracked)',
    items: [
      { id: 'flex', label: 'Flex' },
      { id: 'vinyl', label: 'Vinyl' },
    ]
  },
  {
    label: 'Boards & Sheets',
    items: [
      { id: 'sun_board', label: 'Sun Board' },
      { id: 'paper', label: 'Paper' },
      { id: 'gumming_page', label: 'Gumming Page' },
      { id: 'tin', label: 'Tin' },
    ]
  },
  {
    label: 'Consumables',
    items: [
      { id: 'ink', label: 'Ink' },
      { id: 'solvent', label: 'Solvent' },
      { id: 'cartridge', label: 'Cartridge' },
    ]
  },
  {
    label: 'Structural & Hardware',
    items: [
      { id: 'pipe', label: 'Pipe' },
      { id: 'light', label: 'Light' },
      { id: 'dala', label: 'Dala' },
    ]
  },
  {
    label: 'General',
    items: [
      { id: 'general', label: 'General' }
    ]
  }
];

const UNIT_GROUPS = [
  {
    label: 'Area & Length',
    items: [
      { id: 'SQFT', label: 'SQFT (Square Feet)' },
      { id: 'SQMT', label: 'SQMT (Square Meters)' },
      { id: 'RFT', label: 'RFT (Running Feet)' },
      { id: 'FT', label: 'FT (Feet)' },
      { id: 'IN', label: 'IN (Inches)' },
      { id: 'MT', label: 'MT (Meters)' },
    ]
  },
  {
    label: 'Weight & Volume',
    items: [
      { id: 'KG', label: 'KG (Kilograms)' },
      { id: 'G', label: 'G (Grams)' },
      { id: 'LTR', label: 'LTR (Liters)' },
      { id: 'ML', label: 'ML (Milliliters)' },
    ]
  },
  {
    label: 'Quantity & Packaging',
    items: [
      { id: 'PCS', label: 'PCS (Pieces)' },
      { id: 'ROLL', label: 'ROLL (Roll)' },
      { id: 'PKT', label: 'PKT (Packet)' },
      { id: 'BOX', label: 'BOX (Box)' },
    ]
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Resources' },
  ...CATEGORY_GROUPS.flatMap(group => group.items)
];

const formatCategory = (kind: string) => {
  if (!kind) return 'General';
  const flatItems = CATEGORY_GROUPS.flatMap(g => g.items);
  const found = flatItems.find(i => i.id === kind);
  return found ? found.label : kind.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const isRollBased = (kind: string) => ['flex', 'vinyl'].includes(kind);
const isPipeBased = (kind: string) => kind === 'pipe';
const isDalaBased = (kind: string) => kind === 'dala';
const isPaperBased = (kind: string) => ['paper', 'gumming_page'].includes(kind);
const isBoardBased = (kind: string) => ['sun_board', 'tin'].includes(kind);

export default function RawMaterialsPage() {
  const { profile } = useAuth();
  const { data: materials = [], isLoading: dataLoading, isError, error } = useRawMaterials();
  const { data: vendors = [] } = useVendors();
  const addMaterialMutation = useAddRawMaterial();
  const deleteMaterialMutation = useDeleteRawMaterial();
  const stockInMutation = useStockIn();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'SQFT',
    material_kind: 'flex',
    roll_width_ft: '4',
    default_roll_length_mt: '50',
    default_pipe_length_ft: '20',
    default_dala_length_ft: '20',
    gsm: '300',
    default_pages_per_box: '100',
    thickness_mm: '3',
    default_board_width_ft: '8',
    default_board_height_ft: '4',
    description: ''
  });

  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  
  // Stock In State
  const [stockInPieces, setStockInPieces] = useState('1');
  const [stockInLength, setStockInLength] = useState('');
  const [stockInWidth, setStockInWidth] = useState('');
  const [stockInTotal, setStockInTotal] = useState('');
  const [stockInRate, setStockInRate] = useState('');
  const [stockInVendor, setStockInVendor] = useState('');
  const [isAutoCalc, setIsAutoCalc] = useState(true);

  // Stock Out State
  const [stockOutPieces, setStockOutPieces] = useState('1');
  const [stockOutWidth, setStockOutWidth] = useState('');
  const [stockOutHeight, setStockOutHeight] = useState('');
  const [stockOutTotal, setStockOutTotal] = useState('');
  const [isAutoCalcOut, setIsAutoCalcOut] = useState(false);
  const [stockOutNotes, setStockOutNotes] = useState('Correction');

  // Sync Total when Pieces/Length changes
  useEffect(() => {
    if (isAutoCalc && stockInPieces && selectedMaterial) {
      if (isRollBased(selectedMaterial.material_kind) && stockInLength) {
        const width = parseFloat(stockInWidth || selectedMaterial.roll_width_ft || 4);
        const lengthMt = parseFloat(stockInLength || 50);
        const lengthFt = lengthMt * 3.28084;
        const totalSqft = parseFloat(stockInPieces) * width * lengthFt;
        setStockInTotal(String(totalSqft.toFixed(2)));
      } else if (isPipeBased(selectedMaterial.material_kind)) {
        const pipeLen = parseFloat(selectedMaterial.default_pipe_length_ft || 20);
        setStockInTotal(String(parseFloat(stockInPieces) * pipeLen));
      } else if (isDalaBased(selectedMaterial.material_kind)) {
        const dalaLen = parseFloat(selectedMaterial.default_dala_length_ft || 20);
        setStockInTotal(String(parseFloat(stockInPieces) * dalaLen));
      } else if (isPaperBased(selectedMaterial.material_kind)) {
        const pagesPerBox = parseFloat(selectedMaterial.default_pages_per_box || 100);
        setStockInTotal(String(parseFloat(stockInPieces) * pagesPerBox));
      } else if (isBoardBased(selectedMaterial.material_kind)) {
        const width = parseFloat(stockInWidth || selectedMaterial.default_board_width_ft || 8);
        const height = parseFloat(stockInLength || selectedMaterial.default_board_height_ft || 4);
        setStockInTotal(String(parseFloat(stockInPieces) * width * height));
      }
    }
  }, [stockInPieces, stockInLength, stockInWidth, isAutoCalc, selectedMaterial]);

  // Effect for auto-calculating stock out total
  useEffect(() => {
    if (isAutoCalcOut && selectedMaterial) {
      if (isRollBased(selectedMaterial.material_kind)) {
        const width = parseFloat(stockOutWidth || selectedMaterial.roll_width_ft || 4);
        const height = parseFloat(stockOutHeight || 0);
        setStockOutTotal(String(parseFloat(stockOutPieces) * width * height));
      } else if (isBoardBased(selectedMaterial.material_kind)) {
        const width = parseFloat(stockOutWidth || selectedMaterial.default_board_width_ft || 8);
        const height = parseFloat(stockOutHeight || selectedMaterial.default_board_height_ft || 4);
        setStockOutTotal(String(parseFloat(stockOutPieces) * width * height));
      } else if (isPipeBased(selectedMaterial.material_kind) || isDalaBased(selectedMaterial.material_kind)) {
        const standardLen = parseFloat(isPipeBased(selectedMaterial.material_kind) ? (selectedMaterial.default_pipe_length_ft || 20) : (selectedMaterial.default_dala_length_ft || 20));
        setStockOutTotal(String(parseFloat(stockOutPieces) * standardLen));
      }
    }
  }, [stockOutPieces, stockOutWidth, stockOutHeight, isAutoCalcOut, selectedMaterial]);

  // Set defaults when material is selected
  useEffect(() => {
    if (selectedMaterial) {
      if (isRollBased(selectedMaterial.material_kind)) {
        setIsAutoCalc(true);
        setStockInLength(String(selectedMaterial.default_roll_length_mt || 50));
        setStockInWidth(String(selectedMaterial.roll_width_ft || 4));
        setStockInPieces('1');
      } else if (isPipeBased(selectedMaterial.material_kind)) {
        setIsAutoCalc(true);
        setStockInPieces('1');
        const pipeLen = parseFloat(selectedMaterial.default_pipe_length_ft || 20);
        setStockInTotal(String(1 * pipeLen));
      } else if (isDalaBased(selectedMaterial.material_kind)) {
        setIsAutoCalc(true);
        setStockInPieces('1');
        const dalaLen = parseFloat(selectedMaterial.default_dala_length_ft || 20);
        setStockInTotal(String(1 * dalaLen));
      } else if (isPaperBased(selectedMaterial.material_kind)) {
        setIsAutoCalc(true);
        setStockInPieces('1');
        const pagesPerBox = parseFloat(selectedMaterial.default_pages_per_box || 100);
        setStockInTotal(String(1 * pagesPerBox));
      } else if (isBoardBased(selectedMaterial.material_kind)) {
        setIsAutoCalc(true);
        setStockInPieces('1');
        setStockInWidth(String(selectedMaterial.default_board_width_ft || 8));
        setStockInLength(String(selectedMaterial.default_board_height_ft || 4));
        setStockInTotal(String(1 * (selectedMaterial.default_board_width_ft || 8) * (selectedMaterial.default_board_height_ft || 4)));
      } else {
        setIsAutoCalc(false);
        setStockInTotal('');
        setStockInPieces('1');
      }
      
      // Reset auto-calc out state
      if (isRollBased(selectedMaterial.material_kind) || isBoardBased(selectedMaterial.material_kind) || isPipeBased(selectedMaterial.material_kind) || isDalaBased(selectedMaterial.material_kind)) {
        setIsAutoCalcOut(true);
        setStockOutPieces('1');
        if (isRollBased(selectedMaterial.material_kind)) {
           setStockOutWidth(String(selectedMaterial.roll_width_ft || 4));
           setStockOutHeight('');
        } else if (isBoardBased(selectedMaterial.material_kind)) {
           setStockOutWidth(String(selectedMaterial.default_board_width_ft || 8));
           setStockOutHeight(String(selectedMaterial.default_board_height_ft || 4));
        }
      } else {
        setIsAutoCalcOut(false);
      }
    }
  }, [selectedMaterial]);

  // Enforce unit to be SQFT for roll-based raw materials in the add/edit form
  useEffect(() => {
    if (isRollBased(formData.material_kind) && formData.unit !== 'SQFT') {
      setFormData(prev => ({ ...prev, unit: 'SQFT' }));
    }
  }, [formData.material_kind, formData.unit]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m: any) => {
      const matchesCategory = activeCategory === 'all' || m.material_kind === activeCategory;
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (m.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [materials, activeCategory, searchQuery]);

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      roll_width_ft: isRollBased(formData.material_kind) ? (parseFloat(formData.roll_width_ft) || 0) : undefined,
      default_roll_length_mt: isRollBased(formData.material_kind) ? (parseFloat(formData.default_roll_length_mt) || 0) : undefined,
      default_pipe_length_ft: isPipeBased(formData.material_kind) ? (parseFloat(formData.default_pipe_length_ft) || 0) : undefined,
      default_dala_length_ft: isDalaBased(formData.material_kind) ? (parseFloat(formData.default_dala_length_ft) || 0) : undefined,
      gsm: isPaperBased(formData.material_kind) ? (parseFloat(formData.gsm) || 0) : undefined,
      default_pages_per_box: isPaperBased(formData.material_kind) ? (parseFloat(formData.default_pages_per_box) || 0) : undefined,
      thickness_mm: isBoardBased(formData.material_kind) ? (parseFloat(formData.thickness_mm) || 0) : undefined,
      default_board_width_ft: isBoardBased(formData.material_kind) ? (parseFloat(formData.default_board_width_ft) || 0) : undefined,
      default_board_height_ft: isBoardBased(formData.material_kind) ? (parseFloat(formData.default_board_height_ft) || 0) : undefined
    };

    const mutationData: any = { ...payload };
    if (editingMaterial) mutationData.id = editingMaterial.id;

    addMaterialMutation.mutate(mutationData, {
      onSuccess: () => {
        toast.success(`Material ${editingMaterial ? 'updated' : 'added'} successfully`);
        setIsAddOpen(false);
        setEditingMaterial(null);
      },
      onError: (error: any) => toast.error(error.message)
    });
  };

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !stockInVendor || !stockInTotal) {
       toast.error('Please fill all required fields');
       return;
    }

    let finalRate = parseFloat(stockInRate) || 0;
    if (isRollBased(selectedMaterial.material_kind)) {
      const width = parseFloat(stockInWidth || selectedMaterial.roll_width_ft || 4);
      const lengthMt = parseFloat(stockInLength || 50);
      const lengthFt = lengthMt * 3.28084;
      const rollSqft = width * lengthFt;
      finalRate = rollSqft > 0 ? (parseFloat(stockInRate) || 0) / rollSqft : 0;
    }

    stockInMutation.mutate({
      vendorId: stockInVendor,
      date: new Date().toISOString().split('T')[0],
      invoice: 'DIRECT_ENTRY',
      userId: profile?.id,
      items: [{
        materialId: selectedMaterial.id,
        quantity: parseFloat(stockInTotal),
        rate: finalRate,
        rollWidth: isRollBased(selectedMaterial.material_kind) ? parseFloat(stockInWidth || selectedMaterial.roll_width_ft || 4) : undefined,
        rollLength: isRollBased(selectedMaterial.material_kind) ? (parseFloat(stockInLength || 50) * 3.28084) : undefined
      }]
    }, {
      onSuccess: () => {
        toast.success('Inventory Updated');
        setIsStockInOpen(false);
        setStockInTotal('');
        setStockInRate('');
      },
      onError: (err: any) => {
        toast.error('Inventory Update Failed: ' + (err.message || 'Unknown error'));
      }
    });
  };

  const handleStockOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial || !stockOutTotal) return;

    stockInMutation.mutate({
      vendorId: 'correction',
      date: new Date().toISOString().split('T')[0],
      invoice: 'CORRECTION_OUT',
      userId: profile?.id,
      items: [{
        materialId: selectedMaterial.id,
        quantity: -parseFloat(stockOutTotal),
        rate: 0
      }]
    }, {
      onSuccess: () => {
        toast.success('Stock Extracted');
        setIsStockOutOpen(false);
        setStockOutTotal('');
      },
      onError: (err: any) => {
        toast.error('Stock Extraction Failed: ' + (err.message || 'Unknown error'));
      }
    });
  };

  if (dataLoading && materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 brand-gradient rounded-3xl animate-spin mb-6 flex items-center justify-center">
           <div className="w-8 h-8 bg-background rounded-2xl" />
        </div>
        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.4em] animate-pulse">Loading Materials...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-neutral-900 rounded-[3rem] border border-dashed border-red-200 dark:border-red-900/30 mx-6">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-950/20 rounded-3xl flex items-center justify-center mb-6 text-red-500 shadow-xl shadow-red-500/10">
          <AlertTriangle size={40} strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tight">Connection Error</h3>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mt-2 mb-8 max-w-sm text-center">
          {(error as Error)?.message || 'Failed to connect to material database'}
        </p>
        <Button onClick={() => window.location.reload()} className="h-14 px-10 rounded-2xl brand-gradient text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-orange-500/20">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-10 pb-20">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl lg:text-4xl font-black tracking-tighter text-foreground uppercase">Raw <span className="text-orange-600">Inventory</span></h2>
          <p className="text-[8px] lg:text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em] lg:tracking-[0.5em] ml-1">Centralized Control</p>
        </div>
        <Button onClick={() => { setEditingMaterial(null); setIsAddOpen(true); }} className="w-full lg:w-auto h-12 lg:h-14 rounded-xl lg:rounded-2xl brand-gradient text-white shadow-2xl shadow-orange-500/30 font-black border-none uppercase tracking-widest text-[10px] lg:text-xs px-6 lg:px-8 transition-all hover:scale-105 active:scale-95">
          <Plus className="mr-2 lg:mr-3 h-4 w-4 lg:h-5 lg:w-5" strokeWidth={4} />
          Register Material
        </Button>
      </div>

      {/* Redesigned Category & Search Bar */}
      <div className="flex flex-col gap-4 p-4 lg:p-6 bg-card/60 backdrop-blur-2xl rounded-2xl lg:rounded-[3rem] border border-white/10 shadow-premium">
         <div className="flex flex-wrap items-center gap-2 px-1 lg:px-2">
            <div className="flex-shrink-0 w-8 h-8 lg:w-11 lg:h-11 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center mr-1 lg:mr-2">
               <Filter size={14} className="lg:hidden" strokeWidth={3} />
               <Filter size={18} className="hidden lg:block" strokeWidth={3} />
            </div>
            {CATEGORIES.map(cat => (
               <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 lg:px-6 lg:py-3 rounded-full text-[8px] lg:text-[10px] font-black uppercase tracking-widest lg:tracking-[0.15em] transition-all whitespace-nowrap ${activeCategory === cat.id ? 'bg-orange-600 text-white shadow-xl shadow-orange-500/30 scale-105' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}
               >
                  {cat.label}
               </button>
            ))}
         </div>
         <div className="relative group w-full">
            <div className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-orange-500 transition-colors pointer-events-none">
               <Search size={16} className="lg:hidden" strokeWidth={2.5} />
               <Search size={20} className="hidden lg:block" strokeWidth={2.5} />
            </div>
            <Input 
               placeholder="Search..." 
               className="h-12 lg:h-14 rounded-full bg-white/5 border-none pl-12 lg:pl-14 pr-6 lg:pr-8 font-black text-[9px] lg:text-[10px] uppercase tracking-widest lg:tracking-[0.2em] focus:bg-white/10 focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-muted-foreground/50"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
            />
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-8">
        <AnimatePresence mode="popLayout">
          {filteredMaterials.map((material, i) => (
            <motion.div key={material.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} layout>
              <Card className="group overflow-hidden rounded-[2rem] border-2 border-border/80 shadow-premium bg-card/10 backdrop-blur-3xl relative h-full">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 glass-panel rounded-xl flex items-center justify-center text-orange-600 border border-white/20 shadow-lg group-hover:brand-gradient group-hover:text-white transition-all duration-500">
                      <Layers size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 text-emerald-500" onClick={() => { setSelectedMaterial(material); setIsStockInOpen(true); }}>
                        <PlusCircle size={18} strokeWidth={2.5} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-red-500/10 text-red-500" onClick={() => { setSelectedMaterial(material); setIsStockOutOpen(true); }}>
                        <MinusCircle size={18} strokeWidth={2.5} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-indigo-500/10 text-indigo-500" onClick={() => { setEditingMaterial(material); setFormData({ name: material.name, unit: material.unit, material_kind: material.material_kind || 'flex', roll_width_ft: String(material.roll_width_ft || '4'), default_roll_length_mt: String(material.default_roll_length_mt || '50'), default_pipe_length_ft: String(material.default_pipe_length_ft || '20'), default_dala_length_ft: String(material.default_dala_length_ft || '20'), gsm: String(material.gsm || '300'), default_pages_per_box: String(material.default_pages_per_box || '100'), thickness_mm: String(material.thickness_mm || '3'), default_board_width_ft: String(material.default_board_width_ft || '8'), default_board_height_ft: String(material.default_board_height_ft || '4'), description: material.description || '' }); setIsAddOpen(true); }}>
                        <Edit size={16} strokeWidth={2.5} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-end justify-between gap-3">
                      <div className="space-y-1.5 flex-1 overflow-hidden">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600 text-[8px] font-black uppercase tracking-widest border border-orange-500/30">{formatCategory(material.material_kind)}</span>
                          {isBoardBased(material.material_kind) && material.thickness_mm && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[8px] font-black uppercase tracking-widest border border-blue-500/20">{material.thickness_mm}MM</span>
                          )}
                        </div>
                        <CardTitle className="text-lg font-black text-foreground tracking-tight line-clamp-1 uppercase">{material.name}</CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-6">
                  <div className="flex items-end justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Specs</p>
                      <p className="text-sm font-black text-foreground/80 tracking-tight">
                        {isRollBased(material.material_kind) ? `${material.roll_width_ft}ft × ${material.default_roll_length_mt || 50}mt` : 
                         isPaperBased(material.material_kind) ? `${material.default_pages_per_box || 100} Pgs/Box` :
                         isBoardBased(material.material_kind) ? `${material.default_board_width_ft || 8}ft × ${material.default_board_height_ft || 4}ft` :
                         `Std ${material.unit}`}
                      </p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Stock</p>
                      <div className="flex items-baseline justify-end gap-1">
                        <span className={`text-3xl font-black tabular-nums tracking-tighter ${material.central_stock?.[0]?.quantity < (material.unit === 'LTR' ? 5 : 100) ? 'text-red-500' : 'text-foreground'}`}>{material.central_stock?.[0]?.quantity || 0}</span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase">{material.unit}</span>
                      </div>
                    </div>
                  </div>
                  {isRollBased(material.material_kind) && (
                     <div className="p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex justify-between items-center group-hover:bg-orange-500/10 transition-all">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                              <Hash size={12} strokeWidth={3} />
                           </div>
                           <span className="text-[8px] font-black uppercase text-orange-600 tracking-widest">Piece Count</span>
                        </div>
                        <span className="text-lg font-black text-orange-700 tabular-nums">
                            {((material.central_stock?.[0]?.quantity || 0) / 
                              ((material.roll_width_ft || 4) * (material.default_roll_length_mt || 50) * 3.28084)
                            ).toFixed(2)}{' '}
                            <span className="text-[9px]">PCS</span>
                         </span>
                     </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Simplified Stock In Dialog */}
      <Dialog open={isStockInOpen} onOpenChange={setIsStockInOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-xl p-0 overflow-hidden bg-white dark:bg-neutral-950 shadow-2xl border-none">
          <div className="h-3 w-full bg-emerald-500" />
          <form onSubmit={handleStockIn} className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase text-neutral-900 dark:text-white flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <PlusCircle size={24} />
                 </div>
                 Inventory <span className="text-emerald-500">Inflow</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-8">
               <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Target Material</p>
                     <h3 className="text-xl font-black text-neutral-800 dark:text-neutral-200">{selectedMaterial?.name}</h3>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Stocking Unit</p>
                     <span className="text-lg font-black text-emerald-600">{selectedMaterial?.unit}</span>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-neutral-500 ml-2">1. Select Vendor</Label>
                    <select required className="w-full h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border-none font-black px-6 text-neutral-900 dark:text-white outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-emerald-500/10 transition-all" value={stockInVendor} onChange={e => setStockInVendor(e.target.value)}>
                       <option value="" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Choose Supplier...</option>
                       {vendors.map(v => <option key={v.id} value={v.id} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">{v.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-4">
                     {isRollBased(selectedMaterial?.material_kind) && (
                        <div className="flex items-center justify-between px-2">
                           <Label className="text-[10px] font-black uppercase text-neutral-500">2. Quantity Logic</Label>
                           <button type="button" onClick={() => setIsAutoCalc(!isAutoCalc)} className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border transition-all ${isAutoCalc ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'}`}>
                              {isAutoCalc ? 'Auto-Calculate Pieces' : 'Manual MT/FT Entry'}
                           </button>
                        </div>
                     )}
                      {isAutoCalc && (isRollBased(selectedMaterial?.material_kind) || isPipeBased(selectedMaterial?.material_kind) || isDalaBased(selectedMaterial?.material_kind) || isPaperBased(selectedMaterial?.material_kind) || isBoardBased(selectedMaterial?.material_kind)) ? (
                        <div className="grid grid-cols-3 gap-4">
                           <div className="space-y-2">
                              <div className="relative">
                                 <Input type="number" placeholder="Pieces" className="h-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 font-black text-xl text-center text-neutral-900 dark:text-white focus:border-emerald-500 transition-colors" value={stockInPieces} onChange={e => setStockInPieces(e.target.value)} />
                                 <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-neutral-400">{(isPipeBased(selectedMaterial?.material_kind) || isDalaBased(selectedMaterial?.material_kind) || isBoardBased(selectedMaterial?.material_kind)) ? 'Count' : isPaperBased(selectedMaterial?.material_kind) ? 'Boxes' : 'Pcs'}</span>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <div className="relative">
                                 <Input 
                                   type="number" 
                                   placeholder="Width" 
                                   className={`h-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 font-black text-xl text-center text-neutral-900 dark:text-white focus:border-emerald-500 transition-colors ${(isPipeBased(selectedMaterial?.material_kind) || isDalaBased(selectedMaterial?.material_kind) || isPaperBased(selectedMaterial?.material_kind)) ? 'opacity-60 pointer-events-none' : ''}`} 
                                   value={
                                     isPipeBased(selectedMaterial?.material_kind) ? (selectedMaterial?.default_pipe_length_ft || 20) : 
                                     isDalaBased(selectedMaterial?.material_kind) ? (selectedMaterial?.default_dala_length_ft || 20) : 
                                     isPaperBased(selectedMaterial?.material_kind) ? (selectedMaterial?.default_pages_per_box || 100) :
                                     (isBoardBased(selectedMaterial?.material_kind) || isRollBased(selectedMaterial?.material_kind)) ? stockInWidth :
                                     selectedMaterial?.roll_width_ft || 4
                                   } 
                                   onChange={e => (isBoardBased(selectedMaterial?.material_kind) || isRollBased(selectedMaterial?.material_kind)) && setStockInWidth(e.target.value)} 
                                   readOnly={!(isBoardBased(selectedMaterial?.material_kind) || isRollBased(selectedMaterial?.material_kind))}
                                 />
                                 <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-neutral-400">{(isPipeBased(selectedMaterial?.material_kind) || isDalaBased(selectedMaterial?.material_kind)) ? 'FT/Pc' : isPaperBased(selectedMaterial?.material_kind) ? 'PCS/Box' : isBoardBased(selectedMaterial?.material_kind) ? 'Width (ft)' : 'Width (ft)'}</span>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <div className="relative">
                                 <Input 
                                   type="number" 
                                   placeholder="Height" 
                                   className={`h-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 font-black text-xl text-center text-neutral-900 dark:text-white focus:border-emerald-500 transition-colors ${(isPipeBased(selectedMaterial?.material_kind) || isDalaBased(selectedMaterial?.material_kind) || isPaperBased(selectedMaterial?.material_kind)) ? 'hidden' : ''}`} 
                                   value={stockInLength} 
                                   onChange={e => setStockInLength(e.target.value)} 
                                 />
                                 <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-neutral-400">{isBoardBased(selectedMaterial?.material_kind) ? 'Height (ft)' : 'Length (mt)'}</span>
                              </div>
                           </div>
                        </div>
                      ) : null}

                     <div className="relative group">
                        <Input type="number" placeholder={`Total ${isRollBased(selectedMaterial?.material_kind) ? 'SQFT' : selectedMaterial?.unit}`} className={`h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border-none font-black text-4xl px-8 text-neutral-900 dark:text-white transition-all ${isAutoCalc && (isRollBased(selectedMaterial?.material_kind) || isPipeBased(selectedMaterial?.material_kind) || isDalaBased(selectedMaterial?.material_kind) || isPaperBased(selectedMaterial?.material_kind) || isBoardBased(selectedMaterial?.material_kind)) ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'focus:ring-4 focus:ring-emerald-500/10'}`} value={stockInTotal} onChange={e => setStockInTotal(e.target.value)} readOnly={isAutoCalc && (isRollBased(selectedMaterial?.material_kind) || isPipeBased(selectedMaterial?.material_kind) || isDalaBased(selectedMaterial?.material_kind) || isPaperBased(selectedMaterial?.material_kind) || isBoardBased(selectedMaterial?.material_kind))} />
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-end">
                           <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Final {isRollBased(selectedMaterial?.material_kind) ? 'SQFT' : selectedMaterial?.unit} Total</span>
                           {isAutoCalc && (isRollBased(selectedMaterial?.material_kind) || isPipeBased(selectedMaterial?.material_kind) || isDalaBased(selectedMaterial?.material_kind) || isPaperBased(selectedMaterial?.material_kind) || isBoardBased(selectedMaterial?.material_kind)) && (
                              <span className="text-[9px] font-black text-emerald-500 uppercase text-right">
                                {isRollBased(selectedMaterial?.material_kind) ? (
                                   `${stockInPieces} x ${stockInWidth}ft x ${stockInLength}mt`
                                ) : isBoardBased(selectedMaterial?.material_kind) ? (
                                   `${stockInPieces} x ${stockInWidth} x ${stockInLength}`
                                ) : (
                                   `${stockInPieces} x ${
                                     isPipeBased(selectedMaterial?.material_kind) ? (selectedMaterial?.default_pipe_length_ft || 20) : 
                                     isDalaBased(selectedMaterial?.material_kind) ? (selectedMaterial?.default_dala_length_ft || 20) : 
                                     isPaperBased(selectedMaterial?.material_kind) ? (selectedMaterial?.default_pages_per_box || 100) :
                                     stockInLength
                                   }`
                                )}
                              </span>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-neutral-500 ml-2">3. Rate (per {isRollBased(selectedMaterial?.material_kind) ? 'Piece' : selectedMaterial?.unit})</Label>
                        <Input type="number" placeholder="0.00" className="h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border-none font-black px-8 text-neutral-900 dark:text-white focus:ring-4 focus:ring-emerald-500/10 transition-all" value={stockInRate} onChange={e => setStockInRate(e.target.value)} />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Total Value</Label>
                        <div className="h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center font-black text-xl text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800">
                           ₹{( (parseFloat(isRollBased(selectedMaterial?.material_kind) ? stockInPieces : stockInTotal) || 0) * (parseFloat(stockInRate) || 0) ).toFixed(2)}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <Button type="submit" disabled={stockInMutation.isPending} className="w-full h-20 rounded-[2.5rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-xl shadow-emerald-500/20 uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 group">
               {stockInMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : (
                  <>
                     Confirm Stock Entry
                     <ChevronRight size={24} className="ml-3 group-hover:translate-x-2 transition-transform" />
                  </>
               )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Simplified Stock Out Dialog */}
      <Dialog open={isStockOutOpen} onOpenChange={setIsStockOutOpen}>
        <DialogContent className="rounded-[2.5rem] sm:max-w-md p-0 overflow-hidden bg-white dark:bg-neutral-950 shadow-2xl border-none">
          <div className="h-3 w-full bg-rose-500" />
          <form onSubmit={handleStockOut} className="p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase text-neutral-900 dark:text-white flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <MinusCircle size={24} />
                 </div>
                 Stock <span className="text-rose-500">Extraction</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-8">
               <div className="p-6 bg-red-500/5 rounded-3xl border border-red-500/10 flex items-center justify-between">
                  <div>
                     <p className="text-[10px] font-black uppercase text-red-600 mb-1">Source Material</p>
                     <h3 className="text-xl font-black text-neutral-800 dark:text-neutral-200">{selectedMaterial?.name}</h3>
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Available</p>
                     <p className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">{selectedMaterial?.central_stock?.[0]?.quantity || 0} {selectedMaterial?.unit}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                     <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Stock Out Parameters</Label>
                     {isAutoCalcOut && (
                        <button type="button" onClick={() => setIsAutoCalcOut(false)} className="text-[10px] font-black uppercase text-red-500 hover:underline">Switch to Manual</button>
                     )}
                     {!isAutoCalcOut && (isRollBased(selectedMaterial?.material_kind) || isBoardBased(selectedMaterial?.material_kind) || isPipeBased(selectedMaterial?.material_kind) || isDalaBased(selectedMaterial?.material_kind)) && (
                        <button type="button" onClick={() => setIsAutoCalcOut(true)} className="text-[10px] font-black uppercase text-emerald-500 hover:underline">Switch to Dimensions</button>
                     )}
                  </div>

                  {isAutoCalcOut ? (
                     <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                           <div className="relative">
                              <Input type="number" placeholder="Count" className="h-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 font-black text-xl text-center text-neutral-900 dark:text-white focus:border-red-500 transition-colors" value={stockOutPieces} onChange={e => setStockOutPieces(e.target.value)} />
                              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-neutral-400">Count</span>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <div className="relative">
                              <Input type="number" placeholder="Width" className="h-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 font-black text-xl text-center text-neutral-900 dark:text-white focus:border-red-500 transition-colors" value={stockOutWidth} onChange={e => setStockOutWidth(e.target.value)} />
                              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-neutral-400">Width (ft)</span>
                           </div>
                        </div>
                        <div className="space-y-2">
                           <div className="relative">
                              <Input type="number" placeholder="Height" className="h-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border-2 border-neutral-100 dark:border-neutral-800 font-black text-xl text-center text-neutral-900 dark:text-white focus:border-red-500 transition-colors" value={stockOutHeight} onChange={e => setStockOutHeight(e.target.value)} />
                              <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase text-neutral-400">{isRollBased(selectedMaterial?.material_kind) ? 'Length (ft)' : 'Height (ft)'}</span>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="relative group">
                        <Input type="number" placeholder={`Amount to remove (${selectedMaterial?.unit})`} className="h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border-none font-black text-4xl px-8 text-neutral-900 dark:text-white focus:ring-4 focus:ring-red-500/10 transition-all" value={stockOutTotal} onChange={e => setStockOutTotal(e.target.value)} />
                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Total {selectedMaterial?.unit}</span>
                     </div>
                  )}

                  {isAutoCalcOut && (
                     <div className="relative group">
                        <Input type="number" className="h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-900 border-none font-black text-4xl px-8 text-neutral-900 dark:text-white opacity-60 pointer-events-none" value={stockOutTotal} readOnly />
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-end">
                           <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">Final {selectedMaterial?.unit} Total</span>
                           <span className="text-[9px] font-black text-red-500 uppercase text-right">
                              {stockOutPieces} x {stockOutWidth} x {stockOutHeight}
                           </span>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-neutral-500 ml-2">Notes</Label>
                     <Input type="text" className="h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border-none font-black px-8 text-neutral-900 dark:text-white" value={stockOutNotes} onChange={e => setStockOutNotes(e.target.value)} />
            </div>

            <Button type="submit" disabled={stockInMutation.isPending} className="w-full h-20 rounded-[2.5rem] bg-rose-600 hover:bg-rose-700 text-white font-black text-lg shadow-xl shadow-rose-500/20 uppercase tracking-widest transition-all">
               {stockInMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : 'Finalize Extraction'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Material Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-lg glass-panel border-white/20 p-0 overflow-hidden bg-white dark:bg-neutral-950">
          <div className="brand-gradient h-3 w-full" />
          <div className="p-10 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar pb-16">
            <DialogHeader><DialogTitle className="text-3xl font-black uppercase text-neutral-900 dark:text-white">{editingMaterial ? 'Update' : 'Add Raw'} <span className="text-orange-600">Material</span></DialogTitle></DialogHeader>
            <form onSubmit={handleAddMaterial} className="space-y-6">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-2">Material Name</Label>
                  <Input required placeholder="e.g. STAR FLEX FRONT LIT" className="h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border-none font-black text-neutral-900 dark:text-white px-8 focus:ring-4 focus:ring-orange-500/10 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-2">Measurement Unit</Label>
                      <select 
                        disabled={isRollBased(formData.material_kind)}
                        className={`w-full h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border-none font-black px-6 text-neutral-900 dark:text-white outline-none appearance-none cursor-pointer ${isRollBased(formData.material_kind) ? 'opacity-60 cursor-not-allowed' : ''}`} 
                        value={formData.unit} 
                        onChange={e => setFormData({...formData, unit: e.target.value})}
                      >
                        {UNIT_GROUPS.map(group => (
                           <optgroup key={group.label} label={group.label} className="text-xs font-black uppercase bg-white dark:bg-neutral-900">
                              {group.items.map(u => <option key={u.id} value={u.id} className="text-sm font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">{u.label}</option>)}
                           </optgroup>
                        ))}
                     </select>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-2">Category</Label>
                     <select className="w-full h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border-none font-black px-6 text-neutral-900 dark:text-white outline-none appearance-none cursor-pointer" value={formData.material_kind} onChange={e => setFormData({...formData, material_kind: e.target.value})}>
                        {CATEGORY_GROUPS.map(group => (
                           <optgroup key={group.label} label={group.label} className="text-xs font-black uppercase bg-white dark:bg-neutral-900">
                              {group.items.map(cat => <option key={cat.id} value={cat.id} className="text-sm font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">{cat.label}</option>)}
                           </optgroup>
                        ))}
                     </select>
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-2">Internal Description</Label>
                  <Input placeholder="Optional notes about this material..." className="h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border-none font-black text-neutral-900 dark:text-white px-8 focus:ring-4 focus:ring-orange-500/10 transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
               </div>

                {isRollBased(formData.material_kind) && (
                   <div className="p-8 bg-orange-500/5 rounded-[2.5rem] border border-orange-500/10 space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Ruler size={64} className="text-orange-600" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Dimension Configuration</p>
                      <div className="grid grid-cols-2 gap-6 relative z-10">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Roll Width (ft)</Label>
                            <Input type="number" className="h-16 rounded-2xl bg-white dark:bg-neutral-800 border-orange-100 dark:border-neutral-700 font-black text-xl text-center text-neutral-900 dark:text-white" value={formData.roll_width_ft} onChange={e => setFormData({...formData, roll_width_ft: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Std Length (mt)</Label>
                            <Input type="number" className="h-16 rounded-2xl bg-white dark:bg-neutral-800 border-orange-100 dark:border-neutral-700 font-black text-xl text-center text-neutral-900 dark:text-white" value={formData.default_roll_length_mt} onChange={e => setFormData({...formData, default_roll_length_mt: e.target.value})} />
                         </div>
                      </div>
                   </div>
                )}

                {isPipeBased(formData.material_kind) && (
                   <div className="p-8 bg-blue-500/5 rounded-[2.5rem] border border-blue-500/10 space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Hash size={64} className="text-blue-600" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Pipe Configuration</p>
                      <div className="space-y-2 relative z-10">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Std Length Per Piece (ft)</Label>
                         <Input type="number" className="h-16 rounded-2xl bg-white dark:bg-neutral-800 border-blue-100 dark:border-neutral-700 font-black text-xl text-center text-neutral-900 dark:text-white" value={formData.default_pipe_length_ft} onChange={e => setFormData({...formData, default_pipe_length_ft: e.target.value})} />
                      </div>
                   </div>
                )}

                {isDalaBased(formData.material_kind) && (
                   <div className="p-8 bg-indigo-500/5 rounded-[2.5rem] border border-indigo-500/10 space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Package size={64} className="text-indigo-600" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Dala Configuration</p>
                      <div className="space-y-2 relative z-10">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Std Length Per Piece (ft)</Label>
                         <Input type="number" className="h-16 rounded-2xl bg-white dark:bg-neutral-800 border-indigo-100 dark:border-neutral-700 font-black text-xl text-center text-neutral-900 dark:text-white" value={formData.default_dala_length_ft} onChange={e => setFormData({...formData, default_dala_length_ft: e.target.value})} />
                      </div>
                   </div>
                )}

                {isBoardBased(formData.material_kind) && (
                   <div className="p-8 bg-blue-500/5 rounded-[2.5rem] border border-blue-500/10 space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Layers size={64} className="text-blue-600" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">{formData.material_kind === 'tin' ? 'Tin Configuration' : 'Board Configuration'}</p>
                      <div className="grid grid-cols-2 gap-6 relative z-10">
                         {formData.material_kind !== 'tin' && (
                            <div className="space-y-2 col-span-2">
                               <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Thickness (mm)</Label>
                               <Input type="number" placeholder="e.g. 3" className="h-16 rounded-2xl bg-white dark:bg-neutral-800 border-blue-100 dark:border-neutral-700 font-black text-xl text-center text-neutral-900 dark:text-white" value={formData.thickness_mm} onChange={e => setFormData({...formData, thickness_mm: e.target.value})} />
                            </div>
                         )}
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Std Width (ft)</Label>
                            <Input type="number" placeholder="e.g. 4" className="h-16 rounded-2xl bg-white dark:bg-neutral-800 border-blue-100 dark:border-neutral-700 font-black text-xl text-center text-neutral-900 dark:text-white" value={formData.default_board_width_ft} onChange={e => setFormData({...formData, default_board_width_ft: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">{formData.material_kind === 'tin' ? 'Std Length (ft)' : 'Std Height (ft)'}</Label>
                            <Input type="number" placeholder="e.g. 8" className="h-16 rounded-2xl bg-white dark:bg-neutral-800 border-blue-100 dark:border-neutral-700 font-black text-xl text-center text-neutral-900 dark:text-white" value={formData.default_board_height_ft} onChange={e => setFormData({...formData, default_board_height_ft: e.target.value})} />
                         </div>
                      </div>
                   </div>
                )}

                {isPaperBased(formData.material_kind) && (
                   <div className="p-8 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/10 space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                         <Droplets size={64} className="text-emerald-600" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Paper Configuration</p>
                      <div className="grid grid-cols-2 gap-6 relative z-10">
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">GSM</Label>
                            <Input type="number" placeholder="e.g. 300" className="h-16 rounded-2xl bg-white dark:bg-neutral-800 border-emerald-100 dark:border-neutral-700 font-black text-xl text-center text-neutral-900 dark:text-white" value={formData.gsm} onChange={e => setFormData({...formData, gsm: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-2">Pages / Box</Label>
                            <Input type="number" placeholder="e.g. 100" className="h-16 rounded-2xl bg-white dark:bg-neutral-800 border-emerald-100 dark:border-neutral-700 font-black text-xl text-center text-neutral-900 dark:text-white" value={formData.default_pages_per_box} onChange={e => setFormData({...formData, default_pages_per_box: e.target.value})} />
                         </div>
                      </div>
                   </div>
                )}


               <DialogFooter className="pt-6">
                  <Button type="submit" disabled={addMaterialMutation.isPending} className="w-full h-20 rounded-[2.5rem] brand-gradient text-white font-black text-xl shadow-2xl shadow-orange-500/20 uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95">
                     {addMaterialMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : (editingMaterial ? 'Update Material' : 'Register Material')}
                  </Button>
               </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
