# Audit trail และ data governance

## Audit trail ที่มีอยู่

การเปลี่ยนแปลงสำคัญของเครื่อง, ผู้ใช้งาน, คลัง, งานบริการ, การติดตั้ง, งานซ่อม,
PM และงานช่างถูกเขียนลง `audit_logs` ใน transaction เดียวกับข้อมูลหลักเมื่อ
repository รองรับ transaction นั้น ๆ ทุก record มี action, entity, actor,
เวลา, correlation ID และข้อมูลการเปลี่ยนแปลงตามขอบเขตของงาน

Cloud Firestore Rules อนุญาตให้อ่าน audit log ได้เฉพาะผู้ใช้ active ที่เป็น
`admin` หรือ `executive` และห้าม client สร้าง แก้ไข หรือลบโดยตรง

## Access และ export

- API `GET /api/audit-logs?limit=50` อ่านรายการล่าสุดได้สูงสุด 100 รายการ
- ต้องมี session ที่ยังใช้งานได้และ role เป็น `admin` หรือ `executive`
- response ใช้ `Cache-Control: no-store` และส่ง correlation ID กลับทุกครั้ง
- การ export ต้องมี ticket ระบุเหตุผล, ผู้อนุมัติ, ช่วงเวลา และปลายทางข้อมูล
- ห้ามใส่ password, token, cookie, secret หรือ private key ใน `changes`

## Retention และ review

ให้เจ้าของระบบกำหนด retention ตามกฎหมายและนโยบายบริษัท พร้อม review รายเดือน:

- ตรวจว่าการสร้าง/แก้ไขข้อมูลสำคัญมี audit record ครบ
- ตรวจ correlation ID ของ incident และ notification ที่ล้มเหลว
- ตรวจบัญชี admin/executive และสิทธิ์การอ่าน audit log
- ตรวจการเข้าถึงข้อมูลส่วนบุคคลและการ export ที่ได้รับอนุมัติ
- เก็บหลักฐานการ review และ action ที่แก้ไขแล้ว

## Incident handling

เมื่อพบข้อมูลผิดปกติ ให้เก็บ correlation ID, audit document ID, เวลา, actor,
request path และ deployment version จาก logs ก่อนแก้ไขข้อมูล ห้ามแก้หรือลบ
audit record เพื่อปกปิดเหตุการณ์ ให้ใช้ corrective event ใหม่ที่อธิบายเหตุผล
และผู้อนุมัติแทน
