# วิธีเผยแพร่บน GitHub Pages

โปรเจกต์รุ่นนี้เป็นเว็บแบบ static และบันทึกข้อมูลใน Local Storage ของเบราว์เซอร์ ไม่ต้องมี Node server หรือ Google Apps Script สำหรับการเผยแพร่หน้าเว็บ

## ขั้นตอน

1. แตกไฟล์ ZIP แล้วนำ **ไฟล์และโฟลเดอร์ภายใน** ไปไว้ที่ root ของ repository บน GitHub ตรวจสอบว่า `index.html` และ `.github/workflows/deploy-pages.yml` อยู่ที่ root โดยตรง อย่าอัปโหลด ZIP เข้า repository โดยไม่แตกไฟล์ และอย่าวางโปรเจกต์ซ้อนอยู่ในโฟลเดอร์ย่อย
2. Push/commit ไปยัง branch `main` หรือ `master` (workflow ตั้งให้ทำงานกับสองชื่อนี้) หรือสั่งด้วยตนเองจากแท็บ **Actions** ผ่าน `workflow_dispatch`
3. เปิด **Settings → Pages → Build and deployment** แล้วตั้ง **Source** เป็น **GitHub Actions**
4. เปิดแท็บ **Actions** เลือก workflow “Deploy OPD 2 Workforce to GitHub Pages” แล้วตรวจให้การรันจบด้วยสถานะสำเร็จ จากนั้นเปิด URL ที่แสดงใน deployment/environment
5. แชร์คู่มือหน้าเดียวให้ผู้ทดลองใช้ได้ที่ `https://OWNER.github.io/REPOSITORY/USER_GUIDE_TH.html` (แทน `OWNER/REPOSITORY` ด้วยชื่อจริง) หรือเติม `/USER_GUIDE_TH.html` ต่อท้าย URL ของ deployment

> Workflow รุ่นนี้ไม่ต้องตั้งค่า Repository Variables `OPD2_SHEETS_API_URL` หรือ `OPD2_API_BASE` เพราะแอปปัจจุบันใช้ Local Storage เท่านั้น

## ข้อจำกัดของข้อมูล

ข้อมูลจะอยู่เฉพาะใน browser profile และอุปกรณ์ที่บันทึกไว้ ไม่ได้ sync ระหว่างผู้ใช้หรือเครื่องต่าง ๆ การเผยแพร่ผ่าน GitHub Pages เป็นเพียงการโฮสต์ไฟล์หน้าเว็บ ไม่ได้ทำให้ข้อมูลแชร์กัน หากต้องการฐานข้อมูลส่วนกลาง ต้องเพิ่ม backend/API และปรับแอปแยกต่างหาก

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
