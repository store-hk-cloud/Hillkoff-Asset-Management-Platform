import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type {
  BillingDocument,
  ServiceJob,
  ServiceJobAssessment,
} from "@/domain/entities/service-job";
import type {
  BillingDocumentRecord,
  ServiceJobAssessmentRecord,
} from "@/domain/repositories/service-job.repository";
import {
  ServiceJobAssessmentPrintDocument,
  ServiceJobBillingPrintDocument,
  ServiceJobIntakePrintDocument,
} from "@/features/service-jobs/components/service-job-print-document";

const now = new Date("2026-07-07T04:01:00.000Z");

const job = {
  id: "job-1",
  jobNumber: "CM6907-00070",
  schemaVersion: 1,
  workType: "installation",
  fulfillmentMode: "onsite",
  title: "ติดตั้งเครื่องใหม่",
  description: "ติดตั้งเครื่องทำน้ำแข็ง",
  customer: {
    customerId: "AR4-6708HK00011",
    name: "บริษัท บีนีท จำกัด",
    taxId: "0105555000000",
    group: null,
    billingAddress: "227/70 ม.7 ต.สันผีเสื้อ อ.เมือง จ.เชียงใหม่ 50300",
    serviceAddress: "227/70 ม.7 ต.สันผีเสื้อ อ.เมือง จ.เชียงใหม่ 50300",
    primaryPhone: "063-9205139",
    secondaryPhone: "062-3094040",
  },
  contact: {
    name: "ผู้ติดต่อบริษัท บีนีท",
    phone: "063-9205139",
    extension: null,
    email: "customer@example.com",
  },
  asset: {
    assetId: null,
    assetCode: "2601000020",
    serialNumber: "2601000020",
    equipmentType: "เครื่องทำน้ำแข็ง",
    brand: "ESUN",
    model: "EIM-120C",
    warrantyStatus: "active",
    warrantyExpiresAt: new Date("2027-07-06T00:00:00.000Z"),
    repeatRepair: false,
    previousRepairNumber: null,
    includedAccessories: ["สายไฟ", "คู่มือ"],
    observedDefects: [],
    additionalRequirements: "ขอทดสอบเครื่องก่อนส่งมอบ",
  },
  status: "completed",
  scheduledStartAt: null,
  assignments: [],
  assignedTechnicianIds: [],
  leadTechnicianId: null,
  evidence: [],
  rootCause: "",
  solution: "",
  completedAt: now,
  approvedAssessmentId: "assessment-1",
  handedOffAt: null,
  handoffSignature: null,
  handoffOverrideReason: null,
  termsAcceptedAt: now,
  termsAcceptedBy: "ผู้ติดต่อบริษัท บีนีท",
  createdAt: now,
  createdBy: "user-1",
  updatedAt: now,
  updatedBy: "user-1",
  version: 3,
} as unknown as ServiceJob;

const assessment = {
  id: "assessment-1",
  jobId: job.id,
  revision: 1,
  evaluatorId: "user-1",
  status: "approved",
  lines: [
    {
      id: "line-1",
      code: "ZY-SV-0126",
      type: "service",
      description: "ค่าบริการออกนอกสถานที่",
      unit: "ครั้ง",
      quantity: 1,
      unitPriceSatang: 20000,
      discountBasisPoints: 0,
      discountReason: null,
      warehouseId: null,
      warrantyMonths: 0,
    },
  ],
  policy: {
    kind: "charge_in_warranty",
    vatBasisPoints: 700,
    withholdingBasisPoints: 300,
    depositBasisPoints: 0,
  },
  totals: {
    serviceSubtotalSatang: 20000,
    partsSubtotalSatang: 0,
    subtotalSatang: 20000,
    discountSatang: 0,
    taxableAmountSatang: 20000,
    vatSatang: 1400,
    withholdingSatang: 600,
    depositSatang: 0,
    totalDueSatang: 20800,
  },
  approvedAt: now,
  approvedBy: "user-2",
  createdAt: now,
  createdBy: "user-1",
} as unknown as ServiceJobAssessment;

const assessmentRecord = {
  assessment,
  customerResponse: {
    response: "approved",
    responderName: "ผู้อนุมัติ",
    responseReason: null,
    respondedAt: now,
    responderId: "user-2",
  },
} as unknown as ServiceJobAssessmentRecord;

const billingDocument = {
  ...assessment,
  id: "billing-1",
  assessmentId: assessment.id,
  documentNumber: "SVC-2569-HQ-000001",
  kind: "service_invoice",
  status: "issued",
  customer: job.customer,
  contact: job.contact,
  asset: job.asset,
  issuedAt: now,
  issuedBy: "user-2",
  voidedAt: null,
  voidReason: null,
  issueDate: now,
  dueDate: now,
  paymentTerms: "30 วัน",
  department: "ศูนย์ซ่อม",
  salesperson: "พนักงานขาย",
  emergencyOverrideReason: null,
} as unknown as BillingDocumentRecord & BillingDocument;

describe("service-job print documents", () => {
  it("renders the intake document with the customer and machine snapshot", () => {
    const markup = renderToStaticMarkup(
      <ServiceJobIntakePrintDocument job={job} />,
    );

    expect(markup).toContain("ใบรับงาน");
    expect(markup).toContain(job.jobNumber);
    expect(markup).toContain(job.customer.name);
    expect(markup).toContain(job.asset.serialNumber);
  });

  it("renders assessment lines and calculated totals", () => {
    const markup = renderToStaticMarkup(
      <ServiceJobAssessmentPrintDocument job={job} record={assessmentRecord} />,
    );

    expect(markup).toContain("ใบประเมินงาน");
    expect(markup).toContain("ค่าบริการออกนอกสถานที่");
    expect(markup).toContain("฿208.00");
  });

  it("renders issued billing documents with document metadata", () => {
    const markup = renderToStaticMarkup(
      <ServiceJobBillingPrintDocument document={billingDocument} job={job} />,
    );

    expect(markup).toContain("ใบส่งสินค้า / ใบแจ้งหนี้ / ใบกำกับภาษี");
    expect(markup).toContain(billingDocument.documentNumber);
    expect(markup).toContain("30 วัน");
  });
});
