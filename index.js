const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 🗄️ ฐานข้อมูลจำลอง (เพิ่มระบบจำนวนวัน)
let database = {
    "12345": { 
        hwid: null, 
        status: "active", 
        durationDays: 7,    // กำหนดอายุคีย์ (เช่น 7 วัน) นับตั้งแต่ล็อกอินครั้งแรก
        expiresAt: null     // ระบบจะใส่วันหมดอายุให้อัตโนมัติเมื่อผูกเครื่อง
    },
    "VIP999": { 
        hwid: null, 
        status: "active", 
        durationDays: 30,   // คีย์แบบ 30 วัน
        expiresAt: null 
    },
    "PERMANENT": {
        hwid: null,
        status: "active",
        durationDays: null, // คีย์ถาวร ไม่มีวันหมดอายุ
        expiresAt: null
    }
};

app.post('/api/verify', (req, res) => {
    const { key, hwid, signature } = req.body;
    console.log(`\n[+] มีคนพยายาม Login: Key='${key}', HWID='${hwid}'`);

    if (!key || !hwid || !signature) {
        return res.status(400).json({ valid: false, message: "ข้อมูลส่งมาไม่ครบ!" });
    }

    const userRecord = database[key];
    if (!userRecord) {
        console.log(`[x] ตรวจไม่พบ Key ในระบบ`);
        return res.status(404).json({ valid: false, message: "ไม่พบ License Key นี้ในระบบ!" });
    }

    if (userRecord.status !== "active") {
        console.log(`[x] Key โดนระงับ`);
        return res.status(403).json({ valid: false, message: "License Key นี้ถูกระงับการใช้งาน!" });
    }

    // --- 1. ระบบเช็ค HWID และเริ่มนับเวลาวันแรก ---
    if (userRecord.hwid === null) {
        userRecord.hwid = hwid;
        
        // ถ้าคีย์มีการจำกัดวัน ให้เริ่มคำนวณเวลาหมดอายุตั้งแต่วินาทีนี้!
        if (userRecord.durationDays !== null) {
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + userRecord.durationDays);
            userRecord.expiresAt = expireDate.getTime(); // เก็บเป็นตัวเลข Timestamp
            console.log(`[!] ผูกเครื่องสำเร็จ! คีย์จะหมดอายุวันที่: ${expireDate.toLocaleString('th-TH')}`);
        } else {
            console.log(`[!] ผูกเครื่องสำเร็จ! (คีย์ถาวร)`);
        }

        return res.json({ valid: true, message: "ผูกเครื่องและเข้าสู่ระบบสำเร็จ!" });
    } else if (userRecord.hwid !== hwid) {
        console.log(`[x] บล็อก! HWID ไม่ตรง`);
        return res.status(403).json({ valid: false, message: "คีย์นี้ถูกใช้งานกับอุปกรณ์อื่นแล้ว!" });
    }

    // --- 2. ระบบเช็ควันหมดอายุ (สำหรับการล็อกอินครั้งต่อๆ ไป) ---
    if (userRecord.expiresAt !== null) {
        const currentTime = Date.now();
        if (currentTime > userRecord.expiresAt) {
            console.log(`[x] บล็อก! คีย์ '${key}' หมดอายุแล้ว`);
            return res.status(403).json({ valid: false, message: "คีย์ของคุณหมดอายุการใช้งานแล้ว!" });
        }
    }

    console.log(`[✔] อนุมัติการ Login ผ่าน!`);
    return res.json({ valid: true, message: "เข้าสู่ระบบสำเร็จ!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 API Server รันแล้วที่พอร์ต ${PORT}`);
    console.log(`========================================`);
});
