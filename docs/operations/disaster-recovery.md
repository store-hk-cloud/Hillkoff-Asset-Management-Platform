# Disaster recovery และ backup

ระบบใช้ Firestore เป็นข้อมูลธุรกรรมหลักและใช้ Cloud Storage สำหรับไฟล์หลักฐาน
เอกสาร และลายเซ็น การ backup ต้องเป็นงานของ project ที่มีสิทธิ์ Google Cloud
แยกจาก runtime service account ของแอป

## ค่าที่ต้องกำหนด

```text
GOOGLE_CLOUD_PROJECT=hillkoff-production
FIRESTORE_BACKUP_BUCKET=gs://hillkoff-firestore-backups
FIRESTORE_BACKUP_PREFIX=firestore/รายวัน
```

ตรวจสอบโดยไม่สั่ง export:

```bash
npm run backup:firestore:dry-run
```

สั่ง export จริงเฉพาะใน environment ที่ตรวจ target แล้ว:

```bash
CONFIRM_FIRESTORE_BACKUP=true npm run backup:firestore
```

สคริปต์ใช้ `gcloud firestore export` แบบ asynchronous และไม่แสดง credential
หรือค่า secret ใน output ไม่ควรเรียกใช้กับ production จนกว่าจะตรวจ project,
bucket, IAM และ retention policy ใน change record แล้ว

## Policy ที่ต้องตั้งใน Google Cloud

- ตั้ง schedule อย่างน้อยวันละครั้ง และกำหนด RPO ตามที่ฝ่ายธุรกิจกำหนด
- ใช้ bucket แยกจาก application project เมื่อทำได้
- เปิด object versioning, retention/lifecycle และ encryption ตามนโยบายองค์กร
- จำกัดสิทธิ์ให้ service account ทำ export ได้ แต่ผู้ใช้งานทั่วไปอ่าน backup ไม่ได้
- เก็บ Cloud Storage objects สำหรับหลักฐานและลายเซ็นด้วย retention ที่สอดคล้องกับเอกสารทางธุรกิจ
- เปิด Firestore TTL สำหรับ `rate_limits.expiresAt` เพื่อไม่ให้ข้อมูล rate limit ค้างสะสม

## Restore drill

1. ประกาศ incident owner, snapshot/export ที่จะใช้ และเวลาที่เริ่มกู้คืน
2. สร้าง project หรือ database สำหรับ recovery แยกจาก production
3. restore ไปยัง target ที่ตรวจสอบแล้ว ห้ามเขียนทับ production โดยตรง
4. ตรวจจำนวนเอกสาร, user roles, service jobs, audit logs, storage paths และ Rules
5. ทดสอบ login, งานช่าง, เอกสารพิมพ์, notification และ health check
6. บันทึกเวลาที่กู้ได้จริงเทียบกับ RTO และข้อมูลล่าสุดเทียบกับ RPO
7. อนุมัติการสลับ traffic หรือการนำข้อมูลกลับ production โดยผู้มีอำนาจ

## เป้าหมายเริ่มต้นที่ควรอนุมัติ

RPO และ RTO เป็น business decision ไม่ควรเดาจาก source code โดยตั้งค่าเริ่มต้น
สำหรับการวางแผนเป็น RPO ไม่เกิน 24 ชั่วโมง และ RTO ไม่เกิน 4 ชั่วโมง จนกว่าจะมี
SLA ที่อนุมัติอย่างเป็นทางการ
