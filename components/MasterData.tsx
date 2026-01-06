import React, { useState, useRef, useMemo } from 'react';
import { Plus, Trash2, Download, Upload, Edit, Check, X, Search, Filter, MapPin, Tag, EyeOff, Eye, Keyboard, Languages, ListTree, Users, BookOpen, BookText, Clock, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Location, Staff, Topic, Thirukkural, SharingConfig, PostponedDate, StaffCategory, StaffStatus } from '../types';


interface MasterDataProps {
  locations: Location[];
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>;
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  topics: Topic[];
  setTopics: React.Dispatch<React.SetStateAction<Topic[]>>;
  thirukkurals: Thirukkural[];
  setThirukkurals: React.Dispatch<React.SetStateAction<Thirukkural[]>>;
  sharingConfigs: SharingConfig[];
  setSharingConfigs: React.Dispatch<React.SetStateAction<SharingConfig[]>>;
  postponedDates: PostponedDate[];
  setPostponedDates: React.Dispatch<React.SetStateAction<PostponedDate[]>>;
  
  // This line tells TypeScript that onSync is allowed
  onSync: (type: string, data: any) => Promise<void>; 
}

const TAMIL_DAYS = ['திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];
const ENGLISH_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CATEGORY_MAP: Record<string, StaffCategory> = {
  'permanent': StaffCategory.Permanent,
  'blockintegrator': StaffCategory.Permanent,
  'federationcoordinator': StaffCategory.Permanent,
  'blockintegratorfederationcoordinator': StaffCategory.Permanent,
  'contractual': StaffCategory.Contractual,
  'regional': StaffCategory.Regional,
  'mis': StaffCategory.MIS,
  'psdb': StaffCategory.PSDB,
  'associate': StaffCategory.Associate,
  'accountant': StaffCategory.Accountant
};

const useTamilTransliteration = () => {
  const transliterate = async (text: string): Promise<string> => {
    if (!text || !/[a-zA-Z]/.test(text)) return text;
    try {
      const response = await fetch(
        `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ta-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=test`
      );
      const data = await response.json() as any;
      if (data[0] === 'SUCCESS') {
        return data[1][0][1][0] || text;
      }
      return text;
    } catch (e) {
      console.error('Transliteration failed', e);
      return text;
    }
  };

  const handleKeyDown = async (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    value: string,
    onChange: (newValue: string) => void
  ) => {
    if (e.key === ' ') {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      const cursorPosition = target.selectionStart || 0;
      const textBeforeCursor = value.substring(0, cursorPosition);
      const words = textBeforeCursor.split(/\s+/);
      const lastWord = words[words.length - 1];

      if (lastWord && /[a-zA-Z]/.test(lastWord)) {
        e.preventDefault();
        const tamilWord = await transliterate(lastWord);
        const newValue = 
          value.substring(0, cursorPosition - lastWord.length) + 
          tamilWord + ' ' + 
          value.substring(cursorPosition);
        onChange(newValue);
        
        setTimeout(() => {
          const newPos = cursorPosition - lastWord.length + tamilWord.length + 1;
          target.setSelectionRange(newPos, newPos);
        }, 0);
      }
    }
  };

  return { handleKeyDown };
};

const TamilInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'textarea';
}> = ({ value, onChange, placeholder, className, type = 'text' }) => {
  const { handleKeyDown } = useTamilTransliteration();
  
  if (type === 'textarea') {
    return (
      <div className="relative w-full">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => handleKeyDown(e, value, onChange)}
          placeholder={placeholder}
          className={`${className} pr-10`}
        />
        <Languages size={14} className="absolute top-3 right-3 text-slate-300 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => handleKeyDown(e, value, onChange)}
        placeholder={placeholder}
        className={`${className} pr-10`}
      />
      <Languages size={14} className="absolute top-1/2 -translate-y-1/2 right-4 text-slate-300 pointer-events-none" />
    </div>
  );
};

