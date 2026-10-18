# วิธีเผยแพร่บน GitHub Pages

เว็บหลักยังเป็น static site บน GitHub Pages เช่นเดิม หากต้องการซิงก์ข้อมูลห้องตรวจและ Dashboard ข้ามเครื่อง ให้ตั้ง Google Sheet + Apps Script bridge ตาม [คู่มือตั้งค่า Google Sheets ภาษาไทย](./GOOGLE_SHEETS_SETUP_TH.md) แล้ววาง URL `/exec` ใน `opd2-config.js` ก่อน deploy

## ขั้นตอน

1. แตกไฟล์ ZIP แล้วนำ **ไฟล์และโฟลเดอร์ภายใน** ไปไว้ที่ root ของ repository บน GitHub ตรวจสอบว่า `index.html` และ `.github/workflows/deploy-pages.yml` อยู่ที่ root โดยตรง อย่าอัปโหลด ZIP เข้า repository โดยไม่แตกไฟล์ และอย่าวางโปรเจกต์ซ้อนอยู่ในโฟลเดอร์ย่อย
2. Push/commit ไปยัง branch `main` หรือ `master` (workflow ตั้งให้ทำงานกับสองชื่อนี้) หรือสั่งด้วยตนเองจากแท็บ **Actions** ผ่าน `workflow_dispatch`
3. เปิด **Settings → Pages → Build and deployment** แล้วตั้ง **Source** เป็น **GitHub Actions**
4. เปิดแท็บ **Actions** เลือก workflow “Deploy OPD 2 Workforce to GitHub Pages” แล้วตรวจให้การรันจบด้วยสถานะสำเร็จ จากนั้นเปิด URL ที่แสดงใน deployment/environment
5. แชร์คู่มือหน้าเดียวให้ผู้ทดลองใช้ได้ที่ `https://OWNER.github.io/REPOSITORY/USER_GUIDE_TH.html` (แทน `OWNER/REPOSITORY` ด้วยชื่อจริง) หรือเติม `/USER_GUIDE_TH.html` ต่อท้าย URL ของ deployment

> ตัว workflow ไม่ต้องตั้ง Repository Variables สำหรับ URL เพราะแอปอ่าน `window.OPD2_BRIDGE_URL` จาก `opd2-config.js` ซึ่งต้องใส่ URL `/exec` ของ Apps Script ที่ deploy แล้ว

## ข้อจำกัดของข้อมูล

หากเว้น `OPD2_BRIDGE_URL` ว่าง แอปจะเก็บข้อมูลใน browser profile นี้เท่านั้น เมื่อกำหนด URL Apps Script แล้ว รายชื่อ ค่า Default แผนผู้ป่วยรายสัปดาห์ และตารางจ่ายงานรายวันจะซิงก์กับ Google Sheet แยกตามห้อง Dashboard จึงเปิดดูภาพรวมและรายละเอียดจ่ายงานทุกห้องจากอุปกรณ์อื่นได้ สิทธิ์ขึ้นกับ Apps Script deployment; หากเลือก `Anyone` ทุกคนที่มีลิงก์อ่านและแก้ข้อมูลทุกห้องได้ โปรดอ่านคำเตือนในคู่มือตั้งค่าก่อน Deploy

## ถ้า workflow ไม่เริ่มทำงาน

- ยืนยันว่าไฟล์ workflow อยู่ที่ `.github/workflows/deploy-pages.yml` ที่ root จริง ๆ
- ยืนยันว่า push ไป branch `main` หรือ `master`
- หากไม่แน่ใจเรื่องชื่อ branch ให้เปิดไฟล์ workflow และเพิ่มชื่อ branch จริงในส่วน `on.push.branches`
- ตรวจ **Settings → Actions → General** ว่า repository อนุญาตให้ workflow ใช้ Actions ได้

## Push ด้วย Git (ตัวอย่าง)

เรียกคำสั่งจากโฟลเดอร์โปรเจกต์ที่มี `index.html` อยู่:

```bash
git init -b main
git add -A
git commit -m "Deploy workforce management app"
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

แทน `OWNER/REPOSITORY` ด้วยชื่อบัญชีและ repository ของคุณ หาก repository มี commit อยู่แล้ว ให้ clone repository นั้นแล้วคัดลอกไฟล์โปรเจกต์ลงไปแทนการ `git init` ใหม่
