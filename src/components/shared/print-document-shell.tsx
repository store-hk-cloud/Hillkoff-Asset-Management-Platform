import Image from "next/image";
import type { ReactNode } from "react";

import { PrintButton } from "@/components/shared/print-button";

export function PrintDocumentShell({
  children,
  title,
  subtitle,
  documentNumber,
  date,
  copy,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string | undefined;
  documentNumber?: string | undefined;
  date?: Date | null | undefined;
  copy?: string | null | undefined;
}) {
  return (
    <main className="print-page">
      <div className="print-toolbar print:hidden">
        <PrintButton />
      </div>
      <article className="print-document">
        <header className="print-document-header">
          <div className="print-brand">
            <Image
              alt="Hillkoff"
              height={54}
              priority
              src="/icons/hillkoff-emblem.png"
              width={54}
            />
            <div>
              <p className="print-brand-name">บริษัท ฮิลล์คอฟฟ์ จำกัด</p>
              <p>ศูนย์ซ่อมเครื่องชงกาแฟและอะไหล่แท้</p>
              <p>66 ถ.ช้างเผือก ต.ศรีภูมิ อ.เมือง จ.เชียงใหม่ 50200</p>
              <p>โทร. (66) 0 5321 3078 | 086-4301581, 082-7629258</p>
              <p>www.hillkoff.com | info@hillkoff.com</p>
            </div>
          </div>
          <div className="print-document-title">
            {copy ? <span>{copy}</span> : null}
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
            <dl>
              <div>
                <dt>เลขที่</dt>
                <dd>{documentNumber ?? "-"}</dd>
              </div>
              <div>
                <dt>วันที่</dt>
                <dd>
                  {date
                    ? new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
                        dateStyle: "medium",
                        timeZone: "Asia/Bangkok",
                      }).format(date)
                    : "-"}
                </dd>
              </div>
            </dl>
          </div>
        </header>
        {children}
        <footer className="print-document-footer">
          เอกสารนี้สร้างจากข้อมูลใบงานที่บันทึกในระบบ Hillkoff Machine
          Management
        </footer>
      </article>
    </main>
  );
}
