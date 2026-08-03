# Enterprise release gates

เอกสารนี้เป็นเกณฑ์กลางก่อน merge และก่อนปล่อยระบบ โดยแยกสิ่งที่อยู่ใน
repository ออกจากสิ่งที่ต้องตั้งค่าใน GitHub, Firebase และ Google Cloud

## สิ่งที่ repository บังคับใช้แล้ว

- `npm run check` ตรวจ TypeScript, ESLint และ Functions typecheck
- `npm test -- --run` ตรวจ unit tests
- `npm run test:rules` ตรวจ Firestore และ Storage Rules ด้วย emulator
- `npm run functions:build` ตรวจ Cloud Functions build
- `npm run build` ตรวจ production build
- `npm run test:e2e` ตรวจ health endpoint และ authentication boundary ของหน้าช่างกับงานบริการช่าง
- `npm run audit:ci` ล้มเหลวเมื่อพบ vulnerability ระดับ high ขึ้นไป
- GitHub Actions มี CI, CodeQL และ dependency review
- instrumentation ของ Next.js ส่ง unhandled request error พร้อม correlation ID

## ขั้นตอน release ที่แนะนำ

1. เปิด Pull Request และรอทุก required check เป็นสีเขียว
2. ตรวจ diff, migration และผลกระทบต่อ Firestore Rules
3. ให้ผู้ตรวจคนที่สองยืนยัน security, data contract และเอกสาร rollback
4. merge เข้า `main` หลังผ่าน approval ที่กำหนด
5. deploy ผ่าน environment ที่มี secret แยกจาก development
6. เรียก `/api/health` และ `/api/health?deep=1` หลัง deploy
7. ตรวจ error rate, latency, login failures, queue failures และ notification failures

## สิ่งที่ผู้ดูแลระบบภายนอกต้องตั้งค่า

สิ่งต่อไปนี้ไม่สามารถเปิดใช้งานจาก source code ได้โดยไม่ใช้สิทธิ์ขององค์กร:

- Branch protection ให้ `main` ต้องผ่าน required checks, review และห้าม force push
- GitHub secret scanning, push protection และ Dependabot security updates
- จำกัด GitHub Actions permissions เป็น read-only ตาม workflow และอนุมัติ action versions ตามนโยบายองค์กร
- Firebase App Check, Identity Platform MFA และการบังคับใช้ `AUTH_REQUIRE_MFA=true`
- Google Cloud Logging/Monitoring alert policy และ notification channel
- Firestore export schedule ไปยัง bucket ที่แยก project/สิทธิ์ พร้อม lifecycle retention
- กำหนด RTO/RPO อย่างเป็นทางการและซ้อม restore อย่างน้อยรายไตรมาส

## เกณฑ์หยุด release

หยุด release เมื่อพบ high/critical vulnerability, Rules test ล้มเหลว, build ไม่ผ่าน,
health check degraded, schema mismatch, backup ล่าสุดเกิน RPO หรือไม่สามารถยืนยัน
rollback artifact ได้
