# Multi Clinic Workforce Management · Original UI / Local Edition

เวอร์ชันนี้ยึด **โครงสร้าง UI, ตาราง, ลำดับข้อมูล และรูปแบบการใช้งานจากไฟล์ต้นฉบับ** เป็นหลัก แล้วปรับเฉพาะรายการที่กำหนด:

- ใช้ Local Storage ใน browser เท่านั้น
- ไม่มี Google Sheets, remote database หรือ realtime backend
- แยกข้อมูลตามหน่วยตรวจและห้องตรวจด้วย dropdown
- เพิ่มเจ้าหน้าที่ได้ไม่จำกัด และจำข้อมูลการจ่ายงานเป็น Default
- รองรับ Float และ ใช้ ชม. แบบช่วงเวลา พร้อมคำนวณชั่วโมง
- เวลา `8-12` ถูกแปลงเป็น `08.00 - 12.00 น.`
- Dashboard สรุปแยกตามหน่วยและห้องตรวจ
- คืน banner เครดิตเดิม: `OPD - ER` / `conceived, designed, and` / `Brought to Life by RN.Patipon Wiyo`

## Run

```bash
npm install
npm start
```

เปิด `http://localhost:8787`

ข้อมูลอยู่เฉพาะใน browser profile และเครื่องที่ใช้งานอยู่ ไม่มีการส่งข้อมูลออกไปยังระบบภายนอก
