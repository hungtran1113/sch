import React, { useState, useEffect, useMemo } from 'react';
import { format, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ApiClient, Booking } from './apiClient';
import { getCurrentWeek, getNextWeek, getPrevWeek, getDaysOfWeek, getWeekId, parseWeekId, generateWeekOptions } from './utils';
import { Calendar, ChevronLeft, ChevronRight, Save, X, Users, Download, CheckCircle2, MessageSquare, Eye, FileCode, Moon, Sun, BotMessageSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel, TextRun } from 'docx';
import TravelPlanner from './TravelPlanner';
import AIChat from './AIChat';
import Effects from './Effects';

const TIME_SLOTS = ['Nội dung trong ngày'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'work' | 'travel' | 'chat'>('work'); 
  const [currentUser, setCurrentUser] = useState<{userId: string, username: string, color?: string} | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const [currentWeek, setCurrentWeek] = useState(getCurrentWeek());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingBookings, setPendingBookings] = useState<{date: string, slotIndex: number, content: string, isDelete?: boolean}[]>([]);
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [noteModal, setNoteModal] = useState<{date: string, slotIndex: number} | null>(null);
  const [tempNote, setTempNote] = useState('');
  const [viewMoreModal, setViewMoreModal] = useState<{date: string, slotIndex: number} | null>(null);
  
  const [loading, setLoading] = useState(false);
  const isAdmin = currentUser?.username === 'hiep14082005';
  const [isManageUsersOpen, setIsManageUsersOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  const handleOpenManageUsers = async () => { try { setUsersList(await ApiClient.getUsers()); setIsManageUsersOpen(true); } catch (e) { alert("Lỗi"); } };
  const handleDeleteUser = async (id: string) => { if (!window.confirm("Xóa tài khoản này?")) return; try { await ApiClient.deleteUser(id); setUsersList(usersList.filter(u => u._id !== id)); setBookings(await ApiClient.getBookings(getWeekId(currentWeek))); } catch (e) { alert("Lỗi"); } };
  
  const handleExportExcelAdmin = async () => { 
    try { 
        setLoading(true); 
        const targetWeeks = [getPrevWeek(currentWeek), currentWeek, getNextWeek(currentWeek)];
        const allData = await ApiClient.getAllBookingsForExport(); 
        const excelData: any[] = [];
        for (const week of targetWeeks) {
            const weekIdStr = getWeekId(week); const days = getDaysOfWeek(week);
            excelData.push({ 'Tuần': `--- TUẦN ${weekIdStr} ---`, 'Ngày': '', 'Thứ': '', 'Người Đăng Ký': '', 'Nội Dung': '' });
            let weekUsers = new Set<string>();
            for (const day of days) {
                const dayBookings = allData.filter(b => isSameDay(new Date(b.date), day));
                if (dayBookings.length === 0) { excelData.push({ 'Tuần': weekIdStr, 'Ngày': format(day, 'dd/MM/yyyy'), 'Thứ': format(day, 'EEEE', { locale: vi }), 'Người Đăng Ký': '(Trống)', 'Nội Dung': '' }); } 
                else { dayBookings.forEach(b => { weekUsers.add(b.userId?.username); excelData.push({ 'Tuần': weekIdStr, 'Ngày': format(day, 'dd/MM/yyyy'), 'Thứ': format(day, 'EEEE', { locale: vi }), 'Người Đăng Ký': b.userId?.username, 'Nội Dung': b.content || 'Đã tham gia' }); }); }
            }
            excelData.push({ 'Tuần': `Tổng kết Tuần`, 'Ngày': 'Tham gia:', 'Thứ': Array.from(weekUsers).join(', ') || 'Không có', 'Người Đăng Ký': '', 'Nội Dung': '' });
            excelData.push({ 'Tuần': '', 'Ngày': '', 'Thứ': '', 'Người Đăng Ký': '', 'Nội Dung': '' }); 
        }
        const ws = XLSX.utils.json_to_sheet(excelData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Lich_Ranh"); 
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' }), `Lich_Ranh_3_Tuan.xlsx`); 
    } catch (e) { alert("Có lỗi khi xuất file!"); } finally { setLoading(false); } 
  };

  const handleExportDocAdmin = async () => {
    try {
        setLoading(true);
        const targetWeeks = [getPrevWeek(currentWeek), currentWeek, getNextWeek(currentWeek)];
        const allData = await ApiClient.getAllBookingsForExport();
        const docChildren: any[] = [];
        for (const week of targetWeeks) {
            const weekIdStr = getWeekId(week); const days = getDaysOfWeek(week);
            docChildren.push(new Paragraph({ text: `Tuần: ${weekIdStr}`, heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
            const tableRows = [];
            tableRows.push(new TableRow({ children: [ new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thứ / Ngày", bold: true })] })] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Người tham gia & Nội dung", bold: true })] })] }) ]}));
            let weekUsers = new Set<string>();
            for (const day of days) {
                const dayBookings = allData.filter(b => isSameDay(new Date(b.date), day));
                let cellContent = [];
                if (dayBookings.length === 0) { cellContent.push(new Paragraph("(Trống)")); } 
                else { dayBookings.forEach(b => { weekUsers.add(b.userId?.username); cellContent.push(new Paragraph({ children: [ new TextRun({ text: `${b.userId?.username}: `, bold: true }), new TextRun({ text: b.content || "Đã tham gia" }) ]})); }); }
                tableRows.push(new TableRow({ children: [ new TableCell({ children: [new Paragraph({ text: `${format(day, 'EEEE', { locale: vi })}\n${format(day, 'dd/MM/yyyy')}` })] }), new TableCell({ children: cellContent }) ]}));
            }
            docChildren.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }));
            docChildren.push(new Paragraph({ children: [new TextRun({ text: `Tổng kết người tham gia: `, bold: true }), new TextRun({ text: Array.from(weekUsers).join(', ') || 'Không có' })], spacing: { before: 200, after: 400 } }));
        }
        const doc = new Document({ sections: [{ children: docChildren }] });
        saveAs(await Packer.toBlob(doc), `Lich_Ranh_3_Tuan.docx`);
    } catch(e) { alert("Lỗi xuất Word"); } finally { setLoading(false); }
  };

  const daysOfWeek = useMemo(() => getDaysOfWeek(currentWeek), [currentWeek]);
  const weekId = useMemo(() => getWeekId(currentWeek), [currentWeek]);
  const weekOptions = useMemo(() => generateWeekOptions(), []);

  useEffect(() => { const stored = localStorage.getItem('currentUser'); if (stored) setCurrentUser(JSON.parse(stored)); }, []);
  const loadBookings = async () => { try { setBookings(await ApiClient.getBookings(weekId)); } catch (err) {} };
  useEffect(() => { if (activeTab === 'work') loadBookings(); setPendingBookings([]); }, [weekId, activeTab]);
  useEffect(() => { const interval = setInterval(() => { if(activeTab === 'work' && pendingBookings.length === 0) loadBookings(); }, 5000); return () => clearInterval(interval); }, [weekId, activeTab, pendingBookings]);

  const handlePrevWeek = () => setCurrentWeek(getPrevWeek(currentWeek));
  const handleNextWeek = () => setCurrentWeek(getNextWeek(currentWeek));
  const handleCurrentWeek = () => setCurrentWeek(getCurrentWeek());
  const handleWeekSelect = (e: React.ChangeEvent<HTMLSelectElement>) => setCurrentWeek(parseWeekId(e.target.value));

  const handleToggleCheck = (date: Date, slotIndex: number, myExistingBooking: any) => {
    if (!currentUser) return alert("Vui lòng đăng nhập!");
    const dateStr = date.toISOString();
    setPendingBookings(prev => {
        const existingPending = prev.find(p => p.date === dateStr && p.slotIndex === slotIndex);
        const isCurrentlyChecked = existingPending ? !existingPending.isDelete : !!myExistingBooking;
        const newPending = prev.filter(p => !(p.date === dateStr && p.slotIndex === slotIndex));
        if (isCurrentlyChecked) newPending.push({ date: dateStr, slotIndex, content: '', isDelete: true });
        else newPending.push({ date: dateStr, slotIndex, content: '', isDelete: false }); 
        return newPending;
    });
  };

  const handleOpenNote = (date: Date, slotIndex: number, myExistingBooking: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return alert("Vui lòng đăng nhập!");
    const dateStr = date.toISOString();
    setNoteModal({ date: dateStr, slotIndex });
    setTempNote(myExistingBooking ? myExistingBooking.content : (pendingBookings.find(p => p.date === dateStr && p.slotIndex === slotIndex)?.content || ''));
  };

  const handleNoteSubmit = () => {
    if (noteModal) {
      setPendingBookings(prev => {
        const filtered = prev.filter(p => !(p.date === noteModal.date && p.slotIndex === noteModal.slotIndex));
        return [...filtered, { date: noteModal.date, slotIndex: noteModal.slotIndex, content: tempNote, isDelete: false }];
      });
      setNoteModal(null);
    }
  };

  const handleSave = async () => {
    if (pendingBookings.length === 0 || !currentUser) return;
    setLoading(true);
    try {
      for (const p of pendingBookings) await ApiClient.saveBooking(currentUser.userId, weekId, p.date, p.slotIndex, p.content, p.isDelete ? 'delete' : 'save');
      setPendingBookings([]);
      await loadBookings();
      alert("Đã lưu lịch thành công!");
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('currentUser'); };

  return (
    <div className="min-h-screen font-sans text-gray-900 dark:text-gray-100 transition-colors duration-500 relative">
      
      {/* Component Background Tách Riêng */}
      <Effects />

      <header className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl shadow-sm sticky top-0 z-30 transition-colors border-b border-white/40 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2"><Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /><h1 className="text-xl font-black tracking-tight dark:text-white">HIEP MANAGER</h1></div>
            
            <nav className="hidden md:flex bg-white/40 dark:bg-gray-800/40 p-1 rounded-xl shadow-inner border border-white/50 dark:border-gray-700/50 backdrop-blur-sm">
              <button onClick={() => setActiveTab('work')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'work' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>Lịch Rảnh</button>
              <button onClick={() => setActiveTab('travel')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'travel' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>Travel Timeline</button>
              <button onClick={() => setActiveTab('chat')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${activeTab === 'chat' ? 'bg-indigo-600 shadow-sm text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
                <BotMessageSquare size={16}/> AI Chat
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={toggleTheme} className="p-2 rounded-full bg-white/60 dark:bg-gray-800/60 text-indigo-600 dark:text-indigo-300 hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-sm border border-white/50 dark:border-gray-700">
              {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>

            {activeTab === 'work' && isAdmin && (
              <div className="hidden md:flex space-x-2">
                <button onClick={handleExportDocAdmin} className="flex items-center space-x-1 bg-blue-100/80 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-md text-xs font-bold backdrop-blur-sm"><FileCode className="w-4 h-4" /> <span>Docs</span></button>
                <button onClick={handleExportExcelAdmin} className="flex items-center space-x-1 bg-green-100/80 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-3 py-2 rounded-md text-xs font-bold backdrop-blur-sm"><Download className="w-4 h-4" /> <span>Sheets</span></button>
                <button onClick={handleOpenManageUsers} className="flex items-center space-x-1 bg-red-100/80 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-3 py-2 rounded-md text-xs font-bold backdrop-blur-sm"><Users className="w-4 h-4" /> <span>User</span></button>
              </div>
            )}
            {activeTab === 'work' && pendingBookings.length > 0 && <button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-bold flex items-center gap-2 shadow-lg shadow-green-200 dark:shadow-none"><Save className="w-4 h-4" /> Lưu Lịch</button>}
            
            {currentUser ? (
              <div className="flex items-center space-x-3 bg-white/70 dark:bg-gray-800/70 py-1 pl-3 pr-1 rounded-full border border-white/50 dark:border-gray-700 shadow-sm backdrop-blur-md">
                <div className="text-right leading-none hidden sm:block"><p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold">Tài khoản</p><p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{currentUser.username}</p></div>
                <button onClick={handleLogout} className="p-2 bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-red-600 rounded-full shadow-sm"><X className="w-4 h-4"/></button>
              </div>
            ) : (
              <div className="flex items-center space-x-2"><button onClick={() => setIsLoginModalOpen(true)} className="bg-white/80 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-bold border border-white/50 dark:border-gray-700 shadow-sm">Đăng nhập</button><button onClick={() => setIsRegisterModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none">Đăng ký</button></div>
            )}
          </div>
        </div>
        <div className="md:hidden flex border-t border-white/30 dark:border-gray-800/50 overflow-x-auto hide-scrollbar bg-white/30 dark:bg-gray-900/30 backdrop-blur-md">
          <button onClick={() => setActiveTab('work')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'work' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>Lịch Rảnh</button>
          <button onClick={() => setActiveTab('travel')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'travel' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>Timeline</button>
          <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1 ${activeTab === 'chat' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}><BotMessageSquare size={14}/> AI Chat</button>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      {activeTab === 'work' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500 relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0 bg-white/40 dark:bg-gray-900/40 p-4 rounded-2xl backdrop-blur-lg border border-white/50 dark:border-gray-700/50 shadow-sm">
            <div className="flex space-x-2">
              <button onClick={handlePrevWeek} className="flex items-center px-3 py-2 border border-white/50 dark:border-gray-600 text-sm font-bold rounded-md bg-white/70 dark:bg-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-sm"><ChevronLeft className="w-4 h-4 mr-1" /> Trước</button>
              <button onClick={handleCurrentWeek} className="px-3 py-2 border border-indigo-200 dark:border-indigo-800/50 text-sm font-bold rounded-md text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-900/50 shadow-sm">Hiện tại</button>
              <button onClick={handleNextWeek} className="flex items-center px-3 py-2 border border-white/50 dark:border-gray-600 text-sm font-bold rounded-md bg-white/70 dark:bg-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-sm">Sau <ChevronRight className="w-4 h-4 ml-1" /></button>
            </div>
            <select value={weekId} onChange={handleWeekSelect} className="block w-full sm:w-auto pl-3 pr-10 py-2 font-bold border-white/50 dark:border-gray-600 rounded-md bg-white/70 dark:bg-gray-800 dark:text-gray-200 focus:ring-indigo-500 shadow-sm">{weekOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
          </div>

          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 rounded-[2rem] overflow-hidden overflow-x-auto border border-white/40 dark:border-gray-800/50">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-8 border-b border-white/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-800/30">
                <div className="py-4 px-4 text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase border-r border-white/50 dark:border-gray-800/50">Ngày</div>
                {daysOfWeek.map((day, i) => (
                  <div key={i} className="py-4 px-4 text-center border-r border-white/50 dark:border-gray-800/50">
                    <div className="uppercase text-[10px] font-black text-indigo-600 dark:text-indigo-400 mb-1">{format(day, 'EEEE', { locale: vi })}</div>
                    <div className="text-sm font-black text-gray-900 dark:text-gray-100">{format(day, 'dd/MM')}</div>
                  </div>
                ))}
              </div>
              <div className="divide-y divide-white/50 dark:divide-gray-800/50">
                {TIME_SLOTS.map((slotName, slotIndex) => (
                  <div key={slotIndex} className="grid grid-cols-8">
                    <div className="py-6 px-4 text-[10px] text-gray-500 dark:text-gray-400 font-black border-r border-white/50 dark:border-gray-800/50 flex items-center bg-white/30 dark:bg-gray-800/10 uppercase leading-tight">{slotName}</div>
                    {daysOfWeek.map((day, i) => {
                      const dateStr = day.toISOString();
                      const slotBookings = bookings.filter(b => b.slotIndex === slotIndex && isSameDay(new Date(b.date), day));
                      const myExistingBooking = slotBookings.find(b => b.userId._id === currentUser?.userId);
                      const myPending = pendingBookings.find(p => p.date === dateStr && p.slotIndex === slotIndex);
                      
                      const isChecked = myPending ? !myPending.isDelete : !!myExistingBooking;
                      const displayBookings = slotBookings.filter(b => b.userId._id !== currentUser?.userId);
                      
                      let finalRenderList = [...displayBookings];
                      if (isChecked) {
                          finalRenderList.unshift({
                              userId: { username: currentUser?.username || 'User', color: currentUser?.color || '#10b981' },
                              content: (myPending?.content !== undefined ? myPending.content : myExistingBooking?.content) || '',
                              isPending: !!myPending
                          } as any);
                      }

                      const visibleCount = finalRenderList.length;

                      return (
                        <div key={i} className="p-3 border-r border-white/50 dark:border-gray-800/50 min-h-[420px] hover:bg-white/40 dark:hover:bg-gray-800/30 transition-colors relative flex flex-col group">
                          <div className="flex justify-between items-center mb-3">
                            <label className="flex items-center gap-2 cursor-pointer z-10">
                                <input type="checkbox" checked={isChecked} onChange={() => handleToggleCheck(day, slotIndex, myExistingBooking)} className="w-5 h-5 text-indigo-600 dark:text-indigo-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 cursor-pointer shadow-sm" />
                                {isChecked && <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase">Tham gia</span>}
                            </label>
                            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">{visibleCount}/15</span>
                          </div>
                          
                          <div className="space-y-2 flex-1">
                            {finalRenderList.slice(0, 6).map((b: any, idx) => (
                              <div key={idx} onClick={(e) => { if(b.userId.username === currentUser?.username) handleOpenNote(day, slotIndex, myExistingBooking, e); }} style={{ borderLeftColor: b.userId?.color || '#cbd5e1' }} className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-white dark:border-gray-700/50 border-l-4 shadow-sm rounded-lg p-2 text-xs transition-transform ${b.isPending ? 'animate-pulse opacity-80' : ''} ${b.userId.username === currentUser?.username ? 'cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30' : ''}`}>
                                <div style={{ color: b.userId?.color || '#64748b' }} className="font-black mb-0.5 uppercase text-[10px] flex justify-between">
                                    {b.userId?.username}
                                    {b.userId.username === currentUser?.username && <MessageSquare size={12} className="text-gray-400 dark:text-gray-500"/>}
                                </div>
                                {b.content && <div className="text-gray-800 dark:text-gray-200 font-bold truncate">{b.content}</div>}
                              </div>
                            ))}
                          </div>

                          {visibleCount > 6 && (
                              <button onClick={() => setViewMoreModal({date: dateStr, slotIndex})} className="w-full mt-2 py-1.5 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-[10px] font-black text-gray-600 dark:text-gray-400 uppercase transition-colors shadow-sm">
                                Xem thêm (+{visibleCount - 6})
                              </button>
                          )}
                          
                          {visibleCount > 0 && visibleCount <= 6 && (
                             <button onClick={() => setViewMoreModal({date: dateStr, slotIndex})} className="absolute bottom-2 right-2 p-1 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye size={14}/>
                             </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* CÁC TAB KHÁC */}
      {activeTab === 'travel' && <div className="max-w-7xl mx-auto py-8 animate-in slide-in-from-bottom-4 duration-500 relative z-10"><TravelPlanner /></div>}
      {activeTab === 'chat' && <div className="max-w-7xl mx-auto p-4 md:py-8 animate-in slide-in-from-bottom-4 duration-500 relative z-10"><AIChat currentUser={currentUser} /></div>}

      {/* POPUPS LỊCH RẢNH */}
      {noteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm p-8 transform animate-in zoom-in-95 border border-white/50 dark:border-gray-700">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Thêm nội dung</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Bạn có thể để trống. Tối đa 150 ký tự.</p>
            <textarea autoFocus maxLength={150} value={tempNote} onChange={(e) => setTempNote(e.target.value)} placeholder="VD: Có mặt, họp..." className="w-full h-24 p-4 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold resize-none text-sm shadow-inner" />
            <div className="text-right text-[10px] text-gray-400 mt-1 font-bold">{tempNote.length}/150</div>
            <div className="mt-4 flex gap-3"><button onClick={() => setNoteModal(null)} className="flex-1 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Đóng</button><button onClick={handleNoteSubmit} className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg">Lưu chữ</button></div>
          </div>
        </div>
      )}

      {viewMoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 border border-white/50 dark:border-gray-700">
             <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-800/50">
                 <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><CheckCircle2 className="text-green-500"/> Danh sách Tham gia</h3>
                 <button onClick={() => setViewMoreModal(null)} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"><X size={16}/></button>
             </div>
             <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                 {(() => {
                     const slotBookings = bookings.filter(b => b.slotIndex === viewMoreModal.slotIndex && isSameDay(new Date(b.date), new Date(viewMoreModal.date)));
                     const myPending = pendingBookings.find(p => p.date === viewMoreModal.date && p.slotIndex === viewMoreModal.slotIndex);
                     const myExisting = slotBookings.find(b => b.userId._id === currentUser?.userId);
                     
                     let fullList: { username: string; color: string; content: string }[] = slotBookings.filter(b => b.userId._id !== currentUser?.userId).map(b => ({ username: b.userId.username || "User", color: b.userId.color || '#4f46e5', content: b.content || "" }));
                     if (myPending && !myPending.isDelete) fullList.unshift({ username: currentUser?.username || "User", color: currentUser?.color || '#10b981', content: myPending.content || "" });
                     else if (myExisting && (!myPending || !myPending.isDelete)) fullList.unshift({ username: currentUser?.username || "User", color: myExisting.userId.color || '#4f46e5', content: myExisting.content || "" });

                     return fullList.map((u, i) => (
                         <div key={i} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm">
                             <div className="flex items-start gap-4">
                                 <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-sm shrink-0 shadow-inner" style={{backgroundColor: u.color}}>{u.username.charAt(0).toUpperCase()}</div>
                                 <div className="pt-0.5">
                                     <p className="font-black text-sm" style={{color: u.color}}>{u.username}</p>
                                     {u.content && <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">{u.content}</p>}
                                 </div>
                             </div>
                             <div className="shrink-0 pl-2"><CheckCircle2 className="text-indigo-600 dark:text-indigo-400 w-6 h-6" /></div>
                         </div>
                     ));
                 })()}
             </div>
          </div>
        </div>
      )}

      {/* AUTH MODALS VÀ MANAGE USERS */}
      <AuthModals isLoginOpen={isLoginModalOpen} isRegisterOpen={isRegisterModalOpen} closeLogin={() => setIsLoginModalOpen(false)} closeRegister={() => setIsRegisterModalOpen(false)} openLogin={() => { setIsRegisterModalOpen(false); setIsLoginModalOpen(true); }} openRegister={() => { setIsLoginModalOpen(false); setIsRegisterModalOpen(true); }} onSuccess={(user: any) => { setCurrentUser(user); localStorage.setItem('currentUser', JSON.stringify(user)); }} />
      
      {isManageUsersOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-white/50 dark:border-gray-800">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center"><h3 className="text-lg font-black flex items-center gap-2 dark:text-white"><Users className="text-indigo-600 dark:text-indigo-400" /> Quản lý User</h3><button onClick={() => setIsManageUsersOpen(false)}><X className="w-5 h-5 text-gray-400" /></button></div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {usersList.map(u => (
                <div key={u._id} className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div><p className="font-bold flex items-center gap-2 dark:text-white"><span className="w-3 h-3 rounded-full" style={{backgroundColor: u.color}}></span>{u.username}</p></div>
                  {u.username !== 'hiep14082005' && <button onClick={() => handleDeleteUser(u._id)} className="text-[10px] font-black text-red-600 px-3 py-1.5 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-600 hover:text-white uppercase transition-colors">Xóa</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthModals({ isLoginOpen, isRegisterOpen, closeLogin, closeRegister, openLogin, openRegister, onSuccess }: any) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  useEffect(() => { if (isLoginOpen || isRegisterOpen) { setUsername(''); setPassword(''); setError(''); } }, [isLoginOpen, isRegisterOpen]);
  if (!isLoginOpen && !isRegisterOpen) return null;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (isRegisterOpen) { await ApiClient.register(username, password); openLogin(); alert('Tạo tài khoản thành công!'); }
      else { const user = await ApiClient.login(username, password); onSuccess(user); closeLogin(); }
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl w-full max-w-sm p-8 rounded-3xl relative animate-in zoom-in-95 border border-white/50 dark:border-gray-700 shadow-2xl">
        <button onClick={isLoginOpen ? closeLogin : closeRegister} className="absolute top-4 right-4"><X className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" /></button>
        <h3 className="text-2xl font-black text-center mb-6 dark:text-white">{isLoginOpen ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN'}</h3>
        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-200 dark:border-red-800">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Tên tài khoản" required value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 shadow-inner" />
          <input type="password" placeholder="Mật khẩu" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl font-bold dark:text-white focus:ring-2 focus:ring-indigo-500 shadow-inner" />
          <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 transition-colors">{loading ? 'Đang xử lý...' : (isLoginOpen ? 'Đăng nhập ngay' : 'Đăng ký ngay')}</button>
        </form>
        <div className="mt-6 text-center text-xs font-bold text-gray-500 dark:text-gray-400">
          {isLoginOpen ? <p>Chưa có tài khoản? <button type="button" onClick={openRegister} className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">Đăng ký</button></p> : <p>Đã có tài khoản? <button type="button" onClick={openLogin} className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">Đăng nhập</button></p>}
        </div>
      </div>
    </div>
  );
}