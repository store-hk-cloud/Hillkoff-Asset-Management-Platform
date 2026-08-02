import type { Locale } from "@/lib/i18n/config";

const translations = {
  "app.name": {
    th: "ระบบจัดการเครื่อง Hillkoff",
    en: "Hillkoff Machine Management",
  },
  "nav.dashboard": { th: "ภาพรวม", en: "Dashboard" },
  "nav.technician": { th: "งานของช่าง", en: "Technician Work" },
  "nav.assets": { th: "เครื่อง", en: "Machines" },
  "nav.warehouse": { th: "คลังสินค้า", en: "Warehouse" },
  "nav.installations": { th: "งานติดตั้ง", en: "Installations" },
  "nav.repairs": { th: "งานซ่อม", en: "Repairs" },
  "nav.pm": { th: "บำรุงรักษา", en: "PM" },
  "nav.inventory": { th: "อะไหล่", en: "Inventory" },
  "nav.notifications": { th: "การแจ้งเตือน", en: "Notifications" },
  "nav.users": { th: "ผู้ใช้งาน", en: "Users" },
  "nav.mobile": { th: "เมนูมือถือ", en: "Mobile navigation" },
  "action.login": { th: "เข้าสู่ระบบ", en: "Sign in" },
  "action.logout": { th: "ออกจากระบบ", en: "Sign out" },
  "action.install": { th: "ติดตั้งแอป", en: "Install app" },
  "action.retry": { th: "ลองอีกครั้ง", en: "Try again" },
  "action.cancel": { th: "ยกเลิก", en: "Cancel" },
  "action.search": { th: "ค้นหา", en: "Search" },
  "action.create": { th: "สร้าง", en: "Create" },
  "action.edit": { th: "แก้ไข", en: "Edit" },
  "action.save": { th: "บันทึก", en: "Save" },
  "action.archive": { th: "เก็บถาวร", en: "Archive" },
  "action.back": { th: "ย้อนกลับ", en: "Back" },
  "action.language": { th: "ภาษา", en: "Language" },
  "action.theme": { th: "ธีม", en: "Theme" },
  "theme.light": { th: "โหมดสว่าง", en: "Light mode" },
  "theme.dark": { th: "โหมดมืด", en: "Dark mode" },
  "language.th": { th: "ไทย", en: "Thai" },
  "language.en": { th: "อังกฤษ", en: "English" },
  "status.loading": { th: "กำลังโหลด…", en: "Loading…" },
  "status.offline": {
    th: "ออฟไลน์ — ไม่สามารถบันทึกข้อมูลได้",
    en: "Offline — data changes are unavailable",
  },
  "login.title": { th: "เข้าสู่ระบบ", en: "Sign in" },
  "login.description": {
    th: "ใช้บัญชีที่ผู้ดูแลระบบ Hillkoff จัดเตรียมให้",
    en: "Use the account provided by your Hillkoff administrator",
  },
  "field.email": { th: "อีเมล", en: "Email" },
  "field.password": { th: "รหัสผ่าน", en: "Password" },
  "field.displayName": { th: "ชื่อที่แสดง", en: "Display name" },
  "field.role": { th: "บทบาท", en: "Role" },
  "field.phone": { th: "เบอร์โทรศัพท์", en: "Phone number" },
  "field.status": { th: "สถานะ", en: "Status" },
  "field.customerId": { th: "รหัสลูกค้า", en: "Customer ID" },
  "profile.title": { th: "โปรไฟล์ผู้ใช้", en: "User profile" },
  "profile.description": {
    th: "แก้ไขข้อมูลส่วนตัวที่อนุญาต บทบาทและสถานะจัดการโดยผู้ดูแลระบบ",
    en: "Update your personal details. Roles and account status are managed by an administrator.",
  },
  "users.title": { th: "ผู้ใช้งานและสิทธิ์", en: "Users and access" },
  "users.add": { th: "เพิ่มผู้ใช้งาน", en: "Add user" },
  "users.empty": { th: "ยังไม่มีบัญชีผู้ใช้งาน", en: "No user accounts" },
  "users.resetPassword": {
    th: "ส่งคำเชิญตั้งรหัสผ่าน",
    en: "Send password invitation",
  },
  "assets.title": { th: "เครื่อง", en: "Machines" },
  "assets.management": { th: "จัดการเครื่อง", en: "Machine Management" },
  "assets.add": { th: "เพิ่มเครื่อง", en: "Add machine" },
  "assets.empty": {
    th: "ไม่พบเครื่องตามเงื่อนไข",
    en: "No machines match the selected filters",
  },
  "assets.back": { th: "← เครื่องทั้งหมด", en: "← All machines" },
  "warehouse.title": { th: "คลังสินค้า", en: "Warehouse" },
  "warehouse.description": {
    th: "ย้ายคลัง ขายลูกค้า และตรวจสอบประวัติการเคลื่อนไหว",
    en: "Move warehouse stock, sell machines, and review movement history.",
  },
  "warehouse.receive": { th: "รับเข้า", en: "Receive" },
  "warehouse.transfer": { th: "ย้ายคลัง", en: "Move warehouse" },
  "warehouse.sale": { th: "ขายลูกค้า", en: "Customer sale" },
  "warehouse.movements": { th: "ประวัติการเคลื่อนไหว", en: "Movement logs" },
  "installations.title": { th: "คิวงานติดตั้ง", en: "Installation Queue" },
  "installations.schedule": {
    th: "นัดหมายติดตั้ง",
    en: "Schedule Installation",
  },
  "repairs.title": { th: "จัดการงานซ่อม", en: "Repair Management" },
  "repairs.create": { th: "สร้างใบงานซ่อม", en: "Create Repair Ticket" },
  "pm.title": { th: "บำรุงรักษาเชิงป้องกัน", en: "Preventive Maintenance" },
  "inventory.title": { th: "คลังอะไหล่", en: "Inventory" },
  "notifications.title": { th: "ศูนย์การแจ้งเตือน", en: "Notification Center" },
  "dashboard.title": { th: "ภาพรวมผู้บริหาร", en: "Executive Dashboard" },
  "dashboard.welcome": { th: "ยินดีต้อนรับ", en: "Welcome" },
  "error.title": { th: "เกิดข้อผิดพลาด", en: "Something went wrong" },
  "error.description": {
    th: "ไม่สามารถดำเนินการตามคำขอได้",
    en: "The request could not be completed.",
  },
  "error.application": { th: "แอปพลิเคชันขัดข้อง", en: "Application error" },
  "notFound.title": { th: "ไม่พบหน้าที่ต้องการ", en: "Page not found" },
  "notFound.home": { th: "กลับหน้าหลัก", en: "Return home" },
  "offline.title": {
    th: "ไม่มีการเชื่อมต่ออินเทอร์เน็ต",
    en: "No internet connection",
  },
  "offline.description": {
    th: "การดูและบันทึกข้อมูลเครื่องต้องเชื่อมต่ออินเทอร์เน็ต เพื่อป้องกันข้อมูลซ้ำและความขัดแย้งของรายการธุรกรรม",
    en: "Viewing and changing machine data requires an internet connection to prevent duplicate or conflicting transactions.",
  },
  "public.verification": {
    th: "ตรวจสอบเครื่อง Hillkoff",
    en: "Hillkoff Machine Verification",
  },
  "brand.tagline": {
    th: "กลิ่นหอมพาเปลี่ยนแปลง รสชาติถึงซึ่งความรับผิดชอบ ดื่มด่ำย้ำเตือนความยั่งยืน",
    en: "Where aroma sparks change, where taste meets responsibility, where every sip is a reminder of sustainability",
  },
  "brand.pillar.highland": {
    th: "H: เกษตรพื้นที่สูง",
    en: "H: Highland Agricultural",
  },
  "brand.pillar.innovation": {
    th: "I: นวัตกรรม",
    en: "I: Innovation",
  },
  "brand.pillar.lives": {
    th: "L: ชีวิต",
    en: "L: Lives",
  },
  "footer.terms": {
    th: "ขอบเขตและเงื่อนไขการใช้งาน",
    en: "Scope & Terms of Use",
  },
  "footer.rights": {
    th: "สงวนลิขสิทธิ์ บริษัท ฮิลล์คอฟฟ์ จำกัด",
    en: "All rights reserved, Hillkoff Co., Ltd.",
  },
  "terms.title": { th: "ขอบเขตและเงื่อนไขการใช้งาน", en: "Scope & Terms of Use" },
  "terms.subtitle": {
    th: "สำหรับพนักงานฮิลล์คอฟฟ์ที่ใช้ระบบจัดการเครื่องนี้",
    en: "For Hillkoff staff using this asset management system",
  },
  "terms.scope.heading": { th: "1. ขอบเขตการใช้งาน", en: "1. Scope of Use" },
  "terms.scope.body": {
    th: "ระบบนี้จัดทำขึ้นเพื่อใช้ในการติดตามเครื่องจักร งานติดตั้ง งานซ่อม งานบำรุงรักษาเชิงป้องกัน และคลังอะไหล่ของบริษัท ฮิลล์คอฟฟ์ จำกัด เท่านั้น การเข้าถึงจำกัดเฉพาะพนักงาน ช่างเทคนิค และผู้เกี่ยวข้องที่ได้รับบัญชีผู้ใช้งานจากผู้ดูแลระบบ ตามบทบาทและสิทธิ์ที่กำหนดไว้",
    en: "This system exists solely to track machines, installations, repairs, preventive maintenance, and parts inventory for Hillkoff Co., Ltd. Access is limited to employees, technicians, and authorized parties issued an account by an administrator, scoped to their assigned role and permissions.",
  },
  "terms.data.heading": {
    th: "2. ความรับผิดชอบต่อข้อมูล",
    en: "2. Data Responsibility",
  },
  "terms.data.body": {
    th: "ข้อมูลลูกค้า เครื่องจักร และประวัติการซ่อมบำรุงในระบบถือเป็นข้อมูลลับของบริษัท ห้ามคัดลอก ส่งออก หรือเปิดเผยข้อมูลแก่บุคคลภายนอกโดยไม่ได้รับอนุญาต และห้ามใช้ข้อมูลเพื่อวัตถุประสงค์อื่นนอกเหนือจากงานที่ได้รับมอบหมาย",
    en: "Customer data, machine records, and service history in this system are confidential company information. Do not copy, export, or disclose data to third parties without authorization, and do not use data for any purpose beyond assigned duties.",
  },
  "terms.account.heading": {
    th: "3. ความรับผิดชอบต่อบัญชีผู้ใช้งาน",
    en: "3. Account Responsibility",
  },
  "terms.account.body": {
    th: "ผู้ใช้งานต้องเก็บรักษารหัสผ่านเป็นความลับ ห้ามใช้บัญชีร่วมกับผู้อื่นหรือให้ผู้อื่นเข้าสู่ระบบแทนตน ทุกการกระทำภายใต้บัญชีของท่านถือเป็นความรับผิดชอบของผู้ถือบัญชีนั้น หากสงสัยว่าบัญชีถูกใช้งานโดยไม่ได้รับอนุญาต ให้แจ้งผู้ดูแลระบบทันที",
    en: "Users must keep passwords confidential and must not share accounts or let others sign in on their behalf. All actions taken under your account are your responsibility. Report suspected unauthorized use of your account to an administrator immediately.",
  },
  "terms.monitoring.heading": {
    th: "4. การบันทึกและตรวจสอบการใช้งาน",
    en: "4. Monitoring & Logging",
  },
  "terms.monitoring.body": {
    th: "ระบบมีการบันทึกกิจกรรมสำคัญ เช่น การเข้าสู่ระบบ การแก้ไขข้อมูลเครื่อง และการเปลี่ยนแปลงสถานะงาน เพื่อวัตถุประสงค์ด้านความปลอดภัยและการตรวจสอบย้อนหลัง ข้อมูลเหล่านี้อาจถูกใช้ในการสอบสวนกรณีพบการใช้งานที่ผิดปกติ",
    en: "The system logs key activity such as sign-ins, machine record edits, and job status changes for security and audit purposes. This data may be used to investigate suspected misuse.",
  },
  "terms.prohibited.heading": {
    th: "5. ข้อห้ามในการใช้งาน",
    en: "5. Prohibited Actions",
  },
  "terms.prohibited.body": {
    th: "ห้ามพยายามเข้าถึงข้อมูลหรือฟังก์ชันที่อยู่นอกเหนือสิทธิ์ของตน ห้ามป้อนข้อมูลเท็จหรือบันทึกงานที่ไม่ได้ทำจริง ห้ามใช้ช่องโหว่ของระบบเพื่อประโยชน์ส่วนตน และห้ามนำภาพหรือข้อมูลจากระบบไปเผยแพร่ต่อสาธารณะโดยไม่ได้รับอนุญาตจากผู้บริหาร",
    en: "Do not attempt to access data or functions outside your granted permissions. Do not enter false data or log work that was not actually performed. Do not exploit system vulnerabilities for personal gain, and do not publish images or data from the system without management authorization.",
  },
  "terms.contact.heading": { th: "6. ติดต่อสอบถาม", en: "6. Contact" },
  "terms.contact.body": {
    th: "หากมีข้อสงสัยเกี่ยวกับขอบเขตการใช้งาน สิทธิ์การเข้าถึง หรือพบปัญหาด้านความปลอดภัยของระบบ กรุณาติดต่อผู้ดูแลระบบของบริษัทโดยตรง",
    en: "For questions about scope of use, access permissions, or to report a security concern, please contact your system administrator directly.",
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type TranslationKey = keyof typeof translations;

export function translate(locale: Locale, key: TranslationKey): string {
  return translations[key][locale];
}
