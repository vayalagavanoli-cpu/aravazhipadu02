import React, { useState, useEffect } from 'react';
import { 
  Users, MapPin, BookOpen, BookText, CalendarRange, 
  Clock, LayoutDashboard, FileSpreadsheet, UserCheck 
} from 'lucide-react';
import MasterData from './components/MasterData';
import Scheduler from './components/Scheduler';
import AttendanceTracker from './components/AttendanceTracker';
import { Location, Staff, Topic, Thirukkural, SharingConfig, PostponedDate, AttendanceRecord } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'schedule' | 'attendance'>('dashboard');
  
  // States
  const [locations, setLocations] = useState<Location[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [thirukkurals, setThirukkurals] = useState<Thirukkural[]>([]);
  const [sharingConfigs, setSharingConfigs] = useState<SharingConfig[]>([]);
  const [postponedDates, setPostponedDates] = useState<PostponedDate[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [globalLeaveDays, setGlobalLeaveDays] = useState<Record<string, number[]>>({});

  // 1. Load Data from Cloudflare D1 on Startup
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch('/api'); // Calls functions/api/index.js (onRequestGet)
        if (!response.ok) throw new Error('Failed to fetch');
        
        const result = await response.json() as any;
        
        if (result.locations) setLocations(result.locations);
        if (result.staff) setStaff(result.staff);
        if (result.topics) setTopics(result.topics);
        if (result.thirukkurals) setThirukkurals(result.thirukkurals);
        if (result.attendance_records) setAttendanceRecords(result.attendance_records);
        if (result.postponed_dates) setPostponedDates(result.postponed_dates);
        if (result.sharing_configs) setSharingConfigs(result.sharing_configs);
        
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    loadInitialData();
  }, []);

  // 2. Sync Data to Cloudflare D1
  const syncToCloud = async (type: string, data: any) => {
    try {
      const res = await fetch('/api', { 
        method: 'POST', // Calls functions/api/index.js (onRequestPost)
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });
      
      if (!res.ok) {
        const err = await res.text();
        console.error("Sync Error:", err);
        alert("டேட்டா சேமிப்பதில் சிக்கல் (Sync Failed)");
      } else {
        console.log(`${type} synced successfully`);
      }
    } catch (error) {
      console.error(`Network error syncing ${type}:`, error);
      alert("Network Error");
    }
  };
  
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <CalendarRange className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">அறவழிபாடு</h1>
            </div>
            
            <nav className="flex items-center gap-1">
              <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="முகப்பு" />
              <NavButton active={activeTab === 'master'} onClick={() => setActiveTab('master')} icon={<FileSpreadsheet size={20} />} label="முதன்மைப் பதிவுகள்" />
              <NavButton active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={<Clock size={20} />} label="அட்டவணை" />
              <NavButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={<UserCheck size={20} />} label="வருகைப்பதிவு" />
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard title="பணியாளர்கள்" count={staff.length} icon={<Users className="text-blue-500" />} onClick={() => setActiveTab('master')} />
              <DashboardCard title="இடங்கள்" count={locations.length} icon={<MapPin className="text-emerald-500" />} onClick={() => setActiveTab('master')} />
              <DashboardCard title="சிந்தனை" count={topics.length} icon={<BookOpen className="text-orange-500" />} onClick={() => setActiveTab('master')} />
              <DashboardCard title="திருக்குறள்" count={thirukkurals.length} icon={<BookText className="text-indigo-500" />} onClick={() => setActiveTab('master')} />
            </div>
          </div>
        )}

        {activeTab === 'master' && (
          <MasterData 
            locations={locations} setLocations={setLocations}
            staff={staff} setStaff={setStaff}
            topics={topics} setTopics={setTopics}
            thirukkurals={thirukkurals} setThirukkurals={setThirukkurals}
            sharingConfigs={sharingConfigs} setSharingConfigs={setSharingConfigs}
            postponedDates={postponedDates} setPostponedDates={setPostponedDates}
            onSync={syncToCloud} 
          />
        )}

        {activeTab === 'schedule' && (
          <Scheduler 
            locations={locations} staff={staff} topics={topics} thirukkurals={thirukkurals}
            sharingConfigs={sharingConfigs} postponedDates={postponedDates}
            globalLeaveDays={globalLeaveDays} setGlobalLeaveDays={setGlobalLeaveDays}
            onSync={syncToCloud} 
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceTracker
            staff={staff} locations={locations}
            records={attendanceRecords} setRecords={setAttendanceRecords}
            onSync={syncToCloud} 
          />
        )}
      </main>
    </div>
  );
};

// Helper Components
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${active ? 'text-indigo-600 bg-indigo-50 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
    <span>{icon}</span><span className="text-sm font-medium">{label}</span>
  </button>
);

const DashboardCard: React.FC<{ title: string; count: number; icon: React.ReactNode; onClick: () => void }> = ({ title, count, icon, onClick }) => (
  <div onClick={onClick} className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-xl hover:border-indigo-100 transition-all">
    <div className="space-y-1"><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p><p className="text-3xl font-black text-slate-900">{count}</p></div>
    <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">{icon}</div>
  </div>
);

export default App;