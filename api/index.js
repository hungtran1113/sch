import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: "AIzaSyCsTqVbtmX5UBwvhBo-zp9vas-l8HuBDiU" }); 

const MONGO_URI = "mongodb://tapkichco102_db_user:123u@ac-inv7mum-shard-00-00.q84ato5.mongodb.net:27017,ac-inv7mum-shard-00-01.q84ato5.mongodb.net:27017,ac-inv7mum-shard-00-02.q84ato5.mongodb.net:27017/?ssl=true&replicaSet=atlas-37pyc3-shard-0&authSource=admin&appName=Cluster0";

mongoose.connect(MONGO_URI).then(() => console.log("✅ MongoDB connected")).catch(err => console.error("❌ MongoDB error:", err));

const getRandomColor = () => { const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ff9800', '#ff5722', '#795548']; return colors[Math.floor(Math.random() * colors.length)]; };

const userSchema = new mongoose.Schema({ username: { type: String, required: true, unique: true }, password: { type: String, required: true }, color: { type: String, default: getRandomColor }, createdAt: { type: Date, default: Date.now, expires: 15552000 }});
const User = mongoose.models.User || mongoose.model('User', userSchema);
const bookingSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, weekId: { type: String, required: true }, date: { type: Date, required: true }, slotIndex: { type: Number, required: true }, content: { type: String, default: "" } });
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

const tripSchema = new mongoose.Schema({ 
    title: { type: String, required: true },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    itinerary: [{ date: String, time: String, activity: String, location: String, mapUrl: String, note: String, costExpr: { type: String, default: "" } }],
    updatedAt: { type: Date, default: Date.now }
});
const Trip = mongoose.models.Trip || mongoose.model('Trip', tripSchema);

const chatSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, title: { type: String, default: "Cuộc trò chuyện mới" }, messages: [{ role: { type: String, enum: ['user', 'model'], required: true }, text: { type: String, required: true } }], updatedAt: { type: Date, default: Date.now }});
const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);

const initAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: 'hiep14082005' });
        if (!adminExists) await User.create({ username: 'hiep14082005', password: 'Hiep14082005', color: '#111827' });
    } catch (err) { console.error("Lỗi tạo admin:", err); }
};
initAdmin();

// --- FIXED: CÁC ROUTE CHAT BỊ THIẾU GÂY LỖI JSON ---
app.get('/api/chats', async (req, res) => {
    try { res.json(await Chat.find({ userId: req.query.userId }).sort({ updatedAt: -1 })); } 
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/chats', async (req, res) => {
    try {
        const count = await Chat.countDocuments({ userId: req.body.userId });
        if (count >= 5) return res.status(400).json({ error: "LIMIT_REACHED" });
        const newChat = new Chat({ userId: req.body.userId, messages: [] });
        await newChat.save();
        res.status(201).json(newChat);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/chats/:id', async (req, res) => {
    try { await Chat.findByIdAndDelete(req.params.id); res.json({ success: true }); } 
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/chats/:id/message', async (req, res) => {
    try {
        const { text } = req.body;
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: "Chat not found" });

        const allTrips = await Trip.find();
        const allBookings = await Booking.find().populate('userId', 'username');
        let context = `Dữ liệu: Lịch rảnh: ${JSON.stringify(allBookings)}. Lịch trình: ${JSON.stringify(allTrips)}.`;
        
        const contents = chat.messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
        contents.push({ role: 'user', parts: [{ text: text }] });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents,
            config: { systemInstruction: context, thinkingConfig: { thinkingLevel: "HIGH" } }
        });

        const aiText = response.text || "Lỗi phản hồi";
        chat.messages.push({ role: 'user', text });
        chat.messages.push({ role: 'model', text: aiText });
        if (chat.messages.length <= 2) chat.title = text.substring(0, 30);
        await chat.save();
        res.json(chat);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CÁC ROUTE KHÁC ---
app.delete('/api/admin/clear-all-bookings', async (req, res) => {
    try { await Booking.deleteMany({}); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/trips', async (req, res) => { try { res.json(await Trip.find().sort({ updatedAt: -1 })); } catch (e) { res.status(500).json({ error: e.message }); }});
app.post('/api/trips', async (req, res) => { try { const trip = new Trip(req.body); await trip.save(); res.status(201).json(trip); } catch (e) { res.status(500).json({ error: e.message }); }});
app.put('/api/trips/:id', async (req, res) => { try { res.json(await Trip.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: Date.now() }, { new: true })); } catch (e) { res.status(500).json({ error: e.message }); }});
app.delete('/api/trips/:id', async (req, res) => { try { await Trip.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }});
app.post('/api/register', async (req, res) => { try { const user = new User(req.body); await user.save(); res.status(201).json(user); } catch (e) { res.status(500).json({ error: e.message }); }});
app.post('/api/login', async (req, res) => { try { const user = await User.findOne(req.body); if (!user) return res.status(401).json({ error: "Sai" }); res.json(user); } catch (e) { res.status(500).json({ error: e.message }); }});
app.get('/api/bookings', async (req, res) => { try { res.json(await Booking.find({ weekId: req.query.weekId }).populate('userId', 'username color')); } catch (e) { res.status(500).json({ error: e.message }); }});
app.post('/api/bookings', async (req, res) => { try { const { action, ...data } = req.body; if (action === 'delete') { await Booking.findOneAndDelete(data); return res.json({ success: true }); } res.json(await Booking.findOneAndUpdate(data, { content: req.body.content || "" }, { upsert: true, new: true })); } catch (e) { res.status(500).json({ error: e.message }); }});
app.get('/api/users', async (req, res) => { try { res.json(await User.find()); } catch (e) { res.status(500).json({ error: e.message }); }});
app.delete('/api/users/:id', async (req, res) => { try { await User.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: e.message }); }});

app.listen(3000, () => console.log(`🚀 Server: http://localhost:3000`));