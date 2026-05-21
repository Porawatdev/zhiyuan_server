const express = require('express');
const cors = require('cors');
const app = express();

// อนุญาตให้รับข้อมูลแบบ JSON และอนุญาตให้แอปภายนอกยิงเข้ามาได้
app.use(cors());
app.use(express.json());

// 🗄️ ฐานข้อมูลจำลอง (อนาคตเราค่อยเปลี่ยนไปต่อ SQL หรือ MongoDB ได้)
let database = {
    "12345": { hwid: null, status: "active" },     // คีย์ว่าง: ซื้อใหม่ ยังไม่ผูกเครื่อง
    "PREMIUM99": { hwid: "abcd-1234", status: "active" } // คีย์ที่โดนผูกกับเครื่องอื่นไปแล้ว
};

// 🎯 เส้นทาง (Endpoint) สำหรับรับการ Login จาก Android (Rust)
app.post('/api/verify', (req, res) => {
    // ดึงข้อมูลที่แอปส่งมา
    const { key, hwid, signature } = req.body;

    console.log(`\n[+] มีคนพยายาม Login: Key='${key}', HWID='${hwid}', Sig='${signature}'`);

    // 1. ตรวจสอบว่าแอปส่งข้อมูลมาครบไหม
    if (!key || !hwid || !signature) {
        return res.status(400).json({ valid: false, message: "ข้อมูลส่งมาไม่ครบ!" });
    }

    // 2. ตรวจสอบว่า Key นี้มีในระบบไหม
    const userRecord = database[key];
    if (!userRecord) {
        console.log(`[x] ตรวจไม่พบ Key ในระบบ`);
        return res.status(404).json({ valid: false, message: "ไม่พบ License Key นี้ในระบบ!" });
    }

    // 3. ตรวจสอบสถานะว่าโดนแบนไหม
    if (userRecord.status !== "active") {
        console.log(`[x] Key โดนระงับ`);
        return res.status(403).json({ valid: false, message: "License Key นี้ถูกระงับการใช้งาน!" });
    }

    // 4. ระบบเช็ค HWID (หัวใจหลักของการป้องกันแชร์คีย์!)
    if (userRecord.hwid === null) {
        // ถ้าคีย์ยังว่างอยู่ ให้ผูก HWID ของเครื่องนี้เข้าไปเลย (Bind เครื่อง)
        userRecord.hwid = hwid;
        console.log(`[!] ผูก HWID ใหม่สำเร็จ! เครื่องนี้เป็นเจ้าของคีย์ '${key}' แล้ว`);
        return res.json({ valid: true, message: "ผูกเครื่องและเข้าสู่ระบบสำเร็จ!" });
    } else if (userRecord.hwid !== hwid) {
        // ถ้า HWID ที่ส่งมา ไม่ตรงกับในฐานข้อมูล (แอบเอาคีย์คนอื่นมาใช้)
        console.log(`[x] บล็อก! HWID ไม่ตรง (คาดหวัง: ${userRecord.hwid}, ได้รับ: ${hwid})`);
        return res.status(403).json({ valid: false, message: "คีย์นี้ถูกใช้งานกับอุปกรณ์อื่นแล้ว!" });
    }

    // 5. ผ่านทุกด่าน! (Key ถูก, เครื่องตรง)
    console.log(`[✔] อนุมัติการ Login ผ่าน!`);
    return res.json({ valid: true, message: "เข้าสู่ระบบสำเร็จ!" });
});

// เปิดเซิร์ฟเวอร์
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 API Server รันแล้วที่พอร์ต ${PORT}`);
    console.log(`📡 พร้อมรับการเชื่อมต่อจากแอป Mod Menu!`);
    console.log(`========================================`);
});