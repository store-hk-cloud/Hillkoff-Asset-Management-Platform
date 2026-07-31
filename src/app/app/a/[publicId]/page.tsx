import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AssetIdentityError } from "@/domain/errors/asset-identity.error";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import { getServerTranslator } from "@/lib/i18n/server";
import { getCurrentSession } from "@/lib/auth/dal";
import { AssetIdentityManagementService } from "@/services/asset-identity-management.service";
import { TechnicianWorkspaceService } from "@/services/technician-workspace.service";

import "./public-asset.css";

const service = new AssetIdentityManagementService();
const technicianService = new TechnicianWorkspaceService();
type PublicAssetPageProps = { params: Promise<{ publicId: string }> };

export const metadata = {
  title: "ใบดูแลเครื่อง Hillkoff",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PublicAssetPage({
  params,
}: PublicAssetPageProps) {
  const { locale, t } = await getServerTranslator();
  const session = await getCurrentSession();
  const { publicId } = await params;
  const isStaff = Boolean(session) && session?.profile.role !== "customer";
  let asset;
  let assignedWork: readonly {
    id: string;
    href: string;
    number: string;
    title: string;
  }[] = [];

  try {
    asset = await service.lookupPublic(publicId, isStaff);
    if (session?.profile.role === "technician") {
      assignedWork = (await technicianService.lookup(publicId, session.profile))
        .work;
    }
  } catch (error) {
    if (
      error instanceof AssetIdentityError &&
      error.code === "PUBLIC_ID_NOT_FOUND"
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="hk-public-asset">
      <p className="sr-only">{t("public.verification")}</p>
      <div className="hk-page">
        <header className="hk-hero">
          <Image
            alt="Hillkoff"
            className="hk-hero-logo"
            height={34}
            priority
            src="/brand/hillkoff-logo.png"
            width={190}
          />
          <p className="hk-hero-eyebrow">
            {locale === "th" ? "ใบดูแลเครื่อง · Care Record" : "Care Record"}
          </p>
          <h1 className="hk-hero-title">
            {locale === "th" ? (
              <>
                ทุกเครื่องของ Hillkoff
                <br />
                อยู่ในสายตาของเรา
              </>
            ) : (
              <>
                Every Hillkoff machine,
                <br />
                cared for
              </>
            )}
          </h1>
        </header>

        <main className="hk-card">
          <div className="hk-status-row">
            <div>
              <h2 className="hk-asset-name">{asset.name}</h2>
              {asset.serialNumber ? (
                <p className="hk-asset-sub">Serial · {asset.serialNumber}</p>
              ) : null}
            </div>
            <span className="hk-pill">
              {operationalStatusLabel(asset.operationalStatus, locale)}
            </span>
          </div>

          <hr className="hk-divider" />

          <div className="hk-fact-grid">
            <div>
              <p className="hk-fact-label">
                {locale === "th" ? "สถานะงานซ่อม" : "Repair status"}
              </p>
              <p className="hk-fact-value">
                {repairStatusLabel(asset.repairStatus, locale)}
              </p>
            </div>
            {asset.color ? (
              <div>
                <p className="hk-fact-label">
                  {locale === "th" ? "สี" : "Color"}
                </p>
                <p className="hk-fact-value">{asset.color}</p>
              </div>
            ) : null}
          </div>

          <div className="hk-care-note">
            <svg fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              <path d="M12 21s-7.5-4.6-9.6-9.3C.8 8.1 2.6 4.5 6 4.1c2-.2 3.6.8 4.4 2 .8-1.2 2.4-2.2 4.4-2 3.4.4 5.2 4 3.6 7.6C19.5 16.4 12 21 12 21z" />
            </svg>
            <p>
              <strong>
                {locale === "th"
                  ? "ทีมช่างของเราตรวจสอบและดูแลเครื่องนี้อย่างสม่ำเสมอ"
                  : "Our technicians check and care for this machine on an ongoing basis."}
              </strong>
              <br />
              {locale === "th"
                ? "หากพบความผิดปกติในการใช้งาน สแกน QR นี้ซ้ำได้ทุกเมื่อ ทีมงานจะเห็นประวัติและติดต่อกลับโดยเร็ว"
                : "If something seems off, scan this code again any time — our team will see the history and follow up promptly."}
            </p>
          </div>

          {asset.details ? (
            <section className="hk-staff-drawer">
              <p className="hk-staff-drawer-title">
                <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
                </svg>
                {locale === "th"
                  ? "มองเห็นได้เฉพาะพนักงาน"
                  : "Visible to staff only"}
              </p>
              <div className="hk-staff-fact-grid">
                <div>
                  <p className="hk-fact-label">
                    {locale === "th" ? "รหัสเครื่อง" : "Asset Code"}
                  </p>
                  <p className="hk-fact-value">{asset.details.assetCode}</p>
                </div>
                <div>
                  <p className="hk-fact-label">
                    {locale === "th" ? "หมวดหมู่" : "Category"}
                  </p>
                  <p className="hk-fact-value">{asset.details.category}</p>
                </div>
                <div>
                  <p className="hk-fact-label">
                    {locale === "th" ? "รหัสคลัง" : "Warehouse ID"}
                  </p>
                  <p className="hk-fact-value">
                    {asset.details.warehouseId ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="hk-fact-label">
                    {locale === "th" ? "สถานที่ปัจจุบัน" : "Current Location"}
                  </p>
                  <p className="hk-fact-value">
                    {asset.details.locationName || "—"}
                  </p>
                </div>
                <div>
                  <p className="hk-fact-label">
                    {locale === "th" ? "สภาพ" : "Condition"}
                  </p>
                  <AssetStatusBadge condition={asset.details.condition} />
                </div>
                <div>
                  <p className="hk-fact-label">
                    {locale === "th" ? "การยืนยัน NFC" : "NFC Verification"}
                  </p>
                  <p className="hk-fact-value">{asset.details.nfcStatus}</p>
                </div>
                {asset.inStockQuantity !== null ? (
                  <div>
                    <p className="hk-fact-label">
                      {locale === "th"
                        ? "จำนวนคงเหลือในสต็อกของรหัสนี้"
                        : "In-stock quantity for this code"}
                    </p>
                    <p className="hk-fact-value">
                      {String(asset.inStockQuantity)}
                    </p>
                  </div>
                ) : null}
              </div>

              {session?.profile.role === "technician" ? (
                <div className="hk-work-links">
                  <p className="hk-fact-label">
                    {locale === "th"
                      ? "งานที่ได้รับมอบหมายสำหรับเครื่องนี้"
                      : "Your assigned work for this machine"}
                  </p>
                  {assignedWork.length ? (
                    assignedWork.map((work) => (
                      <Link
                        className="hk-work-link"
                        href={work.href}
                        key={work.id}
                      >
                        <span>
                          {work.number} · {work.title}
                        </span>
                        <span aria-hidden="true" className="hk-chev">
                          ›
                        </span>
                      </Link>
                    ))
                  ) : (
                    <p className="hk-fact-value">
                      {locale === "th"
                        ? "ยังไม่มีใบงานที่มอบหมายให้คุณสำหรับเครื่องนี้"
                        : "No work is currently assigned to you for this machine."}
                    </p>
                  )}
                </div>
              ) : null}
            </section>
          ) : null}
        </main>

        <footer className="hk-footer">
          <Image
            alt=""
            aria-hidden="true"
            className="hk-footer-logo"
            height={20}
            src="/brand/hillkoff-logo.png"
            width={111}
          />
          <p>
            {locale === "th"
              ? "พบปัญหาการใช้งาน ติดต่อทีมดูแลลูกค้า Hillkoff"
              : "Having an issue? Contact the Hillkoff care team."}
          </p>
          <p>
            <a href="tel:+66951349968">095-134-9968</a> ·{" "}
            <a href="https://lin.ee/CHJe3l5" rel="noreferrer" target="_blank">
              Line @hillkoff
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

function operationalStatusLabel(
  status: "in_stock" | "sold" | "in_use" | "archived",
  locale: "th" | "en",
): string {
  const labels = {
    th: {
      in_stock: "อยู่ในสต็อก",
      sold: "ขายแล้ว",
      in_use: "กำลังใช้งานปกติ",
      archived: "เก็บถาวร",
    },
    en: {
      in_stock: "In stock",
      sold: "Sold",
      in_use: "In active use",
      archived: "Archived",
    },
  } as const;

  return labels[locale][status];
}

function repairStatusLabel(
  status:
    | "new"
    | "assigned"
    | "in_progress"
    | "waiting_parts"
    | "completed"
    | "closed"
    | null,
  locale: "th" | "en",
): string {
  if (!status || status === "completed" || status === "closed") {
    return locale === "th"
      ? "ปกติ · ไม่มีงานซ่อมค้าง"
      : "Normal · no open repair";
  }
  const labels = {
    th: {
      new: "รอรับงานซ่อม",
      assigned: "มอบหมายช่างแล้ว",
      in_progress: "กำลังซ่อม",
      waiting_parts: "รออะไหล่",
    },
    en: {
      new: "Awaiting assignment",
      assigned: "Technician assigned",
      in_progress: "Under repair",
      waiting_parts: "Waiting for parts",
    },
  } as const;
  return labels[locale][status];
}
