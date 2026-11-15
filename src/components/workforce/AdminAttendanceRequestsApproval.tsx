import React, { useState, useMemo } from 'react';
import { 
  useAttendanceRequests 
} from '../../hooks/queries/useWorkforce';
import { 
  useApproveAttendanceRequest, 
  useRejectAttendanceRequest 
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
  ChevronDown
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

  const { data: requests = [], isLoading } = useAttendanceRequests();
  const approveMutation = useApproveAttendanceRequest();
  const rejectMutation = useRejectAttendanceRequest();

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
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedRequestToReject) return;
    try {
      await rejectMutation.mutateAsync({
        id: selectedRequestToReject.id,
        rejection_reason: rejectionReason.trim() || 'Request rejected by System Admin'
      });
      toast.success(`Request for ${selectedRequestToReject.worker_name} has been rejected`);
      setRejectModalOpen(false);
      setSelectedRequestToReject(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request');
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
                  <div className="pt-2 flex items-center justify-between border-t border-black/5 dark:border-white/5">
                    <span className="text-[9px] font-bold text-neutral-400 flex items-center gap-1">
                      <Calendar size={11} /> Submitted {new Date(reqItem.created_at).toLocaleDateString()}
                    </span>

                    {isPending ? (
                      <div className="flex items-center gap-2">
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
                    ) : (
                      <div className="flex items-center gap-2">
                        {isApproved ? (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={12} /> Approved & Added to Attendance
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <XCircle size={12} /> Rejected
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-sm rounded-[2rem] bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-tight">
              Reject Attendance Request
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Provide an optional reason why this attendance request is being rejected. The staff member will see this note.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <Textarea
              placeholder="e.g., Attendance already recorded by floor supervisor, or incorrect hours"
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
              className="h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider"
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

