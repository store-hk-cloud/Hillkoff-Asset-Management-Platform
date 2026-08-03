# Observability และ alerting

## Structured logs

Web logs ใช้ JSON fields มาตรฐาน ได้แก่ `severity`, `message`, `timestamp` และ
`correlationId` ทุก API ที่มี error handling ควรส่ง correlation ID จาก request
และคืนค่า header `x-correlation-id` ให้ผู้เรียก ระบบจะ redact key ที่มีลักษณะ
เป็น password, token, secret, cookie, authorization, API key หรือ private key
ก่อนเขียน log

Next.js `instrumentation.ts` ดัก unhandled request errors พร้อม path, method,
router kind, route path และ route type โดยไม่บันทึก request headers ทั้งชุด

## Health และ service signals

- `GET /api/health` ตรวจ web process แบบไม่แตะข้อมูลภายนอก
- `GET /api/health?deep=1` ตรวจการอ่าน Firestore แบบจำกัด 1 document
- login, invitation redemption, password reset และ logout failure มี log เฉพาะเหตุการณ์
- Cloud Functions notification triggers มี retry และ error logging

## Alert policy ที่ควรตั้ง

ตั้ง alert ใน Google Cloud Monitoring ตาม traffic จริงและปรับ threshold หลังมี
baseline อย่างน้อย 7 วัน:

- health degraded ต่อเนื่อง 5 นาที
- HTTP 5xx สูงกว่า 2% ต่อเนื่อง 10 นาที
- p95 latency สูงกว่า 1.5 วินาทีต่อเนื่อง 10 นาที
- login rate-limit หรือ authentication failures เพิ่มผิดปกติ
- notification queue retry สูงกว่าค่า baseline หรือมี dead-letter event
- Firestore read/write errors หรือ quota ใกล้เต็ม
- backup ล่าสุดเกิน RPO ที่อนุมัติ

ทุก alert ต้องมี owner, severity, runbook URL, notification channel และขั้นตอน
ปิดเหตุการณ์ ห้ามส่งข้อมูลลูกค้า, token หรือ request body ไปยัง notification
channel

## Incident workflow

1. เริ่มจาก timestamp, deployment version และ correlation ID
2. แยกปัญหา web, Firebase Auth, Firestore, Storage, Functions หรือ external SMTP
3. ตรวจ audit log และ notification queue ที่เกี่ยวข้อง
4. ใช้ rollback artifact หรือ feature flag ตาม runbook
5. บันทึก root cause, impact, detection gap และ corrective action