const MasterData: React.FC<MasterDataProps> = (props) => {
  const {onSync}=props;
  const [activeSubTab, setActiveSubTab] = useState('locations');

  const renderContent = () => {
      switch (activeSubTab) {
      case 'locations': return <LocationMaster {...props} />;
      case 'staff': return <StaffMaster {...props} />;
      case 'topics': return <TopicMaster {...props} />;
      case 'thirukkural': return <ThirukkuralMaster {...props} />;
      case 'sharing': return <SharingMaster {...props} />;
      case 'postpone': return <PostponeMaster {...props} />;
      default: return null;
          }
          
  };

  const tabs = [
    { id: 'locations', label: '1.1 இடம் (Location)' },
    { id: 'staff', label: '1.2 பணியாளர்கள் (Staff)' },
    { id: 'topics', label: '1.3 சிந்தனை (Reflection)' },
    { id: 'thirukkural', label: '1.4 திருக்குறள் (Kural)' },
    { id: 'sharing', label: '1.5 பகிர்வு (Sharing)' },
    { id: 'postpone', label: '1.6 ஒத்திவைப்பு (Postpone)' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-indigo-600 p-2 rounded-xl text-white">
          <ListTree size={20} />
        </div>
        <h2 className="text-2xl font-black text-slate-900">1. முதன்மைப் பதிவுகள் (Master Entry)</h2>
      </div>

      <div className="bg-slate-200/50 p-1.5 rounded-2xl flex flex-wrap gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === tab.id 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm min-h-[600px]">
        {renderContent()}
      </div>
    </div>
  );
};

const CSVActions: React.FC<{ 
  onUpload: (data: any[]) => void; 
  templateData: any[]; 
  fileName: string;
}> = ({ onUpload, templateData, fileName }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${fileName}_template.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      if (jsonData.length === 0) throw new Error("கோப்பு காலியாக உள்ளது (File is empty)");
      onUpload(jsonData);
    } catch (err: any) {
      alert(`பிழை: ${err.message || "கோப்பை வாசிப்பதில் சிக்கல்"}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2 items-center">
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors"
        >
          <Download size={14} /> மாதிரி Excel
        </button>
        <label className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 cursor-pointer transition-colors">
          <Upload size={14} /> பதிவேற்றம்
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} />
        </label>
      </div>
    </div>
  );
};

const LocationMaster: React.FC<MasterDataProps> = ({ locations, setLocations, onSync }) => {
  const [name, setName] = useState('');
  const [excluded, setExcluded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = () => {
    if (!name) return;
    if (editingId) {
      const updatedList =locations.map((l => l.id === editingId ? { ...l, name: name.trim(), excludedFromSchedule: excluded } : l));

      setLocations(updatedList);
      onSync('location',updatedList);
      setEditingId(null);
            
    } else {
      const newLocation={id: Date.now().toString(), name: name.trim(), excludedFromSchedule: excluded };
      const updatedList =[...locations, newLocation];
      setLocations(updatedList)
      onSync('locations', updatedList);
    }
    setName('');
    setExcluded(false);
  };

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setName(loc.name);
    setExcluded(!!loc.excludedFromSchedule);
  };

  const toggleExcluded = (id: string) => {
    setLocations(locations.map(l => l.id === id ? { ...l, excludedFromSchedule: !l.excludedFromSchedule } : l));
    onSync('locations', locations);
  };

  const handleCSVUpload = (data: any[]) => {
    const newLocs = data.filter(row => row.name).map(row => ({ 
      id: Math.random().toString(36).substr(2, 9), 
      name: String(row.name).trim(),
      excludedFromSchedule: row.excluded === 'yes' || row.excluded === 'true' || !!row.excludedFromSchedule
    }));
    setLocations(prev => [...prev, ...newLocs]);
    onSync('locations', locations);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h3 className="text-2xl font-black">1.1 இடங்கள் (Location Master)</h3>
          <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-1">
            <Keyboard size={12} /> ஆங்கிலத்தில் தட்டச்சு செய்து 'Space' அழுத்தினால் தமிழில் மாறும்.
          </p>
        </div>
        <CSVActions fileName="locations" templateData={[{ name: "Chennai", excluded: "no" }]} onUpload={handleCSVUpload} />
      </div>
      
      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner space-y-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">இடத்தின் பெயர்</label>
            <TamilInput
              value={name}
              onChange={setName}
              placeholder="எ.கா. Trichy, Madurai..."
              className="w-full border rounded-2xl px-5 py-3.5 text-lg font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
            />
          </div>
          <div className="md:w-64 space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">பயன்பாட்டு முறை</label>
            <div className="flex bg-white border rounded-2xl p-1 h-[58px]">
              <button 
                onClick={() => setExcluded(false)}
                className={`flex-1 rounded-xl text-[11px] font-black transition-all ${!excluded ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                அனைத்தும்
              </button>
              <button 
                onClick={() => setExcluded(true)}
                className={`flex-1 rounded-xl text-[11px] font-black transition-all ${excluded ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                வருகை மட்டும்
              </button>
            </div>
          </div>
          <div className="flex items-end">
            <button onClick={save} className="h-[58px] bg-indigo-600 text-white px-8 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">
              {editingId ? "மாற்று" : "சேர்"}
            </button>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
          <AlertCircle className="text-indigo-600 mt-0.5 shrink-0" size={16} />
          <p className="text-xs text-indigo-700 font-medium leading-relaxed">
            <span className="font-black">வருகை மட்டும் (Attendance Only):</span> இந்த இடத்தைத் தேர்வு செய்தால், இது பகிர்வு (Sharing) மற்றும் அட்டவணையில் வராது. ஆனால் வருகைப்பதிவில் (Attendance) இந்த இடத்தைப் பயன்படுத்த முடியும்.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map(l => (
          <div key={l.id} className={`group flex justify-between items-center p-5 rounded-3xl border transition-all ${l.excludedFromSchedule ? 'border-orange-200 bg-orange-50/20 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-lg'}`}>
            <div className="flex flex-col gap-1.5">
              <span className={`text-lg font-black ${l.excludedFromSchedule ? 'text-slate-500' : 'text-slate-900'}`}>{l.name}</span>
              {l.excludedFromSchedule ? (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black rounded-lg w-fit border border-orange-200 uppercase tracking-tighter">வருகைப்பதிவுக்கு மட்டும்</span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-lg w-fit border border-emerald-200 uppercase tracking-tighter">அட்டவணையில் உண்டு</span>
              )}
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => toggleExcluded(l.id)} 
                title={l.excludedFromSchedule ? "அட்டவணையில் சேர்" : "வருகைப்பதிவுக்கு மட்டும் மாற்று"}
                className={`p-2 rounded-xl transition-all ${l.excludedFromSchedule ? 'text-orange-500 bg-orange-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
              >
                {l.excludedFromSchedule ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
              <button onClick={() => startEdit(l)} className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Edit size={18}/></button>
              <button onClick={() => setLocations(locations.filter(loc => loc.id !== l.id))} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StaffMaster: React.FC<MasterDataProps> = ({ staff, setStaff, locations, onSync }) => {
  const [form, setForm] = useState<{
    name: string;
    locationId: string;
    additionalLocationIds: string[];
    category: StaffCategory;
    meetId: string;
    status: StaffStatus;
  }>({ 
    name: '', 
    locationId: '', 
    additionalLocationIds: [],
    category: StaffCategory.Permanent, 
    meetId: '',
    status: 'Working'
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLoc, setFilterLoc] = useState('all');
  const [filterCat, setFilterCat] = useState('all');

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = filterLoc === 'all' || s.locationId === filterLoc;
      const matchesCategory = filterCat === 'all' || s.category === filterCat;
      return matchesSearch && matchesLocation && matchesCategory;
    });
  }, [staff, searchTerm, filterLoc, filterCat]);

  const save = () => {
    if (!form.name || !form.locationId) return;
    if (editingId) {
      setStaff(staff.map(s => s.id === editingId ? { ...s, ...form } : s));
      setEditingId(null);
      onSync('staff', staff);
    } else {
      setStaff([...staff, { ...form, id: Date.now().toString() }]);

    }
    setForm({ 
      name: '', 
      locationId: '', 
      additionalLocationIds: [],
      category: StaffCategory.Permanent, 
      meetId: '',
      status: 'Working'
    });
  };

  const startEdit = (s: Staff) => {
    setEditingId(s.id);
    setForm({ 
      name: s.name, 
      locationId: s.locationId, 
      additionalLocationIds: s.additionalLocationIds || [],
      category: s.category, 
      meetId: s.meetId || '',
      status: s.status || 'Working'
    });
  };

  const handleCSVUpload = (data: any[]) => {
    if (data.length === 0) return;
    const normalize = (str: any) => String(str || '').toLowerCase().trim().replace(/[^\x20-\x7E\u0B80-\u0BFF]/g, '').replace(/[\s_]/g, '');

    const getRowValue = (row: any, candidates: string[]) => {
      const keys = Object.keys(row);
      const normalizedCandidates = candidates.map(c => normalize(c));
      for (const key of keys) {
        if (normalizedCandidates.includes(normalize(key))) return row[key];
      }
      return null;
    };

    const processedStaff: Staff[] = [];

    data.forEach((row, index) => {
      const rawName = getRowValue(row, ['name', 'staffname', 'staff_name', 'பணியாளர்']);
      const rawLoc = getRowValue(row, ['location', 'location_name', 'place', 'இடம்']);
      const rawCategory = getRowValue(row, ['category', 'designation', 'role', 'பிரிவு']);
      const rawMeetId = getRowValue(row, ['meet_id', 'meetid', 'email', 'email_id']);
      const rawStatus = getRowValue(row, ['status', 'நிலை']);
      const rawAdditional = getRowValue(row, ['additional_locations', 'other_locations', 'கூடுதல்_இடம்']);

      if (!rawName || !rawLoc) return;

      const loc = locations.find(l => normalize(l.name) === normalize(rawLoc));
      if (!loc) return;

      const additionalLocs: string[] = [];
      if (rawAdditional) {
        const names = String(rawAdditional).split(/[,;]/).map(n => normalize(n));
        names.forEach(name => {
          const found = locations.find(l => normalize(l.name) === name);
          if (found) additionalLocs.push(found.id);
        });
      }

      let finalCategory = StaffCategory.Permanent;
      const normalizedCat = normalize(rawCategory);
      if (CATEGORY_MAP[normalizedCat]) {
        finalCategory = CATEGORY_MAP[normalizedCat];
      }

      processedStaff.push({
        id: Math.random().toString(36).substr(2, 9),
        name: String(rawName).trim(),
        locationId: loc.id,
        additionalLocationIds: additionalLocs,
        category: finalCategory,
        meetId: String(rawMeetId || '').trim(),
        status: (['working', 'notworking', 'longleave'].includes(normalize(rawStatus)) ? rawStatus : 'Working') as StaffStatus
      });
    });

    if (processedStaff.length > 0) {
      setStaff(prev => [...prev, ...processedStaff]);
      onSync('staff', staff);
      alert(`${processedStaff.length} பணியாளர்கள் சேர்க்கப்பட்டனர்.`);
    }
  };

  const toggleAdditionalLoc = (locId: string) => {
    setForm(prev => ({
      ...prev,
      additionalLocationIds: prev.additionalLocationIds.includes(locId)
        ? prev.additionalLocationIds.filter(id => id !== locId)
        : [...prev.additionalLocationIds, locId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h3 className="text-2xl font-black">1.2 பணியாளர்கள் (Staff Master)</h3>
          <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-1">
            <Keyboard size={12} /> ஆங்கிலத்தில் தட்டச்சு செய்து 'Space' அழுத்தினால் தமிழில் மாறும்.
          </p>
        </div>
        <CSVActions 
          fileName="staff" 
          templateData={[{ name: "Kumaresan", location: "Chennai", category: "Permanent", status: "Working", meet_id: "kumar@email.com" }]} 
          onUpload={handleCSVUpload} 
        />
      </div>
      
      <div className="bg-slate-50 p-6 rounded-3xl border space-y-4 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">பெயர்</label>
            <TamilInput 
              value={form.name} 
              onChange={val => setForm({...form, name: val})} 
              placeholder="பெயர்" 
              className="w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">முதன்மை இடம் (Primary Location)</label>
            <select value={form.locationId} onChange={e => setForm({...form, locationId: e.target.value})} className="w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold">
              <option value="">தேர்ந்தெடுக்கவும்</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.excludedFromSchedule ? '(வருகை மட்டும்)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">பிரிவு</label>
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value as StaffCategory})} className="w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              {Object.values(StaffCategory).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500">நிலை (Status)</label>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value as StaffStatus})} className="w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="Working">பணியில்</option>
              <option value="Not Working">பணியில் இல்லை</option>
              <option value="Long Leave">விடுமுறை</option>
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-bold text-slate-500">Meet ID (Email)</label>
            <input type="text" value={form.meetId} onChange={e => setForm({...form, meetId: e.target.value})} placeholder="example@gmail.com" className="w-full border rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <div className="space-y-2 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <label className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
            <MapPin size={14} /> கூடுதல் பொறுப்பு இடங்கள் (Additional Responsibility Locations)
          </label>
          <div className="max-h-32 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 no-scrollbar p-1">
            {locations.filter(l => l.id !== form.locationId).map(l => (
              <label 
                key={l.id} 
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-[11px] font-bold ${
                  form.additionalLocationIds.includes(l.id) 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                    : 'bg-slate-50 text-slate-500 hover:border-indigo-300'
                }`}
              >
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={form.additionalLocationIds.includes(l.id)} 
                  onChange={() => toggleAdditionalLoc(l.id)} 
                />
                {l.name}
              </label>
            ))}
          </div>
        </div>

        <button onClick={save} className="w-full bg-indigo-600 text-white rounded-2xl font-black py-3 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]">
          {editingId ? "பணியாளர் விபரங்களை புதுப்பிக்கவும்" : "புதிய பணியாளரை சேர்க்கவும்"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-3xl border shadow-sm bg-white">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500">பெயர்</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500">இடம் (Primary & Additional)</th>
              <th className="p-4 font-black uppercase text-[10px] text-slate-500">பிரிவு</th>
              <th className="p-4 text-right font-black uppercase text-[10px] text-slate-500">செயல்கள்</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4">
                  <div className="font-black text-slate-900">{s.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{s.meetId}</div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-black border border-indigo-100">
                      {locations.find(l => l.id === s.locationId)?.name}
                    </span>
                    {(s.additionalLocationIds || []).map(id => (
                      <span key={id} className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded text-[10px] font-bold border border-slate-100" title="கூடுதல் பொறுப்பு">
                        {locations.find(l => l.id === id)?.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${s.status === 'Working' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {s.category}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => startEdit(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit size={16}/></button>
                    <button onClick={() => setStaff(staff.filter(st => st.id !== s.id))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TopicMaster: React.FC<MasterDataProps> = ({ topics, setTopics, onSync }) => {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = () => {
    if (!name) return;
    if (editingId) {
      setTopics(topics.map(t => t.id === editingId ? { ...t, name: name.trim() } : t));
      setEditingId(null);
      onSync('topics', topics);
    } else {
      setTopics([...topics, { id: Date.now().toString(), name: name.trim() }]);
      onSync('topics', topics);
    }
    setName('');
  };

  const startEdit = (t: Topic) => {
    setEditingId(t.id);
    setName(t.name);
  };

  const handleCSVUpload = (data: any[]) => {
    const newTopics = data.filter(row => row.name || row.topic || row.தலைப்பு).map(row => ({ 
      id: Math.random().toString(36).substr(2, 9), 
      name: String(row.name || row.topic || row.தலைப்பு).trim()
    }));
    setTopics(prev => [...prev, ...newTopics]);
    onSync('topics', topics);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h3 className="text-2xl font-black">1.3 சிந்தனை (Reflection Master)</h3>
          <p className="text-[10px] text-indigo-600 font-bold mt-1">சிந்தனைத் தலைப்புகளை இங்கு பதிவு செய்யவும்.</p>
        </div>
        <CSVActions fileName="topics" templateData={[{ name: "Education (கல்வி)" }]} onUpload={handleCSVUpload} />
      </div>
      <div className="flex gap-3 max-w-xl">
        <TamilInput value={name} onChange={setName} placeholder="தலைப்பு" className="flex-1 border rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={save} className="bg-indigo-600 text-white px-6 rounded-2xl font-bold hover:bg-indigo-700 transition-colors">
          {editingId ? <Check /> : <Plus />}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topics.map(t => (
          <div key={t.id} className="flex justify-between items-center p-4 bg-slate-50 border rounded-2xl">
            <span className="font-bold">{t.name}</span>
            <div className="flex gap-2">
              <button onClick={() => startEdit(t)} className="text-slate-400 hover:text-indigo-600"><Edit size={16}/></button>
              <button onClick={() => setTopics(topics.filter(tp => tp.id !== t.id))} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ThirukkuralMaster: React.FC<MasterDataProps> = ({ thirukkurals, setThirukkurals, topics, onSync }) => {
  const [topicId, setTopicId] = useState('');
  const [verse, setVerse] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const save = () => {
    if (!topicId || !verse) return;
    if (editingId) {
      setThirukkurals(thirukkurals.map(k => k.id === editingId ? { ...k, topicId, verse: verse.trim() } : k));
      setEditingId(null);
      onSync('thirukurals', thirukkurals);
    } else {
      setThirukkurals([...thirukkurals, { id: Date.now().toString(), topicId, verse: verse.trim() }]);
      onSync('thirukurals', thirukkurals);
    }
    setVerse('');
  };

  const handleCSVUpload = (data: any[]) => {
    const normalize = (str: any) => String(str || '').toLowerCase().trim();
    const newKurals: Thirukkural[] = [];
    
    data.forEach(row => {
      const rowTopic = String(row.topic || row.name || row.தலைப்பு || '').trim();
      const rowVerse = String(row.verse || row.kural || row.குறள் || '').trim();
      
      if (!rowVerse) return;

      let foundTopicId = topicId;
      if (rowTopic) {
        const topicObj = topics.find(t => normalize(t.name) === normalize(rowTopic));
        if (topicObj) foundTopicId = topicObj.id;
      }

      if (foundTopicId) {
        newKurals.push({
          id: Math.random().toString(36).substr(2, 9),
          topicId: foundTopicId,
          verse: rowVerse
        });
      }
    });

    setThirukkurals(prev => [...prev, ...newKurals]);
    onSync('thirukurals', thirukkurals);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-6">
        <div>
          <h3 className="text-2xl font-black">1.4 திருக்குறள் (Kural Master)</h3>
        </div>
        <CSVActions 
          fileName="thirukkural" 
          templateData={[{ topic: "கல்வி", verse: "கற்க கசடறக் கற்பவை கற்றபின் நிற்க அதற்குத் தக." }]} 
          onUpload={handleCSVUpload} 
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border">
          <select value={topicId} onChange={e => setTopicId(e.target.value)} className="w-full border rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">சிந்தனைத் தலைப்பு</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <TamilInput type="textarea" value={verse} onChange={setVerse} placeholder="குறள்" className="w-full border rounded-2xl px-5 py-3 h-32 outline-none resize-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={save} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold">
            {editingId ? "புதுப்பிக்கவும்" : "சேர்க்கவும்"}
          </button>
        </div>
        <div className="space-y-4 max-h-[450px] overflow-y-auto no-scrollbar">
          {thirukkurals.map(tk => (
            <div key={tk.id} className="p-5 bg-white border rounded-2xl flex justify-between gap-4 shadow-sm">
              <div className="flex-1">
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{topics.find(t => t.id === tk.topicId)?.name}</span>
                <p className="font-bold text-slate-800 mt-2">{tk.verse}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => setThirukkurals(thirukkurals.filter(k => k.id !== tk.id))} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SharingMaster: React.FC<MasterDataProps> = ({ sharingConfigs, setSharingConfigs, locations, onSync }) => {
  const [day, setDay] = useState(ENGLISH_DAYS[0]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  
  // Explicitly exclude locations marked as 'excludedFromSchedule' from being selectable
  const activeLocations = useMemo(() => locations.filter(l => !l.excludedFromSchedule), [locations]);

  const save = () => {
    if (selectedLocations.length === 0) return;
    const existingIndex = sharingConfigs.findIndex(c => c.day === day);
    if (existingIndex >= 0) {
      const updated = [...sharingConfigs];
      updated[existingIndex] = { day, locationIds: selectedLocations };
      setSharingConfigs(updated);
      onSync('sharingConfigs', sharingConfigs);
    } else {
      setSharingConfigs([...sharingConfigs, { day, locationIds: selectedLocations }]);
      onSync('sharingConfigs', sharingConfigs);
    }
    setSelectedLocations([]);
    onSync('sharingConfigs', sharingConfigs);
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-6">
        <h3 className="text-2xl font-black">1.5 பகிர்வு இடங்கள் (Sharing Config)</h3>
        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Selected locations will rotate in the schedule.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6 bg-slate-50 p-6 rounded-3xl border shadow-inner">
          <div className="space-y-1">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">கிழமை</label>
             <select value={day} onChange={e => setDay(e.target.value)} className="w-full border rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold">
               {ENGLISH_DAYS.map((d, i) => <option key={d} value={d}>{TAMIL_DAYS[i]}</option>)}
             </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">இடங்கள் தேர்வு</label>
            <div className="grid grid-cols-2 gap-2 h-52 overflow-y-auto p-4 border rounded-2xl bg-white no-scrollbar">
              {activeLocations.map(l => (
                <label key={l.id} className={`p-2.5 text-[11px] rounded-xl cursor-pointer flex items-center gap-2 border transition-all ${selectedLocations.includes(l.id) ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-sm' : 'bg-slate-50 text-slate-600 hover:border-indigo-300'}`}>
                  <input type="checkbox" className="hidden" checked={selectedLocations.includes(l.id)} onChange={() => setSelectedLocations(prev => prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id])} /> {l.name}
                </label>
              ))}
              {activeLocations.length === 0 && <div className="col-span-2 flex flex-col items-center justify-center h-full text-slate-300 text-xs font-bold gap-2"><MapPin size={24} /> இடங்கள் எதுவும் இல்லை</div>}
            </div>
          </div>
          <button onClick={save} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95">விதிமுறை சேமிக்கவும்</button>
        </div>
        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">தற்போதைய விதிமுறைகள்</h4>
          {sharingConfigs.map(config => (
            <div key={config.day} className="flex justify-between items-center p-5 bg-white border border-slate-100 rounded-3xl shadow-sm hover:border-indigo-100 transition-all">
              <div className="flex flex-col gap-1">
                <span className="font-black text-slate-900">{TAMIL_DAYS[ENGLISH_DAYS.indexOf(config.day)]}</span>
                <span className="text-[10px] font-bold text-slate-400">{config.locationIds.length} இடங்கள் இணைக்கப்பட்டுள்ளன</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setDay(config.day);
                    setSelectedLocations(config.locationIds);
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button onClick={() => setSharingConfigs(sharingConfigs.filter(c => c.day !== config.day))} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
          {sharingConfigs.length === 0 && <div className="p-12 text-center text-slate-300 font-bold border-2 border-dashed rounded-3xl">விதிமுறைகள் எதுவும் இல்லை</div>}
        </div>
      </div>
    </div>
  );
};

const PostponeMaster: React.FC<MasterDataProps> = ({ postponedDates, setPostponedDates, onSync }) => {
  const [orig, setOrig] = useState('');
  const [newD, setNewD] = useState('');

  const save = () => {
    if (!orig || !newD) return;
    setPostponedDates([...postponedDates, { originalDate: orig, newDate: newD }]);
    onSync('postponeddates', postponedDates);
    setOrig(''); setNewD('');
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-6">
        <h3 className="text-2xl font-black">1.6 ஒத்திவைப்பு (Postpone Master)</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4 bg-slate-50 p-6 rounded-3xl border">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">இருந்த தேதி</label>
            <input type="date" value={orig} onChange={e => setOrig(e.target.value)} className="w-full border rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">மாற்றிய தேதி</label>
            <input type="date" value={newD} onChange={e => setNewD(e.target.value)} className="w-full border rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
          </div>
          <button onClick={save} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black mt-2">ஒத்திவைக்க</button>
        </div>
        <div className="space-y-3">
          {postponedDates.map((p, idx) => (
            <div key={idx} className="flex justify-between items-center p-4 bg-white border rounded-2xl shadow-sm">
              <span className="text-xs font-mono font-bold text-slate-600">{p.originalDate} → {p.newDate}</span>
              <button onClick={() => setPostponedDates(postponedDates.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MasterData;