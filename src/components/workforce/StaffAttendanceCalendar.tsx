import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Moon, 
  Sun, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  IndianRupee,
  Info
} from 'lucide-react';
import { 
  useAttendance, 
  useAttendanceRequests, 
  useWorkerLedger 
} from '../../hooks/queries/useWorkforce';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

interface StaffAttendanceCalendarProps {
  workerId: string;
  workerType: 'temporary' | 'permanent';
  workerName?: string;
  dailyRate?: number;
  initialMonth?: number;
  initialYear?: number;
  onMonthYearChange?: (month: number, year: number) => void;
}

const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function StaffAttendanceCalendar({
  workerId,
  workerType,
  workerName,
  dailyRate = 0,
  initialMonth,
  initialYear,
  onMonthYearChange
}: StaffAttendanceCalendarProps) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(initialMonth || (now.getMonth() + 1));
  const [currentYear, setCurrentYear] = useState(initialYear || now.getFullYear());
  const [selectedDayDetail, setSelectedDayDetail] = useState<any | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    let newM = currentMonth - 1;
    let newY = currentYear;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setCurrentMonth(newM);
    setCurrentYear(newY);
    if (onMonthYearChange) onMonthYearChange(newM, newY);
    setSelectedDayDetail(null);
  };

  const handleNextMonth = () => {
    let newM = currentMonth + 1;
    let newY = currentYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setCurrentMonth(newM);
    setCurrentYear(newY);
    if (onMonthYearChange) onMonthYearChange(newM, newY);
    setSelectedDayDetail(null);
  };

  const handleToday = () => {
    const todayM = now.getMonth() + 1;
    const todayY = now.getFullYear();
    setCurrentMonth(todayM);
    setCurrentYear(todayY);
    if (onMonthYearChange) onMonthYearChange(todayM, todayY);
    setSelectedDayDetail(null);
  };

  // Date range for API
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  // Queries
  const { data: attendanceData = [], isLoading: isLoadingAtt } = useAttendance({
    workerId,
    workerType,
    startDate,
    endDate
  });

  const { data: requestData = [] } = useAttendanceRequests({
    workerId
  });

  const { data: ledgerEntries = [] } = useWorkerLedger({
    workerId,
    workerType
  });

  // Map attendance by date string 'YYYY-MM-DD'
  const attendanceMap = useMemo(() => {
    const map = new Map<string, any>();
    attendanceData.forEach((item: any) => {
      map.set(item.date, item);
    });
    return map;
  }, [attendanceData]);

  // Map requests by date string
  const requestsMap = useMemo(() => {
    const map = new Map<string, any>();
    requestData.forEach((req: any) => {
      // If multiple, keep the latest or pending
      const existing = map.get(req.date);
      if (!existing || req.status === 'pending') {
        map.set(req.date, req);
      }
    });
    return map;
  }, [requestData]);

  // Compute calendar days
  const { calendarGrid, counts } = useMemo(() => {
    const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sun
    const grid: Array<{
      dayNumber: number | null;
      dateStr: string | null;
      status: 'present' | 'half_day' | 'absent' | 'leave' | 'blank';
      overtimeHours: number;
      notes: string | null;
      hasYellowStripe: boolean;
      pendingRequest: any | null;
      isToday: boolean;
    }> = [];

    // Empty lead cells
    for (let i = 0; i < firstDayOfWeek; i++) {
      grid.push({
        dayNumber: null,
        dateStr: null,
        status: 'blank',
        overtimeHours: 0,
        notes: null,
        hasYellowStripe: false,
        pendingRequest: null,
        isToday: false
      });
    }

    let yesCount = 0;
    let partCount = 0;
    let noCount = 0;
    let blankCount = 0;
    let notesCount = 0;

    const todayStr = now.toISOString().split('T')[0];

    // Days 1 .. daysInMonth
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const att = attendanceMap.get(dateStr);
      const req = requestsMap.get(dateStr);

      let status: 'present' | 'half_day' | 'absent' | 'leave' | 'blank' = 'blank';
      let overtimeHours = 0;
      let notes: string | null = null;
      let hasYellowStripe = false;

      if (att) {
        status = att.status;
        overtimeHours = Number(att.overtime_hours || 0);
        notes = att.notes || null;
      }

      // If overtime or night duty or notes present -> yellow diagonal stripe on the corner!
      if (
        overtimeHours > 0 || 
        (notes && notes.trim() !== '') || 
        (req && (req.duty_type === 'night_duty' || req.duty_type === 'overtime' || Number(req.overtime_hours) > 0))
      ) {
        hasYellowStripe = true;
        notesCount++;
      }

      if (status === 'present') {
        yesCount++;
      } else if (status === 'half_day') {
        partCount++;
      } else if (status === 'absent') {
        noCount++;
      } else {
        blankCount++;
      }

      grid.push({
        dayNumber: d,
        dateStr,
        status,
        overtimeHours,
        notes,
        hasYellowStripe,
        pendingRequest: req && req.status === 'pending' ? req : null,
        isToday: dateStr === todayStr
      });
    }

    return {
      calendarGrid: grid,
      counts: {
        yes: yesCount,
        part: partCount,
        no: noCount,
        blank: blankCount,
        notes: notesCount
      }
    };
  }, [currentYear, currentMonth, daysInMonth, attendanceMap, requestsMap]);

  // Click on a calendar day to see details
  const handleSelectDay = (cell: any) => {
    if (!cell.dayNumber) return;

    // Look up ledger info for this date
    const dateStr = cell.dateStr;
    const dayLedger = ledgerEntries.filter((e: any) => e.date === dateStr);
    let dayWage = 0;
    let dayNightAllowance = 0;

    dayLedger.forEach((e: any) => {
      const descLower = (e.description || '').toLowerCase();
      if (descLower.includes('night duty') || descLower.includes('night allowance')) {
        dayNightAllowance += Number(e.amount || 0);
      } else if (e.transaction_type === 'wage_earned') {
        dayWage += Number(e.amount || 0);
      }
    });

    setSelectedDayDetail({
      ...cell,
      dayWage,
      dayNightAllowance,
      totalEarned: dayWage + dayNightAllowance
    });
  };

  return (
    <Card className="border-none shadow-2xl rounded-[3rem] bg-white dark:bg-neutral-950 overflow-hidden border border-black/5 dark:border-white/5 relative">
      <CardContent className="p-5 sm:p-8 space-y-6">
        
        {/* Top Header: Nav controls, Month & Year display, Quick Reset */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 dark:text-neutral-500">
              {MONTH_NAMES[now.getMonth()]} {now.getDate()}
            </span>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              className="h-10 w-10 p-0 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              <ChevronLeft size={22} strokeWidth={3} />
            </Button>

            <div className="text-center min-w-[140px]">
              <h3 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-wider font-mono">
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </h3>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="h-10 w-10 p-0 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              <ChevronRight size={22} strokeWidth={3} />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-black/10 dark:border-white/10 text-neutral-500 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer"
          >
            Today
          </Button>
        </div>

        {/* Weekdays Header: Su Mo Tu We Th Fr Sa */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center">
          {WEEKDAYS.map((day, idx) => (
            <div 
              key={day}
              className={`py-2 text-sm sm:text-base font-black tracking-wider ${
                idx === 0 || idx === 6 
                  ? 'text-neutral-400 dark:text-neutral-500' 
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {calendarGrid.map((cell, idx) => {
            if (!cell.dayNumber) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const isPresent = cell.status === 'present';
            const isHalfDay = cell.status === 'half_day';
            const isAbsent = cell.status === 'absent';
            const isBlank = cell.status === 'blank' || cell.status === 'leave';
            const isSelected = selectedDayDetail?.dateStr === cell.dateStr;

            // Background colors matching reference screenshot exactly
            let bgClass = 'bg-[#e5e5e5] dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300';
            if (isPresent) {
              bgClass = 'bg-[#00a82d] hover:bg-[#009428] text-white shadow-md shadow-emerald-600/20';
            } else if (isHalfDay) {
              bgClass = 'bg-[#ff6a00] hover:bg-[#e65f00] text-white shadow-md shadow-orange-500/20';
            } else if (isAbsent) {
              bgClass = 'bg-[#8b0000] hover:bg-[#770000] text-white shadow-md shadow-red-900/20';
            }

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => handleSelectDay(cell)}
                className={`relative aspect-square rounded-2xl flex items-center justify-center font-black text-base sm:text-xl transition-all duration-150 cursor-pointer select-none overflow-hidden ${bgClass} ${
                  isSelected ? 'ring-4 ring-orange-500 scale-105 z-10' : ''
                } ${cell.isToday ? 'outline outline-2 outline-offset-1 outline-orange-500' : ''}`}
              >
                {/* Diagonal Yellow Stripe on Top-Left Corner (C - notes / Night Duty / Overtime) */}
                {cell.hasYellowStripe && (
                  <div 
                    title="Night Duty / Overtime / Notes logged"
                    className="absolute top-0 left-0 w-4 h-4 sm:w-5 sm:h-5 bg-[#ffe600] z-10 shadow-sm"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                    }}
                  />
                )}

                {/* Pending Request Indicator (Subtle Amber Ring / Dot) */}
                {cell.pendingRequest && (
                  <div 
                    title="Self-attendance request pending admin approval"
                    className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-amber-300 animate-ping z-10" 
                  />
                )}

                {/* Day Number */}
                <span className="relative z-0 leading-none">
                  {cell.dayNumber}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Legend / Metric Badges (Exact design as reference image) */}
        <div className="grid grid-cols-5 gap-2 pt-2">
          {/* 1. Y - Yes / Present */}
          <div className="bg-[#00a82d] text-white rounded-2xl p-2.5 sm:p-3 text-center shadow-md flex flex-col justify-center items-center">
            <span className="text-sm sm:text-base font-black tracking-tight leading-none">
              Y {counts.yes}
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-90 mt-1">
              yes
            </span>
          </div>

          {/* 2. P - Part / Half Day */}
          <div className="bg-[#ff6a00] text-white rounded-2xl p-2.5 sm:p-3 text-center shadow-md flex flex-col justify-center items-center">
            <span className="text-sm sm:text-base font-black tracking-tight leading-none">
              P {counts.part}
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-90 mt-1">
              part
            </span>
          </div>

          {/* 3. N - No / Absent */}
          <div className="bg-[#8b0000] text-white rounded-2xl p-2.5 sm:p-3 text-center shadow-md flex flex-col justify-center items-center">
            <span className="text-sm sm:text-base font-black tracking-tight leading-none">
              N {counts.no}
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-90 mt-1">
              no
            </span>
          </div>

          {/* 4. X - Blank / Off */}
          <div className="bg-[#e5e5e5] dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-2xl p-2.5 sm:p-3 text-center shadow-sm flex flex-col justify-center items-center">
            <span className="text-sm sm:text-base font-black tracking-tight leading-none">
              X {counts.blank}
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-80 mt-1">
              blank
            </span>
          </div>

          {/* 5. C - Notes / Extra duty */}
          <div className="bg-[#ffe600] text-neutral-900 rounded-2xl p-2.5 sm:p-3 text-center shadow-md flex flex-col justify-center items-center">
            <span className="text-sm sm:text-base font-black tracking-tight leading-none">
              C {counts.notes}
            </span>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-90 mt-1">
              notes
            </span>
          </div>
        </div>

        {/* Selected Day Details Card (Expandable on tap) */}
        {selectedDayDetail && (
          <div className="p-4 sm:p-5 rounded-3xl bg-neutral-100 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                  selectedDayDetail.status === 'present'
                    ? 'bg-[#00a82d]'
                    : selectedDayDetail.status === 'half_day'
                    ? 'bg-[#ff6a00]'
                    : selectedDayDetail.status === 'absent'
                    ? 'bg-[#8b0000]'
                    : 'bg-neutral-400'
                }`}>
                  <CalendarIcon size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                    {new Date(selectedDayDetail.dateStr).toLocaleDateString(undefined, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h4>
                  <p className="text-[10px] font-bold text-neutral-400 capitalize">
                    {selectedDayDetail.status === 'present' 
                      ? 'Full Day Attendance' 
                      : selectedDayDetail.status === 'half_day' 
                      ? 'Half Day (4 hrs)' 
                      : selectedDayDetail.status === 'absent' 
                      ? 'Absent / Marked Leave' 
                      : 'No Shift Logged'}
                  </p>
                </div>
              </div>

              {/* Overtime/Night badge */}
              {selectedDayDetail.overtimeHours > 0 && (
                <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Moon size={12} /> {selectedDayDetail.overtimeHours}h Night Duty
                </span>
              )}
            </div>

            {/* Temporary staff earnings preview for that day */}
            {workerType === 'temporary' && selectedDayDetail.totalEarned > 0 && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-black/5 dark:border-white/5">
                <span className="text-xs font-bold text-neutral-500">Day's Earnings</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  ₹{selectedDayDetail.totalEarned.toLocaleString()}
                </span>
              </div>
            )}

            {/* Notes */}
            {selectedDayDetail.notes && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 italic bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                "{selectedDayDetail.notes}"
              </p>
            )}

            {/* Pending request note */}
            {selectedDayDetail.pendingRequest && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                <Clock size={16} className="shrink-0" />
                <span>You submitted a {selectedDayDetail.pendingRequest.duty_type.replace('_', ' ')} request for this day. Pending Admin Approval.</span>
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}

