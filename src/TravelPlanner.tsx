import React, { useState, useEffect, useRef } from 'react';
import { ApiClient } from './apiClient';
import { MapPin, Clock, Trash2, Plus, Save, Navigation, Eye, DollarSign, X, Info, FileCode, FileSpreadsheet, ImageIcon } from 'lucide-react';
import Autocomplete from "react-google-autocomplete";
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

export default function TravelPlanner() {
  const [trips, setTrips] = useState<any[]>([]);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [manualSearchText, setManualSearchText] = useState(""); 
  const [showVisual, setShowVisual] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadTrips(); }, []);
  const loadTrips = async () => { 
    const data = await ApiClient.getTrips();
    setTrips(data || []); 
  };

  // LOGIC SẮP XẾP THỜI GIAN
  const sortItinerary = (list: any[]) => {
    return [...list].sort((a, b) => {
      const dateA = a.date || "0000-00-00";
      const dateB = b.date || "0000-00-00";
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeA.localeCompare(timeB);
    });
  };

  const handleSave = async () => {
    if (!activeTrip) return;
    setLoading(true);
    const sortedList = sortItinerary(activeTrip.itinerary);
    const updatedTrip = { ...activeTrip, itinerary: sortedList };
    await ApiClient.updateTrip(activeTrip._id, updatedTrip);
    await loadTrips();
    setActiveTrip(updatedTrip);
    setLoading(false);
    alert("Đã lưu và tự động sắp xếp lịch trình!");
  };

  const handleAddActivity = (place?: any) => {
    if (!activeTrip) return;
    const newItem = { 
        date: activeTrip.startDate || format(new Date(), 'yyyy-MM-dd'),
        time: "08:00", 
        activity: place?.name || manualSearchText || "Hoạt động mới", 
        location: place?.formatted_address || "", 
        mapUrl: place?.url || "", 
        note: "", 
        costExpr: "" 
    };
    const newList = sortItinerary([...activeTrip.itinerary, newItem]);
    setActiveTrip({ ...activeTrip, itinerary: newList });
    setManualSearchText(""); 
  };

  const updateItem = (idx: number, field: string, val: string) => {
    const newList = [...activeTrip.itinerary];
    newList[idx][field] = val;
    if (field === 'date' || field === 'time') {
        setActiveTrip({ ...activeTrip, itinerary: sortItinerary(newList) });
    } else {
        setActiveTrip({ ...activeTrip, itinerary: newList });
    }
  };

  const calculateCost = (expr: string) => { 
    try { 
        if (!expr) return 0; 
        return Function(`"use strict"; return (${expr.replace(/[^-+*/0-9.]/g, '')})`)() || 0; 
    } catch { return 0; } 
  };
  
  const totalCost = activeTrip?.itinerary?.reduce((sum: number, item: any) => sum + calculateCost(item.costExpr), 0) || 0;

  // CÁC HÀM XUẤT FILE (GIỮ NGUYÊN)
  const exportImage = async () => { if (!tableRef.current) return; const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true }); canvas.toBlob((b) => { if (b) saveAs(b, `Lich_Trinh.png`); }); };
  const exportExcel = () => {
    const data = activeTrip.itinerary.map((i: any) => ({ "Ngày": i.date, "Giờ": i.time, "Hoạt động": i.activity, "Địa điểm": i.location, "Chi phí": calculateCost(i.costExpr), "Ghi chú": i.note }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Itinerary");
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `Lich_Trinh.xlsx`);
  };
  const exportWord = async () => {
    const doc = new Document({ sections: [{ children: [ new Paragraph({ text: activeTrip.title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [ new TableRow({ children: [new TableCell({ children: [new Paragraph("Ngày/Giờ")] }), new TableCell({ children: [new Paragraph("Hoạt động")] }), new TableCell({ children: [new Paragraph("Chi phí")] })] }), ...activeTrip.itinerary.map((i: any) => new TableRow({ children: [ new TableCell({ children: [new Paragraph(`${i.date} ${i.time}`)] }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: i.activity, bold: true })] }), new Paragraph(i.location || "")] }), new TableCell({ children: [new Paragraph(`${calculateCost(i.costExpr).toLocaleString()} đ`)] }) ] })) ]}) ]}]});
    saveAs(await Packer.toBlob(doc), `Lich_Trinh.docx`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
      {/* Sidebar */}
      <div className="w-full lg:w-80 space-y-4">
        {/* BOX LỊCH TRÌNH - ĐỔI THÀNH MÀU XÁM ĐẬM (SOLID) */}
        <div className="bg-gray-800 p-5 rounded-3xl border border-gray-700 shadow-xl">
          <div className="flex justify-between items-center mb-4 text-white">
            <h2 className="font-black uppercase text-sm">Lịch trình ({trips.length}/3)</h2>
            {trips.length < 3 && <button onClick={async () => { const t = prompt("Tên chuyến:"); if(t) { await ApiClient.createTrip({title: t, startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), itinerary: []}); loadTrips(); }}} className="bg-indigo-600 p-2 rounded-full hover:scale-110 transition-all shadow-lg"><Plus size={16}/></button>}
          </div>
          <div className="space-y-2">
            {trips.map((t) => (
              <div key={t._id} onClick={() => setActiveTrip(t)} className={`p-4 rounded-2xl cursor-pointer border-2 transition-all ${activeTrip?._id === t._id ? 'border-indigo-500 bg-indigo-600/20 shadow-lg' : 'border-gray-700 hover:bg-gray-700'}`}>
                <div className="flex justify-between items-center font-bold text-sm text-white">
                  <span className="truncate pr-2">{t.title}</span>
                  <button onClick={async (e) => { e.stopPropagation(); if(confirm("Xóa lịch trình này?")) { await ApiClient.deleteTrip(t._id); loadTrips(); setActiveTrip(null); }}}><Trash2 size={14} className="text-gray-400 hover:text-red-500"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* THÔNG BÁO DÙNG CHUNG (GIỮ NGUYÊN) */}
        <div className="bg-[#5C50F1] p-6 rounded-[2.2rem] text-white shadow-xl flex flex-col gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center"><Info size={18} /></div>
          <p className="text-xs font-bold leading-relaxed">Đây là lịch trình dùng chung. Mọi thay đổi của bạn sẽ được cập nhật ngay lập tức cho tất cả người dùng khác.</p>
        </div>

        {activeTrip && (
            <div className="flex flex-col gap-3">
                {/* BOX TỔNG CHI PHÍ - XÁM ĐẬM (SOLID) */}
                <div className="bg-gray-800 p-5 rounded-3xl border border-gray-700 flex flex-col items-center shadow-lg">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tổng chi phí dự kiến</span>
                    <span className="text-2xl font-black text-white">{totalCost.toLocaleString()} VNĐ</span>
                </div>
                <button onClick={() => setShowVisual(true)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all"><Eye size={18}/> Xem & Xuất file</button>
                <button onClick={() => setShowMapModal(true)} className="w-full flex items-center justify-center gap-2 bg-white text-indigo-600 py-4 rounded-2xl font-black text-xs uppercase hover:bg-gray-100 transition-all shadow-md"><Navigation size={18}/> Mở Bản Đồ Tìm Kiếm</button>
            </div>
        )}
      </div>

      <div className="flex-1">
        {!activeTrip ? (
          <div className="h-96 border-4 border-dashed border-gray-700 rounded-[3.5rem] flex flex-col items-center justify-center bg-gray-800/50">
            <Navigation size={64} className="mb-4 animate-bounce text-gray-500" />
            <p className="font-black uppercase text-xs text-gray-500 tracking-widest">Chọn chuyến đi để bắt đầu</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* BOX MAIN LỊCH TRÌNH - XÁM ĐẬM (SOLID) */}
            <div className="bg-gray-800 p-8 rounded-[3.5rem] border border-gray-700 shadow-2xl">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <input className="text-3xl font-black text-white bg-transparent border-none focus:ring-0 w-full" value={activeTrip.title} onChange={e => setActiveTrip({...activeTrip, title: e.target.value})} />
                <button onClick={handleSave} disabled={loading} className="bg-green-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shrink-0"><Save size={18}/> {loading ? '...' : 'LƯU LỊCH TRÌNH'}</button>
              </div>

              {/* BOX CHỌN NGÀY - XÁM NHẠT HƠN (SOLID) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 p-6 bg-gray-700 rounded-3xl border border-gray-600 shadow-inner">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Ngày bắt đầu</label>
                    <input type="date" className="w-full bg-gray-900 border-none rounded-xl text-white font-bold p-3 focus:ring-2 focus:ring-indigo-500" value={activeTrip.startDate || ""} onChange={e => setActiveTrip({...activeTrip, startDate: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Ngày kết thúc</label>
                    <input type="date" className="w-full bg-gray-900 border-none rounded-xl text-white font-bold p-3 focus:ring-2 focus:ring-indigo-500" value={activeTrip.endDate || ""} onChange={e => setActiveTrip({...activeTrip, endDate: e.target.value})} />
                 </div>
              </div>

              {/* INPUT TÌM KIẾM - XÁM NHẠT HƠN */}
              <div className="mb-10 flex gap-2">
                  <Autocomplete
                      apiKey={"YOUR_GOOGLE_MAPS_API_KEY"}
                      onPlaceSelected={(place) => handleAddActivity(place)}
                      className="flex-1 px-6 py-4 bg-gray-700 border border-gray-600 rounded-2xl font-bold text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 shadow-inner"
                      placeholder="Nhập địa điểm muốn thêm..."
                      onChange={(e: any) => setManualSearchText(e.target.value)}
                      value={manualSearchText}
                  />
                  <button onClick={() => handleAddActivity()} className="bg-indigo-600 text-white p-4 rounded-2xl hover:scale-105 transition-all shadow-lg"><Plus size={24}/></button>
              </div>
              
              {/* DANH SÁCH HOẠT ĐỘNG */}
              <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-1 before:bg-gray-700">
                {activeTrip.itinerary.map((item: any, idx: number) => (
                  <div key={idx} className="relative pl-14 group animate-in slide-in-from-left duration-300">
                    <div className="absolute left-0 top-1 w-10 h-10 bg-indigo-600 border-4 border-[#1f2937] rounded-full flex items-center justify-center z-10 text-white shadow-lg"><Clock size={16} /></div>
                    
                    {/* BOX HOẠT ĐỘNG - XÁM NHẠT (SOLID) */}
                    <div className="bg-gray-700 p-6 rounded-3xl border border-gray-600 hover:border-gray-500 transition-all relative shadow-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-3">
                                   <input type="date" className="text-xs font-bold text-indigo-400 bg-transparent border-none p-0 focus:ring-0 w-32 cursor-pointer" value={item.date} onChange={e => updateItem(idx, 'date', e.target.value)} min={activeTrip.startDate} max={activeTrip.endDate} />
                                   <input type="time" className="text-xl font-black text-white bg-transparent border-none p-0 focus:ring-0 cursor-pointer" value={item.time} onChange={e => updateItem(idx, 'time', e.target.value)} />
                                </div>
                                <input className="block w-full font-bold text-white bg-transparent border-none p-0 text-lg focus:ring-0 placeholder-gray-400" placeholder="Tên hoạt động..." value={item.activity} onChange={e => updateItem(idx, 'activity', e.target.value)} />
                                
                                <details className="mt-2">
                                    <summary className="text-[10px] text-indigo-400 cursor-pointer font-bold uppercase tracking-widest flex items-center gap-1"><Eye size={12}/> Bản đồ trực tiếp</summary>
                                    <div className="mt-3 rounded-xl overflow-hidden h-48 bg-gray-900 border border-gray-600 shadow-inner">
                                        {/* ĐÃ FIX IFRAME GOOGLE MAPS TÌM THEO TÊN (KHÔNG LỖI API KEY) */}
                                        <iframe width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(item.location || item.activity || "Vietnam")}&hl=vi&z=14&output=embed`}></iframe>
                                    </div>
                                </details>
                            </div>
                            <div className="space-y-3">
                                {/* INPUT ĐỊA CHỈ & GIÁ TIỀN - XÁM RẤT ĐẬM */}
                                <div className="bg-gray-900 p-3 rounded-xl flex items-center gap-2 border border-gray-600 shadow-inner">
                                    <MapPin size={14} className="text-red-400"/>
                                    <input placeholder="Link Maps hoặc Địa chỉ" className="text-xs w-full bg-transparent border-none p-0 text-white placeholder-gray-500 focus:ring-0 font-medium" value={item.mapUrl} onChange={e => updateItem(idx, 'mapUrl', e.target.value)} />
                                </div>
                                <div className="bg-gray-900 p-3 rounded-xl flex items-center gap-2 border border-gray-600 shadow-inner">
                                    <DollarSign size={14} className="text-green-400"/>
                                    <input placeholder="Chi phí (VD: 100+50)" className="text-xs w-full bg-transparent border-none p-0 text-white placeholder-gray-500 focus:ring-0 font-black" value={item.costExpr} onChange={e => updateItem(idx, 'costExpr', e.target.value)} />
                                </div>
                                <textarea placeholder="Ghi chú chuyến đi..." className="w-full bg-transparent border-none text-[12px] text-white placeholder-gray-400 p-0 focus:ring-0 resize-none h-12" value={item.note} onChange={e => updateItem(idx, 'note', e.target.value)} />
                            </div>
                        </div>
                        <button onClick={() => { const nl = activeTrip.itinerary.filter((_:any, i:number) => i !== idx); setActiveTrip({...activeTrip, itinerary: nl})}} className="absolute -top-2 -right-2 bg-gray-600 text-gray-300 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-lg"><X size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* POPUP BẢN ĐỒ TÌM KIẾM - ĐÃ FIX LINK MAPS CHUẨN */}
      {showMapModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 border border-gray-700">
            <div className="p-4 bg-gray-800 text-white flex justify-between items-center border-b border-gray-700">
                <div className="font-black uppercase tracking-widest text-sm flex items-center gap-2"><Navigation size={16} className="text-indigo-400"/> Tìm kiếm Bản đồ</div>
                <button onClick={() => setShowMapModal(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <iframe width="100%" height="100%" frameBorder="0" src="https://maps.google.com/maps?q=Vietnam&hl=vi&z=6&output=embed"></iframe>
          </div>
        </div>
      )}

      {/* MODAL XUẤT FILE */}
      {showVisual && activeTrip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-gray-900 w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 my-auto border border-gray-700">
            <div className="p-8 bg-gray-800 border-b border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
              <h3 className="text-xl font-black text-white uppercase">{activeTrip.title}</h3>
              <div className="flex gap-2">
                <button onClick={exportWord} className="flex items-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-blue-400 font-bold text-xs hover:bg-gray-600 transition-all"><FileCode size={16}/> Google Docs</button>
                <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-green-400 font-bold text-xs hover:bg-gray-600 transition-all"><FileSpreadsheet size={16}/> Google Sheets</button>
                <button onClick={exportImage} className="flex items-center gap-2 px-4 py-2 bg-gray-700 border border-gray-600 rounded-xl text-orange-400 font-bold text-xs hover:bg-gray-600 transition-all"><ImageIcon size={16}/> PNG</button>
                <button onClick={() => setShowVisual(false)} className="p-2 bg-gray-700 text-gray-400 rounded-xl hover:bg-red-500 hover:text-white ml-2 transition-all"><X size={20}/></button>
              </div>
            </div>
            <div ref={tableRef} className="p-10 bg-gray-900">
                <table className="w-full text-left border-collapse rounded-3xl overflow-hidden shadow-md">
                    <thead className="bg-indigo-600 text-white"><tr className="text-[10px] uppercase font-black"><th className="p-5">Ngày/Giờ</th><th className="p-5">Hoạt động</th><th className="p-5">Chi phí</th><th className="p-5">Ghi chú</th></tr></thead>
                    <tbody className="divide-y divide-gray-700">
                        {activeTrip.itinerary.map((item: any, i: number) => (
                            <tr key={i} className="text-gray-300 bg-gray-800">
                                <td className="p-5 text-indigo-400 font-black text-sm"><div>{item.date}</div><div>{item.time}</div></td>
                                <td className="p-5"><div className="font-black text-white">{item.activity}</div><div className="text-[10px] text-gray-400 mt-1 uppercase truncate max-w-xs">{item.location}</div></td>
                                <td className="p-5 font-black text-green-400">{calculateCost(item.costExpr).toLocaleString()} đ</td>
                                <td className="p-5 text-xs italic opacity-70">{item.note || '---'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}