# คู่มือตั้ง Google Sheets สำหรับ GitHub Pages

เว็บหลักยังอยู่บน GitHub Pages ส่วน Apps Script เชื่อมหน้าเว็บกับชีตกลาง และใช้ `Rooms` เพื่อแยกข้อมูลตามห้องตรวจ ระบบยังไม่มีสิทธิ์แยกตามห้อง: ผู้ใช้ทุกคนที่ Apps Script อนุญาตจะเห็นและแก้ไขทุกห้องได้

> **สำคัญ — การเปิดใช้เป็นสาธารณะ:** เมื่อ Deploy เป็น `Anyone` ทุกคนที่เปิด URL ของเว็บได้ รวมถึงคนนอกองค์กร อาจดูและแก้รายชื่อ ตารางจ่ายงานรายบุคคล สถานะลา/อบรม หน้าที่ เวลา จุดปฏิบัติงาน Code และหมายเหตุของทุกห้องได้ แม้ไฟล์ Google Sheet จะตั้งเป็นส่วนตัวก็ตาม เพราะ Apps Script ทำงานด้วยสิทธิ์ของเจ้าของชีต ห้ามใส่ข้อมูลผู้ป่วยหรือข้อมูลที่ไม่ต้องการเปิดแก่ผู้มีลิงก์ หากต้องจำกัดเฉพาะหัวหน้า/บุคลากร ให้ตั้งสิทธิ์ Apps Script ตามบัญชีหรือโดเมนองค์กรและตรวจสอบสิทธิ์นั้นก่อนใช้งานจริง

เมื่อเชื่อมต่อสำเร็จ ระบบซิงก์รายชื่อ ค่า Default แผนผู้ป่วยรายสัปดาห์ และการจ่ายงานรายวันข้ามอุปกรณ์ Dashboard รวมข้อมูลทุกห้องที่เปิดใช้งาน และแสดงภาพรวมการจัดสรรรายสัปดาห์แยกตามตำแหน่ง

## 1. ใช้ Google Sheet เดิมที่สร้างไว้

ไม่ต้องสร้างชีตใหม่ และไม่ต้องเปลี่ยนการแชร์ไฟล์ชีตให้เป็นสาธารณะ เก็บไฟล์ชีตไว้แบบส่วนตัวใน Drive ของเจ้าของ Apps Script ได้

ถ้าเคยทำตามขั้นก่อนหน้าและมีแท็บ `Users` แล้ว **ปล่อยแท็บนั้นไว้ได้ แต่ไม่ต้องกรอกหรือใช้** โค้ด public-link รุ่นนี้ไม่อ่านแท็บ `Users`

## 2. วาง Apps Script รุ่น public-link

1. เปิดไฟล์ Apps Script ที่ผูกกับ Google Sheet
2. เปิด `Code.gs` แล้วเลือกโค้ดทั้งหมด ลบ และวางโค้ดจาก `google-apps-script/Code.gs` ในชุดโปรเจกต์
3. ใน `OPD2_CONFIG` ใส่ `SPREADSHEET_ID` และ `ALLOWED_PARENT_ORIGIN` ค่าจริงจากระบบของคุณ อย่าปล่อย placeholder (`PASTE_SPREADSHEET_ID_HERE` / `YOUR_GITHUB_OWNER`)
4. กดบันทึก `Ctrl+S`
5. ในแถบ Files กด `+` → **HTML** ตั้งชื่อ `Bridge` แล้ววางเนื้อหาทั้งหมดจาก `google-apps-script/Bridge.html` ในชุดโค้ด
6. เปิด **Project Settings** แล้วเปิด `Show "appsscript.json" manifest file in editor` จากนั้นวางเนื้อหาจาก `google-apps-script/appsscript.json`
7. เลือก `setupDatabase` แล้วกด **Run** และอนุญาตสิทธิ์ Google Sheets
8. กลับไปชีต จะมีแท็บ `Rooms`, `RoomData` และ `WorkforceData`

ถ้ายังเห็น `Users` จากการตั้งค่ารุ่นก่อน ไม่ต้องลบ แท็บนี้ไม่มีผลกับโค้ดใหม่

ถ้ามี deployment เดิมอยู่แล้ว ให้อัปเดต `Code.gs` และ `Bridge.html` ตามไฟล์ชุดนี้ แล้วรัน `setupDatabase` เพื่อเพิ่ม `WorkforceData` จากนั้นเลือก **Deploy → Manage deployments → Edit → New version → Deploy** และใช้ URL `/exec` เดิมต่อได้

### แท็บที่สร้างขึ้น

- `Rooms`: รายชื่อหน่วยและห้องที่แอปมีให้เลือก ระบบใส่รายการเริ่มต้นให้เมื่อแท็บยังไม่มีข้อมูล
- `RoomData`: ระบบบันทึกรายชื่อและค่า Default โดยใช้ `unitId` และ `clinicName` เป็นตัวแยกห้อง
- `WorkforceData`: ระบบบันทึกแผนผู้ป่วยหนึ่งแถวต่อสัปดาห์ และตารางจ่ายงานหนึ่งแถวต่อวัน แยกด้วยหน่วย ห้อง และชนิดข้อมูล

อย่าแก้หัวแถวของทั้งสองแท็บ หากปิดห้องโดยแก้ `active` เป็น `FALSE` ห้องนั้นจะหายจากหน้าแอป แต่การใช้เว็บยังเป็นสาธารณะ ไม่มีการแยกสิทธิ์ตามห้อง

