
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Trash2, 
  FileDown, 
  Upload, 
  Zap, 
  Check,
  Search,
  UserCheck,
  Users,
  Filter,
  MapPin,
  Copy,
  Share2,
  CheckCircle2,
  AlertTriangle,
  PieChart,
  Save,
  RefreshCw,
  Calendar,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
//import { GoogleGenerativeAI, SchemaType  } from "@google/generative-ai";
import { Staff, AttendanceRecord, Location, StaffCategory } from '../types';

interface AttendanceTrackerProps {
  staff: Staff[];
  locations: Location[]; 
  records: AttendanceRecord[];
  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;

 onSync: (type: string, data: any) => Promise<void>;
}

const TAMIL_MONTHS = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

// Helper to format date as DD-MM-YYYY
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}-${m}-${y}`;
};

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ staff, locations, records, setRecords, onSync }) => {
  const [syncLoading, setSyncLoading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [reportView, setReportView] = useState<'daily' | 'monthly'>('daily');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  
  const [localRecords, setLocalRecords] = useState<AttendanceRecord[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef(false);
  const workingStaff = useMemo(() => staff.filter(s => s.status === 'Working'), [staff]);

  // Load daily records
  useEffect(() => {
    const existing = records.filter(r => r.date === selectedDate);
    setLocalRecords(existing);
    setHasUnsavedChanges(false);
  }, [selectedDate, records]);

  const getLocalAttendanceForStaff = (staffId: string) => {
    return localRecords.find(r => r.staffId === staffId);
  };

  const isLocalPresent = (staffId: string) => !!getLocalAttendanceForStaff(staffId);

  const toggleAttendance = (staffId: string) => {
    const record = getLocalAttendanceForStaff(staffId);
    if (record) {
      setLocalRecords(localRecords.filter(r => r.staffId !== staffId));
    } else {
      const newRecord: AttendanceRecord = {
        id: Math.random().toString(36).substr(2, 9),
        date: selectedDate,
        staffId: staffId,
        meetLink: '',
        inTime: 'Manual',
        outTime: 'Manual',
        percentage: 100
      };
      setLocalRecords([...localRecords, newRecord]);
    }
    setHasUnsavedChanges(true);
  };

  const handleSaveToGlobal = async() => {
    setRecords(prev => {
      const filtered = prev.filter(r => r.date !== selectedDate);
      return [...filtered, ...localRecords];
    });
   

    setHasUnsavedChanges(false);

    // ADD THIS: Sync each record to the D1 Database
  try {
    const syncPromises = localRecords.map(record => onSync('attendance', record));
    await Promise.all(syncPromises);
    alert("வருகைப்பதிவு வெற்றிகரமாக சேமிக்கப்பட்டது!");
  } catch (error) {
    console.error("Sync failed:", error);
    alert("டேட்டாபேஸில் சேமிப்பதில் பிழை ஏற்பட்டது.");
  }
};

   

  
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (localRecords.length > 0) {
      const confirmReplace = window.confirm("தேர்ந்தெடுக்கப்பட்ட தேதிக்கு ஏற்கனவே வருகைப்பதிவு உள்ளது. அதை மாற்ற விரும்புகிறீர்களா? (Attendance already updated for selected date. Do you want replace?)");
      if (!confirmReplace) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setLocalRecords([]);
    }

    isCancelledRef.current = false;
    setSyncLoading(true);
    setProcessingProgress(10);
    setProcessingStatus('கோப்பை வாசிக்கிறது...');
    
    try {
      const text = await file.text();
      if (!text || text.trim().length === 0) {
        alert("தேர்ந்தெடுக்கப்பட்ட கோப்பு காலியாக உள்ளது.");
        setSyncLoading(false);
        return;
      }

      if (isCancelledRef.current) return;
      
      setProcessingProgress(30);
      setProcessingStatus('AI ஆய்வு செய்கிறது...');
      await processWithAI(text);
    } catch (err) {
      if (!isCancelledRef.current) {
        alert("கோப்பை வாசிப்பதில் பிழை ஏற்பட்டது.");
        setSyncLoading(false);
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const cancelUpload = () => {
    isCancelledRef.current = true;
    setSyncLoading(false);
    setProcessingProgress(0);
    setProcessingStatus('');
    const existing = records.filter(r => r.date === selectedDate);
    setLocalRecords(existing);
  };

  const processWithAI = async (textData: string) => {
    if (workingStaff.length === 0) {
      alert("முதலில் 'Master Data' பகுதியில் பணியாளர்களைச் சேர்க்கவும்.");
      setSyncLoading(false);
      return;
    }

    try {
      // Always initialize GoogleGenAI with { apiKey: process.env.API_KEY } directly before use.
     // const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || "");
      //const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
      const staffListString = workingStaff.map(s => `Name: ${s.name}, SystemID: ${s.id}, MeetID: ${s.meetId}`).join(" | ");
      const prompt = `You are a Google Meet Attendance Parser. 
      Input: CSV content with Participant Name and duration info.
      Task: 
      1. Map participants to the MASTER LIST.
      2. If a participant is NOT in the MASTER LIST, return them with staffId as "UNKNOWN" and their name in "unknownName".
      3. Return ONLY a JSON array.
      MASTER LIST: ${staffListString}.
      Format: [{"staffId": "ID", "unknownName": "Optional", "percentage": 85, "inTime": "HH:MM", "outTime": "HH:MM"}]
      DATA: ${textData}`;

     

      if (isCancelledRef.current) return;

      setProcessingProgress(70);
      setProcessingStatus('தரவுகளை ஒத்திசைக்கிறது...');

      // Access the generated text directly from the response.
const response = result.response;
const textResponse = await response.text(); 
 const jsonStr = textResponse?.trim();

      if (!jsonStr) {
        throw new Error("AI returned an empty response");
        }
      const matches = JSON.parse(jsonStr);
      
      const newRecordsFromAI: AttendanceRecord[] = matches.map((m: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        date: selectedDate,
        staffId: m.staffId,
        unknownName: m.unknownName,
        meetLink: '',
        inTime: m.inTime || '---',
        outTime: m.outTime || '---',
        percentage: Math.min(100, Math.round(m.percentage || 100))
      }));

      if (isCancelledRef.current) return;

      setLocalRecords(newRecordsFromAI); 
      setHasUnsavedChanges(true);
      setProcessingProgress(100);
      setTimeout(() => {
        if (!isCancelledRef.current) setSyncLoading(false);
      }, 500);
    } catch (error) {
      if (!isCancelledRef.current) {
        console.error(error);
        alert("AI ஆய்வு செய்வதில் பிழை.");
        setSyncLoading(false);
      }
    }
  };

  const monthlyStats = useMemo(() => {
    const monthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const monthRecords = records.filter(r => r.date.startsWith(monthPrefix));
    const uniqueDates = Array.from(new Set(monthRecords.map(r => r.date))).sort();
    
    const staffReport = workingStaff.map(s => {
      const staffRecords = monthRecords.filter(r => r.staffId === s.id);
      const badDaysCount = uniqueDates.filter(d => {
        const rec = staffRecords.find(r => r.date === d);
        return !rec || rec.percentage < 40;
      }).length;
      return { 
        name: s.name, 
        location: locations.find(l => l.id === s.locationId)?.name || 'Unknown', 
        badDays: badDaysCount 
      };
    }).filter(s => s.badDays > 0).sort((a, b) => b.badDays - a.badDays);

    const locReport = locations.map(loc => {
      const locStaff = workingStaff.filter(s => s.locationId === loc.id);
      if (locStaff.length === 0) return null;
      
      let fullDays = 0;
      uniqueDates.forEach(d => {
        const allPresent = locStaff.every(s => monthRecords.some(r => r.date === d && r.staffId === s.id));
        if (allPresent) fullDays++;
      });
      return { name: loc.name, fullDays, totalDays: uniqueDates.length };
    }).filter(l => l !== null);

    return { staffReport, locReport, totalDays: uniqueDates.length };
  }, [records, selectedMonth, selectedYear, workingStaff, locations]);

  const filteredStaff = useMemo(() => {
    return workingStaff.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = filterLocation === 'all' || s.locationId === filterLocation;
      const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
      return matchesSearch && matchesLocation && matchesCategory;
    });
  }, [workingStaff, searchTerm, filterLocation, filterCategory]);

  const unknownLocalRecords = localRecords.filter(r => r.staffId === 'UNKNOWN');
  const presentCount = workingStaff.filter(s => isLocalPresent(s.id)).length;

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopyFeedback(label);
        setTimeout(() => setCopyFeedback(null), 2000);
      });
    } else {
      // Fallback for older browsers or non-HTTPS contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyFeedback(label);
        setTimeout(() => setCopyFeedback(null), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const getTamilDateHeader = () => {
    const d = new Date(selectedDate);
    const dateFormatted = formatDate(selectedDate);
    const dayName = d.toLocaleDateString('ta-IN', { weekday: 'long' });
    return `📅 *அறிக்கை தேதி: ${dateFormatted} (${dayName})*`;
  };

  const generateAbsenteesReport = () => {
    let report = `${getTamilDateHeader()}\n`;
    report += `--------------------------------------\n`;
    report += `❌ *வருகை தராதவர்கள் மற்றும் குறைந்த வருகை (<40%):*\n\n`;
    locations.forEach(loc => {
      const locStaff = workingStaff.filter(s => s.locationId === loc.id);
      const absentees = locStaff.filter(s => !isLocalPresent(s.id));
      const lowAtt = locStaff.filter(s => {
        const r = getLocalAttendanceForStaff(s.id);
        return r && r.percentage < 40;
      });
      if (absentees.length > 0 || lowAtt.length > 0) {
        report += `📍 *${loc.name}:*\n`;
        absentees.forEach(s => report += `  - ${s.name} (Absent)\n`);
        lowAtt.forEach(s => report += `  - ${s.name} (${getLocalAttendanceForStaff(s.id)?.percentage}%)\n`);
        report += `\n`;
      }
    });
    report += `\n*Total :* ${presentCount}/${workingStaff.length}`;
    return report.trim();
  };

  const generateFullAttendanceReport = () => {
    let report = `${getTamilDateHeader()}\n`;
    report += `--------------------------------------\n`;
    report += `✅ *100% வருகை தந்த வட்டாரங்கள்:*\n\n`;
    let found = false;
    locations.forEach(loc => {
      const locStaff = workingStaff.filter(s => s.locationId === loc.id);
      if (locStaff.length > 0 && locStaff.every(s => isLocalPresent(s.id))) {
        report += `📍 *${loc.name}*\n`;
        found = true;
      }
    });
    if (found) report += `\nஅனைவருக்கும் வாழ்த்துகள் 💐`;
    else report += `(இன்று முழு வருகை இல்லை)`;
    report += `\n*Total :* ${presentCount}/${workingStaff.length}`;
    return report.trim();
  };

  const generateCategorySummaryReport = () => {
    let report = `${getTamilDateHeader()}\n`;
    report += `--------------------------------------\n`;
    report += `📊 *மொத்த வருகை விபரம் (பங்கேற்றவர்கள்/மொத்தம்):*\n\n`;
    Object.values(StaffCategory).forEach(cat => {
      const catStaff = workingStaff.filter(s => s.category === cat);
      if (catStaff.length > 0) {
        const present = catStaff.filter(s => isLocalPresent(s.id)).length;
        report += `  - *${cat}*: ${present} / ${catStaff.length}\n`;
      }
    });
    report += `\n*Total :* ${presentCount}/${workingStaff.length}`;
    return report.trim();
  };

  const generateMonthlyAbsenteesReport = () => {
    let report = `📊 *மாதாந்திர அறிக்கை: ${TAMIL_MONTHS[selectedMonth]} ${selectedYear}*\n`;
    report += `--------------------------------------\n`;
    report += `📅 *மொத்த நாள்கள் : ${monthlyStats.totalDays}*\n`;
    report += `--------------------------------------\n`;
    report += `❌ *குறைந்த பங்கேற்பு / விடுமுறை நாட்கள் விவரம்:*\n\n`;
    monthlyStats.staffReport.forEach(s => {
      report += `👤 *${s.name}* (${s.location}): *${s.badDays}* நாட்கள்\n`;
    });
    return report.trim();
  };

  const generateMonthlyFullAttendanceReport = () => {
    let report = `📊 *மாதாந்திர அறிக்கை: ${TAMIL_MONTHS[selectedMonth]} ${selectedYear}*\n`;
    report += `--------------------------------------\n`;
    report += `✅ *வட்டாரங்களின் முழு வருகை நாட்கள்:*\n\n`;
    monthlyStats.locReport.forEach(l => {
      report += `📍 *${l?.name}*: ${l?.fullDays} / ${l?.totalDays} நாட்கள்\n`;
    });
    return report.trim();
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <UserCheck size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">ஸ்மார்ட் வருகைப்பதிவு</h3>
            <div className="flex items-center gap-2 mt-1">
              <button 
                onClick={() => setReportView('daily')}
                className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${reportView === 'daily' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                தினசரி அறிக்கை
              </button>
              <button 
                onClick={() => setReportView('monthly')}
                className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${reportView === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                மாதாந்திர ஆய்வு
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100 flex items-center gap-3">
            <Users className="text-indigo-600" size={20} />
            <div className="text-sm font-bold text-indigo-900">
              பங்கேற்பு: <span className="text-lg font-black">{presentCount}</span> / {workingStaff.length}
            </div>
          </div>
        </div>
      </header>

      {syncLoading && (
        <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 pr-16">
            <div className="flex items-center gap-3">
              <RefreshCw size={18} className="animate-spin text-indigo-600" />
              <span className="text-sm font-black text-indigo-600 uppercase tracking-wide">
                 {processingStatus}
              </span>
            </div>
            <span className="text-sm font-black text-indigo-900">{processingProgress}%</span>
          </div>
          <button 
            onClick={cancelUpload}
            className="absolute top-5 right-5 p-2 bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all z-20 shadow-sm border border-slate-200"
            title="பதிவேற்றத்தை ரத்துசெய் (Cancel)"
          >
            <X size={20} />
          </button>
          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${processingProgress}%` }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h4 className="font-black text-slate-900 flex items-center gap-2">
              <Zap size={18} className="text-indigo-600" /> கட்டுப்பாட்டு மையம்
            </h4>

            {reportView === 'daily' && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-emerald-900">CSV அப்லோட்</p>
                    <p className="text-[10px] text-emerald-600 font-bold italic">Auto-Sync Meet IDs</p>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100 hover:scale-105 transition-transform"
                  >
                    <Upload size={18} /> 
                  </button>
                </div>
                <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleCSVUpload} />
              </div>
            )}

            <div className="space-y-4 pt-2">
              {reportView === 'daily' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">தேதி</label>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)} 
                    className="w-full border rounded-xl px-4 py-2.5 font-black outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">மாதம்</label>
                    <select 
                      value={selectedMonth} 
                      onChange={e => setSelectedMonth(parseInt(e.target.value))}
                      className="w-full border rounded-xl px-4 py-2.5 font-black outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {TAMIL_MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ஆண்டு</label>
                    <select 
                      value={selectedYear} 
                      onChange={e => setSelectedYear(parseInt(e.target.value))}
                      className="w-full border rounded-xl px-4 py-2.5 font-black outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </>
              )}

              {reportView === 'daily' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">தேடல்</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="பெயர் தேடுக..."
                        className="w-full border rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-black bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">இடம்</label>
                    <select 
                      value={filterLocation} 
                      onChange={e => setFilterLocation(e.target.value)}
                      className="w-full border rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-black bg-white appearance-none"
                    >
                      <option value="all">அனைத்து இடங்களும்</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-black text-slate-900 flex items-center gap-2">
              <Share2 size={18} className="text-emerald-500" /> WhatsApp அறிக்கைகள்
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
              {reportView === 'daily' ? (
                <>
                  <button onClick={() => copyToClipboard(generateAbsenteesReport(), 'd1')} className="flex items-center justify-between p-3 bg-slate-50 border rounded-2xl hover:bg-slate-100 transition-all group text-left">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 p-2 rounded-xl text-orange-600"><AlertTriangle size={18} /></div>
                      <div className="text-left"><p className="text-xs font-black">Absentees & Low participation</p></div>
                    </div>
                    {copyFeedback === 'd1' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-300" />}
                  </button>
                  <button onClick={() => copyToClipboard(generateFullAttendanceReport(), 'd2')} className="flex items-center justify-between p-3 bg-slate-50 border rounded-2xl hover:bg-slate-100 transition-all group text-left">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><CheckCircle2 size={18} /></div>
                      <div className="text-left"><p className="text-xs font-black">100% Attendance</p></div>
                    </div>
                    {copyFeedback === 'd2' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-300" />}
                  </button>
                  <button onClick={() => copyToClipboard(generateCategorySummaryReport(), 'd3')} className="flex items-center justify-between p-3 bg-slate-50 border rounded-2xl hover:bg-slate-100 transition-all group text-left">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><PieChart size={18} /></div>
                      <div className="text-left"><p className="text-xs font-black">Category Summary</p></div>
                    </div>
                    {copyFeedback === 'd3' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-300" />}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => copyToClipboard(generateMonthlyAbsenteesReport(), 'm1')} className="flex items-center justify-between p-3 bg-slate-50 border rounded-2xl hover:bg-slate-100 transition-all group text-left">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 p-2 rounded-xl text-orange-600"><AlertTriangle size={18} /></div>
                      <div className="text-left"><p className="text-xs font-black">Absent Days Count</p><p className="text-[9px] font-bold text-slate-400">பணியாளர் வாரியாக</p></div>
                    </div>
                    {copyFeedback === 'm1' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-300" />}
                  </button>
                  <button onClick={() => copyToClipboard(generateMonthlyFullAttendanceReport(), 'm2')} className="flex items-center justify-between p-3 bg-slate-50 border rounded-2xl hover:bg-slate-100 transition-all group text-left">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><CheckCircle2 size={18} /></div>
                      <div className="text-left"><p className="text-xs font-black">Location Accuracy</p><p className="text-[9px] font-bold text-slate-400">இடம் வாரியாக முழு வருகை</p></div>
                    </div>
                    {copyFeedback === 'm2' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Copy size={16} className="text-slate-300" />}
                  </button>
                </>
              )}
            </div>
            {copyFeedback && <p className="text-[10px] text-center font-black text-emerald-600 bg-emerald-50 py-1 rounded-lg animate-pulse">நகலெடுக்கப்பட்டது!</p>}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative min-h-[650px]">
          {reportView === 'daily' ? (
            <>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h4 className="font-black text-slate-900 flex items-center gap-2">
                  <Filter size={18} className="text-slate-400" /> வருகைப் பட்டியல் ({formatDate(selectedDate)})
                </h4>
                <div className="flex items-center gap-3">
                  {hasUnsavedChanges && <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-full animate-pulse">சேமிக்கப்படவில்லை!</span>}
                  <button onClick={() => {
                    const data = localRecords.map(r => ({
                      'Date': formatDate(r.date),
                      'Name': workingStaff.find(s => s.id === r.staffId)?.name || r.unknownName || 'Unknown',
                      'Percentage': r.percentage,
                      'In': r.inTime,
                      'Out': r.outTime
                    }));
                    const ws = XLSX.utils.json_to_sheet(data);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
                    XLSX.writeFile(wb, `DailyAttendance_${formatDate(selectedDate)}.xlsx`);
                  }} className="text-emerald-600 font-bold text-[10px] uppercase flex items-center gap-1 hover:bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                    <FileDown size={14} /> அறிக்கையை பதிவிறக்க
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto flex-1 no-scrollbar">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 border-b sticky top-0 z-10">
                    <tr>
                      <th className="p-4 font-black text-[10px] uppercase text-slate-500 text-center w-20">Tick</th>
                      <th className="p-4 font-black text-[10px] uppercase text-slate-500">பணியாளர் விவரம்</th>
                      <th className="p-4 font-black text-[10px] uppercase text-slate-500">இடம்</th>
                      <th className="p-4 font-black text-[10px] uppercase text-slate-500 text-center">வருகை %</th>
                      <th className="p-4 font-black text-[10px] uppercase text-slate-500 text-right">நிலை</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {unknownLocalRecords.map(r => (
                      <tr key={r.id} className="bg-red-50/50 group border-l-4 border-red-400">
                        <td className="p-4 text-center">
                          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-500">
                            <AlertTriangle size={18} />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-black text-red-900">Unknown: {r.unknownName}</div>
                          <div className="text-[10px] text-red-400">பெயர் பட்டியலில் இல்லை (Match ID)</div>
                        </td>
                        <td className="p-4 text-slate-400 italic">---</td>
                        <td className="p-4 text-center"><span className="text-xs font-black text-red-600">{r.percentage}%</span></td>
                        <td className="p-4 text-right">
                          <button onClick={() => setLocalRecords(prev => prev.filter(p => p.id !== r.id))} className="text-red-300 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {filteredStaff.map(s => {
                      const record = getLocalAttendanceForStaff(s.id);
                      const present = !!record;
                      return (
                        <tr key={s.id} onClick={() => toggleAttendance(s.id)} className={`cursor-pointer transition-colors group ${present ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                          <td className="p-4 text-center">
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 mx-auto ${present ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                              {present && <Check size={18} className="text-white stroke-[4px] animate-in zoom-in-75 duration-300" />}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className={`font-bold transition-colors ${present ? 'text-indigo-900' : 'text-slate-700 group-hover:text-indigo-600'}`}>{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{s.meetId}</div>
                          </td>
                          <td className="p-4 text-xs font-bold text-slate-500">{locations.find(l => l.id === s.locationId)?.name}</td>
                          <td className="p-4 text-center"><span className={`text-xs font-black ${present ? 'text-indigo-600' : 'text-slate-300'}`}>{present ? `${record.percentage}%` : '0%'}</span></td>
                          <td className="p-4 text-right">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border transition-all ${present ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>{present ? 'PRESENT' : 'ABSENT'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
                <div className="text-xs font-black text-slate-500">வருகை: <span className="text-indigo-600 font-black">{presentCount}</span> / {workingStaff.length}</div>
                <button onClick={handleSaveToGlobal} disabled={!hasUnsavedChanges} className={`px-10 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg transition-all ${hasUnsavedChanges ? 'bg-emerald-600 text-white shadow-emerald-100 hover:scale-105 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>
                  <Save size={18} /> சேமிக்கவும்
                </button>
              </div>
            </>
          ) : (
            <div className="p-8 space-y-8 overflow-y-auto max-h-[700px] no-scrollbar">
              <div className="flex items-center justify-between border-b pb-4">
                 <h4 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Calendar className="text-indigo-600" /> மாதாந்திர ஆய்வு: {TAMIL_MONTHS[selectedMonth]} {selectedYear}</h4>
                 <div className="bg-indigo-50 px-4 py-2 rounded-xl text-indigo-700 text-xs font-black border border-indigo-100">தரவு உள்ள நாட்கள்: {monthlyStats.totalDays}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h5 className="font-black text-xs uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <Users size={16} /> விடுமுறை / குறைந்த பங்கேற்பு நாட்கள்
                  </h5>
                  <div className="space-y-3">
                    {monthlyStats.staffReport.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed text-slate-400 font-bold">விவரங்கள் இல்லை</div>
                    ) : (
                      monthlyStats.staffReport.map(s => (
                        <div key={s.name} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                          <div>
                            <div className="font-bold text-slate-900">{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">{s.location}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-indigo-600">{s.badDays}</div>
                            <div className="text-[9px] font-black text-slate-400 uppercase">நாட்கள்</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-black text-xs uppercase text-slate-400 tracking-widest flex items-center gap-2">
                    <MapPin size={16} /> வட்டாரங்களின் முழு வருகை (Consistency)
                  </h5>
                  <div className="space-y-3">
                    {monthlyStats.locReport.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed text-slate-400 font-bold">விவரங்கள் இல்லை</div>
                    ) : (
                      monthlyStats.locReport.map(l => (
                        <div key={l?.name} className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm hover:border-emerald-200 transition-colors">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-black text-slate-800">{l?.name}</span>
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{Math.round((l?.fullDays || 0) / (l?.totalDays || 1) * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-emerald-500 transition-all duration-700 ease-out shadow-sm" style={{ width: `${(l?.fullDays || 0) / (l?.totalDays || 1) * 100}%` }} />
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Consistency Level</span>
                            <span className="text-[11px] font-black text-slate-600">{l?.fullDays} / {l?.totalDays} நாட்கள்</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceTracker;
