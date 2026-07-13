import React, { useState } from 'react';
import { 
  Building2, Plus, ArrowUpRight, ArrowDownRight, 
  ChevronRight, Building, Search, IndianRupee, FileText,
  MapPin, Landmark, ArrowLeft, History, MoreVertical, Edit2, Trash2,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { 
  useCorporateClients, 
  useCorporateBranches, 
  useCorporateBranchLedger,
  CorporateBranch,
  CorporateClient
} from '@/hooks/queries/useCorporateClients';
import {
  useAddCorporateClient,
  useAddCorporateBranch,
  useDeleteCorporateClient,
  useDeleteCorporateBranch,
  useUpdateCorporateLedgerEntry
} from '@/hooks/mutations/useCorporateClients';
import { AddOrderDialog } from '@/components/corporate/AddOrderDialog';
import { RecordPaymentDialog } from '@/components/corporate/RecordPaymentDialog';
import { CorporateAnalyticsChart } from '@/components/corporate/CorporateAnalyticsChart';
import { ClientEditDialog } from '@/components/corporate/ClientEditDialog';
import { BranchEditDialog } from '@/components/corporate/BranchEditDialog';

import { toast } from 'sonner';

export default function CorporateClients() {
  const [selectedClient, setSelectedClient] = useState<CorporateClient & { totalBalance: number, branchesCount: number } | null>(null);
  const [selectedBranchForLedger, setSelectedBranchForLedger] = useState<CorporateBranch | null>(null);
  const [branchForOrder, setBranchForOrder] = useState<CorporateBranch | null>(null);
  const [branchForPayment, setBranchForPayment] = useState<CorporateBranch | null>(null);
  
  const [clientToEdit, setClientToEdit] = useState<CorporateClient | null>(null);
  const [branchToEdit, setBranchToEdit] = useState<CorporateBranch | null>(null);

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  
  const [newClientName, setNewClientName] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');

  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchContact, setNewBranchContact] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchEmail, setNewBranchEmail] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  const { data: clients, isLoading: clientsLoading } = useCorporateClients();
  const { data: branches, isLoading: branchesLoading } = useCorporateBranches(selectedClient?.id || null);

  const addClient = useAddCorporateClient();
  const addBranch = useAddCorporateBranch();
  const deleteClient = useDeleteCorporateClient();
  const deleteBranch = useDeleteCorporateBranch();

  const handleDownloadCorporateLedger = async (
    timeframeMonths: number,
    clientId: string | null,
    clientName: string | null,
    branchId: string | null,
    branchName: string | null
  ) => {
    const loadingToast = toast.loading('Preparing report data...');
    try {
      let query = supabase
        .from('corporate_ledger')
        .select(`
          *,
          branch:corporate_branches!inner(
            name,
            client:corporate_clients!inner(name)
          )
        `)
        .order('date', { ascending: true });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      } else if (clientId) {
        query = query.eq('corporate_branches.client_id', clientId);
      }

      // Filter by timeframe
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - timeframeMonths);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];
      
      query = query.gte('date', cutoffStr);

      const { data: ledgerEntries, error } = await query;
      toast.dismiss(loadingToast);

      if (error) throw error;

      if (!ledgerEntries || ledgerEntries.length === 0) {
        toast.warning('No ledger entries found for the selected timeframe.');
        return;
      }

      // Format CSV
      const csvRows: string[] = [];
      const reportTitle = branchName 
        ? `BRANCH LEDGER REPORT - ${branchName.toUpperCase()}`
        : clientName 
          ? `COMPANY LEDGER REPORT - ${clientName.toUpperCase()}`
          : 'GLOBAL CORPORATE LEDGERS REPORT';

      csvRows.push(`${reportTitle}`);
      csvRows.push(`Timeframe: Last ${timeframeMonths} Month(s) (Since ${cutoffStr})`);
      csvRows.push(''); // spacing

      // Header row
      csvRows.push('Date,Company,Branch,Transaction Type,Amount (Rs),Running Balance,Description');

      ledgerEntries.forEach((entry: any) => {
        const companyName = entry.branch?.client?.name || 'Unknown Company';
        const brName = entry.branch?.name || 'Unknown Branch';
        const txType = entry.transaction_type.toUpperCase();
        const amount = Number(entry.amount || 0);
        const balance = Number(entry.balance || 0);
        const desc = entry.notes || '';

        csvRows.push([
          entry.date,
          `"${companyName.replace(/"/g, '""')}"`,
          `"${brName.replace(/"/g, '""')}"`,
          txType,
          amount,
          balance,
          `"${desc.replace(/"/g, '""')}"`
        ].join(','));
      });

      const csvContent = csvRows.join('\n');
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = branchName 
        ? `ledger_branch_${branchName.replace(/\s+/g, '_')}_${timeframeMonths}m.csv`
        : clientName 
          ? `ledger_company_${clientName.replace(/\s+/g, '_')}_${timeframeMonths}m.csv`
          : `global_corporate_ledgers_${timeframeMonths}m.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report downloaded successfully');
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error(err);
      toast.error('Failed to generate spreadsheet: ' + err.message);
    }
  };

  const handleDeleteClient = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${name}? This will delete all its branches and transactions permanently.`)) {
      try {
        await deleteClient.mutateAsync(id);
        toast.success('Client deleted successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete client');
      }
    }
  };

  const handleDeleteBranch = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete branch ${name}? This will delete all its transactions.`)) {
      try {
        await deleteBranch.mutateAsync(id);
        toast.success('Branch deleted successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete branch');
      }
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return;
    try {
      await addClient.mutateAsync({ 
        name: newClientName,
        contact_person: newClientContact || undefined,
        phone: newClientPhone || undefined,
        email: newClientEmail || undefined
      });
      toast.success('Client group created successfully');
      setNewClientName('');
      setNewClientContact('');
      setNewClientPhone('');
      setNewClientEmail('');
      setIsAddingClient(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to create client group');
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !selectedClient) return;
    try {
      await addBranch.mutateAsync({ 
        client_id: selectedClient.id, 
        name: newBranchName,
        contact_person: newBranchContact || undefined,
        phone: newBranchPhone || undefined,
        email: newBranchEmail || undefined,
        address: newBranchAddress || undefined
      });
      toast.success('Branch added successfully');
      setNewBranchName('');
      setNewBranchContact('');
      setNewBranchPhone('');
      setNewBranchEmail('');
      setNewBranchAddress('');
      setIsAddingBranch(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to add branch');
    }
  };

  const totalCorporateBalance = clients?.reduce((sum, client) => sum + (client.totalBalance || 0), 0) || 0;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {selectedClient && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 -ml-2 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedClient(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to All Clients
              </Button>
            )}
          </div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <Landmark className="h-10 w-10 text-orange-600" />
            {selectedClient ? selectedClient.name : 'Corporate Clients'}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            {selectedClient 
              ? 'Manage branches, view ledgers, and record transactions for this group.' 
              : 'Track overarching orders and payments from major client groups.'}
          </p>
        </div>

        {!selectedClient && (
          <div className="flex flex-wrap items-center gap-4 bg-muted/30 p-4 rounded-2xl border border-border/50">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Market Balance</span>
              <span className={`text-2xl font-black ${totalCorporateBalance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(totalCorporateBalance))}
                <span className="text-sm font-medium ml-2">{totalCorporateBalance < 0 ? 'DUE' : totalCorporateBalance > 0 ? 'ADVANCE' : ''}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl h-12 border-border/50 hover:bg-muted font-bold px-4">
                    <Download className="h-5 w-5 mr-2" /> Download Reports
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                  <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-3 py-2">Consolidated Reports</div>
                  <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(1, null, null, null, null)} className="rounded-xl font-bold">1 Month History</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(3, null, null, null, null)} className="rounded-xl font-bold">3 Months History</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(6, null, null, null, null)} className="rounded-xl font-bold">6 Months History</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(12, null, null, null, null)} className="rounded-xl font-bold">12 Months History</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => setIsAddingClient(!isAddingClient)} className="rounded-xl h-12 shadow-lg shadow-primary/20">
                <Plus className="h-5 w-5 mr-2" /> Add Client Group
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Analytics Chart */}
      <CorporateAnalyticsChart clientId={selectedClient?.id} />

      {/* Add Client Form */}
      {isAddingClient && !selectedClient && (
        <Card className="border-orange-500/20 shadow-lg shadow-orange-500/5 bg-orange-500/5">
          <CardContent className="p-6">
            <form onSubmit={handleAddClient} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-orange-700 dark:text-orange-400">New Client Group Name *</label>
                  <Input 
                    placeholder="e.g. State Bank of India (SBI)" 
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="bg-background"
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-orange-700 dark:text-orange-400">Contact Person</label>
                  <Input 
                    placeholder="e.g. John Doe" 
                    value={newClientContact}
                    onChange={(e) => setNewClientContact(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-orange-700 dark:text-orange-400">Phone</label>
                  <Input 
                    placeholder="e.g. 9876543210" 
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-orange-700 dark:text-orange-400">Email</label>
                  <Input 
                    type="email"
                    placeholder="e.g. contact@sbi.co.in" 
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <Button type="button" variant="ghost" onClick={() => setIsAddingClient(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!newClientName || addClient.isPending}>
                  Create Group
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Main Content Area */}
      {!selectedClient ? (
        // --- LEVEL 1: CLIENT GROUPS ---
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientsLoading ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">Loading corporate clients...</div>
          ) : clients?.length === 0 ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed rounded-3xl bg-muted/10">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-xl font-bold mb-2">No Corporate Clients</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">Create your first client group (like a bank or retail chain) to start tracking their sub-branches.</p>
            </div>
          ) : (
            clients?.map((client) => (
              <Card 
                key={client.id} 
                className={`group cursor-pointer hover:shadow-xl transition-all duration-300 overflow-hidden border ${client.totalBalance < 0 ? 'border-destructive/50 hover:border-destructive hover:shadow-destructive/10 bg-destructive/5' : 'border-green-500/50 hover:border-green-500 hover:shadow-green-500/10 bg-green-500/5'}`}
                onClick={() => setSelectedClient(client as any)}
              >
                <div className="h-2 w-full bg-muted group-hover:brand-gradient transition-all duration-300" />
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {client.name}
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setClientToEdit(client as any)}>
                            <Edit2 className="h-4 w-4 mr-2" /> Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e: any) => handleDeleteClient(e, client.id, client.name)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Client
                          </DropdownMenuItem>
                          <div className="h-px bg-muted my-1" />
                          <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest px-2 py-1.5">Download Ledger</div>
                          <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(1, client.id, client.name, null, null)}>1 Month</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(3, client.id, client.name, null, null)}>3 Months</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(6, client.id, client.name, null, null)}>6 Months</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(12, client.id, client.name, null, null)}>12 Months</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                    </div>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Building className="h-4 w-4" /> {client.branchesCount} Branches configured
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="pt-4 border-t border-border/50">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Group Consolidated Balance</div>
                    <div className={`text-3xl font-black ${client.totalBalance < 0 ? 'text-destructive' : client.totalBalance > 0 ? 'text-green-600' : 'text-foreground'}`}>
                      {formatCurrency(Math.abs(client.totalBalance || 0))}
                      <span className="text-base font-medium ml-2">
                        {client.totalBalance < 0 ? 'DUE' : client.totalBalance > 0 ? 'ADVANCE' : 'SETTLED'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        // --- LEVEL 2: BRANCHES ---
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
          
          {/* Selected Client Summary Card */}
          <Card className="bg-muted/30 border-none shadow-inner">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Consolidated Group Balance</div>
                <div className={`text-4xl md:text-5xl font-black ${selectedClient.totalBalance < 0 ? 'text-destructive' : selectedClient.totalBalance > 0 ? 'text-green-600' : 'text-foreground'}`}>
                  {formatCurrency(Math.abs(selectedClient.totalBalance || 0))}
                  <span className="text-xl md:text-2xl font-bold ml-3">
                    {selectedClient.totalBalance < 0 ? 'DUE' : selectedClient.totalBalance > 0 ? 'ADVANCE' : 'SETTLED'}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-xl h-12 border-border/50 hover:bg-muted font-bold px-4">
                      <Download className="h-5 w-5 mr-2" /> Download Group Ledgers
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-3 py-2">Group Timeframe</div>
                    <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(1, selectedClient.id, selectedClient.name, null, null)} className="rounded-xl font-bold">1 Month History</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(3, selectedClient.id, selectedClient.name, null, null)} className="rounded-xl font-bold">3 Months History</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(6, selectedClient.id, selectedClient.name, null, null)} className="rounded-xl font-bold">6 Months History</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(12, selectedClient.id, selectedClient.name, null, null)} className="rounded-xl font-bold">12 Months History</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button onClick={() => setIsAddingBranch(!isAddingBranch)} className="h-12 px-6 rounded-xl">
                  <Plus className="h-5 w-5 mr-2" /> Add Branch to {selectedClient.name}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add Branch Form */}
          {isAddingBranch && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <form onSubmit={handleAddBranch} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-sm font-semibold">New Branch Name *</label>
                      <Input 
                        placeholder="e.g. Serampore Branch" 
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        className="bg-background"
                        autoFocus
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold">Contact Person</label>
                      <Input 
                        placeholder="e.g. Jane Doe" 
                        value={newBranchContact}
                        onChange={(e) => setNewBranchContact(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold">Phone</label>
                      <Input 
                        placeholder="e.g. 9876543210" 
                        value={newBranchPhone}
                        onChange={(e) => setNewBranchPhone(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold">Email</label>
                      <Input 
                        type="email"
                        placeholder="e.g. branch@sbi.co.in" 
                        value={newBranchEmail}
                        onChange={(e) => setNewBranchEmail(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-semibold">Address</label>
                      <Input 
                        placeholder="e.g. 123 Main St, City" 
                        value={newBranchAddress}
                        onChange={(e) => setNewBranchAddress(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsAddingBranch(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!newBranchName || addBranch.isPending}>
                      Save Branch
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Branches Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
            {branchesLoading ? (
              <div className="col-span-full py-12 text-center text-muted-foreground">Loading branches...</div>
            ) : branches?.length === 0 ? (
              <div className="col-span-full py-16 text-center border-2 border-dashed rounded-3xl bg-muted/5">
                <MapPin className="h-16 w-16 mx-auto text-muted-foreground opacity-30 mb-4" />
                <h3 className="text-xl font-bold mb-2">No Branches Added</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">Add a specific branch for {selectedClient.name} to start adding orders and payments to its ledger.</p>
              </div>
            ) : (
              branches?.map((branch) => (
                <Card key={branch.id} className={`flex flex-col shadow-md hover:shadow-lg transition-all duration-300 border ${branch.currentBalance < 0 ? 'border-destructive/50 bg-destructive/5' : 'border-green-500/50 bg-green-500/5'}`}>
                  <CardHeader className="bg-muted/30 pb-4 border-b">
                    <CardTitle className="text-xl flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-orange-500 mt-1 shrink-0" />
                        <span>{branch.name}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setBranchToEdit(branch as any)}>
                            <Edit2 className="h-4 w-4 mr-2" /> Edit Branch
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e: any) => handleDeleteBranch(e, branch.id, branch.name)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Branch
                          </DropdownMenuItem>
                          <div className="h-px bg-muted my-1" />
                          <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest px-2 py-1.5">Download Ledger</div>
                          <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(1, null, null, branch.id, branch.name)}>1 Month</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(3, null, null, branch.id, branch.name)}>3 Months</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(6, null, null, branch.id, branch.name)}>6 Months</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadCorporateLedger(12, null, null, branch.id, branch.name)}>12 Months</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardTitle>
                    {branch.address && <CardDescription>{branch.address}</CardDescription>}
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-6 gap-4">
                      <div className="text-left">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Branch Balance</div>
                        <div className={`text-2xl font-black ${branch.currentBalance < 0 ? 'text-destructive' : branch.currentBalance > 0 ? 'text-green-600' : 'text-foreground'}`}>
                          {formatCurrency(Math.abs(branch.currentBalance || 0))}
                        </div>
                        <div className="text-xs font-semibold mt-1 text-muted-foreground">
                          {branch.currentBalance < 0 ? 'Outstanding Due' : branch.currentBalance > 0 ? 'Advance Credit' : 'Zero Balance'}
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end border-l pl-4 border-border/50">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Last Invoice</div>
                        {(() => {
                          const ledger = branch.ledger || [];
                          const latestInvoice = [...ledger].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).find((l: any) => l.invoice_number);
                          if (latestInvoice) {
                            return (
                              <>
                                <div className="text-sm font-bold text-foreground">#{latestInvoice.invoice_number}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(latestInvoice.date).toLocaleDateString()}</div>
                              </>
                            );
                          }
                          return <div className="text-[10px] font-medium text-muted-foreground italic">No invoices yet</div>;
                        })()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <Button 
                        variant="outline" 
                        className="w-full h-12 border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setBranchForOrder(branch as any)}
                      >
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Add Order
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full h-12 border-green-600/20 hover:bg-green-600/10 hover:text-green-600"
                        onClick={() => setBranchForPayment(branch as any)}
                      >
                        <ArrowDownRight className="mr-2 h-4 w-4" />
                        Receive Pay
                      </Button>
                    </div>
                  </CardContent>
                  <CardFooter className="p-0 border-t">
                    <Button 
                      variant="ghost" 
                      className="w-full h-14 rounded-none rounded-b-xl hover:bg-muted font-bold tracking-wide"
                      onClick={() => setSelectedBranchForLedger(branch as any)}
                    >
                      <History className="h-4 w-4 mr-2 text-muted-foreground" />
                      VIEW DETAILED LEDGER
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddOrderDialog 
        isOpen={!!branchForOrder} 
        onClose={() => setBranchForOrder(null)} 
        branch={branchForOrder} 
      />
      
      <RecordPaymentDialog 
        isOpen={!!branchForPayment} 
        onClose={() => setBranchForPayment(null)} 
        branch={branchForPayment} 
      />

      <ClientEditDialog
        isOpen={!!clientToEdit}
        onClose={() => setClientToEdit(null)}
        client={clientToEdit}
      />

      <BranchEditDialog
        isOpen={!!branchToEdit}
        onClose={() => setBranchToEdit(null)}
        branch={branchToEdit}
      />

      {/* Ledger Slide-out Sheet */}
      <LedgerSheet 
        branch={selectedBranchForLedger} 
        isOpen={!!selectedBranchForLedger} 
        onClose={() => setSelectedBranchForLedger(null)} 
      />
    </div>
  );
}

// Separate component for the Ledger Sheet to keep things clean
function LedgerSheet({ branch, isOpen, onClose }: { branch: CorporateBranch | null, isOpen: boolean, onClose: () => void }) {
  const { data: ledger, isLoading } = useCorporateBranchLedger(branch?.id || null);
  const updateLedgerEntry = useUpdateCorporateLedgerEntry();
  
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editInvoice, setEditInvoice] = useState('');

  const handleEditClick = (entry: any) => {
    setEditingEntryId(entry.id);
    setEditDate(entry.date);
    setEditInvoice(entry.invoice_number || '');
  };

  const handleSaveEdit = async (entry: any) => {
    if (!branch) return;
    try {
      await updateLedgerEntry.mutateAsync({
        id: entry.id,
        branch_id: branch.id,
        reference_id: entry.reference_id,
        data: {
          date: editDate,
          invoice_number: editInvoice || undefined
        }
      });
      toast.success('Entry updated successfully');
      setEditingEntryId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update entry');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-0 flex flex-col h-full glass-card border-l-border/50">
        <SheetHeader className="p-6 md:p-8 bg-muted/30 border-b shrink-0">
          <SheetTitle className="text-2xl font-black flex items-center gap-2">
            <History className="h-6 w-6 text-orange-500" />
            Ledger: {branch?.name}
          </SheetTitle>
          <SheetDescription className="text-base mt-2">
            Complete transaction history for this specific branch.
          </SheetDescription>
          
          {branch && (
            <div className="mt-6 p-4 rounded-xl bg-background border shadow-sm flex justify-between items-center">
              <span className="font-semibold text-muted-foreground uppercase tracking-widest text-xs">Current Balance</span>
              <span className={`text-2xl font-black ${branch.currentBalance < 0 ? 'text-destructive' : branch.currentBalance > 0 ? 'text-green-600' : ''}`}>
                {formatCurrency(Math.abs(branch.currentBalance || 0))}
                <span className="text-sm font-medium ml-2">
                  {branch.currentBalance < 0 ? 'DUE' : branch.currentBalance > 0 ? 'ADVANCE' : ''}
                </span>
              </span>
            </div>
          )}
        </SheetHeader>
        
        <div className="flex-1 p-6 md:p-8">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground animate-pulse">Loading ledger records...</div>
          ) : ledger?.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium text-foreground">No transactions found</p>
              <p className="text-sm">Orders and payments for this branch will appear here.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-muted ml-3 space-y-8 pb-8">
              {ledger?.map((entry) => (
                <div key={entry.id} className="relative pl-8">
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background shadow-sm ${
                    entry.transaction_type === 'order' ? 'bg-destructive' : 
                    entry.transaction_type === 'payment' ? 'bg-green-500' : 'bg-purple-500'
                  }`} />
                  
                  <div className="bg-background rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {entry.transaction_type === 'order' ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-bold uppercase tracking-wider text-[10px]">Order Billed</Badge>
                          ) : entry.transaction_type === 'payment' ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 font-bold uppercase tracking-wider text-[10px]">Payment Received</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-bold uppercase tracking-wider text-[10px]">Advance Received</Badge>
                          )}
                          {!editingEntryId || editingEntryId !== entry.id ? (
                            <span className="text-xs font-semibold text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          ) : null}
                          {entry.invoice_number && editingEntryId !== entry.id && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              INV: {entry.invoice_number}
                            </Badge>
                          )}
                        </div>
                        {editingEntryId === entry.id ? (
                          <div className="flex flex-col gap-2 mt-2 bg-muted/20 p-3 rounded-lg border">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Date</label>
                                <Input 
                                  type="date" 
                                  value={editDate} 
                                  onChange={(e) => setEditDate(e.target.value)} 
                                  className="h-8 text-xs bg-background"
                                />
                              </div>
                              {entry.transaction_type === 'order' && (
                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Invoice No.</label>
                                  <Input 
                                    value={editInvoice} 
                                    onChange={(e) => setEditInvoice(e.target.value)} 
                                    placeholder="Invoice #" 
                                    className="h-8 text-xs bg-background"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 justify-end mt-1">
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingEntryId(null)}>Cancel</Button>
                              <Button size="sm" className="h-7 text-xs" disabled={updateLedgerEntry.isPending} onClick={() => handleSaveEdit(entry)}>Save</Button>
                            </div>
                          </div>
                        ) : (
                          <h4 className="font-semibold text-base mt-2">{entry.notes || 'No description provided'}</h4>
                        )}
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                        <div className={`text-lg font-black ${entry.transaction_type === 'order' ? 'text-destructive' : 'text-green-600'}`}>
                          {entry.transaction_type === 'order' ? '-' : '+'}{formatCurrency(entry.amount)}
                        </div>
                        {editingEntryId !== entry.id && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 mt-1 opacity-50 hover:opacity-100" onClick={() => handleEditClick(entry)}>
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-3 mt-3 border-t flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Running Balance</span>
                      <span className={`font-bold ${entry.balance < 0 ? 'text-destructive' : entry.balance > 0 ? 'text-green-600' : ''}`}>
                        {formatCurrency(Math.abs(entry.balance))} {entry.balance < 0 ? 'Due' : entry.balance > 0 ? 'Adv' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
