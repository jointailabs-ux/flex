import React, { useState, useEffect, useMemo } from 'react';
import { usePermanentStaff, useTempWorkers, useAttendance } from '../../hooks/queries/useWorkforce';
import { 
  useMarkBulkAttendance, 
  useDeletePermanentStaff, 
  useDeleteTempWorker,
  useAddLedgerEntry
} from '../../hooks/mutations/useWorkforce';
import { useAuth } from '../../contexts/AuthContext';

import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { 
  Users, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Ban, 
  Save, 
  Loader2,
  Filter,
  Trash2,
  Download,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";

export default function AttendancePage() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<'all' | 'permanent' | 'temporary'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Night Duty state
  const [isNightDutyOpen, setIsNightDutyOpen] = useState(false);
  const [nightDutyWorker, setNightDutyWorker] = useState<any>(null);
  const [nightDutyHours, setNightDutyHours] = useState<number>(2);

  const addLedgerEntryMutation = useAddLedgerEntry();

  const handleOpenNightDutyModal = (worker: any) => {
    setNightDutyWorker(worker);
    const existingHours = attendanceState[worker.id]?.overtime_hours || 0;
    setNightDutyHours(existingHours > 0 ? existingHours : 2); // Default to existing hours, or 2 if 0
    setIsNightDutyOpen(true);
  };

  const handleSaveNightDuty = () => {
    if (!nightDutyWorker) return;
    setAttendanceState(prev => ({
      ...prev,
      [nightDutyWorker.id]: {
        ...prev[nightDutyWorker.id],
        overtime_hours: nightDutyHours
      }
    }));
    setIsNightDutyOpen(false);
    toast.success(`Night duty of ${nightDutyHours} hours set locally. Remember to click "Save All" to confirm.`);
  };
  
  // Date shortcut helpers
  const setRelativeDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getDateString = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  // Report Modal States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportMode, setReportMode] = useState<'month' | 'custom'>('month');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportFromDate, setReportFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [reportToDate, setReportToDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'all' | 'permanent' | 'temporary'>('all');
  const [isExporting, setIsExporting] = useState(false);

  const { data: permanentStaff = [], isLoading: isLoadingPerm } = usePermanentStaff();
  const { data: tempWorkers = [], isLoading: isLoadingTemp } = useTempWorkers();
  const { data: attendanceData = [], isLoading: isLoadingAtt } = useAttendance({ date: selectedDate });
  
  const { mutate: markBulk, isPending } = useMarkBulkAttendance();
  const deletePermanentMutation = useDeletePermanentStaff();
  const deleteTempMutation = useDeleteTempWorker();

  const handleDeleteEmployee = async (id: string, type: 'permanent' | 'temporary', name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;
    try {
      if (type === 'permanent') {
        await deletePermanentMutation.mutateAsync(id);
      } else {
        await deleteTempMutation.mutateAsync(id);
      }
      toast.success(`${name} deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete');
    }
  };

  // Local state to track modifications before saving
  const [attendanceState, setAttendanceState] = useState<Record<string, { status: string, overtime_hours?: number }>>({});

  const isLoading = isLoadingPerm || isLoadingTemp || isLoadingAtt;

  // Combine staff into a unified list
  const allStaff = useMemo(() => {
    const perm = permanentStaff.map((s: any) => ({ ...s, worker_type: 'permanent' }));
    const temp = tempWorkers.map((s: any) => ({ ...s, worker_type: 'temporary' }));
    return [...perm, ...temp].sort((a, b) => a.name.localeCompare(b.name));
  }, [permanentStaff, tempWorkers]);

  const filteredStaff = useMemo(() => {
    let list = allStaff;
    if (filterType !== 'all') {
      list = list.filter(s => s.worker_type === filterType);
    }
    if (searchTerm.trim() !== '') {
      list = list.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  }, [allStaff, filterType, searchTerm]);

  const handleDownloadReport = async () => {
    setIsExporting(true);
    try {
      let start: string;
      let end: string;

      if (reportMode === 'month') {
        const firstDay = new Date(reportYear, reportMonth - 1, 1);
        const lastDay = new Date(reportYear, reportMonth, 0);
        start = firstDay.toISOString().split('T')[0];
        end = lastDay.toISOString().split('T')[0];
      } else {
        start = reportFromDate;
        end = reportToDate;
      }

      // Fetch attendance in range
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        const mockProfile = localStorage.getItem('mockProfile');
        if (mockProfile) headers['x-mock-profile'] = mockProfile;
      }

      const attResponse = await fetch(`/api/workforce/attendance?startDate=${start}&endDate=${end}`, { headers });
      if (!attResponse.ok) throw new Error('Failed to fetch attendance data');
      const attendanceList = await attResponse.json();

      // Filter employees based on reportType
      const filteredEmployees = allStaff.filter(emp => {
        if (reportType === 'all') return true;
        return emp.worker_type === reportType;
      });

      // Generate array of date strings between start and end
      const dateArray: string[] = [];
      let currentDate = new Date(start);
      const stopDate = new Date(end);
      while (currentDate <= stopDate) {
        dateArray.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const csvRows: string[] = [];

      // CSV Header Row
      const dateHeaders = dateArray.map(d => {
        const [y, m, day] = d.split('-');
        const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day}-${monthsShort[parseInt(m, 10) - 1]}`;
      });
      csvRows.push(`Employee Name,Classification,Base Rate (Rs),${dateHeaders.join(',')},Total Present,Total Half Day,Total Leave,Total Absent,Estimated Earnings (Temp Only)`);

      filteredEmployees.forEach(emp => {
        let presentCount = 0;
        let halfDayCount = 0;
        let leaveCount = 0;
        let absentCount = 0;

        const rowStatuses = dateArray.map(dateStr => {
          const record = attendanceList.find((att: any) => att.worker_id === emp.id && att.date === dateStr);
          if (!record) return '-';
          
          switch(record.status) {
            case 'present':
              presentCount++;
              return 'P';
            case 'half_day':
              halfDayCount++;
              return 'HD';
            case 'leave':
              leaveCount++;
              return 'L';
            case 'absent':
              absentCount++;
              return 'A';
            default:
              return '-';
          }
        });

        const rateLabel = emp.worker_type === 'permanent' 
          ? `${emp.basic_salary}/mo` 
          : `${emp.daily_rate}/day`;

        const estimatedEarnings = emp.worker_type === 'temporary'
          ? (presentCount * Number(emp.daily_rate || 0)) + (halfDayCount * Number(emp.daily_rate || 0) / 2)
          : '';

        csvRows.push(`"${emp.name.replace(/"/g, '""')}",${emp.worker_type.toUpperCase()},"${rateLabel}",${rowStatuses.join(',')},${presentCount},${halfDayCount},${leaveCount},${absentCount},${estimatedEarnings}`);
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
      const fileName = reportMode === 'month'
        ? `attendance_matrix_${reportYear}_${reportMonth}.csv`
        : `attendance_matrix_${start}_to_${end}.csv`;

      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Attendance report downloaded successfully');
      setIsReportModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to generate report: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Sync DB attendance with local state when date changes or data loads
  useEffect(() => {
    const newState: Record<string, any> = {};
    attendanceData.forEach((record: any) => {
      newState[record.worker_id] = { 
         status: record.status, 
         overtime_hours: record.overtime_hours 
      };
    });
    setAttendanceState(newState);
  }, [attendanceData, selectedDate]);

  const handleStatusChange = (workerId: string, status: string) => {
    setAttendanceState(prev => ({
      ...prev,
      [workerId]: { ...prev[workerId], status }
    }));
  };

  const handleSave = () => {
    // Collect all workers that have a status or night duty hours set
    const allWorkerIds = new Set([
      ...Object.keys(attendanceState),
      ...allStaff
        .filter(s => s.worker_type === 'temporary' && (attendanceState[s.id]?.overtime_hours || 0) > 0)
        .map(s => s.id)
    ]);

    const payload = Array.from(allWorkerIds)
      .map((workerId) => {
        const worker = allStaff.find(s => s.id === workerId);
        const data = attendanceState[workerId] || {};
        const hasNightDuty = worker?.worker_type === 'temporary' && (data.overtime_hours || 0) > 0;
        
        // Night Duty Only: temp worker has night duty hours but no day status selected
        // Auto-set to 'absent' so they get ONLY night duty allowance, no daily wage
        let status = data.status || null;
        if (!status && hasNightDuty) {
          status = 'absent';
        }

        return {
          worker_id: workerId,
          worker_type: worker?.worker_type || 'temporary',
          date: selectedDate,
          status,
          overtime_hours: data.overtime_hours || 0
        };
      })
      // Only include records that have an actual status set
      .filter(r => r.status && r.worker_type);

    if (payload.length === 0) {
      toast.info('Mark at least one employee before saving.');
      return;
    }

    // Notify user about night-duty-only workers
    const nightOnlyWorkers = payload.filter(r => {
      const data = attendanceState[r.worker_id] || {};
      return !data.status && r.overtime_hours > 0 && r.worker_type === 'temporary';
    });
    if (nightOnlyWorkers.length > 0) {
      const names = nightOnlyWorkers
        .map(r => allStaff.find(s => s.id === r.worker_id)?.name || 'Unknown')
        .join(', ');
      toast.info(`Night Duty Only: ${names} — no daily wage, only night duty allowance will be recorded.`);
    }

    console.log('Saving attendance payload:', payload);

    markBulk(payload, {
      onSuccess: (data) => {
        console.log('Attendance saved:', data);
        toast.success(`Attendance saved for ${payload.length} employee(s)`);
      },
      onError: (error: any) => {
        console.error('Attendance save error:', error);
        toast.error(`Failed to save: ${error.message}`);
      }
    });
  };

  const getStatusButtonClass = (workerId: string, status: string) => {
    const currentStatus = attendanceState[workerId]?.status;
    if (currentStatus !== status) return "bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10";
    
    switch(status) {
      case 'present': return "bg-emerald-500/20 border-emerald-500/50 text-emerald-500";
      case 'half_day': return "bg-amber-500/20 border-amber-500/50 text-amber-500";
      case 'leave': return "bg-blue-500/20 border-blue-500/50 text-blue-500";
      case 'absent': return "bg-red-500/20 border-red-500/50 text-red-500";
      default: return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <Loader2 className="animate-spin text-orange-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-neutral-900/40 p-6 rounded-3xl border border-white/5">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-white flex items-center gap-3 uppercase">
            <Users className="text-orange-600" size={28} strokeWidth={2.5} /> Daily Attendance <span className="text-orange-600 font-light">Roster</span>
          </h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">
            Seamless past and present attendance management & payroll automation
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           {/* Relative date shortcuts */}
           <div className="flex items-center gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-white/5">
             {[
               { label: 'Today', days: 0 },
               { label: 'Yesterday', days: 1 },
               { label: '2 Days Ago', days: 2 },
               { label: '3 Days Ago', days: 3 }
             ].map(opt => (
               <button
                 key={opt.label}
                 type="button"
                 onClick={() => setRelativeDate(opt.days)}
                 className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                   selectedDate === getDateString(opt.days)
                     ? 'bg-orange-600 text-white shadow-md'
                     : 'text-neutral-400 hover:text-white hover:bg-white/5'
                 }`}
               >
                 {opt.label}
               </button>
             ))}
           </div>

           <div className="relative custom-date-picker w-44">
             <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500 z-0" size={16} />
             <Input
               type="date"
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="pl-10 h-11 bg-neutral-950 border-white/10 text-white w-44 rounded-xl font-bold text-xs cursor-pointer"
             />
           </div>

           <Button 
             onClick={() => setIsReportModalOpen(true)}
             variant="outline"
             className="h-11 rounded-xl border-white/10 hover:bg-neutral-800 font-black text-[10px] uppercase tracking-widest text-neutral-300 bg-transparent"
           >
             <Download className="mr-2" size={16} strokeWidth={2.5} />
             Export Report
           </Button>

           <Button 
             onClick={handleSave} 
             disabled={isPending} 
             className="h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-widest px-6"
           >
              {isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} strokeWidth={2.5} />}
              Save All
           </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
         <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => setFilterType('all')}
              className={filterType === 'all' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-neutral-400 hover:bg-white/5'}
            >
              All Staff
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setFilterType('permanent')}
              className={filterType === 'permanent' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-neutral-400 hover:bg-white/5'}
            >
              Permanent
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setFilterType('temporary')}
              className={filterType === 'temporary' ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-neutral-400 hover:bg-white/5'}
            >
              Temporary
            </Button>
         </div>

         <div className="flex items-center gap-2 bg-neutral-800 border border-white/10 rounded-xl px-3 py-2 w-full sm:w-72">
            <Search size={15} className="text-neutral-400 shrink-0" />
            <input 
              type="text"
              placeholder="Search employee name..." 
              className="bg-transparent text-sm font-medium text-white placeholder:text-neutral-500 outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-neutral-500 hover:text-white text-xs font-bold ml-1">✕</button>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStaff.map((staff) => (
          <Card key={staff.id} className="bg-neutral-900/50 border-white/10 overflow-hidden relative">
            {staff.worker_type === 'temporary' && (
               <div className="absolute top-0 right-0 bg-orange-600/20 text-orange-500 text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg">
                  Daily Wage Worker
               </div>
            )}
            <CardContent className="p-4 pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white truncate">{staff.name}</h3>
                <p className="text-xs text-neutral-400 uppercase tracking-widest">{staff.role || staff.designation || 'Staff'}</p>
                {staff.worker_type === 'temporary' && staff.daily_rate && (
                  <p className="text-xs text-emerald-500 font-bold mt-1">₹{staff.daily_rate}/day</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline"
                  onClick={() => handleStatusChange(staff.id, 'present')}
                  className={`h-10 border transition-all ${getStatusButtonClass(staff.id, 'present')}`}
                >
                  <CheckCircle2 size={16} className="mr-1.5" /> Present
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleStatusChange(staff.id, 'half_day')}
                  className={`h-10 border transition-all ${getStatusButtonClass(staff.id, 'half_day')}`}
                >
                  <Clock size={16} className="mr-1.5" /> Half Day
                </Button>
                {staff.worker_type !== 'temporary' ? (
                  <Button 
                    variant="outline"
                    onClick={() => handleStatusChange(staff.id, 'leave')}
                    className={`h-10 border transition-all ${getStatusButtonClass(staff.id, 'leave')}`}
                  >
                    <CalendarIcon size={16} className="mr-1.5" /> Leave
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => handleOpenNightDutyModal(staff)}
                    className={`h-10 border ${
                      attendanceState[staff.id]?.overtime_hours 
                        ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' 
                        : 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10'
                    } transition-all`}
                  >
                    <Clock size={16} className="mr-1.5 text-indigo-400" /> Night Duty {attendanceState[staff.id]?.overtime_hours ? `(${attendanceState[staff.id]?.overtime_hours}h)` : ''}
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => handleStatusChange(staff.id, 'absent')}
                  className={`h-10 border transition-all ${getStatusButtonClass(staff.id, 'absent')}`}
                >
                  <Ban size={16} className="mr-1.5" /> Absent
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleDeleteEmployee(staff.id, staff.worker_type, staff.name)}
                  className="h-10 border border-white/10 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 size={16} className="mr-1.5" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredStaff.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center bg-neutral-900/30 rounded-xl border border-white/5 border-dashed">
           <Filter size={48} className="text-neutral-600 mb-4" />
           <p className="text-neutral-400 text-sm">No staff members found matching the selected filter.</p>
        </div>
      )}

      {/* Night Duty Modal */}
      <Dialog open={isNightDutyOpen} onOpenChange={setIsNightDutyOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-md bg-neutral-950 border border-white/10 text-white p-0 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white">
             <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Night Duty Allowance</DialogTitle>
                <DialogDescription className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                   Add night shift allowance for {nightDutyWorker?.name}
                </DialogDescription>
             </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6">
             <div className="space-y-4 rounded-2xl bg-white/5 p-4 border border-white/5">
                <div className="flex justify-between items-center text-xs">
                   <span className="text-neutral-400">Daily Wage Rate:</span>
                   <span className="font-bold text-white">₹{nightDutyWorker?.daily_rate || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                   <span className="text-neutral-400">Hourly Wage (Daily / 8):</span>
                   <span className="font-bold text-white">₹{(Number(nightDutyWorker?.daily_rate || 0) / 8).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-white/10 pt-3">
                   <span className="text-neutral-400">Date:</span>
                   <span className="font-bold text-orange-400">{selectedDate}</span>
                </div>
             </div>

             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Night Duty Duration</Label>
                <select 
                  className="w-full h-12 rounded-xl bg-neutral-900 border border-white/10 text-white px-4 text-xs font-bold outline-none cursor-pointer"
                  value={nightDutyHours}
                  onChange={(e) => setNightDutyHours(Number(e.target.value))}
                >
                  {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map(h => (
                    <option key={h} value={h} className="bg-neutral-900 text-white">{h === 0 ? 'No Night Duty' : `${h} Hour${h > 1 ? 's' : ''}`}</option>
                  ))}
                </select>
             </div>

             <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1">Calculated Allowance</span>
                     <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{nightDutyHours} hrs × ₹{(Number(nightDutyWorker?.daily_rate || 0) / 8).toFixed(2)}</span>
                  </div>
                  <span className="text-3xl font-black text-emerald-400 tabular-nums tracking-tighter">
                    ₹{((Number(nightDutyWorker?.daily_rate || 0) / 8) * nightDutyHours).toFixed(2)}
                  </span>
                </div>
             </div>

             <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-3">
               <Button 
                 type="button" 
                 variant="ghost" 
                 className="h-11 rounded-xl font-black text-[10px] uppercase tracking-widest text-neutral-400 flex-1 hover:bg-white/5 hover:text-white"
                 onClick={() => setIsNightDutyOpen(false)}
               >
                 Cancel
               </Button>
               <Button 
                 onClick={handleSaveNightDuty}
                 className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex-1 shadow-lg shadow-indigo-600/20"
               >
                 Save Allowance
               </Button>
             </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attendance Report Modal */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="rounded-[3rem] sm:max-w-md bg-neutral-950 border border-white/10 text-white p-0 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-br from-orange-600 to-amber-600 p-8 text-white">
             <DialogHeader>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                   <Download size={24} strokeWidth={2.5} />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Attendance Reports</DialogTitle>
                <DialogDescription className="text-orange-50 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
                   High-fidelity payroll & roster matrices
                </DialogDescription>
             </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
               <button 
                 type="button"
                 onClick={() => setReportMode('month')}
                 className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${reportMode === 'month' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
               >
                 Selected Month
               </button>
               <button 
                 type="button"
                 onClick={() => setReportMode('custom')}
                 className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${reportMode === 'custom' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
               >
                 Custom Date Range
               </button>
            </div>

            {reportMode === 'month' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Month</Label>
                  <select 
                    className="w-full h-11 rounded-xl bg-neutral-900 border border-white/10 text-white px-4 text-xs font-bold outline-none cursor-pointer"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(Number(e.target.value))}
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                      <option key={m} value={i + 1} className="bg-neutral-900">{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Year</Label>
                  <select 
                    className="w-full h-11 rounded-xl bg-neutral-900 border border-white/10 text-white px-4 text-xs font-bold outline-none cursor-pointer"
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y} className="bg-neutral-900">{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">From Date</Label>
                  <Input 
                    type="date"
                    className="h-11 rounded-xl bg-neutral-900 border-white/10 text-white text-xs"
                    value={reportFromDate}
                    onChange={(e) => setReportFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">To Date</Label>
                  <Input 
                    type="date"
                    className="h-11 rounded-xl bg-neutral-900 border-white/10 text-white text-xs"
                    value={reportToDate}
                    onChange={(e) => setReportToDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Staff Classification</Label>
              <select 
                className="w-full h-11 rounded-xl bg-neutral-900 border border-white/10 text-white px-4 text-xs font-bold outline-none cursor-pointer"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
              >
                <option value="all" className="bg-neutral-900">All Workforce Staff</option>
                <option value="permanent" className="bg-neutral-900">Permanent Employees Only</option>
                <option value="temporary" className="bg-neutral-900">Temporary Daily Wage Only</option>
              </select>
            </div>

            <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                className="h-11 rounded-xl font-black text-[10px] uppercase tracking-widest text-neutral-400 flex-1 hover:bg-white/5 hover:text-white"
                onClick={() => setIsReportModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDownloadReport}
                disabled={isExporting} 
                className="h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-[10px] uppercase tracking-widest flex-1 shadow-lg shadow-orange-600/20"
              >
                {isExporting ? <Loader2 className="animate-spin mr-2" size={14} /> : <Download className="mr-2" size={14} />}
                {isExporting ? 'Generating...' : 'Download Roster'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
