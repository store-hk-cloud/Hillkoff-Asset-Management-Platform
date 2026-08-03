# Accessibility และ performance quality bar

เกณฑ์นี้ใช้ตรวจทุกหน้าหลัก โดยเฉพาะหน้ารวมงานบริการช่างและ workspace ของช่าง

## Accessibility

- ใช้ heading ตามลำดับและมีชื่อหน้า/ชื่อส่วนที่ชัดเจน
- ทุก input มี label และทุก icon-only button มี accessible name
- keyboard ใช้งานได้ครบ มี focus-visible ที่เห็นชัด และ modal จัดการ focus
- สีข้อความและสถานะต้องผ่าน WCAG 2.2 AA และไม่ใช้สีเป็นข้อมูลเพียงอย่างเดียว
- ตาราง, badge, error, loading และ empty state ต้องอ่านได้ด้วย screen reader
- ปุ่มพิมพ์และเอกสารงานช่างต้องมี semantic title และไม่ตัดข้อมูลสำคัญ

## Performance

- API list ทุกจุดต้องมี limit และไม่ scan collection โดยไม่จำเป็น
- งานหนัก เช่น export, report และ backup ต้องทำแบบ asynchronous หรือ background
- หน้าแรกควรโหลดเฉพาะข้อมูลของ role และ section ที่ผู้ใช้เปิด
- ตรวจ Core Web Vitals หลัง deploy และกำหนด owner เมื่อเกิน budget
- เก็บ correlation ID ใน slow request เพื่อหา query หรือ external call ที่ช้า

## Definition of done

ก่อน merge ต้องผ่าน typecheck, lint, unit/rules tests, production build และ smoke
E2E พร้อมตรวจด้วย keyboard อย่างน้อยหนึ่งรอบในหน้าที่แก้ไข หากเปลี่ยนเอกสาร
พิมพ์ต้อง render เป็น PDF/print preview และตรวจภาษาไทย, ขอบกระดาษ และการตัดหน้า
