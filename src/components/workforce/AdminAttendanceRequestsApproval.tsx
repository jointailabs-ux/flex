import React, { useState, useMemo } from 'react';
import { 
  useAttendanceRequests 
} from '../../hooks/queries/useWorkforce';
import { 
  useApproveAttendanceRequest, 
  useRejectAttendanceRequest,
  useEditAttendanceRequest
} from '../../hooks/mutations/useWorkforce';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Moon, 
  Sun, 
  Zap, 
  Calendar,
  AlertCircle,
  Search,
  Check,
  X,
  Loader2,
  Users,
  ShieldCheck,
  ChevronDown,
  Edit3,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';

export default function AdminAttendanceRequestsApproval() {
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestToReject, setSelectedRequestToReject] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRequestToEdit, setSelectedRequestToEdit] = useState<any>(null);
  const [editDutyType, setEditDutyType] = useState<string>('regular');
  const [editAttendanceStatus, setEditAttendanceStatus] = useState<string>('present');
  const [editHoursWorked, setEditHoursWorked] = useState<number>(8);
  const [editOvertimeHours, setEditOvertimeHours] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'pending' | 'approved' | 'rejected'>('approved');
  const [editRejectionReason, setEditRejectionReason] = useState<string>('');

  const { data: requests = [], isLoading } = useAttendanceRequests();
  const approveMutation = useApproveAttendanceRequest();
  const rejectMutation = useRejectAttendanceRequest();
  const editMutation = useEditAttendanceRequest();

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (filterStatus !== 'all') {
      list = list.filter((r: any) => r.status === filterStatus);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter((r: any) => 
        (r.worker_name && r.worker_name.toLowerCase().includes(term)) ||
        (r.notes && r.notes.toLowerCase().includes(term)) ||
        (r.duty_type && r.duty_type.toLowerCase().includes(term))
      );
    }
    return list;
  }, [requests, filterStatus, searchTerm]);

  const pendingCount = useMemo(() => {
    return requests.filter((r: any) => r.status === 'pending').length;
  }, [requests]);

  const handleApprove = async (reqItem: any) => {
    try {
      await approveMutation.mutateAsync(reqItem.id);
      toast.success(
        `Approved ${reqItem.worker_name}'s attendance for ${reqItem.date}! Recorded in official attendance and wage ledger.`
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve attendance request');
    }
  };

  const handleOpenReject = (reqItem: any) => {
    setSelectedRequestToReject(reqItem);
    setRejectionReason(reqItem.rejection_reason || '');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRequestToReject) return;
    try {
      await rejectMutation.mutateAsync({
        id: selectedRequestToReject.id,
        rejection_reason: rejectionReason.trim() || 'Request rejected by System Admin'
      });
      toast.success(
        selectedRequestToReject.status === 'approved'
          ? `Revoked & rejected attendance for ${selectedRequestToReject.worker_name}. Attendance & wage records removed.`
          : `Request for ${selectedRequestToReject.worker_name} has been rejected`
      );
      setRejectModalOpen(false);
      setSelectedRequestToReject(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request');
    }
  };

  const handleOpenEdit = (reqItem: any) => {
    setSelectedRequestToEdit(reqItem);
    setEditDutyType(reqItem.duty_type || 'regular');
    setEditAttendanceStatus(reqItem.attendance_status || 'present');
    setEditHoursWorked(Number(reqItem.hours_worked || 8));
    setEditOvertimeHours(Number(reqItem.overtime_hours || 0));
    setEditNotes(reqItem.notes || '');
    setEditStatus(reqItem.status || 'approved');
    setEditRejectionReason(reqItem.rejection_reason || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRequestToEdit) return;
    try {
      await editMutation.mutateAsync({
        id: selectedRequestToEdit.id,
        duty_type: editDutyType,
        attendance_status: editAttendanceStatus,
        hours_worked: Number(editHoursWorked),
        overtime_hours: Number(editOvertimeHours),
        notes: editNotes.trim(),
        status: editStatus,
        rejection_reason: editStatus === 'rejected' ? (editRejectionReason.trim() || 'Rejected by Admin') : null
      });
      toast.success(`Updated attendance request for ${selectedRequestToEdit.worker_name}`);
      setEditModalOpen(false);
      setSelectedRequestToEdit(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save changes');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-[2.5rem] bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-purple-500/10 border border-orange-500/20 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
            <Clock size={28} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white uppercase italic">
                Staff Attendance <span className="text-orange-600">Approval Queue</span>
              </h2>
              {pendingCount > 0 ? (
                <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse shadow-md">
                  {pendingCount} Pending
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  All Clear
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 font-medium mt-1">
              Review and approve self-submitted attendance, night duty, and duty hours from temporary & permanent staff.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-black/5 dark:border-white/5">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {status === 'pending' ? `Pending (${pendingCount})` : status}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
        <Input
          type="text"
          placeholder="Filter requests by employee name, shift type, or notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11 h-11 rounded-2xl bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-xs"
        />
      </div>

      {/* Request Cards Grid */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
          <Loader2 size={32} className="animate-spin text-orange-500" />
          <p className="text-xs font-black uppercase tracking-widest">Loading attendance requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 bg-neutral-50/50 dark:bg-white/[0.02] rounded-[2.5rem] border border-dashed border-neutral-200 dark:border-neutral-800 text-center">
          <CheckCircle2 size={44} className="text-emerald-500 opacity-60" />
          <h4 className="text-base font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-tight">
            {filterStatus === 'pending' ? 'No Pending Requests' : 'No Attendance Requests Found'}
          </h4>
          <p className="text-xs text-neutral-400 max-w-sm">
            {filterStatus === 'pending'
              ? 'All staff self-service attendance submissions have been processed!'
              : 'Try changing your filter or search criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredRequests.map((reqItem: any) => {
            const isPending = reqItem.status === 'pending';
            const isApproved = reqItem.status === 'approved';
            const isRejected = reqItem.status === 'rejected';

            const isNight = reqItem.duty_type === 'night_duty';
            const isOvertime = reqItem.duty_type === 'overtime';
            const isMorning = reqItem.duty_type === 'morning_shift';

            const DutyIcon = isNight ? Moon : isOvertime ? Zap : Sun;
            const dutyColor = isNight ? 'text-purple-500 bg-purple-500/10 border-purple-500/20' : isOvertime ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' : 'text-orange-500 bg-orange-500/10 border-orange-500/20';

            return (
              <Card
                key={reqItem.id}
                className={`border-none rounded-[2rem] backdrop-blur-xl border transition-all overflow-hidden ${
                  isPending
                    ? 'bg-white dark:bg-neutral-900/90 border-amber-500/30 shadow-lg shadow-amber-500/5'
                    : isApproved
                    ? 'bg-neutral-50/80 dark:bg-neutral-900/40 border-emerald-500/20'
                    : 'bg-neutral-50/80 dark:bg-neutral-900/40 border-red-500/20'
                }`}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Top Bar: Worker info & status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-950 text-white flex items-center justify-center font-black text-base shadow-md">
                        {reqItem.worker_name?.[0] || 'W'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                            {reqItem.worker_name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                            {reqItem.worker_type === 'temporary' ? 'Temp' : 'Permanent'}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-neutral-400 mt-0.5">
                          {reqItem.worker_subtitle || (reqItem.worker_type === 'temporary' ? 'Daily Wage Worker' : 'Staff')}
                          {reqItem.daily_rate > 0 && ` • Base: Rs ${reqItem.daily_rate}/day`}
                        </p>
                      </div>
                    </div>

                    {/* Duty Badge */}
                    <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${dutyColor}`}>
                      <DutyIcon size={13} />
                      <span>{reqItem.duty_type.replace('_', ' ')}</span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-center">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 block">Date of Duty</span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {new Date(reqItem.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 block">Attendance</span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 capitalize">
                        {reqItem.attendance_status === 'present' ? 'Full Day' : 'Half Day'} ({reqItem.hours_worked}h)
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-purple-500 block">Night / OT</span>
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        {Number(reqItem.overtime_hours) > 0 ? `${reqItem.overtime_hours} hrs` : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Staff Notes */}
                  {reqItem.notes && (
                    <div className="text-[11px] text-neutral-600 dark:text-neutral-300 italic bg-black/5 dark:bg-white/5 p-2.5 rounded-xl">
                      <span className="font-bold text-neutral-400 not-italic mr-1">Staff Note:</span>
                      "{reqItem.notes}"
                    </div>
                  )}

                  {/* If Rejected */}
                  {isRejected && reqItem.rejection_reason && (
                    <div className="text-[11px] text-red-500 font-semibold bg-red-500/10 p-2.5 rounded-xl flex items-center gap-1.5">
                      <AlertCircle size={14} /> Rejection Reason: {reqItem.rejection_reason}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 dark:border-white/5">
                    <span className="text-[9px] font-bold text-neutral-400 flex items-center gap-1">
                      <Calendar size={11} /> Submitted {new Date(reqItem.created_at).toLocaleDateString()}
                    </span>

                    {isPending && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(reqItem)}
                          disabled={approveMutation.isPending || rejectMutation.isPending || editMutation.isPending}
                          className="h-9 px-3 rounded-xl border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold cursor-pointer"
                        >
                          <Edit3 size={13} className="mr-1" /> Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReject(reqItem)}
                          disabled={rejectMutation.isPending || approveMutation.isPending}
                          className="h-9 px-3 rounded-xl border-red-500/30 text-red-600 hover:bg-red-500/10 text-xs font-bold cursor-pointer"
                        >
                          <X size={14} className="mr-1" /> Reject
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleApprove(reqItem)}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                          className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 cursor-pointer"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin mr-1" />
                          ) : (
                            <Check size={14} className="mr-1" />
                          )}
                          Approve & Credit
                        </Button>
                      </div>
                    )}

                    {isApproved && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(reqItem)}
                          disabled={editMutation.isPending || rejectMutation.isPending}
                          className="h-8 px-2.5 rounded-xl border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-bold cursor-pointer"
                        >
                          <Edit3 size={12} className="mr-1 text-orange-500" /> Edit Details
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenReject(reqItem)}
                          disabled={rejectMutation.isPending || editMutation.isPending}
                          className="h-8 px-2.5 rounded-xl border-red-500/30 text-red-600 hover:bg-red-500/10 text-[11px] font-bold cursor-pointer"
                        >
                          <X size={12} className="mr-1" /> Reject Afterwards
                        </Button>

                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={11} /> Approved
                        </span>
                      </div>
                    )}

                    {isRejected && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(reqItem)}
                          disabled={editMutation.isPending || approveMutation.isPending}
                          className="h-8 px-2.5 rounded-xl border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-[11px] font-bold cursor-pointer"
                        >
                          <Edit3 size={12} className="mr-1 text-orange-500" /> Edit Details
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleApprove(reqItem)}
                          disabled={approveMutation.isPending || editMutation.isPending}
                          className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider shadow-sm cursor-pointer"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 size={12} className="animate-spin mr-1" />
                          ) : (
                            <RotateCcw size={12} className="mr-1" />
                          )}
                          Re-Approve & Credit
                        </Button>

                        <span className="px-2.5 py-1 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <XCircle size={11} /> Rejected
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Request Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
              <SlidersHorizontal size={20} className="text-orange-500" />
              Modify Shift Record
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 font-medium">
              Adjust work hours, duty category, attendance credit, and remarks. All changes immediately sync with staff profile and wages.
            </DialogDescription>
          </DialogHeader>

          {selectedRequestToEdit && (
            <div className="space-y-4 py-3">
              {/* Worker & Date Banner */}
              <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-black/5 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                    {selectedRequestToEdit.worker_name}
                  </h4>
                  <p className="text-[10px] font-bold text-neutral-400">
                    {selectedRequestToEdit.worker_type === 'temporary' ? 'Daily Wage Worker' : 'Permanent Staff'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 block">Duty Date</span>
                  <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                    {selectedRequestToEdit.date}
                  </span>
                </div>
              </div>

              {/* Duty Type Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Duty Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'regular', label: 'Regular Day Shift', icon: Sun },
                    { id: 'morning_shift', label: 'Morning Shift', icon: Sun },
                    { id: 'night_duty', label: 'Night Duty', icon: Moon },
                    { id: 'overtime', label: 'Overtime Work', icon: Zap }
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = editDutyType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setEditDutyType(t.id);
                          if (t.id === 'night_duty' && editOvertimeHours === 0) {
                            setEditOvertimeHours(8);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
                            : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-orange-500/40'
                        }`}
                      >
                        <Icon size={14} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Attendance Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Attendance Credit
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'present', label: 'Full Day (8h)', defaultHours: 8 },
                    { id: 'half_day', label: 'Half Day (4h)', defaultHours: 4 },
                    { id: 'absent', label: 'Absent', defaultHours: 0 }
                  ].map((s) => {
                    const isSelected = editAttendanceStatus === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setEditAttendanceStatus(s.id);
                          setEditHoursWorked(s.defaultHours);
                        }}
                        className={`p-2 rounded-xl border text-[11px] font-bold text-center cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent shadow-md'
                            : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duty Hours & Overtime Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                    Regular Hours Worked
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={editHoursWorked}
                    onChange={(e) => setEditHoursWorked(Number(e.target.value))}
                    className="h-10 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                    Night / OT Hours
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={editOvertimeHours}
                    onChange={(e) => setEditOvertimeHours(Number(e.target.value))}
                    className="h-10 rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 font-bold"
                  />
                </div>
              </div>

              {/* Status Decision Toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Decision Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('approved')}
                    className={`py-2 px-1 rounded-xl border text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                      editStatus === 'approved'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-emerald-600'
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('pending')}
                    className={`py-2 px-1 rounded-xl border text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                      editStatus === 'pending'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                        : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-amber-600'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus('rejected')}
                    className={`py-2 px-1 rounded-xl border text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                      editStatus === 'rejected'
                        ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20'
                        : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-red-600'
                    }`}
                  >
                    Rejected
                  </button>
                </div>
              </div>

              {/* If Rejected, Rejection Reason */}
              {editStatus === 'rejected' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-[10px] font-black uppercase tracking-wider text-red-500">
                    Rejection Reason
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Incorrect hours or not approved by supervisor"
                    value={editRejectionReason}
                    onChange={(e) => setEditRejectionReason(e.target.value)}
                    className="h-10 rounded-xl text-xs bg-red-50/50 dark:bg-red-950/20 border-red-500/30"
                  />
                </div>
              )}

              {/* Remarks / Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                  Remarks / Notes
                </label>
                <Textarea
                  placeholder="Add notes about shift adjustments, job packaging details, etc."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="min-h-[70px] rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              className="h-10 rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={editMutation.isPending}
              className="h-10 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-orange-600/20 cursor-pointer"
            >
              {editMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              Save & Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-sm rounded-[2rem] bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-tight">
              {selectedRequestToReject?.status === 'approved' ? 'Revoke & Reject Attendance' : 'Reject Attendance Request'}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {selectedRequestToReject?.status === 'approved'
                ? 'This attendance was previously approved. Confirming rejection will revoke this attendance day, remove wage credits from the ledger, and update the staff profile.'
                : 'Provide an optional reason why this attendance request is being rejected. The staff member will see this note on their profile.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <Textarea
              placeholder="e.g., Attendance cancelled, supervisor did not verify hours, or duplicate submission"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[80px] rounded-xl text-xs bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              className="h-10 rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending}
              className="h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              {rejectMutation.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

