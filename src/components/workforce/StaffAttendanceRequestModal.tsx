import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Moon, 
  Sun, 
  Zap, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useSubmitAttendanceRequest } from '../../hooks/mutations/useWorkforce';

interface StaffAttendanceRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: string;
  workerType: 'temporary' | 'permanent';
  workerName: string;
  dailyRate?: number;
}

export default function StaffAttendanceRequestModal({
  open,
  onOpenChange,
  workerId,
  workerType,
  workerName,
  dailyRate = 0
}: StaffAttendanceRequestModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dutyType, setDutyType] = useState<'regular' | 'night_duty' | 'morning_shift' | 'overtime'>('regular');
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'half_day'>('present');
  const [hoursWorked, setHoursWorked] = useState<number>(8);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const submitMutation = useSubmitAttendanceRequest();

  // Preset hours helper
  const handleDutyTypeChange = (type: 'regular' | 'night_duty' | 'morning_shift' | 'overtime') => {
    setDutyType(type);
    if (type === 'night_duty') {
      if (overtimeHours === 0) setOvertimeHours(4); // default 4 hrs night duty
      if (hoursWorked < 8) setHoursWorked(8);
    } else if (type === 'morning_shift') {
      setHoursWorked(8);
      setOvertimeHours(0);
    } else if (type === 'overtime') {
      setHoursWorked(8);
      if (overtimeHours === 0) setOvertimeHours(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) {
      toast.error('Worker profile not detected. Please relogin.');
      return;
    }

    try {
      await submitMutation.mutateAsync({
        worker_id: workerId,
        worker_type: workerType,
        date,
        duty_type: dutyType,
        attendance_status: attendanceStatus,
        hours_worked: Number(hoursWorked) || 8,
        overtime_hours: dutyType === 'night_duty' || dutyType === 'overtime' ? Number(overtimeHours) || 0 : 0,
        notes: notes.trim() || null
      });

      toast.success('Attendance request submitted to System Admin for approval!');
      onOpenChange(false);
      // Reset form
      setNotes('');
      setOvertimeHours(0);
      setHoursWorked(8);
      setDutyType('regular');
      setAttendanceStatus('present');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit attendance request');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full p-6 sm:p-8 rounded-[2rem] border border-black/10 dark:border-white/10 shadow-2xl bg-white dark:bg-neutral-900">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl brand-gradient flex items-center justify-center text-white shadow-md">
              <Clock size={18} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600 dark:text-orange-400">
              Self-Attendance Portal
            </span>
          </div>
          <DialogTitle className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Log Work & Attendance
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500 font-medium">
            Submit your duty hours or night shift. Once submitted, System Admin will verify and credit your attendance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Worker Info Card */}
          <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Employee Profile</p>
              <h4 className="text-sm font-black text-neutral-800 dark:text-neutral-100">{workerName}</h4>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                {workerType === 'temporary' ? 'Temporary Staff' : 'Permanent Staff'}
              </span>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5">
              <CalendarIcon size={14} className="text-orange-500" /> Date of Attendance
            </Label>
            <Input 
              type="date"
              value={date}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 font-semibold"
              required
            />
          </div>

          {/* Duty / Shift Type Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              Shift / Duty Type
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDutyTypeChange('regular')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  dutyType === 'regular'
                    ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Sun size={16} className="text-amber-500" />
                <span>Regular Shift</span>
              </button>

              <button
                type="button"
                onClick={() => handleDutyTypeChange('night_duty')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  dutyType === 'night_duty'
                    ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Moon size={16} className="text-purple-500" />
                <span>Night Duty</span>
              </button>

              <button
                type="button"
                onClick={() => handleDutyTypeChange('morning_shift')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  dutyType === 'morning_shift'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Sun size={16} className="text-blue-500" />
                <span>Morning Shift</span>
              </button>

              <button
                type="button"
                onClick={() => handleDutyTypeChange('overtime')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  dutyType === 'overtime'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800/40 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Zap size={16} className="text-emerald-500" />
                <span>Overtime Shift</span>
              </button>
            </div>
          </div>

          {/* Attendance Status (Present vs Half Day) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              Attendance Status
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAttendanceStatus('present');
                  if (hoursWorked < 8) setHoursWorked(8);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  attendanceStatus === 'present'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
                }`}
              >
                <CheckCircle2 size={14} /> Full Day Present
              </button>

              <button
                type="button"
                onClick={() => {
                  setAttendanceStatus('half_day');
                  setHoursWorked(4);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  attendanceStatus === 'half_day'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/40'
                }`}
              >
                <Clock size={14} /> Half Day (4 Hrs)
              </button>
            </div>
          </div>

          {/* Hours Worked & Night Duty Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                Hours Worked
              </Label>
              <Input
                type="number"
                min="1"
                max="24"
                step="0.5"
                value={hoursWorked}
                onChange={(e) => setHoursWorked(Number(e.target.value))}
                className="h-11 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 font-bold"
                required
              />
            </div>

            {(dutyType === 'night_duty' || dutyType === 'overtime') && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  {dutyType === 'night_duty' ? 'Night Duty Hours' : 'Overtime Hours'}
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="16"
                  step="0.5"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(Number(e.target.value))}
                  className="h-11 rounded-xl bg-purple-500/5 border-purple-500/30 text-purple-600 dark:text-purple-300 font-bold"
                  required
                />
              </div>
            )}
          </div>

          {/* Notes / Reason */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
              Work Description / Notes (Optional)
            </Label>
            <Textarea
              placeholder="e.g. Worked night shift unloading inventory truck, or morning batch processing"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[70px] rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="h-11 rounded-xl brand-gradient text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" /> Submitting...
                </>
              ) : (
                'Submit For Admin Approval'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

