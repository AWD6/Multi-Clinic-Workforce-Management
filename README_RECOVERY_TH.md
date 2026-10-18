# อัปเดตระบบ Workforce ให้ซิงก์ Dashboard ข้ามเครื่อง

## ไฟล์ที่อัปเดตใน GitHub
คัดลอกไฟล์ในชุดนี้ไปแทนไฟล์เดิมใน repository โดยรักษาโครงสร้างโฟลเดอร์:
- `index.html`, `script.js`, `opd2-data-store.js`, `style.css`
- `google-apps-script/Code.gs` และ `google-apps-script/Bridge.html`
- README และคู่มือที่แก้ไว้ในชุดนี้

ตอนอัปเดต Apps Script ให้คงค่า `SPREADSHEET_ID` และ `ALLOWED_PARENT_ORIGIN` จริงของระบบไว้ (อย่าใช้ placeholder ในตัวอย่าง) จากนั้นรัน `setupDatabase` เพื่อสร้างแท็บ `WorkforceData` แล้ว Deploy Web App เป็นเวอร์ชันใหม่ ก่อน commit ไฟล์เว็บและรอ GitHub Pages deploy เสร็จ

## สิ่งที่แก้
- Dashboard รวมผู้ป่วยคาดการณ์ กำลังคน Product เปอร์เซ็นต์จ่ายงาน ลา อบรม/ประชุม ใช้ ชม. และ Float ของทุกห้อง
- กด Detail ที่ห้องตรวจเพื่อดูแผนและรายการจ่ายงานรายบุคคลแยกตามวัน
- แผนผู้ป่วยและการจ่ายงานซิงก์ข้ามเครื่องผ่าน `WorkforceData`; รายชื่อและ Default ยังคงอยู่ใน `RoomData`
- ข้อมูลตารางเดิมใน Local Storage จะถูกนำขึ้นชีตเมื่อเชื่อมครั้งแรก หากชีตยังไม่มีรายการนั้น

## สิทธิ์การเข้าถึง
โหมด `Anyone` เปิดข้อมูลรายชื่อและรายละเอียดการจ่ายงานทุกห้องให้ผู้มีลิงก์อ่านและแก้ได้ คู่มือ Google Sheets อธิบายผลกระทบนี้และข้อจำกัดด้านการจำกัดสิทธิ์
