import React from 'react';
import { useAttendanceRequests } from '../../hooks/queries/useWorkforce';
import { Card, CardContent } from '../ui/card';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Moon, 
  Sun, 
  Zap, 
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';

interface StaffRequestsHistoryProps {
  workerId: string;
}

export default function StaffRequestsHistory({ workerId }: StaffRequestsHistoryProps) {
  const { data: requests = [], isLoading } = useAttendanceRequests({ workerId });

  if (isLoading) {
    return (
      <div className="py-8 flex items-center justify-center text-xs text-neutral-400">
        Loading requests...
      </div>
    );
  }

  if (requests.length === 0) {
    return null; // Don't show clutter if no self-service requests were made yet
  }

  return (
    <div className="relative z-10 space-y-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tight">
            My Attendance <span className="text-orange-600">Requests</span>
          </h3>
          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.25em] mt-0.5">
            Self-submitted duty and night work requests
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/20">
          {requests.length} Submitted
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {requests.slice(0, 6).map((req: any) => {
          const isPending = req.status === 'pending';
          const isApproved = req.status === 'approved';
          const isRejected = req.status === 'rejected';

          const isNight = req.duty_type === 'night_duty';
          const isOvertime = req.duty_type === 'overtime';
          const isMorning = req.duty_type === 'morning_shift';

          const DutyIcon = isNight ? Moon : isOvertime ? Zap : Sun;
          const dutyLabel = isNight ? 'Night Duty' : isOvertime ? 'Overtime' : isMorning ? 'Morning Shift' : 'Regular Shift';

          return (
            <Card 
              key={req.id} 
              className={`border-none rounded-[1.8rem] backdrop-blur-xl border transition-all ${
                isPending
                  ? 'bg-amber-500/[0.04] border-amber-500/20'
                  : isApproved
                  ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                  : 'bg-red-500/[0.04] border-red-500/20'
              }`}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                      isNight ? 'bg-purple-600' : isOvertime ? 'bg-blue-600' : 'bg-orange-500'
                    }`}>
                      <DutyIcon size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight text-neutral-900 dark:text-white">
                        {dutyLabel}
                      </h4>
                      <p className="text-[9px] font-bold text-neutral-400 flex items-center gap-1">
                        <Calendar size={10} /> {req.date}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                        <Clock size={10} /> Pending Admin
                      </span>
                    )}
                    {isApproved && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 size={10} /> Approved
                      </span>
                    )}
                    {isRejected && (
                      <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                        <XCircle size={10} /> Rejected
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/5 dark:border-white/5 text-[11px]">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 block">Status / Hours</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">
                      {req.attendance_status === 'present' ? 'Full Day' : 'Half Day'} ({req.hours_worked} hrs)
                    </span>
                  </div>
                  {Number(req.overtime_hours) > 0 && (
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase tracking-wider text-purple-500 block">Night / OT Hours</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        +{req.overtime_hours} hrs credited
                      </span>
                    </div>
                  )}
                </div>

                {req.notes && (
                  <p className="text-[10px] text-neutral-500 italic bg-black/5 dark:bg-white/5 p-2 rounded-xl">
                    "{req.notes}"
                  </p>
                )}

                {isRejected && req.rejection_reason && (
                  <p className="text-[10px] text-red-500 font-semibold bg-red-500/10 p-2 rounded-xl flex items-center gap-1">
                    <AlertCircle size={12} /> Reason: {req.rejection_reason}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