## 3. Deploy Apps Script และกำหนดว่าใครเปิดข้อมูลได้

1. ใน Apps Script เลือก **Deploy → New deployment**
2. กดไอคอนรูปเฟือง → เลือก **Web app**
3. ตั้ง **Execute as** เป็นบัญชีเจ้าของสคริปต์
4. ตั้ง **Who has access** ให้ตรงกับผู้ใช้จริง:
   - ถ้าให้หัวหน้าภายในองค์กรใช้ ให้เลือกเฉพาะบัญชี/โดเมนองค์กร (เช่น Anyone within your organization) และแชร์ URL เว็บกับหัวหน้าที่ได้รับอนุญาต
   - หากเลือก **Anyone** ทุกคนที่มีลิงก์ รวมถึงคนนอกองค์กร จะอ่านและแก้ข้อมูลทุกห้องได้
5. กด **Deploy** และคัดลอก URL ที่ลงท้ายด้วย `/exec`

การแยกสิทธิ์มีที่ระดับ deployment เท่านั้น ยังไม่มีบทบาทหัวหน้า/ผู้แก้ไขและไม่มีสิทธิ์แยกห้อง หาก Workspace ไม่มีตัวเลือกจำกัดเฉพาะองค์กรและข้อมูลไม่ควรเปิดสู่สาธารณะ ให้ประสานผู้ดูแล Workspace ก่อนเผยแพร่

## 4. เชื่อม URL เข้ากับเว็บ GitHub Pages

1. เปิด `opd2-config.js` ใน repository ของเว็บ
2. กำหนด URL `/exec` ที่ได้จาก Deploy เช่น:

   ```js
   window.OPD2_BRIDGE_URL = "https://script.google.com/macros/s/DEPLOYMENT_ID/exec";
   ```

3. บันทึก Commit และ Push ให้ GitHub Pages deploy เวอร์ชันใหม่
4. เปิดเว็บ แล้วตรวจสถานะบนแถบด้านบน ควรขึ้นว่า **เชื่อม Google Sheet แล้ว**
5. เพิ่มข้อมูลทดสอบที่ไม่ใช่ข้อมูลจริง แล้วตรวจว่ารายชื่ออยู่ใน `RoomData` ส่วนแผนและจ่ายงานอยู่ใน `WorkforceData`; เปิดเว็บจาก browser/เครื่องอื่นและตรวจ Dashboard รายห้อง

ผู้ใช้ที่ผ่านสิทธิ์ Apps Script จะเห็นห้องที่เปิดใช้งานใน `Rooms` และสามารถแก้ข้อมูลในทุกห้องได้ การแบ่งห้องในชีตเป็นการแยกข้อมูล ไม่ใช่การจำกัดว่าใครเข้าถึงห้องใด

## ข้อมูลที่ซิงก์

- เพิ่ม/แก้/ลบชื่อและตำแหน่ง → บันทึกแยกตามห้องใน `RoomData`
- หน้าที่และค่าประจำที่ระบบบันทึกเป็น Default → บันทึกแยกตามห้อง
- แผนผู้ป่วยรายสัปดาห์และวันหยุด → `WorkforceData` แยกตามสัปดาห์
- ตารางจ่ายงานรายวัน รวม VAC, ประชุม/อบรม, Float, ใช้ ชม., หน้าที่, เวลา, จุด, Code, เวลาเข้า และหมายเหตุ → `WorkforceData` แยกตามวัน
- ข้อมูลเดิมใน Local Storage ของ browser profile ที่เคยจ่ายงาน → เมื่อนำเว็บรุ่นใหม่ไปเปิดบน browser/profile เดิม ระบบจะนำแผนและรายการจ่ายงานเดิมขึ้นชีตในรายการวันที่ยังไม่มีในชีต; ควรเปิดเว็บจากทุกเครื่องที่มีข้อมูลเดิมและรอข้อความซิงก์สำเร็จก่อนปิดหน้า

## ถ้าติดปัญหา

- ถ้า `setupDatabase` แจ้ง Spreadsheet ID ให้ตรวจว่าใช้ Code.gs จากไฟล์ที่ปรับไว้แล้ว และรหัสในต้นไฟล์ตรงกับ Google Sheet
- ถ้าขึ้น `ไม่มีห้องตรวจ...` ให้ตรวจแท็บ `Rooms` ว่ามีรายการและ `active` เป็น `TRUE`
- ถ้า Apps Script `Anyone` ไม่ปรากฏ นโยบาย Workspace อาจปิดการเผยแพร่สาธารณะ
- หาก browser บล็อก iframe/third-party cookies ให้ทดสอบ browser อื่นที่องค์กรอนุญาต; อย่าแก้ด้วยการแชร์ Google Sheet สู่สาธารณะ
- เมื่อแก้ `Code.gs` ให้ใช้ **Deploy → Manage deployments → Edit → New version → Deploy** เพื่ออัปเดต web app
- สำรอง Google Sheet สม่ำเสมอ เพราะผู้ใช้ลิงก์สาธารณะอาจแก้หรือลบข้อมูล

เอกสาร Google: [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web) · [HTML Service communication](https://developers.google.com/apps-script/guides/html/communication) · [Lock Service](https://developers.google.com/apps-script/reference/lock/lock-service) · [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas)
