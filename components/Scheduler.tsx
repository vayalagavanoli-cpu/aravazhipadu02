
import React, { useState, useMemo } from 'react';
import { Calendar, FileDown, AlertCircle, CheckCircle2, Play } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Location, Staff, Topic, Thirukkural, SharingConfig, PostponedDate, ScheduleRow, StaffCategory } from '../types';

interface SchedulerProps {
  locations: Location[];
  staff: Staff[];
  topics: Topic[];
  thirukkurals: Thirukkural[];
  sharingConfigs: SharingConfig[];
  postponedDates: PostponedDate[];
  globalLeaveDays: Record<string, number[]>;
  setGlobalLeaveDays: React.Dispatch<React.SetStateAction<Record<string, number[]>>>;
}

const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TAMIL_DAYS = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];

// Helper to format date as DD-MM-YYYY
const formatDateForDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
};

const Scheduler: React.FC<SchedulerProps> = ({ 
  locations, staff, topics, thirukkurals, sharingConfigs, postponedDates,
  globalLeaveDays, setGlobalLeaveDays 
}) => {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [isGenerated, setIsGenerated] = useState(false);

  const monthKey = `${year}-${month}`;
  const currentMonthLeaveDays = globalLeaveDays[monthKey] || [];

  const toggleLeave = (day: number) => {
    setIsGenerated(false);
    setGlobalLeaveDays(prev => {
      const existing = prev[monthKey] || [];
      const updated = existing.includes(day) 
        ? existing.filter(d => d !== day) 
        : [...existing, day];
      return { ...prev, [monthKey]: updated };
    });
  };

  const handleMonthYearChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
    setIsGenerated(false);
  };

  const schedule = useMemo(() => {
    if (!isGenerated || locations.length === 0 || staff.length === 0 || topics.length === 0 || thirukkurals.length === 0) {
      return [];
    }

    const rows: ScheduleRow[] = [];
    const workingStaff = staff.filter(s => s.status === 'Working');

    const getStaffByLoc = (locId: string) => {
      return workingStaff.filter(s => s.locationId === locId || s.additionalLocationIds?.includes(locId));
    };

    // Filter out locations that are excluded from the schedule
    const activeLocations = locations.filter(l => !l.excludedFromSchedule);
    if (activeLocations.length === 0) return [];

    const sortedActiveLocNames = [...activeLocations].sort((a, b) => a.id.localeCompare(b.id)).map(l => l.name);
    
    const sortedAssociatesByLoc: Record<string, string[]> = {};
    activeLocations.forEach(loc => {
      sortedAssociatesByLoc[loc.id] = getStaffByLoc(loc.id)
        .filter(s => s.category === StaffCategory.Associate)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(s => s.name);
    });

    let topicIdx = 0;
    let kuralIdx = 0;
    let s1Idx = 0;
    const s4Counters: Record<string, number> = {}; 
    
    // Start from the beginning of the year to maintain consistent rotation logic across months
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, month + 1, 0);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentMonth = d.getMonth();
      const currentYear = d.getFullYear();
      const currentDay = d.getDate();
      const dayOfWeek = d.getDay();
      const currentMonthKey = `${currentYear}-${currentMonth}`;
      const leaves = globalLeaveDays[currentMonthKey] || [];

      // CRITICAL: Skip Sundays and Selected Leave Days
      // Rotation indices are ONLY incremented on working days.
      if (dayOfWeek === 0 || leaves.includes(currentDay)) {
        continue;
      }

      const dayName = ENGLISH_DAYS[dayOfWeek];
      const tamilDay = TAMIL_DAYS[dayOfWeek];
      // Timezone-safe local date string generation
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;

      const topic = topics[topicIdx % topics.length];
      const kural = thirukkurals[kuralIdx % thirukkurals.length];
      const s1Location = sortedActiveLocNames[s1Idx % sortedActiveLocNames.length];
      
      topicIdx++;
      kuralIdx++;
      s1Idx++;

      const weekIndex = Math.floor((currentDay - 1) / 7);
      const isOddWeek = weekIndex % 2 === 0;

      const getStaffForSharing = (locId: string, type: '2' | '3' | '4') => {
        const locStaff = getStaffByLoc(locId);
        
        if (type === '2') {
          const p = locStaff.find(s => s.category === StaffCategory.Permanent);
          const a = locStaff.find(s => s.category === StaffCategory.Accountant);
          const m = locStaff.find(s => s.category === StaffCategory.MIS);
          return p?.name || a?.name || m?.name || 'N/A';
        } 
        
        if (type === '3') {
          const acc = locStaff.find(s => s.category === StaffCategory.Accountant);
          const mis = locStaff.find(s => s.category === StaffCategory.MIS);
          const per = locStaff.find(s => s.category === StaffCategory.Permanent);
          if (isOddWeek) return acc?.name || mis?.name || per?.name || 'N/A';
          return mis?.name || acc?.name || per?.name || 'N/A';
        }

        if (type === '4') {
          const associates = sortedAssociatesByLoc[locId] || [];
          if (associates.length === 0) return 'N/A';
          const counter = s4Counters[locId] || 0;
          return associates[counter % associates.length];
        }
        return '-';
      };

      const config = sharingConfigs.find(c => c.day === dayName);
      const dayLocIds = config ? config.locationIds : [];
      
      // Filter the config location IDs to only include active ones
      const activeDayLocIds = dayLocIds.filter(id => activeLocations.some(al => al.id === id));
      const span = activeDayLocIds.length || 1;
      const isTargetMonth = (currentMonth === month && currentYear === year);

      if (activeDayLocIds.length === 0) {
        if (isTargetMonth) {
          rows.push({
            date: dateStr, day: tamilDay, topic: topic.name, thirukkural: kural.verse,
            sharing1Location: s1Location, subRowLocation: '-',
            sharing2Staff: '-', sharing3Staff: '-', sharing4Staff: '-',
            isFirstSubRow: true, subRowSpan: 1
          });
        }
      } else {
        activeDayLocIds.forEach((locId, idx) => {
          const locObj = activeLocations.find(l => l.id === locId);
          const s2 = getStaffForSharing(locId, '2');
          const s3 = getStaffForSharing(locId, '3');
          const s4 = getStaffForSharing(locId, '4');
          
          s4Counters[locId] = (s4Counters[locId] || 0) + 1;

          if (isTargetMonth) {
            rows.push({
              date: dateStr, day: tamilDay, topic: topic.name, thirukkural: kural.verse,
              sharing1Location: s1Location, subRowLocation: locObj?.name || '-',
              sharing2Staff: s2, sharing3Staff: s3, sharing4Staff: s4,
              isFirstSubRow: idx === 0, subRowSpan: span
            });
          }
        });
      }
    }
    return rows;
  }, [isGenerated, month, year, globalLeaveDays, locations, staff, topics, thirukkurals, sharingConfigs]);

  const exportExcel = () => {
    const exportData = schedule.map(row => {
      return {
        'தேதி': row.isFirstSubRow ? formatDateForDisplay(row.date) : '',
        'கிழமை': row.isFirstSubRow ? row.day : '',
        'சிந்தனை': row.isFirstSubRow ? row.topic : '',
        'திருக்குறள்': row.isFirstSubRow ? row.thirukkural : '',
        'பகிர்வு-1 (இடம்)': row.isFirstSubRow ? row.sharing1Location : '',
        'பகிர்வு இடம் (2,3,4)': row.subRowLocation,
        'பகிர்வு-2': row.sharing2Staff,
        'பகிர்வு-3': row.sharing3Staff,
        'பகிர்வு-4': row.sharing4Staff
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    worksheet['!cols'] = [
      { wch: 15 }, // Date
      { wch: 12 }, // Day
      { wch: 25 }, // Reflection (சிந்தனை)
      { wch: 40 }, // Thirukkural
      { wch: 20 }, // S1 Loc
      { wch: 20 }, // Sub row loc
      { wch: 25 }, // S2 Staff
      { wch: 25 }, // S3 Staff
      { wch: 25 }, // S4 Staff
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule");
    XLSX.writeFile(workbook, `அறவழிபாடு_அட்டவணை_${formatDateForDisplay(`${year}-${String(month + 1).padStart(2, '0')}-01`)}.xlsx`);
  };

  const daysInMonthCount = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonthIdx = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex gap-4">
          <select value={month} onChange={e => handleMonthYearChange(parseInt(e.target.value), year)} className="border rounded-2xl px-4 py-2 bg-slate-50 font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
            {['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'].map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={e => handleMonthYearChange(month, parseInt(e.target.value))} className="border rounded-2xl px-4 py-2 bg-slate-50 font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsGenerated(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100">
            <Play size={18} fill="currentColor" /> அட்டவணையை உருவாக்கு
          </button>
          {isGenerated && schedule.length > 0 && (
            <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-100">
              <FileDown size={20} /> எக்செல் (Excel)
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="font-black text-slate-900 text-lg mb-6 flex items-center gap-2 uppercase tracking-wide">
          <Calendar className="text-indigo-600" /> விடுமுறை நாட்கள் தேர்வு
        </h3>
        <div className="grid grid-cols-7 gap-3">
          {TAMIL_DAYS.map(d => <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>)}
          
          {/* Calendar Grid Spacers */}
          {Array.from({ length: firstDayOfMonthIdx }).map((_, i) => (
            <div key={`spacer-${i}`} className="h-12 bg-slate-50/20 rounded-2xl" />
          ))}

          {/* Actual Month Days */}
          {Array.from({ length: daysInMonthCount }).map((_, i) => {
            const dayNum = i + 1;
            const isLeave = currentMonthLeaveDays.includes(dayNum);
            const isSunday = new Date(year, month, dayNum).getDay() === 0;
            return (
              <button 
                key={dayNum} 
                disabled={isSunday} 
                onClick={() => toggleLeave(dayNum)} 
                className={`h-12 rounded-2xl text-sm font-black border transition-all ${
                  isSunday 
                    ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                    : isLeave 
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-100 border-orange-500' 
                      : 'bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/20'
                }`}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[10px] font-bold text-slate-400 italic">* ஞாயிறு மற்றும் தேர்ந்தெடுக்கப்பட்ட விடுமுறை நாட்கள் அட்டவணையில் சேர்க்கப்படாது.</p>
      </div>

      {isGenerated && schedule.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-3xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 font-black text-slate-500 uppercase text-[10px] border-r tracking-wider text-center">தேதி</th>
                <th className="p-4 font-black text-slate-500 uppercase text-[10px] border-r tracking-wider text-center">கிழமை</th>
                <th className="p-4 font-black text-slate-500 uppercase text-[10px] border-r tracking-wider">சிந்தனை</th>
                <th className="p-4 font-black text-slate-500 uppercase text-[10px] border-r tracking-wider">திருக்குறள்</th>
                <th className="p-4 font-black text-indigo-600 uppercase text-[10px] border-r text-center tracking-wider">பகிர்வு-1</th>
                <th className="p-4 font-black text-indigo-700 uppercase text-[10px] border-r bg-indigo-50/50 text-center tracking-wider">இடம்</th>
                <th className="p-4 font-black text-slate-500 uppercase text-[10px] border-r text-center tracking-wider">பகிர்வு-2</th>
                <th className="p-4 font-black text-slate-500 uppercase text-[10px] border-r text-center tracking-wider">பகிர்வு-3</th>
                <th className="p-4 font-black text-slate-500 uppercase text-[10px] text-center tracking-wider">பகிர்வு-4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedule.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  {row.isFirstSubRow && (
                    <>
                      <td className="p-4 border-r align-top text-center font-mono text-[11px] font-black text-slate-900 bg-slate-50/20" rowSpan={row.subRowSpan}>
                        {formatDateForDisplay(row.date)}
                      </td>
                      <td className="p-4 border-r align-top text-center font-black text-[10px] text-indigo-600 bg-slate-50/20" rowSpan={row.subRowSpan}>
                        {row.day}
                      </td>
                      <td className="p-4 border-r align-top font-black text-xs text-slate-800 bg-slate-50/20" rowSpan={row.subRowSpan}>
                        {row.topic}
                      </td>
                      <td className="p-4 border-r align-top italic text-[10px] text-slate-500 leading-relaxed bg-slate-50/20" rowSpan={row.subRowSpan}>
                        {row.thirukkural}
                      </td>
                      <td className="p-4 border-r align-top text-center" rowSpan={row.subRowSpan}>
                        <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black inline-block shadow-md shadow-indigo-100">{row.sharing1Location}</div>
                      </td>
                    </>
                  )}
                  <td className="p-4 font-black text-indigo-900 border-r bg-indigo-50/10 text-center">{row.subRowLocation}</td>
                  <td className="p-4 border-r font-bold text-slate-700 text-center">{row.sharing2Staff}</td>
                  <td className="p-4 border-r font-bold text-slate-700 text-center">{row.sharing3Staff}</td>
                  <td className="p-4 font-bold text-slate-700 text-center">{row.sharing4Staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Scheduler;
