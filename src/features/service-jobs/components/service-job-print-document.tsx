import type {
  BillingDocument,
  ServiceJob,
  ServiceJobAssessment,
  ServiceJobAssessmentLine,
} from "@/domain/entities/service-job";
import type {
  BillingDocumentRecord,
  ServiceJobAssessmentRecord,
} from "@/domain/repositories/service-job.repository";
import { PrintDocumentShell } from "@/components/shared/print-document-shell";
import type { ReactNode } from "react";

const dateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

const shortDateFormatter = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  dateStyle: "medium",
  timeZone: "Asia/Bangkok",
});

const moneyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
});

const workTypeLabels: Record<ServiceJob["workType"], string> = {
  repair: "งานซ่อม",
  installation: "งานติดตั้ง",
  new_machine_test: "เทสเครื่องใหม่",
};

const fulfillmentLabels: Record<ServiceJob["fulfillmentMode"], string> = {
  onsite: "งานนอกสถานที่",
  carry_in: "รับเครื่องที่ศูนย์",
  carrier: "จัดส่งโดยขนส่ง",
};

const warrantyLabels: Record<ServiceJob["asset"]["warrantyStatus"], string> = {
  active: "ในประกัน",
  expired: "นอกประกัน",
  unknown: "ไม่ระบุ",
};

const billingKindLabels: Record<BillingDocument["kind"], string> = {
  delivery_note: "ใบส่งสินค้า / ใบแจ้งหนี้",
  invoice: "ใบส่งสินค้า / ใบแจ้งหนี้ / ใบกำกับภาษี",
  tax_invoice: "ใบส่งสินค้า / ใบแจ้งหนี้ / ใบกำกับภาษี",
  service_invoice: "ใบส่งสินค้า / ใบแจ้งหนี้ / ใบกำกับภาษี",
  parts_invoice: "ใบส่งสินค้า / ใบแจ้งหนี้ / ใบกำกับภาษี",
};

function formatDate(value: Date | null, withTime = false): string {
  if (!value) return "-";
  return (withTime ? dateFormatter : shortDateFormatter).format(value);
}

function formatMoney(satang: number | bigint): string {
  return moneyFormatter.format(
    typeof satang === "bigint" ? Number(satang) / 100 : satang / 100,
  );
}

function lineTotalSatang(line: ServiceJobAssessmentLine): bigint {
  const gross = BigInt(line.quantity) * BigInt(line.unitPriceSatang);
  const discount =
    (gross * BigInt(line.discountBasisPoints) + 5_000n) / 10_000n;
  return gross - discount;
}

function joinValues(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "-";
}

function PrintField({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "print-field print-field-wide" : "print-field"}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function PrintSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="print-section print-avoid-break">
      <h2 className="print-section-title">{title}</h2>
      {children}
    </section>
  );
}

function SignatureRow({ labels }: { labels: readonly string[] }) {
  return (
    <div className="print-signature-grid print-avoid-break">
      {labels.map((label) => (
        <div className="print-signature" key={label}>
          <p>{label}</p>
          <div className="print-signature-line" />
          <p className="print-signature-date">
            วันที่ ........./........./.........
          </p>
        </div>
      ))}
    </div>
  );
}

function MachineSnapshot({ job }: { job: ServiceJob }) {
  const { asset } = job;
  return (
    <dl className="print-fields print-fields-4">
      <PrintField label="รหัสทรัพย์สิน">{asset.assetCode ?? "-"}</PrintField>
      <PrintField label="Serial">{asset.serialNumber ?? "-"}</PrintField>
      <PrintField label="ประเภทเครื่อง">{asset.equipmentType}</PrintField>
      <PrintField label="ยี่ห้อ / รุ่น">
        {asset.brand} / {asset.model}
      </PrintField>
      <PrintField label="การรับประกัน">
        {warrantyLabels[asset.warrantyStatus]}
      </PrintField>
      <PrintField label="วันหมดประกัน">
        {formatDate(asset.warrantyExpiresAt)}
      </PrintField>
      <PrintField label="ซ่อมซ้ำ">
        {asset.repeatRepair
          ? `ใช่${asset.previousRepairNumber ? ` (${asset.previousRepairNumber})` : ""}`
          : "ไม่ใช่"}
      </PrintField>
      <PrintField label="ช่องทางงาน">
        {fulfillmentLabels[job.fulfillmentMode]}
      </PrintField>
    </dl>
  );
}

