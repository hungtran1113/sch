import React, { useState, useEffect, useRef } from 'react';
import { ApiClient } from './apiClient';
import { MapPin, Clock, Trash2, Plus, ExternalLink, Save, PlaneTakeoff, Info, Navigation, Eye, GripVertical, DollarSign, FileSpreadsheet, FileCode, ImageIcon, X } from 'lucide-react';
import Autocomplete from "react-google-autocomplete";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel, TextRun } from 'docx';
import { saveAs } from 'file-saver';

export default function TravelPlanner() {
  const [trips, setTrips] = useState<any[]>([]);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchKey, setSearchKey] = useState(0); 
  const [showVisual, setShowVisual] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [manualSearchText, setManualSearchText] = useState(""); 
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadTrips(); }, []);

  const loadTrips = async () => { setTrips(await ApiClient.getTrips()); };
  const calculateCost = (expr: string) => { try { if (!expr) return 0; return Function(`"use strict"; return (${expr.replace(/[^-+*/0-9.]/g, '')})`)() || 0; } catch { return 0; } };
  const totalCost = activeTrip?.itinerary?.reduce((sum: number, item: any) => sum + calculateCost(item.costExpr), 0) || 0;

  const handleSave = async () => {
    if (!activeTrip) return; setLoading(true);
    await ApiClient.updateTrip(activeTrip._id, activeTrip); await loadTrips(); setLoading(false); alert("Đã lưu dữ liệu!");
  };

  const handleAddActivity = (place?: any) => {
    if (!activeTrip) return;
    const activityName = place?.name || manualSearchText || "Hoạt động mới";
    setActiveTrip({ ...activeTrip, itinerary: [...activeTrip.itinerary, { time: "08:00", activity: activityName, location: place?.formatted_address || "", mapUrl: place?.url || "", note: "", costExpr: "" }] });
    setManualSearchText(""); 
  };

  const onDragEnd = (result: any) => {
    if (!result.destination || !activeTrip) return;
    const newItinerary = Array.from(activeTrip.itinerary);
    newItinerary.splice(result.destination.index, 0, newItinerary.splice(result.source.index, 1)[0]);
    setActiveTrip({ ...activeTrip, itinerary: newItinerary });
  };

  const exportImage = async () => { if (!tableRef.current) return; const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true }); canvas.toBlob((b) => { if (b) saveAs(b, `Lich_Trinh_${activeTrip.title}.png`); }); };
  
  // FIX: SỬ DỤNG BLOB ĐỂ TẢI FILE EXCEL MƯỢT TRÊN MỌI TRÌNH DUYỆT
  const exportExcel = () => {
    const data = activeTrip.itinerary.map((i: any) => ({ "Giờ": i.time, "Hoạt động": i.activity, "Địa điểm": i.location, "Chi phí (VNĐ)": calculateCost(i.costExpr), "Ghi chú": i.note }));
    const ws = XLSX.utils.json_to_sheet(data); 
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Itinerary"); 
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, `Lich_Trinh_${activeTrip.title}.xlsx`);
  };
  
  const exportWord = async () => {
    const doc = new Document({ sections: [{ children: [
          new Paragraph({ text: activeTrip.title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
              new TableRow({ children: [new TableCell({ children: [new Paragraph("Giờ")] }), new TableCell({ children: [new Paragraph("Hoạt động & Địa điểm")] }), new TableCell({ children: [new Paragraph("Chi phí")] }), new TableCell({ children: [new Paragraph("Ghi chú")] })] }),
              ...activeTrip.itinerary.map((i: any) => new TableRow({ children: [
                  new TableCell({ children: [new Paragraph(i.time)] }), 
                  new TableCell({ children: [
                      new Paragraph({ children: [new TextRun({ text: i.activity || "", bold: true })] }), 
                      new Paragraph(i.location || "")
                  ] }), 
                  new TableCell({ children: [new Paragraph(`${calculateCost(i.costExpr).toLocaleString()} đ`)] }), 
                  new TableCell({ children: [new Paragraph(i.note || "")] })
              ] }))
          ]}),
    ]}]});
    saveAs(await Packer.toBlob(doc), `Lich_Trinh_${activeTrip.title}.docx`);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
      <div className="w-full lg:w-80 space-y-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter"><PlaneTakeoff size={20} className="text-indigo-600"/> Lịch trình ({trips.length}/3)</h2>
            {trips.length < 3 && <button onClick={async () => { const title = prompt("Tên chuyến đi:"); if(title) { await ApiClient.createTrip({title, itinerary: []}); loadTrips(); }}} className="p-2 bg-indigo-600 text-white rounded-full hover:scale-110"><Plus size={16}/></button>}
          </div>
          <div className="space-y-2">
            {trips.map(t => (
              <div key={t._id} onClick={() => setActiveTrip(t)} className={`p-4 rounded-2xl cursor-pointer border-2 transition-all ${activeTrip?._id === t._id ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' : 'border-gray-50 hover:bg-gray-50'}`}>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="truncate pr-2">{t.title}</span>
                  <button onClick={async (e) => { e.stopPropagation(); if(confirm("Xóa?")) { await ApiClient.deleteTrip(t._id); loadTrips(); setActiveTrip(null); }}} className="text-gray-300 hover:text-red-500"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#5C50F1] p-6 rounded-[2.2rem] text-white shadow-xl shadow-indigo-100 flex flex-col gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white"><Info size={18} /></div>
          <p className="text-xs font-bold leading-relaxed">Đây là lịch trình dùng chung. Mọi thay đổi của bạn sẽ được cập nhật ngay lập tức cho tất cả người dùng khác.</p>
        </div>

        {activeTrip && (
            <div className="flex flex-col gap-3">
                <div className="bg-white p-5 rounded-3xl border-2 border-dashed border-indigo-100 flex flex-col items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng chi phí dự kiến</span>
                    <span className="text-2xl font-black text-indigo-600">{totalCost.toLocaleString()} VNĐ</span>
                </div>
                <button onClick={() => setShowVisual(true)} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all"><Eye size={18}/> Xem & Xuất file</button>
                <button onClick={() => setShowMapModal(true)} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-green-500 text-green-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-50 transition-all"><MapPin size={18}/> Mở Bản Đồ Tìm Kiếm</button>
            </div>
        )}
      </div>

      <div className="flex-1">
        {!activeTrip ? (
          <div className="h-96 border-4 border-dashed border-gray-100 rounded-[3.5rem] flex flex-col items-center justify-center text-gray-300">
            <Navigation size={64} className="opacity-10 mb-4 animate-bounce"/>
            <p className="font-black uppercase tracking-widest text-xs">Chọn chuyến đi để bắt đầu</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 md:p-10 rounded-[3.5rem] shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-50 pb-8">
                <input className="text-3xl font-black text-gray-900 border-none p-0 focus:ring-0 w-full" value={activeTrip.title} onChange={e => setActiveTrip({...activeTrip, title: e.target.value})} />
                <button onClick={handleSave} disabled={loading} className="w-full md:w-auto bg-green-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg shadow-green-100 text-xs tracking-widest uppercase"><Save size={18}/> {loading ? '...' : 'Lưu lịch trình'}</button>
              </div>

              <div className="mb-10">
                <label className="block text-[10px] font-black uppercase text-gray-400 mb-3 tracking-[0.2em] ml-1">Tìm địa điểm nhanh (Google Places)</label>
                <div className="flex gap-2 relative">
                    <Autocomplete
                        key={searchKey}
                        apiKey={"YOUR_GOOGLE_MAPS_API_KEY"}
                        onPlaceSelected={(place) => handleAddActivity(place)}
                        options={{ types: ["establishment"] }}
                        placeholder="Nhập tên quán cafe, địa danh (Nếu lỗi GG có thể nhập tay)..."
                        className="flex-1 px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-indigo-500 shadow-inner"
                        onChange={(e: any) => setManualSearchText(e.target.value)}
                        value={manualSearchText}
                    />
                    <button onClick={() => handleAddActivity()} className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl hover:bg-indigo-100 transition-colors"><Plus size={24}/></button>
                </div>
              </div>
              
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="itinerary">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-1 before:bg-gray-50">
                      {activeTrip.itinerary.map((item: any, idx: number) => (
                        <Draggable key={idx.toString()} draggableId={idx.toString()} index={idx}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} className="relative pl-14 group">
                              <div {...provided.dragHandleProps} className="absolute left-[-10px] top-5 text-gray-300 hover:text-indigo-500 cursor-grab p-1"><GripVertical size={24}/></div>
                              <div className="absolute left-0 top-1 w-10 h-10 bg-white border-4 border-indigo-500 rounded-full flex items-center justify-center z-10 shadow-md group-hover:scale-110 transition-all"><Clock size={16} className="text-indigo-600"/></div>
                              
                              <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-50 group-hover:bg-white group-hover:border-indigo-100 transition-all shadow-sm">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div className="space-y-4">
                                          <input type="time" className="text-xl font-black text-indigo-600 bg-transparent border-none p-0 focus:ring-0" value={item.time} onChange={e => { const newIt = [...activeTrip.itinerary]; newIt[idx].time = e.target.value; setActiveTrip({...activeTrip, itinerary: newIt})}} />
                                          <input placeholder="Bạn đi đâu?" className="block w-full font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0 text-lg" value={item.activity} onChange={e => { const newIt = [...activeTrip.itinerary]; newIt[idx].activity = e.target.value; setActiveTrip({...activeTrip, itinerary: newIt})}} />
                                      </div>
                                      <div className="space-y-4">
                                          <div className="bg-white p-3 rounded-xl border border-gray-100">
                                              <div className="flex items-center gap-2 mb-2"><MapPin size={14} className="text-red-400"/><input placeholder="Địa chỉ hoặc link" className="text-xs w-full border-none p-0 focus:ring-0 font-medium" value={item.mapUrl} onChange={e => { const newIt = [...activeTrip.itinerary]; newIt[idx].mapUrl = e.target.value; setActiveTrip({...activeTrip, itinerary: newIt})}} /></div>
                                              {(item.mapUrl || item.location || item.activity) && (
                                                <details className="mt-2 group/details">
                                                    <summary className="text-[10px] text-indigo-500 cursor-pointer font-bold uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1 select-none"><Eye size={12}/> Ấn để xem bản đồ trực tiếp</summary>
                                                    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 h-48 bg-gray-100 animate-in fade-in zoom-in-95"><iframe width="100%" height="100%" frameBorder="0" src={`https://maps.google.com/maps?q=${encodeURIComponent(item.location || item.activity)}&output=embed`}></iframe></div>
                                                </details>
                                              )}
                                          </div>
                                          <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-gray-100">
                                              <DollarSign size={14} className="text-green-500"/>
                                              <input placeholder="Giá tiền (VD: 100+50)" className="text-xs w-full border-none p-0 font-black text-green-600" value={item.costExpr} onChange={e => { const newIt = [...activeTrip.itinerary]; newIt[idx].costExpr = e.target.value; setActiveTrip({...activeTrip, itinerary: newIt})}} />
                                              <span className="text-[10px] font-black bg-green-50 text-green-700 px-2 py-1 rounded-md">={calculateCost(item.costExpr).toLocaleString()}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <textarea placeholder="Ghi chú thêm..." className="mt-4 w-full text-xs text-gray-500 bg-white p-4 border-none rounded-2xl focus:ring-1 focus:ring-indigo-100 resize-none leading-relaxed" value={item.note} onChange={e => { const newIt = [...activeTrip.itinerary]; newIt[idx].note = e.target.value; setActiveTrip({...activeTrip, itinerary: newIt})}} />
                                  <button onClick={() => { const newIt = activeTrip.itinerary.filter((_:any, i:number) => i !== idx); setActiveTrip({...activeTrip, itinerary: newIt})}} className="absolute top-4 right-4 text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              <button onClick={() => handleAddActivity()} className="ml-14 w-full mt-8 py-6 border-4 border-dashed border-gray-50 rounded-[2.5rem] text-gray-300 font-black hover:text-indigo-600 hover:bg-indigo-50/20 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"><Plus size={20}/> Thêm địa điểm tiếp theo</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL BẢN ĐỒ TÌM KIẾM TOÀN MÀN HÌNH */}
      {showMapModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-green-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 font-black uppercase tracking-widest text-sm"><MapPin size={18}/> Bản đồ Toàn Cầu</div>
              <button onClick={() => setShowMapModal(false)} className="hover:bg-green-700 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 w-full h-full bg-gray-100">
                <iframe width="100%" height="100%" frameBorder="0" src="https://maps.google.com/maps?q=Vietnam&output=embed"></iframe>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM TRỰC QUAN & XUẤT */}
      {showVisual && activeTrip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-300 my-auto">
            <div className="p-8 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
              <h3 className="text-xl font-black text-gray-900">{activeTrip.title}</h3>
              <div className="flex gap-2">
                <button onClick={exportWord} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-blue-700 font-bold text-xs"><FileCode size={16}/> Google Docs</button>
                <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-green-700 font-bold text-xs"><FileSpreadsheet size={16}/> Google Sheets</button>
                <button onClick={exportImage} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-orange-600 font-bold text-xs"><ImageIcon size={16}/> Ảnh PNG</button>
                <button onClick={() => setShowVisual(false)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 ml-2"><X size={20}/></button>
              </div>
            </div>
            <div ref={tableRef} className="p-10 bg-white">
                <div className="overflow-x-auto rounded-[1.5rem] border-2 border-gray-50">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-[#5C50F1] text-white">
                            <tr>
                                <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] w-24">Giờ</th>
                                <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] w-1/3">Hoạt động & Địa điểm</th>
                                <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em] w-32">Chi phí</th>
                                <th className="px-6 py-5 font-black text-[10px] uppercase tracking-[0.2em]">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {activeTrip.itinerary.map((item: any, i: number) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                                    <td className="px-6 py-6 font-black text-indigo-600 align-top">{item.time}</td>
                                    <td className="px-6 py-6 align-top">
                                        <div className="font-black text-gray-900 text-base">{item.activity}</div>
                                        {item.location && <div className="text-[11px] text-gray-400 mt-2 flex items-start gap-1 font-bold leading-relaxed uppercase"><MapPin size={12} className="mt-0.5 shrink-0"/> {item.location}</div>}
                                    </td>
                                    <td className="px-6 py-6 font-black text-green-600 align-top">{calculateCost(item.costExpr).toLocaleString()} đ</td>
                                    <td className="px-6 py-6 text-sm text-gray-500 font-medium italic align-top leading-relaxed">{item.note || '---'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}