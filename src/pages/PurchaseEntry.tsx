import React, { useState } from 'react';
import { ShoppingCart, Plus, Save, Truck, Layers, Hash, DollarSign, FileText, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useVendors, useRawMaterials } from '../hooks/queries/useInventory';
import { useStockIn } from '../hooks/mutations/useInventory';

export default function PurchaseEntryPage() {
  const { profile } = useAuth();
  const { data: vendors = [], isLoading: vendorsLoading, isError: vendorsError } = useVendors();
  const { data: materials = [], isLoading: materialsLoading, isError: materialsError } = useRawMaterials();
  const stockInMutation = useStockIn();

  const [formData, setFormData] = useState({
    vendor_id: '',
    raw_material_id: '',
    quantity: '',
    unit_price: '',
    notes: '',
    pipe_length: '',
    pieces: '1',
    roll_width: '',
    roll_length_mt: '50'
  });

  const selectedMaterial = (materials as any[]).find(m => m.id === formData.raw_material_id);
  const isRoll = selectedMaterial && ['flex', 'vinyl'].includes(selectedMaterial.material_kind || '');

  React.useEffect(() => {
    if (selectedMaterial && isRoll) {
      setFormData(prev => ({
        ...prev,
        roll_width: String(selectedMaterial.roll_width_ft || '4'),
        roll_length_mt: String(selectedMaterial.default_roll_length_mt || '50'),
        pieces: '1'
      }));
    }
  }, [formData.raw_material_id, selectedMaterial]);

  const loading = stockInMutation.isPending;
  const dataLoading = vendorsLoading || materialsLoading;
  const dataError = vendorsError || materialsError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const finalQuantity = isRoll 
      ? parseFloat(formData.pieces || '0') * parseFloat(formData.roll_width || '0') * (parseFloat(formData.roll_length_mt || '0') * 3.28084)
      : parseFloat(formData.quantity || '0');
    const finalRate = isRoll
      ? parseFloat(formData.unit_price || '0') / (parseFloat(formData.roll_width || '1') * (parseFloat(formData.roll_length_mt || '1') * 3.28084))
      : parseFloat(formData.unit_price || '0');
    
    stockInMutation.mutate({
      vendorId: formData.vendor_id,
      invoice: formData.notes || 'N/A',
      items: [{
         materialId: formData.raw_material_id,
         quantity: finalQuantity,
         rate: finalRate,
         rollWidth: isRoll ? parseFloat(formData.roll_width) : undefined,
         rollLength: isRoll ? (parseFloat(formData.roll_length_mt) * 3.28084) : undefined,
         pipeLength: selectedMaterial?.material_kind === 'pipe' ? parseFloat(formData.pipe_length) : null
      }],
      userId: profile.id
    }, {
      onSuccess: () => {
        toast.success('Purchase recorded successfully');
        setFormData({
          vendor_id: '',
          raw_material_id: '',
          quantity: '',
          unit_price: '',
          notes: '',
          pipe_length: '',
          pieces: '1',
          roll_width: '',
          roll_length_mt: '50'
        });
      },
      onError: (error: any) => {
        toast.error('Failed to record purchase: ' + error.message);
      }
    });
  };

  if (dataLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-neutral-900 rounded-[3rem] border border-dashed border-red-200 dark:border-red-900/30">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4 text-red-500">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-black text-neutral-900 dark:text-neutral-100">Failed to Load Data</h3>
        <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-2 mb-6 text-center px-6">
          Could not load vendors or materials from the server
        </p>
        <button onClick={() => window.location.reload()} className="h-12 px-8 rounded-2xl bg-orange-600 text-white font-bold">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">Purchase Inbound</h2>
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Restock Raw Materials & Assets</p>
      </div>

      <Card className="rounded-[2rem] md:rounded-[3rem] border-none shadow-xl shadow-neutral-200/50 dark:shadow-none overflow-hidden bg-white dark:bg-neutral-900">
        <CardHeader className="bg-neutral-900 dark:bg-neutral-950 text-white p-6 md:p-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/40">
                <Truck size={24} strokeWidth={2.5} />
             </div>
             <div>
                <CardTitle className="text-xl md:text-2xl font-black">Entry Protocol</CardTitle>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mt-1">Transaction ID: NEW-AUTO</p>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
               {/* Vendor Selection */}
               <div className="space-y-3">
                 <div className="flex items-center gap-2 mb-1">
                    <Truck size={14} className="text-neutral-400" />
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Supplier Authority</Label>
                 </div>
                 <select 
                   required
                   className="w-full h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-100 dark:border-neutral-700 font-bold px-4 outline-none focus:ring-4 focus:ring-orange-600/10 transition-all appearance-none cursor-pointer"
                   value={formData.vendor_id}
                   onChange={(e) => setFormData({...formData, vendor_id: e.target.value})}
                 >
                   <option value="" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">Select Vendor</option>
                   {vendors.map(v => <option key={v.id} value={v.id} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">{v.name}</option>)}
                 </select>
               </div>

               {/* Material Selection */}
               <div className="space-y-3">
                 <div className="flex items-center gap-2 mb-1">
                    <Layers size={14} className="text-neutral-400" />
                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Resource Type</Label>
                 </div>
                 <select 
                   required
                   className="w-full h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 border border-neutral-100 dark:border-neutral-700 font-bold px-4 outline-none focus:ring-4 focus:ring-orange-600/10 transition-all appearance-none cursor-pointer"
                   value={formData.raw_material_id}
                   onChange={(e) => setFormData({...formData, raw_material_id: e.target.value})}
                 >
                   <option value="" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">Select Material</option>
                   {materials.map(m => <option key={m.id} value={m.id} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">{m.name} ({m.unit})</option>)}
                 </select>
               </div>

               {/* Quantity/Roll/Pipe Inputs */}
               {!isRoll && (
                 <div className="space-y-3">
                   <div className="flex items-center gap-2 mb-1">
                      <Hash size={14} className="text-neutral-400" />
                      <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Volume / Quantity</Label>
                   </div>
                   <Input 
                     type="number"
                     step="0.001"
                     required
                     placeholder="0.000"
                     className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 border-neutral-100 dark:border-neutral-700 font-black text-lg focus:ring-orange-600/10 tabular-nums"
                     value={formData.quantity}
                     onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                   />
                 </div>
               )}

               {isRoll && (
                 <>
                   <div className="space-y-3">
                     <div className="flex items-center gap-2 mb-1">
                        <Hash size={14} className="text-neutral-400" />
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Pieces / Rolls</Label>
                     </div>
                     <Input 
                       type="number"
                       required
                       placeholder="e.g. 1"
                       className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 border-neutral-100 dark:border-neutral-700 font-black text-lg focus:ring-orange-600/10 tabular-nums"
                       value={formData.pieces}
                       onChange={(e) => setFormData({...formData, pieces: e.target.value})}
                     />
                   </div>
                   <div className="space-y-3">
                     <div className="flex items-center gap-2 mb-1">
                        <Ruler size={14} className="text-neutral-400" />
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Roll Width (ft)</Label>
                     </div>
                     <Input 
                       type="number"
                       step="0.1"
                       required
                       placeholder="e.g. 6"
                       className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 border-neutral-100 dark:border-neutral-700 font-black text-lg focus:ring-orange-600/10 tabular-nums"
                       value={formData.roll_width}
                       onChange={(e) => setFormData({...formData, roll_width: e.target.value})}
                     />
                   </div>
                   <div className="space-y-3">
                     <div className="flex items-center gap-2 mb-1">
                        <Ruler size={14} className="text-neutral-400" />
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Roll Length (mt)</Label>
                     </div>
                     <Input 
                       type="number"
                       step="0.1"
                       required
                       placeholder="e.g. 50"
                       className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 border-neutral-100 dark:border-neutral-700 font-black text-lg focus:ring-orange-600/10 tabular-nums"
                       value={formData.roll_length_mt}
                       onChange={(e) => setFormData({...formData, roll_length_mt: e.target.value})}
                     />
                   </div>
                   <div className="space-y-3">
                     <div className="flex items-center gap-2 mb-1">
                        <Ruler size={14} className="text-neutral-400" />
                        <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Total Calculated Area (sqft)</Label>
                     </div>
                     <div className="h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/40 font-black text-lg flex items-center px-4 text-orange-700 dark:text-orange-400">
                       {(parseFloat(formData.pieces || '0') * parseFloat(formData.roll_width || '0') * (parseFloat(formData.roll_length_mt || '0') * 3.28084)).toFixed(2)} sqft
                     </div>
                   </div>
                 </>
               )}

                {/* Unit Price */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                     <DollarSign size={14} className="text-neutral-400" />
                     <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cost per {isRoll ? 'Roll' : 'Unit'} (₹)</Label>
                  </div>
                  <Input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 border-neutral-100 dark:border-neutral-700 font-black text-lg focus:ring-orange-600/10 tabular-nums"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                  />
                </div>

                {/* Board Specs */}
                {formData.raw_material_id && ['sun_board', 'tin'].includes(materials.find(m => m.id === formData.raw_material_id)?.material_kind || '') && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                         <Ruler size={14} className="text-neutral-400" />
                         <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Board Width (ft)</Label>
                      </div>
                      <div className="h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 font-black text-lg flex items-center px-4 text-neutral-500 dark:text-neutral-400">
                        {materials.find(m => m.id === formData.raw_material_id)?.default_board_width_ft || '8.0'} ft
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                         <Ruler size={14} className="text-neutral-400" />
                         <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Board Height (ft)</Label>
                      </div>
                      <div className="h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 font-black text-lg flex items-center px-4 text-neutral-500 dark:text-neutral-400">
                        {materials.find(m => m.id === formData.raw_material_id)?.default_board_height_ft || '4.0'} ft
                      </div>
                    </div>
                  </>
                )}

                {/* Pipe Specs */}
                {formData.raw_material_id && materials.find(m => m.id === formData.raw_material_id)?.material_kind === 'pipe' && (
                  <div className="space-y-3 col-span-1 md:col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                       <Ruler size={14} className="text-neutral-400" />
                       <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Pipe Length (ft)</Label>
                    </div>
                    <Input 
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 10.00"
                      className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 border-neutral-100 dark:border-neutral-700 font-black text-lg focus:ring-orange-600/10 tabular-nums"
                      value={formData.pipe_length}
                      onChange={(e) => setFormData({...formData, pipe_length: e.target.value})}
                    />
                  </div>
                )}
             </div>

            {/* Notes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                 <FileText size={14} className="text-neutral-400" />
                 <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Transaction Notes</Label>
              </div>
              <Input 
                className="h-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-100 border-neutral-100 dark:border-neutral-700 font-medium px-4"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Reference numbers, batch codes, or specific instructions..."
              />
            </div>

            <div className="pt-8 border-t border-neutral-100 dark:border-neutral-800">
              <div className="bg-neutral-50 dark:bg-neutral-800 p-6 md:p-8 rounded-[2rem] mb-8 border border-neutral-100 dark:border-neutral-700">
                 <div className="flex justify-between items-center">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Calculated Valuation</span>
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Base + Logistics</span>
                   </div>
                   <span className="text-4xl md:text-5xl font-black text-orange-600 tabular-nums tracking-tighter">
                     ₹{(isRoll 
                       ? (parseFloat(formData.pieces || '0') * parseFloat(formData.unit_price || '0')) 
                       : (parseFloat(formData.quantity || '0') * parseFloat(formData.unit_price || '0'))
                     ).toFixed(2)}
                   </span>
                 </div>
              </div>
              <Button type="submit" className="w-full h-16 md:h-20 rounded-[2rem] text-xl font-black bg-neutral-950 dark:bg-neutral-100 dark:text-neutral-900 text-white shadow-2xl shadow-neutral-400 dark:shadow-none hover:bg-orange-600 dark:hover:bg-orange-600 dark:hover:text-white transition-all active:scale-[0.98]" disabled={loading}>
                <Save className="mr-3 h-6 w-6" strokeWidth={2.5} />
                Verify & Commit Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
