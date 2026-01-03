
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  BookOpen, 
  BookText, 
  CalendarRange, 
  Clock, 
  LayoutDashboard,
  FileSpreadsheet,
  UserCheck
} from 'lucide-react';
import MasterData from './components/MasterData';
import Scheduler from './components/Scheduler';
import AttendanceTracker from './components/AttendanceTracker';
import { Location, Staff, Topic, Thirukkural, SharingConfig, PostponedDate, AttendanceRecord } from './types';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API
const API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string);

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'schedule' | 'attendance'>('dashboard');
  
  const [locations, setLocations] = useState<Location[]>(() => {
    const saved = localStorage.getItem('locations');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [staff, setStaff] = useState<Staff[]>(() => {
    const saved = localStorage.getItem('staff');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [topics, setTopics] = useState<Topic[]>(() => {
    const saved = localStorage.getItem('topics');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [thirukkurals, setThirukkurals] = useState<Thirukkural[]>(() => {
    const saved = localStorage.getItem('thirukkurals');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [sharingConfigs, setSharingConfigs] = useState<SharingConfig[]>(() => {
    const saved = localStorage.getItem('sharingConfigs');
    return saved ? JSON.parse(saved) : [];
  });

  const [postponedDates, setPostponedDates] = useState<PostponedDate[]>(() => {
    const saved = localStorage.getItem('postponedDates');
    return saved ? JSON.parse(saved) : [];
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('attendanceRecords');
    return saved ? JSON.parse(saved) : [];
  });

  // Store leave days as Record<"YYYY-MM", number[]>
  const [globalLeaveDays, setGlobalLeaveDays] = useState<Record<string, number[]>>(() => {
    const saved = localStorage.getItem('globalLeaveDays');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('locations', JSON.stringify(locations));
    localStorage.setItem('staff', JSON.stringify(staff));
    localStorage.setItem('topics', JSON.stringify(topics));
    localStorage.setItem('thirukkurals', JSON.stringify(thirukkurals));
    localStorage.setItem('sharingConfigs', JSON.stringify(sharingConfigs));
    localStorage.setItem('postponedDates', JSON.stringify(postponedDates));
    localStorage.setItem('globalLeaveDays', JSON.stringify(globalLeaveDays));
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
  }, [locations, staff, topics, thirukkurals, sharingConfigs, postponedDates, globalLeaveDays, attendanceRecords]);

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
              <NavButton 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
                icon={<LayoutDashboard size={20} />} 
                label="முகப்பு" 
              />
              <NavButton 
                active={activeTab === 'master'} 
                onClick={() => setActiveTab('master')} 
                icon={<FileSpreadsheet size={20} />} 
                label="முதன்மைப் பதிவுகள்" 
              />
              <NavButton 
                active={activeTab === 'schedule'} 
                onClick={() => setActiveTab('schedule')} 
                icon={<Clock size={20} />} 
                label="அட்டவணை" 
              />
              <NavButton 
                active={activeTab === 'attendance'} 
                onClick={() => setActiveTab('attendance')} 
                icon={<UserCheck size={20} />} 
                label="வருகைப்பதிவு" 
              />
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard 
                title="பணியாளர்கள்" 
                count={staff.length} 
                icon={<Users className="text-blue-500" />} 
                onClick={() => setActiveTab('master')}
              />
              <DashboardCard 
                title="இடங்கள்" 
                count={locations.length} 
                icon={<MapPin className="text-emerald-500" />} 
                onClick={() => setActiveTab('master')}
              />
              <DashboardCard 
                title="சிந்தனை" 
                count={topics.length} 
                icon={<BookOpen className="text-orange-500" />} 
                onClick={() => setActiveTab('master')}
              />
              <DashboardCard 
                title="திருக்குறள்" 
                count={thirukkurals.length} 
                icon={<BookText className="text-indigo-500" />} 
                onClick={() => setActiveTab('master')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-8">
                 <div className="flex-1 space-y-4">
                   <h3 className="text-2xl font-bold text-slate-900">அறவழிபாடு திட்டம்</h3>
                   <p className="text-slate-600">இந்த மாதத்திற்கான பகிர்வுகளைத் திட்டமிட்டு எக்செல் கோப்பாகப் பதிவிறக்கவும்.</p>
                   <button 
                    onClick={() => setActiveTab('schedule')}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                   >
                     அட்டவணைக்குச் செல்லவும்
                   </button>
                 </div>
              </div>
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-8">
                 <div className="flex-1 space-y-4">
                   <h3 className="text-2xl font-bold text-slate-900">வருகைப்பதிவு</h3>
                   <p className="text-slate-600">கூகுள் மீட் வருகைப்பதிவை மேலாண்மை செய்து அறிக்கை பெறவும்.</p>
                   <button 
                    onClick={() => setActiveTab('attendance')}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                   >
                     வருகைப்பதிவுக்குச் செல்லவும்
                   </button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'master' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <MasterData 
              locations={locations} setLocations={setLocations}
              staff={staff} setStaff={setStaff}
              topics={topics} setTopics={setTopics}
              thirukkurals={thirukkurals} setThirukkurals={setThirukkurals}
              sharingConfigs={sharingConfigs} setSharingConfigs={setSharingConfigs}
              postponedDates={postponedDates} setPostponedDates={setPostponedDates}
            />
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <Scheduler 
              locations={locations}
              staff={staff}
              topics={topics}
              thirukkurals={thirukkurals}
              sharingConfigs={sharingConfigs}
              postponedDates={postponedDates}
              globalLeaveDays={globalLeaveDays}
              setGlobalLeaveDays={setGlobalLeaveDays}
            />
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <AttendanceTracker
              staff={staff}
              locations={locations}
              records={attendanceRecords}
              setRecords={setAttendanceRecords}
            />
          </div>
        )}
      </main>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ 
  active, onClick, icon, label 
}) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
      active 
        ? 'text-indigo-600 bg-indigo-50 font-bold' 
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`}
  >
    <span>{icon}</span>
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const DashboardCard: React.FC<{ title: string; count: number; icon: React.ReactNode; onClick: () => void }> = ({ 
  title, count, icon, onClick 
}) => (
  <div 
    onClick={onClick}
    className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:shadow-xl hover:border-indigo-100 transition-all"
  >
    <div className="space-y-1">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-black text-slate-900">{count}</p>
    </div>
    <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
      {icon}
    </div>
  </div>
);

export default App;
