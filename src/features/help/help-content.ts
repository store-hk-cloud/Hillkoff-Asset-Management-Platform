import type { UserRole } from "@/domain/value-objects/user-role";

export type HelpLocale = "th" | "en";

export type LocalizedText = Readonly<{
  th: string;
  en: string;
}>;

export type HelpCategory =
  | "getting-started"
  | "asset-operations"
  | "service-operations"
  | "warehouse"
  | "administration";

export type HelpIconName =
  | "book"
  | "machine"
  | "service"
  | "wrench"
  | "calendar"
  | "warehouse"
  | "users"
  | "shield"
  | "life-buoy";

export type HelpStep = Readonly<{
  title: LocalizedText;
  detail: LocalizedText;
  href?: string;
}>;

export type HelpGuide = Readonly<{
  id: string;
  category: HelpCategory;
  icon: HelpIconName;
  roles: readonly (UserRole | "all")[];
  title: LocalizedText;
  summary: LocalizedText;
  outcome: LocalizedText;
  steps: readonly HelpStep[];
  checklist: readonly LocalizedText[];
  cautions: readonly LocalizedText[];
}>;

export const helpGuides: readonly HelpGuide[] = [
  {
    id: "start-here",
    category: "getting-started",
    icon: "book",
    roles: ["all"],
    title: {
      th: "เริ่มต้นใช้งานระบบอย่างถูกต้อง",
      en: "Start here: use the system correctly",
    },
    summary: {
      th: "ทำความเข้าใจบทบาท เมนูหลัก ข้อมูลที่ต้องบันทึก และแนวทางทำงานประจำวัน",
      en: "Understand your role, the main navigation, required records, and the daily operating rhythm.",
    },
    outcome: {
      th: "คุณจะรู้ว่าต้องเริ่มจากหน้าไหน ทำรายการอะไรได้บ้าง และข้อมูลใดต้องตรวจสอบก่อนบันทึก",
      en: "You will know where to start, which actions are available to you, and what to verify before saving.",
    },
    steps: [
      {
        title: {
          th: "เข้าสู่ระบบและตรวจบทบาท",
          en: "Sign in and confirm your role",
        },
        detail: {
          th: "ใช้บัญชีของตนเองเท่านั้น หลังเข้าสู่ระบบให้ตรวจชื่อและบทบาทที่แสดงบนแถบด้านบน บทบาทเป็นตัวกำหนดเมนูและขอบเขตข้อมูลที่เห็น",
          en: "Use your own account only. After sign-in, confirm the name and role shown in the top bar. Your role determines the menus and data scope you can access.",
        },
        href: "/profile",
      },
      {
        title: { th: "ทำความรู้จักเมนูหลัก", en: "Learn the main navigation" },
        detail: {
          th: "เมนูแบ่งเป็นพื้นที่ทำงาน งานปฏิบัติการ และระบบ ให้ใช้ Dashboard ดูภาพรวม แล้วเลือกเมนูตามประเภทงาน ไม่ควรสร้างรายการซ้ำเพื่อแก้ไขข้อมูลเดิม",
          en: "Menus are grouped into Workspace, Operations, and System. Use Dashboard for the overview, then select the module that owns the work. Do not create a duplicate record to correct an existing one.",
        },
        href: "/dashboard",
      },
      {
        title: {
          th: "ตั้งค่าโปรไฟล์ ภาษา และธีม",
          en: "Set up profile, language, and theme",
        },
        detail: {
          th: "ตรวจข้อมูลติดต่อใน Profile เลือกภาษาไทยหรือ English จากปุ่มภาษา และเลือกธีมที่อ่านง่ายสำหรับพื้นที่ทำงานของคุณ",
          en: "Review your contact details in Profile, choose Thai or English from the language switcher, and select the theme that remains readable in your workspace.",
        },
        href: "/profile",
      },
      {
        title: {
          th: "ติดตั้งเป็นแอปสำหรับใช้งานประจำ",
          en: "Install the app for daily work",
        },
        detail: {
          th: "บนอุปกรณ์ที่รองรับ ให้กด Install app จากแถบด้านบน เพื่อเปิดระบบได้เร็วและเข้าถึงงานช่างหรือคลังจากหน้าจอหลัก",
          en: "On a supported device, select Install app from the top bar for faster access to technician and warehouse work from the home screen.",
        },
      },
      {
        title: {
          th: "ตรวจข้อมูลก่อนกดบันทึก",
          en: "Verify data before saving",
        },
        detail: {
          th: "ตรวจรหัสเครื่อง ลูกค้า คลัง ผู้รับผิดชอบ วันที่ และสถานะทุกครั้ง รายการที่บันทึกแล้วอาจถูกใช้เป็นหลักฐานการปฏิบัติงานและประวัติการตรวจสอบ",
          en: "Always verify asset code, customer, warehouse, assignee, date, and status. Saved records may become operational evidence and part of the audit history.",
        },
      },
    ],
    checklist: [
      {
        th: "ใช้บัญชีของตนเองและไม่แชร์รหัสผ่าน",
        en: "Use your own account and never share the password.",
      },
      {
        th: "เลือกโมดูลให้ตรงกับงานก่อนสร้างรายการ",
        en: "Choose the correct module before creating a record.",
      },
      {
        th: "ตรวจข้อมูลสำคัญก่อนบันทึกทุกครั้ง",
        en: "Verify key fields before every save.",
      },
    ],
    cautions: [
      {
        th: "หากไม่เห็นเมนูที่ต้องใช้ ให้ติดต่อผู้ดูแลระบบ อย่าพยายามใช้บัญชีผู้อื่น",
        en: "If a required menu is missing, contact an administrator instead of using another person's account.",
      },
    ],
  },
  {
    id: "machines-and-identity",
    category: "asset-operations",
    icon: "machine",
    roles: ["all"],
    title: {
      th: "จัดการเครื่องและตัวตนของเครื่อง",
      en: "Manage machines and machine identity",
    },
    summary: {
      th: "ตั้งแต่เพิ่มเครื่อง แก้ไขข้อมูล ติด QR/NFC ไปจนถึงตรวจประวัติเครื่องและลิงก์สาธารณะ",
      en: "From creating a machine and attaching QR/NFC to reviewing its history and public verification link.",
    },
    outcome: {
      th: "เครื่องแต่ละเครื่องมีข้อมูลหลัก ตัวตนที่ตรวจสอบได้ และประวัติการเปลี่ยนแปลงครบถ้วน",
      en: "Each machine has a reliable master record, verifiable identity, and complete change history.",
    },
    steps: [
      {
        title: {
          th: "ค้นหาเครื่องก่อนสร้างใหม่",
          en: "Search before creating a new machine",
        },
        detail: {
          th: "ไปที่ Machines ใช้รหัสเครื่อง Serial หรือข้อมูลลูกค้าค้นหาก่อนเสมอ หากพบรายการเดิมให้เปิดแก้ไขแทนการสร้างซ้ำ",
          en: "Open Machines and search by machine code, serial number, or customer before creating anything. If the record exists, edit it instead of creating a duplicate.",
        },
        href: "/assets",
      },
      {
        title: {
          th: "เพิ่มเครื่องด้วยข้อมูลหลักให้ครบ",
          en: "Create the machine with complete master data",
        },
        detail: {
          th: "กรอกรหัสเครื่อง รุ่น Serial ลูกค้า คลัง สถานะ วันที่ติดตั้ง และข้อมูลรับประกันตามเอกสารอ้างอิง ตรวจการสะกดและหน่วยให้ตรงกันทั้งระบบ",
          en: "Enter the machine code, model, serial number, customer, warehouse, status, installation date, and warranty details from the source document. Keep spelling and units consistent.",
        },
        href: "/assets/new",
      },
      {
        title: {
          th: "แก้ไขสถานะตามเหตุการณ์จริง",
          en: "Update status only when the event occurs",
        },
        detail: {
          th: "เปลี่ยนสถานะเมื่อมีเหตุการณ์จริง เช่น รับเข้า ติดตั้ง ใช้งาน ซ่อม ย้าย หรือเลิกใช้งาน ใส่เหตุผลและข้อมูลประกอบในช่องที่ระบบเตรียมไว้",
          en: "Change status only when the real event occurs, such as receipt, installation, operation, repair, transfer, or retirement. Add the reason and supporting information where provided.",
        },
        href: "/assets",
      },
      {
        title: {
          th: "ลงทะเบียน QR หรือ NFC",
          en: "Register QR or NFC identity",
        },
        detail: {
          th: "เปิดรายละเอียดเครื่อง ไปที่ Identity แล้วลงทะเบียนป้ายประจำเครื่องตามขั้นตอน หลังลงทะเบียนให้ทดสอบสแกนและตรวจว่ารหัสที่อ่านได้ตรงกับเครื่องจริง",
          en: "Open the machine detail, go to Identity, and register the assigned tag. Test the scan immediately and confirm that the returned identity matches the physical machine.",
        },
        href: "/assets",
      },
      {
        title: {
          th: "ตรวจประวัติและลิงก์ยืนยัน",
          en: "Review history and the verification link",
        },
        detail: {
          th: "เปิด Event history เพื่อตรวจการเปลี่ยนสถานะและงานที่เกี่ยวข้อง หากต้องส่งให้ลูกค้าตรวจเครื่อง ให้ใช้ public verification link ที่ระบบสร้างให้แทนการส่งข้อมูลภายใน",
          en: "Review Event history for status changes and related work. When a customer needs to verify a machine, share the generated public verification link instead of internal data.",
        },
      },
    ],
    checklist: [
      {
        th: "รหัสเครื่องและ Serial ต้องไม่ซ้ำ",
        en: "Machine code and serial number must be unique.",
      },
      {
        th: "ตรวจลูกค้า คลัง และสถานะให้ตรงกับเอกสาร",
        en: "Match customer, warehouse, and status to the source document.",
      },
      {
        th: "ทดสอบ QR/NFC หลังลงทะเบียนทันที",
        en: "Test QR/NFC immediately after registration.",
      },
    ],
    cautions: [
      {
        th: "ห้ามลบหรือสร้างเครื่องซ้ำเพื่อแก้ข้อมูล หากไม่แน่ใจให้เปิดรายการเดิมและติดต่อผู้ดูแล",
        en: "Do not delete or duplicate a machine to correct data. Edit the original record or contact an administrator.",
      },
    ],
  },
  {
    id: "service-lifecycle",
    category: "service-operations",
    icon: "service",
    roles: ["all"],
    title: {
      th: "วงจรงานบริการตั้งแต่รับเรื่องถึงปิดงาน",
      en: "Service lifecycle: intake to closeout",
    },
    summary: {
      th: "ใช้ Service operations เป็นแหล่งข้อมูลหลักของงานบริการ การมอบหมาย การประเมิน การทำงาน เอกสาร และการรับรองผล",
      en: "Use Service operations as the system of record for intake, assignment, assessment, execution, documents, and acceptance.",
    },
    outcome: {
      th: "ทุกงานบริการมีเจ้าของงาน สถานะ หลักฐาน และขั้นตอนอนุมัติที่ตรวจสอบย้อนหลังได้",
      en: "Every service job has an owner, status, evidence, and approval trail that can be audited.",
    },
    steps: [
      {
        title: {
          th: "สร้างใบงานจากคำขอจริง",
          en: "Create a job from the real request",
        },
        detail: {
          th: "สร้างรายการใหม่โดยระบุประเภทงาน เครื่อง ลูกค้า สถานที่ อาการหรือวัตถุประสงค์ วันที่นัดหมาย และผู้ติดต่อให้ครบ ใช้หมายเหตุอธิบายสิ่งที่ไม่อยู่ในช่องมาตรฐาน",
          en: "Create a new job with type, machine, customer, location, issue or objective, appointment date, and contact. Use notes for context that does not fit standard fields.",
        },
        href: "/service-jobs/new",
      },
      {
        title: {
          th: "มอบหมายผู้รับผิดชอบและผู้ช่วย",
          en: "Assign the lead and assistants",
        },
        detail: {
          th: "เลือกช่างหลักและผู้ช่วยตามทักษะ พื้นที่ และกำลังคน ตรวจวันเวลาให้ไม่ชนกับงานเดิม แล้วส่งการมอบหมายให้ผู้ปฏิบัติงานตอบรับ",
          en: "Assign the lead and assistants based on skill, location, and capacity. Check for schedule conflicts, then send the assignment for acceptance.",
        },
        href: "/service-jobs",
      },
      {
        title: { th: "ประเมินและขออนุมัติ", en: "Assess and request approval" },
        detail: {
          th: "บันทึกการตรวจ อาการ สาเหตุ งานที่ต้องทำ อะไหล่ ค่าแรง และค่าใช้จ่ายที่เกี่ยวข้อง หากต้องรออนุมัติให้ส่ง assessment ให้ผู้มีอำนาจตอบรับก่อนเริ่มงานที่มีค่าใช้จ่าย",
          en: "Record inspection, symptoms, cause, work required, parts, labor, and related costs. If approval is required, send the assessment to the authorized approver before chargeable work begins.",
        },
        href: "/service-jobs",
      },
      {
        title: {
          th: "เช็กอินและทำงานตามรายการ",
          en: "Check in and execute the work",
        },
        detail: {
          th: "เมื่อถึงสถานที่ให้เช็กอิน บันทึกเวลาและพิกัดตามนโยบาย จากนั้นอัปเดต execution เป็นช่วง ๆ ใส่ผลตรวจ รูปถ่าย อะไหล่ที่ใช้ และปัญหาที่พบจริง",
          en: "Check in on arrival and capture time and location according to policy. Update execution as work progresses with findings, photos, parts used, and actual exceptions.",
        },
      },
      {
        title: {
          th: "ส่งมอบ จัดทำเอกสาร และปิดงาน",
          en: "Handoff, document, and close",
        },
        detail: {
          th: "ตรวจผลลัพธ์กับลูกค้าหรือผู้รับมอบ บันทึก handoff และเช็กเอาต์ จากนั้นจัดทำใบประเมิน ใบรับงาน ใบแจ้งหนี้หรือเอกสารที่เกี่ยวข้อง และส่ง feedback ตามขั้นตอน",
          en: "Review the result with the customer or recipient, record the handoff, and check out. Then create the assessment, work receipt, invoice, or required documents and send feedback through the workflow.",
        },
        href: "/service-jobs",
      },
    ],
    checklist: [
      {
        th: "งานมีเครื่อง ลูกค้า สถานที่ และผู้ติดต่อครบ",
        en: "The job has machine, customer, location, and contact details.",
      },
      {
        th: "มีการตอบรับงานและอนุมัติก่อนทำงานที่ต้องอนุมัติ",
        en: "Assignment is accepted and required approval is completed before work.",
      },
      {
        th: "มีหลักฐานก่อน-หลังทำงานและการส่งมอบ",
        en: "Before/after evidence and handoff are recorded.",
      },
      {
        th: "ยอดค่าใช้จ่ายและเอกสารตรงกับงานจริง",
        en: "Charges and documents match the actual work.",
      },
    ],
    cautions: [
      {
        th: "อย่าข้ามสถานะเพื่อให้จบเร็ว เพราะแต่ละสถานะเป็นหลักฐานของการควบคุมงาน",
        en: "Do not skip statuses to close faster; each status is part of the operational control trail.",
      },
      {
        th: "หากข้อมูลไม่ครบ ให้หยุดส่งต่อและแก้ที่ขั้นตอนต้นทาง",
        en: "If information is incomplete, stop the handoff and correct the source step.",
      },
    ],
  },
  {
    id: "technician-daily-work",
    category: "service-operations",
    icon: "wrench",
    roles: ["technician", "admin", "executive"],
    title: {
      th: "คู่มือการทำงานประจำวันของช่าง",
      en: "Technician daily work guide",
    },
    summary: {
      th: "แนวทางตั้งแต่เปิดงาน รับมอบหมาย เดินทาง เช็กอิน ทำงาน ใช้อะไหล่ ส่งมอบ และปิดงาน",
      en: "A field-ready sequence from accepting assignments through travel, check-in, execution, parts, handoff, and closeout.",
    },
    outcome: {
      th: "สถานะงานสะท้อนหน้างานจริง และผู้ประสานงานติดตามความคืบหน้าได้โดยไม่ต้องถามซ้ำ",
      en: "Job status reflects field reality and coordinators can follow progress without repeated calls.",
    },
    steps: [
      {
        title: {
          th: "เปิด Technician workspace และเรียงลำดับงาน",
          en: "Open Technician workspace and prioritize",
        },
        detail: {
          th: "ตรวจงานที่ได้รับมอบหมายตามวันนัด ความเร่งด่วน SLA และพื้นที่ ตรวจรายละเอียดเครื่องกับเอกสารก่อนออกเดินทาง หากข้อมูลขัดแย้งให้แจ้งผู้ประสานงาน",
          en: "Review assignments by appointment, urgency, SLA, and location. Confirm machine details and documents before leaving. Report conflicting information to the coordinator.",
        },
        href: "/technician",
      },
      {
        title: {
          th: "ตอบรับงานและเตรียมอุปกรณ์",
          en: "Accept the job and prepare",
        },
        detail: {
          th: "ตอบรับหรือปฏิเสธพร้อมเหตุผลตามจริง เตรียมเครื่องมือ อะไหล่ PPE และเอกสารที่จำเป็น ตรวจว่างานที่ต้องมีอนุมัติได้รับอนุมัติแล้ว",
          en: "Accept or decline with a truthful reason. Prepare tools, parts, PPE, and documents. Confirm that required approvals are complete.",
        },
      },
      {
        title: { th: "เช็กอินเมื่อถึงหน้างาน", en: "Check in on arrival" },
        detail: {
          th: "เปิดงานที่ถูกต้อง ตรวจตัวตนเครื่องจาก QR/NFC หรือ Serial แล้วเช็กอินก่อนเริ่มปฏิบัติงาน หากเข้าพื้นที่ไม่ได้หรือเครื่องไม่ตรง ให้บันทึกเป็นปัญหาและติดต่อผู้ประสานงาน",
          en: "Open the correct job, verify the machine using QR/NFC or serial number, and check in before work begins. If access fails or the machine does not match, record the exception and contact the coordinator.",
        },
      },
      {
        title: {
          th: "บันทึกการทำงานและหลักฐานระหว่างงาน",
          en: "Record execution and evidence",
        },
        detail: {
          th: "อัปเดตขั้นตอนตามลำดับ บันทึกอาการ สาเหตุ การแก้ไข ค่าอ่าน ผลทดสอบ และรูปถ่ายที่จำเป็น ใช้ข้อความที่คนอื่นอ่านแล้วเข้าใจได้ ไม่ใช้คำย่อส่วนตัว",
          en: "Update steps in order with symptoms, cause, fix, readings, test results, and required photos. Use notes that another person can understand; avoid personal abbreviations.",
        },
      },
      {
        title: { th: "บันทึกอะไหล่และส่งมอบ", en: "Record parts and hand off" },
        detail: {
          th: "เลือกอะไหล่จากรายการจริง ระบุจำนวนและสาเหตุการใช้ ตรวจเครื่องหลังซ่อม ให้ลูกค้าหรือผู้รับมอบตรวจรับ บันทึกลายละเอียด handoff และเช็กเอาต์ก่อนออกจากพื้นที่",
          en: "Select the actual parts used, quantity, and reason. Test the machine after service, let the customer or recipient verify the result, record the handoff, and check out before leaving.",
        },
      },
    ],
    checklist: [
      {
        th: "เช็กเครื่องและงานให้ตรงก่อนเริ่ม",
        en: "Verify the machine and job before starting.",
      },
      {
        th: "บันทึกหลักฐานระหว่างทำ ไม่รอเขียนย้อนหลังทั้งหมด",
        en: "Capture evidence during work, not only after the fact.",
      },
      {
        th: "อะไหล่ที่ใช้ต้องตรงกับของจริง",
        en: "Parts recorded must match what was actually used.",
      },
      {
        th: "ห้ามเช็กเอาต์ก่อนตรวจรับหรือ handoff",
        en: "Do not check out before acceptance or handoff.",
      },
    ],
    cautions: [
      {
        th: "หากงานทำต่อไม่ได้ ให้ส่งต่อพร้อมเหตุผลและสถานะ ไม่ปิดงานแทนการรายงานปัญหา",
        en: "If work cannot continue, hand it off with the reason and status; do not close the job to hide an exception.",
      },
    ],
  },
  {
    id: "repairs",
    category: "service-operations",
    icon: "wrench",
    roles: ["all"],
    title: {
      th: "งานซ่อมและการติดตามปัญหา",
      en: "Repairs and issue tracking",
    },
    summary: {
      th: "สร้างใบงานซ่อม จัดลำดับ มอบหมาย วินิจฉัย ใช้อะไหล่ และยืนยันการซ่อมเสร็จ",
      en: "Create, prioritize, assign, diagnose, consume parts, and confirm repair completion.",
    },
    outcome: {
      th: "อาการเสีย สาเหตุ วิธีแก้ และต้นทุนเชื่อมโยงกับเครื่องและผู้ปฏิบัติงานอย่างครบถ้วน",
      en: "Symptoms, cause, resolution, and cost are connected to the machine and the person who performed the work.",
    },
    steps: [
      {
        title: { th: "สร้างใบงานซ่อม", en: "Create a repair ticket" },
        detail: {
          th: "ระบุเครื่อง อาการเสีย ระดับความเร่งด่วน ผู้แจ้ง สถานที่ และเวลาที่ต้องการให้ช่างเข้าดำเนินการ แนบหลักฐานที่ช่วยวิเคราะห์ได้",
          en: "Enter machine, symptom, urgency, requester, location, and requested service time. Attach evidence that helps diagnosis.",
        },
        href: "/service-jobs/new?workType=repair",
      },
      {
        title: { th: "คัดกรองและมอบหมาย", en: "Triage and assign" },
        detail: {
          th: "ตรวจว่าปัญหาเป็นงานซ่อมจริงหรือควรไปกระบวนการติดตั้ง/PM เลือกช่างตามความชำนาญและพื้นที่ แล้วส่งงานให้ตอบรับ",
          en: "Confirm that the issue belongs to Repairs rather than Installation or PM. Assign by skill and location, then send the job for acceptance.",
        },
        href: "/service-jobs?workType=repair",
      },
      {
        title: {
          th: "บันทึกวินิจฉัยและแผนแก้ไข",
          en: "Record diagnosis and repair plan",
        },
        detail: {
          th: "บันทึกอาการที่ตรวจพบ สาเหตุราก วิธีแก้ เครื่องมือ และอะไหล่ที่ต้องใช้ หากต้องรอราคา/อนุมัติ ให้ค้างสถานะไว้จนกว่าจะได้รับคำตอบ",
          en: "Record observed symptoms, root cause, resolution, tools, and parts. If pricing or approval is required, keep the job pending until a decision is received.",
        },
      },
      {
        title: {
          th: "ทดสอบหลังซ่อมและสรุปผล",
          en: "Test after repair and summarize",
        },
        detail: {
          th: "ทดสอบตามอาการเดิมและรายการความปลอดภัย บันทึกผลก่อน-หลัง ค่าอ่าน และข้อแนะนำให้ลูกค้า จากนั้นส่งมอบและปิดงานเมื่อข้อมูลครบ",
          en: "Test against the original symptom and safety checks. Record before/after readings and customer recommendations, then hand off and close when complete.",
        },
      },
    ],
    checklist: [
      {
        th: "อาการเสียต้องอ้างอิงเครื่องที่ถูกต้อง",
        en: "The symptom must reference the correct machine.",
      },
      {
        th: "มีสาเหตุและวิธีแก้ ไม่บันทึกเพียงว่าแก้แล้ว",
        en: "Record cause and resolution, not only 'fixed'.",
      },
      {
        th: "ต้นทุนและอะไหล่ต้องตรวจสอบได้",
        en: "Costs and parts must be traceable.",
      },
    ],
    cautions: [
      {
        th: "อย่าเปลี่ยนสถานะเป็นเสร็จหากยังรอการทดสอบหรือการรับรองจากลูกค้า",
        en: "Do not mark complete while testing or customer acceptance is still pending.",
      },
    ],
  },
  {
    id: "installation-and-pm",
    category: "service-operations",
    icon: "calendar",
    roles: ["all"],
    title: {
      th: "งานติดตั้งและบำรุงรักษาเชิงป้องกัน",
      en: "Installations and preventive maintenance",
    },
    summary: {
      th: "วางแผนวันนัด เตรียมเครื่อง ตรวจติดตั้ง และสร้างรอบ PM จากผลการปฏิบัติงานจริง",
      en: "Schedule work, prepare the machine, verify installation, and maintain PM cycles from actual execution results.",
    },
    outcome: {
      th: "งานติดตั้งเริ่มจากเครื่องและสถานที่ที่ถูกต้อง ส่วน PM มีรอบถัดไปและประวัติการตรวจครบ",
      en: "Installation starts with the correct machine and location, while PM produces the next due date and a complete service history.",
    },
    steps: [
      {
        title: {
          th: "สร้างคิวติดตั้งและกำหนดนัดหมาย",
          en: "Create the installation queue and schedule",
        },
        detail: {
          th: "ระบุเครื่อง ลูกค้า สถานที่ ผู้ติดต่อ ความพร้อมของพื้นที่ และวันที่ต้องการ หากเป็นเครื่องใหม่ให้ตรวจข้อมูลรับประกันและเอกสารส่งมอบให้ครบ",
          en: "Enter machine, customer, location, contact, site readiness, and desired date. For a new machine, confirm warranty and delivery documents.",
        },
        href: "/service-jobs/new?workType=installation",
      },
      {
        title: {
          th: "มอบหมายและเตรียมหน้างาน",
          en: "Assign and prepare the site",
        },
        detail: {
          th: "เลือกช่างและอุปกรณ์ที่เหมาะสม ตรวจเส้นทาง ข้อจำกัดหน้างาน ไฟฟ้า น้ำ และพื้นที่วางเครื่อง เปลี่ยนนัดหมายในระบบทันทีหากมีการเลื่อน",
          en: "Assign the right technician and equipment. Confirm access, route, power, water, and placement constraints. Update the system immediately if the appointment changes.",
        },
      },
      {
        title: {
          th: "เริ่มงานและตรวจติดตั้งตาม checklist",
          en: "Start and verify against the checklist",
        },
        detail: {
          th: "เช็กอิน ตรวจ serial/QR ติดตั้งตามขั้นตอน บันทึกรูปถ่ายจุดต่อและสภาพแวดล้อม ทดลองใช้งาน และบันทึกข้อผิดปกติแทนการข้ามรายการ",
          en: "Check in, verify serial/QR, install step by step, photograph connections and site condition, run a test, and record exceptions instead of skipping checklist items.",
        },
        href: "/service-jobs?workType=installation",
      },
      {
        title: {
          th: "กำหนดรอบ PM และติดตามประวัติ",
          en: "Set PM cadence and track history",
        },
        detail: {
          th: "หลังติดตั้งหรือปิดงาน ให้กำหนดรอบ PM ตามคู่มือและเงื่อนไขจริง ตรวจงานใน calendar/schedule และใช้ history ดูงานที่เสร็จแล้วก่อนวางแผนรอบถัดไป",
          en: "After installation or closeout, set the PM cadence from the manual and actual conditions. Use calendar/schedule for due work and history before planning the next cycle.",
        },
        href: "/pm",
      },
    ],
    checklist: [
      {
        th: "นัดหมายและสถานที่ตรงกับลูกค้า",
        en: "Appointment and location match the customer confirmation.",
      },
      {
        th: "ตรวจ serial/QR ก่อนเริ่มติดตั้ง",
        en: "Verify serial/QR before installation.",
      },
      {
        th: "มีผลทดสอบและรูปส่งมอบ",
        en: "Test result and handoff evidence are recorded.",
      },
      {
        th: "มีรอบ PM ถัดไปหลังปิดงาน",
        en: "The next PM due cycle exists after closeout.",
      },
    ],
    cautions: [
      {
        th: "หากหน้างานไม่พร้อม ให้บันทึกเหตุผลและเลื่อนนัดอย่างเป็นทางการ ไม่ปิดงานว่าเสร็จ",
        en: "If the site is not ready, record the reason and reschedule formally; do not close the job as complete.",
      },
    ],
  },
  {
    id: "warehouse-and-inventory",
    category: "warehouse",
    icon: "warehouse",
    roles: ["admin", "warehouse", "technician", "sales", "branch", "executive"],
    title: {
      th: "คลังสินค้า การโอนย้าย และอะไหล่",
      en: "Warehouse, transfers, and inventory",
    },
    summary: {
      th: "รับเข้า โอนคลัง ขาย ตัดอะไหล่ และตรวจ movement log ให้ยอดคงเหลือสะท้อนของจริง",
      en: "Receive, transfer, sell, consume parts, and use movement logs to keep stock aligned with reality.",
    },
    outcome: {
      th: "ทุกการเคลื่อนไหวมีต้นทาง ปลายทาง เหตุผล ผู้ทำรายการ และยอดหลังรายการตรวจสอบได้",
      en: "Every movement has traceable source, destination, reason, actor, and resulting balance.",
    },
    steps: [
      {
        title: {
          th: "ตรวจคลังและยอดก่อนทำรายการ",
          en: "Check the warehouse and balance first",
        },
        detail: {
          th: "เปิด Warehouse หรือ Inventory ค้นหาด้วยรหัสเครื่อง/อะไหล่ ตรวจคลังต้นทาง ยอดคงเหลือ และรายการค้างก่อนสร้างการเคลื่อนไหว",
          en: "Open Warehouse or Inventory, search by machine or part code, and verify source warehouse, balance, and pending movements before creating a transaction.",
        },
        href: "/warehouse",
      },
      {
        title: {
          th: "รับเข้าและบันทึกของจริง",
          en: "Receive and record the physical stock",
        },
        detail: {
          th: "ตรวจจำนวน รุ่น Serial สภาพ และเอกสารรับเข้า บันทึกเข้าคลังที่ถูกต้อง หากจำนวนไม่ตรงให้แยกเป็นข้อยกเว้นและใส่หมายเหตุ",
          en: "Verify quantity, model, serial, condition, and receipt documents. Post to the correct warehouse. If quantities differ, record an exception with notes.",
        },
      },
      {
        title: {
          th: "โอนคลังอย่างมีผู้รับผิดชอบ",
          en: "Transfer with clear ownership",
        },
        detail: {
          th: "เลือกต้นทาง ปลายทาง รายการ จำนวน วันที่ และเหตุผล ตรวจว่าไม่มีการโอนเกินยอด แล้วให้ผู้รับปลายทางยืนยันตามกระบวนการ",
          en: "Select source, destination, item, quantity, date, and reason. Confirm the transfer does not exceed available stock, then obtain destination confirmation.",
        },
        href: "/warehouse/transfer",
      },
      {
        title: {
          th: "ขายเครื่องและตัดอะไหล่จากงาน",
          en: "Sell machines and consume parts from work",
        },
        detail: {
          th: "การขายต้องอ้างอิงลูกค้าและรายการจริง ส่วนอะไหล่ให้บันทึกผ่านงานซ่อมหรืองานบริการที่ใช้ เพื่อให้ต้นทุนย้อนกลับไปยังงานได้",
          en: "Sales must reference the actual customer and item. Parts should be consumed from the repair or service job that used them so cost can be traced back to the work.",
        },
        href: "/warehouse/sale",
      },
      {
        title: {
          th: "ตรวจ movement log และ low stock",
          en: "Review movement logs and low stock",
        },
        detail: {
          th: "ตรวจประวัติการเคลื่อนไหวหลังรายการสำคัญ เปรียบเทียบยอดกับหน้างาน และติดตามอะไหล่ใกล้จุดสั่งซื้อเพื่อวางแผนเติมสต็อก",
          en: "Review movement history after important transactions, reconcile the balance with the physical stock, and monitor parts near reorder point.",
        },
        href: "/warehouse/movements",
      },
    ],
    checklist: [
      {
        th: "ต้นทางและปลายทางถูกต้อง",
        en: "Source and destination are correct.",
      },
      {
        th: "ยอดหลังรายการตรงกับของจริง",
        en: "Post-transaction balance matches physical stock.",
      },
      {
        th: "เหตุผลและเอกสารอ้างอิงครบ",
        en: "Reason and reference documents are present.",
      },
      {
        th: "ตรวจ log หลังรายการผิดปกติ",
        en: "Review the log after an exception or correction.",
      },
    ],
    cautions: [
      {
        th: "ห้ามปรับยอดด้วยการสร้างรายการหลอก หากยอดไม่ตรงให้หยุดและแจ้งผู้ดูแลคลัง",
        en: "Never create a false movement to force a balance. Stop and report stock variance to the warehouse owner.",
      },
    ],
  },
  {
    id: "users-and-access",
    category: "administration",
    icon: "users",
    roles: ["admin"],
    title: {
      th: "ผู้ใช้งาน บทบาท และสิทธิ์การเข้าถึง",
      en: "Users, roles, and access control",
    },
    summary: {
      th: "เชิญผู้ใช้ กำหนดบทบาท จำกัดขอบเขต ปิดบัญชี และส่งคำเชิญตั้งรหัสผ่านอย่างปลอดภัย",
      en: "Invite users, assign roles and scope, disable accounts, and send secure password invitations.",
    },
    outcome: {
      th: "ผู้ใช้แต่ละคนเข้าถึงเฉพาะข้อมูลและการกระทำที่จำเป็นต่อหน้าที่ พร้อมตรวจสอบย้อนหลังได้",
      en: "Each user has only the access and actions required for their job, with an audit trail.",
    },
    steps: [
      {
        title: {
          th: "สร้างผู้ใช้จากคำขอที่ได้รับอนุมัติ",
          en: "Create users from an approved request",
        },
        detail: {
          th: "ไปที่ Users เพิ่มชื่อ อีเมล เบอร์โทร บทบาท และขอบเขต เช่น คลังหรือกลุ่มลูกค้า ตรวจอีเมลให้ถูกต้องก่อนส่งคำเชิญ",
          en: "In Users, enter name, email, phone, role, and scope such as warehouse or customer group. Verify the email before sending the invitation.",
        },
        href: "/users/new",
      },
      {
        title: {
          th: "เลือกบทบาทตามหน้าที่จริง",
          en: "Choose the role that matches the job",
        },
        detail: {
          th: "ให้สิทธิ์เท่าที่จำเป็น: admin ดูแลระบบ, warehouse ดูแลคลัง, technician ปฏิบัติงานช่าง, sales ประสานงาน, branch/customer เห็นข้อมูลตามขอบเขต, executive ดูภาพรวม",
          en: "Grant least privilege: admin manages the system, warehouse manages stock, technician performs field work, sales coordinates customers, branch/customer access is scoped, and executive reviews oversight data.",
        },
      },
      {
        title: {
          th: "ส่งคำเชิญหรือรีเซ็ตรหัสผ่าน",
          en: "Send an invitation or password reset",
        },
        detail: {
          th: "ใช้เมนู reset password ของผู้ใช้ ระบบจะออกคำเชิญตามอายุที่กำหนด ผู้ใช้ต้องตั้งรหัสผ่านของตนเอง ไม่ส่งหรือรับรหัสผ่านแทน",
          en: "Use the user's reset password action. The system sends a time-limited invitation. The user must set their own password; never send or receive a password on their behalf.",
        },
      },
      {
        title: {
          th: "ปิดสิทธิ์ทันทีเมื่อพ้นหน้าที่",
          en: "Disable access when duties end",
        },
        detail: {
          th: "เมื่อพนักงานย้ายงาน ลาออก หรือไม่ต้องใช้ระบบ ให้เปลี่ยนสถานะบัญชีตามนโยบาย ตรวจงานค้างและมอบหมายเจ้าของงานใหม่ก่อนปิด",
          en: "When someone changes duties, leaves, or no longer needs access, update the account status according to policy. Review open work and reassign ownership before disabling.",
        },
        href: "/users",
      },
    ],
    checklist: [
      {
        th: "มีคำขอและผู้อนุมัติอ้างอิง",
        en: "An approved request and approver are recorded.",
      },
      {
        th: "บทบาทและขอบเขตไม่กว้างเกินหน้าที่",
        en: "Role and scope are no broader than the duty requires.",
      },
      {
        th: "ไม่แชร์รหัสผ่านหรือใช้บัญชีแทนกัน",
        en: "Passwords are not shared and accounts are not substituted.",
      },
    ],
    cautions: [
      {
        th: "ห้ามแก้บทบาทของตนเองเพื่อเพิ่มสิทธิ์ หากต้องการสิทธิ์เพิ่มให้ใช้กระบวนการอนุมัติ",
        en: "Do not change your own role to gain access. Use the approved access request process.",
      },
    ],
  },
  {
    id: "notifications-and-dashboard",
    category: "administration",
    icon: "shield",
    roles: ["all"],
    title: {
      th: "ติดตาม Dashboard การแจ้งเตือน และงานค้าง",
      en: "Monitor dashboards, notifications, and queues",
    },
    summary: {
      th: "อ่านตัวชี้วัดอย่างถูกต้อง แยกงานเร่งด่วน และตอบสนอง notification โดยไม่ปล่อยงานค้างเงียบ ๆ",
      en: "Read operational metrics correctly, identify urgent work, and act on notifications without leaving silent queues.",
    },
    outcome: {
      th: "ผู้รับผิดชอบเห็นงานค้างและข้อยกเว้นเร็วขึ้น พร้อมส่งต่อให้เจ้าของงานได้ตรงจุด",
      en: "Owners see backlog and exceptions early and can route them to the right person.",
    },
    steps: [
      {
        title: {
          th: "เริ่มจาก Dashboard ตามสิทธิ์",
          en: "Start with the dashboard for your role",
        },
        detail: {
          th: "ผู้บริหารดูภาพรวมเครื่อง ต้นทุน PM และสต็อก ส่วนผู้ปฏิบัติงานใช้เมนูงานของตนเป็นหลัก อย่าตีความตัวเลขโดยไม่ดูช่วงเวลาและแหล่งข้อมูล",
          en: "Executives review machine, cost, PM, and stock indicators; operators use their work queues first. Do not interpret a number without checking its time range and source.",
        },
        href: "/dashboard",
      },
      {
        title: {
          th: "เปิด Notifications และจัดลำดับ",
          en: "Open Notifications and prioritize",
        },
        detail: {
          th: "ตรวจการแจ้งเตือนใหม่ งานซ่อม/PM/ติดตั้งที่ต้องตอบรับ และ stock ต่ำ แยกสิ่งที่ต้องทำทันทีออกจากข้อมูลเพื่อทราบ แล้วส่งต่อเจ้าของงานเมื่อไม่ใช่หน้าที่ของคุณ",
          en: "Review new alerts, repair/PM/installation responses, and low stock. Separate action-required items from informational messages and route work you do not own.",
        },
        href: "/notifications",
      },
      {
        title: {
          th: "ปิด loop ของการแจ้งเตือน",
          en: "Close the notification loop",
        },
        detail: {
          th: "หลังดำเนินการให้เปลี่ยนสถานะในโมดูลต้นทาง ไม่ใช่เพียงอ่าน notification เพราะการปิด loop ต้องเกิดจากงานจริงที่อัปเดตแล้ว",
          en: "After acting, update the source module rather than only reading the notification. Closing the loop requires the underlying work to be updated.",
        },
      },
    ],
    checklist: [
      {
        th: "ตรวจช่วงเวลาและขอบเขตข้อมูลก่อนสรุป",
        en: "Check time range and data scope before concluding.",
      },
      {
        th: "งานที่ต้องทำมีเจ้าของและกำหนดเวลา",
        en: "Action items have an owner and due time.",
      },
      {
        th: "แก้ที่โมดูลต้นทาง ไม่ปิดเพียง notification",
        en: "Update the source module, not only the notification.",
      },
    ],
    cautions: [
      {
        th: "ตัวเลข Dashboard เป็นสัญญาณสำหรับตัดสินใจ ต้องเปิดรายการจริงเมื่อจะอนุมัติหรือแก้ไข",
        en: "Dashboard numbers are decision signals; open the source record before approving or correcting work.",
      },
    ],
  },
  {
    id: "customer-and-feedback",
    category: "service-operations",
    icon: "life-buoy",
    roles: ["customer", "branch", "sales", "technician", "admin", "executive"],
    title: {
      th: "การส่งมอบ ลูกค้า และ Feedback",
      en: "Customer handoff and feedback",
    },
    summary: {
      th: "ตรวจเครื่องผ่านลิงก์สาธารณะ ยืนยันผลการทำงาน และส่งข้อเสนอแนะกลับเข้าประวัติงาน",
      en: "Verify a machine through the public link, accept delivered work, and return feedback to the job history.",
    },
    outcome: {
      th: "ลูกค้าเห็นข้อมูลที่อนุญาตเท่านั้น และทีมงานมีหลักฐานการรับมอบหรือข้อร้องเรียนที่ตามต่อได้",
      en: "Customers see only permitted information, while the team has traceable acceptance or follow-up feedback.",
    },
    steps: [
      {
        title: {
          th: "เปิดลิงก์ตรวจเครื่องหรือ QR",
          en: "Open the machine verification link or QR",
        },
        detail: {
          th: "สแกน QR หรือเปิด public link ตรวจรุ่น สถานะ และข้อมูลที่ระบบเปิดเผย หากพบว่าเครื่องไม่ตรง ให้หยุดการรับรองและแจ้งทีมงานทันที",
          en: "Scan the QR or open the public link to verify model, status, and permitted details. If the machine does not match, stop acceptance and report it immediately.",
        },
        href: "/assets",
      },
      {
        title: { th: "ตรวจผลก่อนรับมอบ", en: "Review before acceptance" },
        detail: {
          th: "ตรวจผลทดสอบ รูปถ่าย อะไหล่ที่เปลี่ยน และคำแนะนำการใช้งาน ถ้ายังมีข้อสงสัยให้ระบุเป็น feedback หรือขอแก้ไขก่อนปิดงาน",
          en: "Review test results, photos, replaced parts, and operating recommendations. If anything is unclear, record feedback or request correction before closeout.",
        },
      },
      {
        title: {
          th: "ส่ง Feedback ให้มีรายละเอียด",
          en: "Submit actionable feedback",
        },
        detail: {
          th: "ระบุว่างานเกี่ยวข้องกับเครื่องใด เกิดเมื่อใด อาการเป็นอย่างไร และคาดหวังให้แก้แบบไหน หลีกเลี่ยงข้อความสั้นที่ไม่มีบริบท",
          en: "State which machine is affected, when it occurred, what happened, and what resolution is expected. Avoid short messages without context.",
        },
        href: "/service-jobs",
      },
    ],
    checklist: [
      {
        th: "ตรวจเครื่องจริงก่อนยืนยัน",
        en: "Verify the physical machine before acceptance.",
      },
      {
        th: "อ่านผลทดสอบและเอกสารส่งมอบ",
        en: "Review test results and handoff documents.",
      },
      {
        th: "Feedback ระบุเครื่อง เวลา และอาการ",
        en: "Feedback includes machine, time, and symptom.",
      },
    ],
    cautions: [
      {
        th: "ลิงก์สาธารณะมีไว้ตรวจสอบ ไม่ใช่ช่องทางส่งข้อมูลภายในหรือข้อมูลลูกค้ารายอื่น",
        en: "Public links are for verification, not for sharing internal or unrelated customer data.",
      },
    ],
  },
  {
    id: "exceptions-and-security",
    category: "administration",
    icon: "shield",
    roles: ["all"],
    title: {
      th: "ข้อยกเว้น ความปลอดภัย และการใช้งานออฟไลน์",
      en: "Exceptions, security, and offline use",
    },
    summary: {
      th: "แนวทางเมื่อข้อมูลไม่ตรง ระบบขัดข้อง อินเทอร์เน็ตหลุด หรือพบเหตุการณ์ที่ต้องรายงาน",
      en: "What to do when data is wrong, the system fails, connectivity drops, or a security event is suspected.",
    },
    outcome: {
      th: "ปัญหาถูกบันทึกและส่งต่ออย่างปลอดภัย โดยไม่สร้างข้อมูลซ้ำหรือทำให้ประวัติงานเสียหาย",
      en: "Problems are recorded and escalated safely without duplicate records or corrupted history.",
    },
    steps: [
      {
        title: {
          th: "ข้อมูลไม่ตรงกับหน้างาน",
          en: "When field data does not match",
        },
        detail: {
          th: "หยุดรายการที่กำลังทำ ตรวจรหัสเครื่อง/งานและเอกสารต้นทาง บันทึกข้อยกเว้นในงานเดิม และติดต่อผู้ประสานงาน อย่าสร้างเครื่องหรืองานใหม่เพื่อหลบปัญหา",
          en: "Pause the transaction, verify machine/job identity and source documents, record the exception on the original job, and contact the coordinator. Do not create a new machine or job to bypass the issue.",
        },
      },
      {
        title: {
          th: "อินเทอร์เน็ตหลุดระหว่างทำงาน",
          en: "When connectivity drops",
        },
        detail: {
          th: "อย่ากดบันทึกซ้ำหลายครั้ง รอการเชื่อมต่อหรือเก็บหลักฐานตามนโยบายหน่วยงาน แล้วกลับมาอัปเดตรายการเดิมเมื่อออนไลน์ ตรวจว่ารายการถูกบันทึกแล้วก่อนทำต่อ",
          en: "Do not submit repeatedly. Wait for connectivity or capture evidence according to company policy, then update the original record when online. Confirm the save before continuing.",
        },
        href: "/offline",
      },
      {
        title: {
          th: "พบความผิดปกติด้านบัญชีหรือข้อมูล",
          en: "When an account or data issue is suspected",
        },
        detail: {
          th: "ออกจากระบบบนอุปกรณ์ที่ไม่ใช่ของตน เปลี่ยนรหัสผ่านผ่านช่องทางที่กำหนด และแจ้งผู้ดูแลพร้อมเวลา/หน้าที่พบเหตุการณ์โดยไม่ส่งรหัสผ่านหรือ token",
          en: "Sign out from an untrusted device, change the password through the approved path, and report the time and action where the issue occurred. Never send a password or token.",
        },
      },
      {
        title: {
          th: "ระบบตอบข้อผิดพลาด",
          en: "When the system returns an error",
        },
        detail: {
          th: "จด URL งาน รหัสรายการ เวลา และข้อความแจ้งเตือน จากนั้นลองใหม่ครั้งเดียว หากยังไม่สำเร็จส่งข้อมูลให้ผู้ดูแลเพื่อวิเคราะห์จาก log และ correlation id",
          en: "Record the URL, record ID, time, and error message. Retry once; if it still fails, send those details to the administrator so logs and the correlation ID can be investigated.",
        },
      },
    ],
    checklist: [
      {
        th: "ไม่กดซ้ำเมื่อไม่แน่ใจว่าบันทึกสำเร็จหรือไม่",
        en: "Do not repeat-submit when save status is unclear.",
      },
      {
        th: "เก็บรหัสรายการ เวลา และข้อความผิดพลาด",
        en: "Capture record ID, time, and error text.",
      },
      {
        th: "ไม่ส่งรหัสผ่าน token หรือข้อมูลเกินจำเป็น",
        en: "Never send passwords, tokens, or unnecessary data.",
      },
    ],
    cautions: [
      {
        th: "การแก้ปัญหาด้วยการสร้างรายการซ้ำทำให้ประวัติและยอดคงเหลือคลาดเคลื่อน",
        en: "Creating duplicate records as a workaround corrupts history and balances.",
      },
    ],
  },
  {
    id: "dashboard-overview",
    category: "administration",
    icon: "book",
    roles: ["all"],
    title: {
      th: "คู่มือการทำงานหน้า Dashboard",
      en: "Dashboard operating guide",
    },
    summary: {
      th: "วิธีอ่านภาพรวม ตรวจงานค้าง และเปลี่ยนตัวเลขให้เป็นรายการที่ต้องดำเนินการ",
      en: "How to read the overview, identify backlog, and turn indicators into actions.",
    },
    outcome: {
      th: "เริ่มต้นวันทำงานด้วยภาพรวมที่ถูกต้อง รู้ว่างานใดเร่งด่วนและต้องส่งต่อให้ใคร",
      en: "Start the day with a reliable overview, clear priorities, and named owners for follow-up.",
    },
    steps: [
      {
        title: {
          th: "เปิด Dashboard และตรวจบทบาท",
          en: "Open Dashboard and confirm scope",
        },
        detail: {
          th: "ตรวจว่าชื่อผู้ใช้และบทบาทถูกต้อง เพราะตัวเลขและเมนูจะแสดงตามสิทธิ์ของคุณ อ่านช่วงเวลาและแหล่งข้อมูลก่อนนำตัวเลขไปสรุป",
          en: "Confirm the signed-in user and role because metrics and menus are permission-scoped. Check the time range and data source before drawing conclusions.",
        },
        href: "/dashboard",
      },
      {
        title: {
          th: "ตรวจเครื่องและงานที่ผิดปกติ",
          en: "Review machine and job exceptions",
        },
        detail: {
          th: "ดูเครื่องตามสถานะ งานซ่อมที่ค้าง เครื่องเสียบ่อย และรายการที่ใกล้หมดประกัน แล้วเปิดรายการต้นทางเพื่อดูรายละเอียดก่อนมอบหมายงาน",
          en: "Review asset status, open repairs, repeat failures, and expiring warranties. Open the source records before assigning follow-up work.",
        },
        href: "/assets",
      },
      {
        title: {
          th: "ตรวจ PM และสต็อกที่มีผลต่อการบริการ",
          en: "Review PM and stock constraints",
        },
        detail: {
          th: "ตรวจอัตรา PM ที่เสร็จ งานที่ใกล้ครบกำหนด และอะไหล่ต่ำกว่าจุดสั่งซื้อ เชื่อมโยงรายการกับทีมช่างหรือคลังเพื่อกำหนดเจ้าของและกำหนดเวลา",
          en: "Review PM completion, due work, and parts below reorder point. Route each issue to the technician or warehouse owner with a due time.",
        },
        href: "/pm",
      },
      {
        title: {
          th: "บันทึกผลการติดตามที่ต้นทาง",
          en: "Close the loop at the source",
        },
        detail: {
          th: "Dashboard ใช้สำหรับชี้เป้า ไม่ใช่ที่ปิดงาน หลังติดตามแล้วให้อัปเดตสถานะในโมดูลต้นทางและตรวจว่าตัวเลขสะท้อนการเปลี่ยนแปลงในรอบถัดไป",
          en: "Dashboard is a signal, not the place to close work. Update the source module and confirm the next refresh reflects the change.",
        },
      },
    ],
    checklist: [
      {
        th: "ตรวจช่วงเวลาและขอบเขตข้อมูล",
        en: "Confirm time range and data scope.",
      },
      {
        th: "เปิดรายการต้นทางก่อนตัดสินใจ",
        en: "Open source records before deciding.",
      },
      {
        th: "ทุกประเด็นมีเจ้าของและกำหนดเวลา",
        en: "Every issue has an owner and due time.",
      },
      { th: "ปิดงานในโมดูลต้นทาง", en: "Close work in the source module." },
    ],
    cautions: [
      {
        th: "อย่าสรุปจากตัวเลขอย่างเดียว หากจะอนุมัติหรือแก้ไขต้องตรวจรายละเอียดรายการจริง",
        en: "Do not act on a number alone; inspect the source record before approving or correcting work.",
      },
    ],
  },
  {
    id: "preventive-maintenance",
    category: "service-operations",
    icon: "calendar",
    roles: [
      "admin",
      "warehouse",
      "technician",
      "branch",
      "customer",
      "executive",
    ],
    title: {
      th: "คู่มือการทำงาน PM โดยเฉพาะ",
      en: "Preventive maintenance operating guide",
    },
    summary: {
      th: "วางรอบ PM ตรวจงานที่ถึงกำหนด บันทึกผลตาม checklist และสร้างรอบถัดไปให้ต่อเนื่อง",
      en: "Plan PM cycles, execute due work, record checklist results, and create the next cycle without gaps.",
    },
    outcome: {
      th: "เครื่องมีแผน PM ที่ชัดเจน งานที่ทำจริงมีผลตรวจและหลักฐานครบ และรอบถัดไปไม่หลุดจากระบบ",
      en: "Each machine has a clear PM plan, completed work has evidence, and the next due cycle is preserved.",
    },
    steps: [
      {
        title: { th: "ตรวจรายการ PM ที่ถึงกำหนด", en: "Review due PM work" },
        detail: {
          th: "เปิด PM ตรวจเครื่อง วันที่ครบกำหนด รอบความถี่ และประวัติครั้งล่าสุด จัดลำดับงานที่เลยกำหนดหรือมีความเสี่ยงสูงก่อน",
          en: "Open PM and review machine, due date, cadence, and last completion. Prioritize overdue or high-risk work first.",
        },
        href: "/pm",
      },
      {
        title: {
          th: "จัดตารางและเตรียมช่าง",
          en: "Schedule and prepare the technician",
        },
        detail: {
          th: "กำหนดวันเวลา สถานที่ ผู้รับผิดชอบ เครื่องมือ และอะไหล่ที่จำเป็น ตรวจไม่ให้ชนกับงานบริการอื่น และยืนยันความพร้อมกับลูกค้าหรือสาขา",
          en: "Set date, time, location, owner, tools, and required parts. Check conflicts with other service work and confirm readiness with the customer or branch.",
        },
        href: "/pm/schedule",
      },
      {
        title: {
          th: "ตรวจตาม checklist และบันทึกค่าจริง",
          en: "Execute the checklist and record actual readings",
        },
        detail: {
          th: "เช็กอินที่เครื่อง ตรวจสภาพตามรายการ บันทึกค่าอ่าน อาการผิดปกติ รูปถ่าย และอะไหล่ที่ใช้ หากพบงานซ่อมเพิ่มเติมให้เปิดหรือเชื่อมโยงงานซ่อมแทนการใส่รวมแบบไม่มีขอบเขต",
          en: "Check in at the machine, complete each item, and record readings, exceptions, photos, and parts. Create or link a repair for additional work instead of hiding it in an unscoped note.",
        },
      },
      {
        title: {
          th: "ตรวจผลและรับรองการปิดงาน",
          en: "Verify results and close the work",
        },
        detail: {
          th: "ทดสอบการทำงาน สรุปสิ่งที่ทำและคำแนะนำ ส่งมอบให้ผู้รับผิดชอบตรวจรับ แล้วปิดงานด้วยสถานะที่ตรงกับผลจริง",
          en: "Test operation, summarize work and recommendations, obtain acceptance from the responsible person, and close with the status that matches reality.",
        },
      },
      {
        title: {
          th: "กำหนดรอบถัดไปและตรวจประวัติ",
          en: "Set the next cycle and verify history",
        },
        detail: {
          th: "หลังปิดงานให้ตรวจวันครบกำหนดครั้งถัดไปและเปิด history ยืนยันว่าผล PM ถูกบันทึกกับเครื่องที่ถูกต้อง หากรอบเปลี่ยนให้บันทึกเหตุผลไว้",
          en: "After closeout, verify the next due date and review history against the correct machine. Record a reason whenever the cadence changes.",
        },
        href: "/pm/history",
      },
    ],
    checklist: [
      {
        th: "เครื่องและรอบ PM ถูกต้อง",
        en: "Machine and PM cycle are correct.",
      },
      {
        th: "ครบทุก checklist item และค่าที่วัดได้",
        en: "Every checklist item and reading is recorded.",
      },
      {
        th: "แยกงานซ่อมเพิ่มเติมออกจาก PM",
        en: "Additional repair work is separated from PM.",
      },
      {
        th: "มีการรับรองผลและวันครบกำหนดครั้งถัดไป",
        en: "Acceptance and the next due date are present.",
      },
    ],
    cautions: [
      {
        th: "ห้ามปิด PM โดยไม่ตรวจวันรอบถัดไป เพราะจะทำให้เครื่องหลุดจากแผนบำรุงรักษา",
        en: "Never close PM without checking the next due date; otherwise the machine can fall out of the maintenance plan.",
      },
    ],
  },
  {
    id: "inventory-control",
    category: "warehouse",
    icon: "warehouse",
    roles: ["admin", "warehouse", "technician", "executive"],
    title: {
      th: "คู่มือควบคุมสต็อกอะไหล่โดยเฉพาะ",
      en: "Inventory control operating guide",
    },
    summary: {
      th: "ตรวจยอดอะไหล่ รับเข้า ตัดใช้ ตรวจจุดสั่งซื้อ และแก้ความคลาดเคลื่อนอย่างมีหลักฐาน",
      en: "Check part balances, receive stock, consume parts, monitor reorder points, and correct variances with evidence.",
    },
    outcome: {
      th: "ยอดอะไหล่ในระบบตรงกับของจริง ต้นทุนเชื่อมโยงกับงาน และการเติมสต็อกเกิดก่อนของขาด",
      en: "System balances match physical stock, costs trace to work, and replenishment happens before stockout.",
    },
    steps: [
      {
        title: {
          th: "ตรวจยอดก่อนหยิบหรือรับของ",
          en: "Check balance before picking or receiving",
        },
        detail: {
          th: "ค้นหาด้วยรหัสอะไหล่ ตรวจคลัง จำนวนคงเหลือ จุดสั่งซื้อ และรายการค้าง หากยอดในระบบกับของจริงไม่ตรงให้หยุดและรายงานก่อนทำรายการใหม่",
          en: "Search by part number and verify warehouse, on-hand quantity, reorder point, and pending movements. If system and physical stock differ, stop and report before creating another transaction.",
        },
        href: "/inventory",
      },
      {
        title: {
          th: "รับเข้าและจัดเก็บตามคลัง",
          en: "Receive and put away by warehouse",
        },
        detail: {
          th: "ตรวจจำนวน รุ่น lot/serial สภาพ และเอกสารรับเข้า จากนั้นบันทึกเข้าคลังที่ถูกต้อง พร้อมระบุข้อยกเว้นเมื่อของชำรุดหรือจำนวนไม่ครบ",
          en: "Verify quantity, model, lot/serial, condition, and receipt documents. Post to the correct warehouse and record exceptions for damage or shortage.",
        },
      },
      {
        title: {
          th: "ตัดอะไหล่จากงานที่ใช้จริง",
          en: "Consume parts from the actual job",
        },
        detail: {
          th: "เลือกงานซ่อมหรืองานบริการที่ใช้อะไหล่ ระบุรายการและจำนวนตามจริง ตรวจผู้รับผิดชอบและเหตุผล เพื่อให้ต้นทุนและประวัติเครื่องย้อนกลับได้",
          en: "Select the repair or service job that used the part, record the actual item and quantity, and include owner and reason so cost and machine history remain traceable.",
        },
        href: "/warehouse/movements",
      },
      {
        title: {
          th: "ติดตามจุดสั่งซื้อและรายการผิดปกติ",
          en: "Monitor reorder points and exceptions",
        },
        detail: {
          th: "ตรวจรายการใกล้หมดหรือหมดแล้ว จัดลำดับตามงานที่กำลังจะเกิดขึ้น และตรวจ movement log เมื่อพบยอดติดลบ รายการซ้ำ หรือการแก้ไขที่ไม่คุ้นเคย",
          en: "Review low or out-of-stock parts, prioritize by upcoming work, and inspect movement logs for negative balances, duplicates, or unfamiliar corrections.",
        },
      },
      {
        title: { th: "กระทบยอดและส่งต่อผู้ดูแล", en: "Reconcile and hand off" },
        detail: {
          th: "เปรียบเทียบยอดระบบกับการนับจริง บันทึกผลต่างและเอกสารอ้างอิง แล้วส่งให้ผู้ดูแลคลังอนุมัติการแก้ไขตามขั้นตอน ห้ามปรับยอดด้วยรายการหลอก",
          en: "Reconcile system balance with the physical count, record variance and references, and route corrections for warehouse approval. Never force a balance with a false movement.",
        },
      },
    ],
    checklist: [
      {
        th: "รหัสอะไหล่และคลังถูกต้อง",
        en: "Part number and warehouse are correct.",
      },
      {
        th: "จำนวนตรงกับของจริงและเอกสาร",
        en: "Quantity matches physical stock and documents.",
      },
      {
        th: "การตัดใช้ผูกกับงานจริง",
        en: "Consumption is linked to the actual job.",
      },
      {
        th: "ผลต่างมีหลักฐานและผู้อนุมัติ",
        en: "Variance has evidence and an approver.",
      },
    ],
    cautions: [
      {
        th: "อย่าปรับยอดเพื่อให้ตัวเลขสวย ต้องแก้ด้วยกระบวนการกระทบยอดที่ตรวจสอบได้",
        en: "Do not adjust balances just to make numbers look right; use an auditable reconciliation process.",
      },
    ],
  },
];