function CustomerSnapshot({ job }: { job: ServiceJob }) {
  return (
    <dl className="print-fields print-fields-2">
      <PrintField label="รหัสลูกค้า">
        {job.customer.customerId ?? "-"}
      </PrintField>
      <PrintField label="ชื่อลูกค้า">{job.customer.name}</PrintField>
      <PrintField label="ผู้ติดต่อ">{job.contact.name}</PrintField>
      <PrintField label="เบอร์โทร">
        {job.contact.phone || job.customer.primaryPhone}
      </PrintField>
      <PrintField label="เบอร์โทร 2">
        {job.customer.secondaryPhone ?? "-"}
      </PrintField>
      <PrintField label="อีเมล">{job.contact.email ?? "-"}</PrintField>
      <PrintField label="ที่อยู่บริการ" wide>
        {job.customer.serviceAddress}
      </PrintField>
      <PrintField label="ที่อยู่ออกเอกสาร" wide>
        {job.customer.billingAddress}
      </PrintField>
    </dl>
  );
}

function LineTable({
  lines,
  showWarranty = false,
}: {
  lines: readonly ServiceJobAssessmentLine[];
  showWarranty?: boolean;
}) {
  return (
    <div className="print-table-wrap">
      <table className="print-table">
        <thead>
          <tr>
            <th className="print-col-index">
              ลำดับ
              <br />
              NO.
            </th>
            <th>
              รหัสสินค้า
              <br />
              ITEM
            </th>
            <th>
              รายการอะไหล่ / ซ่อม
              <br />
              DESCRIPTION
            </th>
            {showWarranty ? (
              <th>
                ระยะประกัน
                <br />
                WARRANTY
              </th>
            ) : null}
            <th className="print-col-number">
              จำนวน
              <br />
              QTY
            </th>
            <th className="print-col-number">
              ราคา / หน่วย
              <br />
              UNIT PRICE
            </th>
            <th className="print-col-number">
              ส่วนลด %<br />
              DISCOUNT
            </th>
            <th className="print-col-number">
              จำนวนเงิน
              <br />
              AMOUNT
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.length > 0 ? (
            lines.map((line, index) => (
              <tr key={line.id}>
                <td className="text-center">{index + 1}</td>
                <td>{line.code || "-"}</td>
                <td>
                  <strong>{line.type === "part" ? "อะไหล่" : "บริการ"}</strong>
                  <br />
                  {line.description}
                </td>
                {showWarranty ? (
                  <td className="text-center">{line.warrantyMonths} เดือน</td>
                ) : null}
                <td className="text-right">{line.quantity}</td>
                <td className="text-right">
                  {formatMoney(line.unitPriceSatang)}
                </td>
                <td className="text-right">
                  {(line.discountBasisPoints / 100).toFixed(2)}
                </td>
                <td className="text-right">
                  {formatMoney(lineTotalSatang(line))}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="text-center" colSpan={showWarranty ? 8 : 7}>
                ไม่มีรายการ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TotalsBox({
  totals,
  policy,
}: {
  totals: ServiceJobAssessment["totals"];
  policy: ServiceJobAssessment["policy"];
}) {
  return (
    <div className="print-totals-layout print-avoid-break">
      <div className="print-note-box">
        <p className="print-note-title">หมายเหตุ</p>
        <p>รายการเงินคำนวณจาก snapshot ที่บันทึกในใบงาน</p>
        <p>
          VAT {policy.vatBasisPoints / 100}% | หัก ณ ที่จ่าย{" "}
          {policy.withholdingBasisPoints / 100}% | มัดจำ{" "}
          {policy.depositBasisPoints / 100}%
        </p>
      </div>
      <dl className="print-total-box">
        <div>
          <dt>ค่าบริการ</dt>
          <dd>{formatMoney(totals.serviceSubtotalSatang)}</dd>
        </div>
        <div>
          <dt>ค่าอะไหล่</dt>
          <dd>{formatMoney(totals.partsSubtotalSatang)}</dd>
        </div>
        <div>
          <dt>รวมก่อนส่วนลด</dt>
          <dd>{formatMoney(totals.subtotalSatang)}</dd>
        </div>
        <div>
          <dt>หักส่วนลด</dt>
          <dd>- {formatMoney(totals.discountSatang)}</dd>
        </div>
        <div>
          <dt>มูลค่าหลังหักส่วนลด</dt>
          <dd>{formatMoney(totals.taxableAmountSatang)}</dd>
        </div>
        <div>
          <dt>ภาษีมูลค่าเพิ่ม</dt>
          <dd>{formatMoney(totals.vatSatang)}</dd>
        </div>
        <div>
          <dt>หัก ณ ที่จ่าย</dt>
          <dd>- {formatMoney(totals.withholdingSatang)}</dd>
        </div>
        <div>
          <dt>หักเงินมัดจำ</dt>
          <dd>- {formatMoney(totals.depositSatang)}</dd>
        </div>
        <div className="print-total-grand">
          <dt>จำนวนเงินรวมทั้งสิ้น</dt>
          <dd>{formatMoney(totals.totalDueSatang)}</dd>
        </div>
      </dl>
    </div>
  );
}

function IntakeTerms() {
  return (
    <div className="print-terms print-avoid-break">
      <strong>ข้อตกลง</strong>
      <ul>
        <li>
          ท่านต้องนำใบรับงานมาติดต่อเพื่อรับเครื่อง ถ้าไม่มารับภายใน 10
          วันนับจากวันที่นัดรับคืน ทางบริษัทจะไม่รับผิดชอบความเสียหายใดๆ
          ทั้งสิ้น
        </li>
        <li>
          ถ้าลูกค้าไม่ติดต่อเข้ามารับสินค้า หรือติดต่อไม่ได้
          หลังจากวันนัดรับเกิน 30 วัน
          ทางบริษัทมีค่าใช้จ่ายในการดูแลรักษาสินค้าเริ่มต้นวันละ 30 บาท
        </li>
      </ul>
    </div>
  );
}

export function ServiceJobIntakePrintDocument({ job }: { job: ServiceJob }) {
  return (
    <PrintDocumentShell
      date={job.createdAt}
      documentNumber={job.jobNumber}
      subtitle="ใบรับงานบริการเครื่องชงกาแฟและอุปกรณ์"
      title="ใบรับงาน"
    >
      <PrintSection title="ข้อมูลลูกค้าและผู้ติดต่อ">
        <CustomerSnapshot job={job} />
      </PrintSection>
      <PrintSection title="ข้อมูลเครื่องและการรับงาน">
        <MachineSnapshot job={job} />
        <dl className="print-fields print-fields-2 print-mt-3">
          <PrintField label="ประเภทงาน">
            {workTypeLabels[job.workType]}
          </PrintField>
          <PrintField label="วันเวลารับงาน">
            {formatDate(job.createdAt, true)}
          </PrintField>
          <PrintField label="อาการ / รายละเอียด" wide>
            {job.description || job.title}
          </PrintField>
          <PrintField label="อุปกรณ์ที่มากับเครื่อง" wide>
            {joinValues(job.asset.includedAccessories)}
          </PrintField>
          <PrintField label="ความต้องการเพิ่มเติม" wide>
            {job.asset.additionalRequirements || "-"}
          </PrintField>
          <PrintField label="ตำหนิรูปพรรณ / ข้อสังเกต" wide>
            {joinValues(job.asset.observedDefects)}
          </PrintField>
        </dl>
      </PrintSection>
      <div className="print-check-row print-avoid-break">
        <span className="print-check-label">รูปแบบการให้บริการ</span>
        <span className="print-check-item">
          {job.fulfillmentMode === "onsite" ? "☑" : "☐"} On Site
        </span>
        <span className="print-check-item">
          {job.fulfillmentMode === "carrier" ? "☑" : "☐"} จัดส่งโดยขนส่ง
        </span>
        <span className="print-check-item">
          {job.fulfillmentMode === "carry_in" ? "☑" : "☐"} รับที่ศูนย์
        </span>
      </div>
      <IntakeTerms />
      <div className="print-contact-note">
        ติดตามงานบริการ ติดต่อเบอร์โทร 086-4301581, 082-7629258
      </div>
      <SignatureRow labels={["พนักงานรับงาน", "ผู้ส่งซ่อม / ผู้ติดต่อ"]} />
    </PrintDocumentShell>
  );
}

function AssessmentHeader({ job }: { job: ServiceJob }) {
  return (
    <>
      <PrintSection title="ข้อมูลลูกค้าและเครื่อง">
        <CustomerSnapshot job={job} />
        <MachineSnapshot job={job} />
      </PrintSection>
    </>
  );
}

export function ServiceJobAssessmentPrintDocument({
  job,
  record,
}: {
  job: ServiceJob;
  record: ServiceJobAssessmentRecord;
}) {
  const { assessment } = record;
  return (
    <PrintDocumentShell
      date={assessment.createdAt}
      documentNumber={`${job.jobNumber} / Rev.${assessment.revision}`}
      subtitle="(ไม่ใช่ใบเสร็จรับเงิน)"
      title="ใบประเมินงาน"
    >
      <AssessmentHeader job={job} />
      <PrintSection title="รายการประเมินค่าใช้จ่าย">
        <LineTable lines={assessment.lines} showWarranty />
        <TotalsBox policy={assessment.policy} totals={assessment.totals} />
      </PrintSection>
      {record.customerResponse ? (
        <div className="print-response print-avoid-break">
          ผลการตอบรับจากลูกค้า:{" "}
          <strong>
            {record.customerResponse.response === "approved"
              ? "อนุมัติ"
              : "ไม่อนุมัติ"}
          </strong>
          {record.customerResponse.responseReason
            ? ` - ${record.customerResponse.responseReason}`
            : ""}
        </div>
      ) : null}
      <div className="print-contact-note">
        ติดตามงานบริการ ติดต่อเบอร์โทร 086-4301581, 082-7629258
      </div>
      <SignatureRow
        labels={["พนักงานประเมินงาน", "ธุรการช่าง", "ผู้อนุมัติ / ลูกค้า"]}
      />
    </PrintDocumentShell>
  );
}

export function ServiceJobBillingPrintDocument({
  job,
  document,
}: {
  job: ServiceJob;
  document: BillingDocumentRecord;
}) {
  const title = billingKindLabels[document.kind];
  return (
    <PrintDocumentShell
      copy="ต้นฉบับ"
      date={document.issueDate}
      documentNumber={document.documentNumber}
      subtitle={document.status === "void" ? "เอกสารยกเลิก" : undefined}
      title={title}
    >
      <div className="print-billing-meta print-avoid-break">
        <div>
          <p>
            <strong>ข้อมูลผู้รับสินค้า / บริการ (ลูกค้า)</strong>
          </p>
          <p>รหัสลูกค้า: {document.customer.customerId ?? "-"}</p>
          <p>ชื่อลูกค้า: {document.customer.name}</p>
          <p>เลขประจำตัวผู้เสียภาษี: {document.customer.taxId ?? "-"}</p>
          <p>ที่อยู่: {document.customer.billingAddress}</p>
          <p>โทรศัพท์: {document.customer.primaryPhone}</p>
        </div>
        <dl className="print-billing-side">
          <PrintField label="เลขที่เอกสาร">
            {document.documentNumber}
          </PrintField>
          <PrintField label="วันที่เอกสาร">
            {formatDate(document.issueDate)}
          </PrintField>
          <PrintField label="ครบกำหนด">
            {formatDate(document.dueDate)}
          </PrintField>
          <PrintField label="เงื่อนไขชำระ">{document.paymentTerms}</PrintField>
          <PrintField label="หมายเลขใบงาน">{job.jobNumber}</PrintField>
          <PrintField label="แผนก / ผู้ขาย">
            {document.department} / {document.salesperson}
          </PrintField>
        </dl>
      </div>
      <PrintSection
        title={`ประเภทงาน: ${workTypeLabels[job.workType]} - ${fulfillmentLabels[job.fulfillmentMode]}`}
      >
        <LineTable lines={document.lines} />
        <TotalsBox policy={document.policy} totals={document.totals} />
      </PrintSection>
      <div className="print-billing-note print-avoid-break">
        <p>รายละเอียดงาน: {job.title}</p>
        <p>หมายเหตุ: เอกสารนี้ออกจากข้อมูลใบงานและรายการประเมินที่ยืนยันแล้ว</p>
      </div>
      <SignatureRow
        labels={["ธุรการช่าง", "บัญชี", "ผู้รับสินค้า / บริการ (ลูกค้า)"]}
      />
      <p className="print-disclaimer">
        เอกสารนี้ไม่ใช่ใบกำกับภาษีและไม่สามารถใช้แทนใบกำกับภาษีได้
        หากเอกสารไม่ใช่ประเภทใบกำกับภาษี
      </p>
    </PrintDocumentShell>
  );
}
