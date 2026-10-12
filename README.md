# Multi Clinic Workforce Management

เว็บหลักยังเผยแพร่บน GitHub Pages การซิงก์รายชื่อบุคลากรและค่าเริ่มต้นประจำห้องทำผ่าน Google Sheet + Apps Script bridge รุ่นนี้เป็น **public-link**: ทุกคนที่เปิดเว็บได้สามารถดูและแก้ทะเบียนทุกห้องผ่านแอปได้ แม้ไฟล์ Sheet จะตั้งเป็นส่วนตัว

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
- รายชื่อห้องและหน่วยจากแท็บ `Rooms`

แท็บ `Users` ไม่ได้ใช้ในรุ่น public-link หากมีจากการตั้งค่าก่อนหน้า ปล่อยไว้ได้ ข้อมูลแผนผู้ป่วยและจ่ายงานรายวันยังเป็น Local Storage และไม่ซิงก์ข้ามอุปกรณ์ ดูรายละเอียดและคำเตือนการเปิดเผยข้อมูลใน [คู่มือตั้งค่า Google Sheets ภาษาไทย](./GOOGLE_SHEETS_SETUP_TH.md)

## ไฟล์ Apps Script

คัดลอก `google-apps-script/Code.gs`, `Bridge.html` และ `appsscript.json` ตามคู่มือ ก่อน Deploy แบบ **Execute as owner / Anyone** โปรดเข้าใจว่าผู้ใช้อินเทอร์เน็ตที่เข้าหน้าเว็บสามารถอ่านและแก้รายชื่อของทุกห้องได้

## ตรวจสอบโค้ด

```bash
npm run check
```
