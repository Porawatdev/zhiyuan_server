const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 📌 กำหนดลายเซ็นแท้ของแอปเรา (กันแอบแก้แอป)
const VALID_SIGNATURE = "06092a864886f70d01010b0500305e31"; 

// 🗄️ ฐานข้อมูลจำลอง (เพิ่มคีย์ใหม่ได้ที่นี่เลย)
let database = {
    "12345": { hwid: null, status: "active", durationDays: 7, expiresAt: null },
    "VIP999": { hwid: null, status: "active", durationDays: 30, expiresAt: null },
    "zhiyuan-eghuy4e": { hwid: null, status: "active", durationDays: 30, expiresAt: null },
    "PERMANENT": { hwid: null, status: "active", durationDays: null, expiresAt: null }
};

app.post('/api/verify', (req, res) => {
    const { key, hwid, signature } = req.body;
    console.log(`\n[+] มีคนพยายาม Login: Key='${key}', HWID='${hwid}', Sig='${signature}'`);

    if (!key || !hwid || !signature) {
        return res.status(400).json({ valid: false, message: "ข้อมูลส่งมาไม่ครบ!" });
    }

    // 🔥 ด่านที่ 1: เช็คการดัดแปลงแอป (Anti-Tamper)
    if (signature !== VALID_SIGNATURE) {
        console.log(`[x] บล็อก! ลายเซ็นแอปถูกดัดแปลง (แอบแกะแอป)`);
        return res.status(403).json({ 
            valid: false, 
            message: "การเข้าสู่ระบบเซิร์ฟเวอร์ล้มเหลว กรุณาดาวน์โหลดจากช่องทางที่ถูกต้องเท่านั้น" 
        });
    }

    // 🔥 ด่านที่ 2: เช็คว่ามีคีย์ในระบบไหม
    const userRecord = database[key];
    if (!userRecord) {
        console.log(`[x] ตรวจไม่พบ Key ในระบบ`);
        return res.status(404).json({ valid: false, message: "ไม่พบ License Key นี้ในระบบ!" });
    }

    if (userRecord.status !== "active") {
        console.log(`[x] Key โดนระงับ`);
        return res.status(403).json({ valid: false, message: "License Key นี้ถูกระงับการใช้งาน!" });
    }

    // 🔥 ด่านที่ 3: เช็ค HWID และเริ่มนับเวลาวันแรก
    if (userRecord.hwid === null) {
        userRecord.hwid = hwid;
        
        if (userRecord.durationDays !== null) {
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + userRecord.durationDays);
            userRecord.expiresAt = expireDate.getTime();
            console.log(`[!] ผูกเครื่องสำเร็จ! คีย์จะหมดอายุวันที่: ${expireDate.toLocaleString('th-TH')}`);
        } else {
            console.log(`[!] ผูกเครื่องสำเร็จ! (คีย์ถาวร)`);
        }

        return res.json({ valid: true, message: "ผูกเครื่องและเข้าสู่ระบบสำเร็จ!" });
    } else if (userRecord.hwid !== hwid) {
        console.log(`[x] บล็อก! HWID ไม่ตรง`);
        return res.status(403).json({ valid: false, message: "คีย์นี้ถูกใช้งานกับอุปกรณ์อื่นแล้ว!" });
    }

    // 🔥 ด่านที่ 4: เช็ควันหมดอายุ 
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