export type HelpGuideId = (typeof helpGuides)[number]["id"];

export const helpCategoryLabels: Readonly<Record<HelpCategory, LocalizedText>> =
  {
    "getting-started": { th: "เริ่มต้นใช้งาน", en: "Getting started" },
    "asset-operations": { th: "เครื่องและตัวตน", en: "Machines & identity" },
    "service-operations": { th: "งานบริการ", en: "Service operations" },
    warehouse: { th: "คลังและอะไหล่", en: "Warehouse & inventory" },
    administration: { th: "ระบบและการควบคุม", en: "Administration & control" },
  };

export const helpCategoryOrder: readonly HelpCategory[] = [
  "getting-started",
  "asset-operations",
  "service-operations",
  "warehouse",
  "administration",
];

export const helpRoleLabels: Readonly<Record<UserRole, LocalizedText>> = {
  admin: { th: "ผู้ดูแลระบบ", en: "Administrator" },
  warehouse: { th: "คลังสินค้า", en: "Warehouse" },
  technician: { th: "ช่างเทคนิค", en: "Technician" },
  sales: { th: "ฝ่ายขาย", en: "Sales" },
  branch: { th: "สาขา", en: "Branch" },
  customer: { th: "ลูกค้า", en: "Customer" },
  executive: { th: "ผู้บริหาร", en: "Executive" },
};
