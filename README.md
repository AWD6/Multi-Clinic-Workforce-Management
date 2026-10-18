# Multi Clinic Workforce Management

เว็บหลักยังเผยแพร่บน GitHub Pages การซิงก์ข้อมูลทำผ่าน Google Sheet + Apps Script bridge การเข้าถึงข้อมูลกำหนดที่ Apps Script deployment; หากเปิดแบบ **Anyone** ทุกคนที่มีลิงก์จะดูและแก้ข้อมูลทุกห้องได้ แม้ไฟล์ Sheet จะตั้งเป็นส่วนตัว

## เริ่มต้น

```bash
npm install
npm start
```

เปิด `http://localhost:8787`

หากไม่ตั้ง `window.OPD2_BRIDGE_URL` ใน `opd2-config.js` แอปจะใช้ Local Storage หากใส่ URL `/exec` ของ Apps Script Web App แอปจะโหลดข้อมูลห้องจาก Google Sheet ก่อนเริ่มทำงาน

## ข้อมูลที่ซิงก์

- รายชื่อบุคลากรและตำแหน่ง แยกตาม `unitId::clinicName`
- หน้าที่/ค่า Default ที่ใช้ซ้ำในแต่ละห้อง
- แผนผู้ป่วยรายสัปดาห์และสถานะวันหยุด
- ตารางจ่ายงานรายวัน รวมสถานะลา ประชุม/อบรม Float ใช้ ชม. หน้าที่ เวลา จุดปฏิบัติงาน Code และหมายเหตุ
- รายชื่อห้องและหน่วยจากแท็บ `Rooms`

แท็บ `RoomData` เก็บรายชื่อและค่า Default ส่วน `WorkforceData` เก็บแผนแยกตามสัปดาห์และการจ่ายงานแยกตามวัน Dashboard จึงแสดงข้อมูลของทุกห้องที่เปิดใช้งานได้เมื่อเปิดจากอุปกรณ์อื่น ดูรายละเอียดและคำเตือนการเปิดเผยข้อมูลใน [คู่มือตั้งค่า Google Sheets ภาษาไทย](./GOOGLE_SHEETS_SETUP_TH.md)

## ไฟล์ Apps Script

คัดลอก `google-apps-script/Code.gs`, `Bridge.html` และ `appsscript.json` ตามคู่มือ จากนั้นรัน `setupDatabase` เพื่อสร้าง `WorkforceData` และ Deploy เวอร์ชันใหม่ เลือกการเข้าถึงตามกลุ่มผู้ใช้จริง; ผู้ใช้ที่ผ่านสิทธิ์จะอ่านและแก้ข้อมูลทุกห้องได้

## ตรวจสอบโค้ด

```bash
npm run check
```
