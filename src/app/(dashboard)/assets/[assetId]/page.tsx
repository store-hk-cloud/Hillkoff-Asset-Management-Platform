import Link from "next/link";
import { FileText, Pencil, QrCode } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Asset } from "@/domain/entities/asset";
import type { AssetEvent } from "@/domain/entities/asset-event";
import type { UserProfile } from "@/domain/entities/user-profile";
import { AssetError } from "@/domain/errors/asset.error";
import { AssetAccessService } from "@/domain/services/asset-access.service";
import { ArchiveAssetButton } from "@/features/assets/components/archive-asset-button";
import { AssetEventList } from "@/features/assets/components/asset-event-list";
import { AssetStatusBadge } from "@/features/assets/components/asset-status-badge";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { AssetManagementService } from "@/services/asset-management.service";

const assetService = new AssetManagementService();
const accessService = new AssetAccessService();

const tabs = [
  ["overview", "Overview"],
  ["timeline", "Timeline"],
  ["repair", "Repair History"],
  ["pm", "PM History"],
  ["installation", "Installation History"],
  ["documents", "Documents"],
] as const;

type AssetTab = (typeof tabs)[number][0];

type AssetDetailPageProps = {
  params: Promise<{ assetId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

function isAssetTab(value: string | undefined): value is AssetTab {
  return tabs.some(([tab]) => tab === value);
}

async function loadAssetDetail(assetId: string, profile: UserProfile) {
  try {
    const [asset, events]: [Asset, readonly AssetEvent[]] = await Promise.all([
      assetService.get(assetId, profile),
      assetService.listEvents(assetId, profile),
    ]);
    return { asset, events };
  } catch (error) {
    if (
      error instanceof AssetError &&
      (error.code === "ASSET_NOT_FOUND" || error.code === "ASSET_ACCESS_DENIED")
    ) {
      notFound();
    }

    throw error;
  }
}

export default async function AssetDetailPage({
  params,
  searchParams,
}: AssetDetailPageProps) {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();
  const { assetId } = await params;
  const requestedTab = (await searchParams).tab;
  const activeTab = isAssetTab(requestedTab) ? requestedTab : "overview";

  const { asset, events } = await loadAssetDetail(assetId, profile);
  const canWrite =
    accessService.canWrite(profile) && asset.status !== "archived";
  const filteredEvents =
    activeTab === "repair"
      ? events.filter((event) => event.type === "repair")
      : activeTab === "pm"
        ? events.filter((event) => event.type === "preventive_maintenance")
        : activeTab === "installation"
          ? events.filter((event) => event.type === "installation")
          : events;
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "medium",
      timeZone: "Asia/Bangkok",
    },
  );
  const tabLabels: Record<AssetTab, string> =
    locale === "th"
      ? {
          overview: "ภาพรวม",
          timeline: "ไทม์ไลน์",
          repair: "ประวัติซ่อม",
          pm: "ประวัติ PM",
          installation: "ประวัติติดตั้ง",
          documents: "เอกสาร",
        }
      : {
          overview: "Overview",
          timeline: "Timeline",
          repair: "Repair History",
          pm: "PM History",
          installation: "Installation History",
          documents: "Documents",
        };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            className="text-muted-foreground hover:text-foreground text-sm"
            href="/assets"
          >
            {t("assets.back")}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {asset.name}
            </h1>
            <AssetStatusBadge status={asset.status} />
            <AssetStatusBadge condition={asset.condition} />
          </div>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {asset.assetCode}
          </p>
        </div>

        {canWrite ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/assets/${asset.id}/edit`}>
                <Pencil aria-hidden="true" className="size-4" />
                {t("action.edit")}
              </Link>
            </Button>
            <ArchiveAssetButton
              assetCode={asset.assetCode}
              assetId={asset.id}
            />
          </div>
        ) : asset.publicId ? (
          <Button asChild variant="outline">
            <Link href={`/assets/${asset.id}/identity`}>
              <QrCode aria-hidden="true" className="size-4" />
              QR / NFC
            </Link>
          </Button>
        ) : null}
      </div>
      {asset.publicId && canWrite ? (
        <Button asChild className="w-full sm:w-auto" variant="outline">
          <Link href={`/assets/${asset.id}/identity`}>
            <QrCode aria-hidden="true" className="size-4" />
            QR / NFC Identity
          </Link>
        </Button>
      ) : null}

      <nav
        aria-label={locale === "th" ? "รายละเอียดทรัพย์สิน" : "Asset detail"}
        className="flex gap-1 overflow-x-auto border-b"
      >
        {tabs.map(([tab, label]) => (
          <Link
            className={cn(
              "shrink-0 border-b-2 px-3 py-3 text-sm",
              activeTab === tab
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
            href={`/assets/${asset.id}?tab=${tab}`}
            key={tab}
          >
            {tabLabels[tab] ?? label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {locale === "th" ? "ข้อมูลหลัก" : "Core information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <Detail
                label={locale === "th" ? "หมวดหมู่" : "Category"}
                value={asset.category}
              />
              <Detail label="Serial Number" value={asset.serialNumber ?? "—"} />
              <Detail
                label={locale === "th" ? "สี" : "Color"}
                value={asset.color || "—"}
              />
              <Detail
                label={locale === "th" ? "คลังเก็บ" : "Warehouse"}
                value={asset.locationName || "—"}
              />
              <Detail
                label={locale === "th" ? "รหัสคลัง" : "Warehouse ID"}
                value={asset.warehouseId ?? "—"}
              />
              <Detail
                label={t("field.customerId")}
                value={asset.customerId ?? "—"}
              />
              <Detail
                label={locale === "th" ? "ผู้ครอบครอง" : "Custody"}
                value={
                  asset.custodyType === "customer"
                    ? locale === "th"
                      ? "ลูกค้า"
                      : "Customer"
                    : locale === "th"
                      ? "สาขา"
                      : "Branch"
                }
              />
              <Detail
                label={locale === "th" ? "วันที่ติดตั้ง" : "Installation date"}
                value={
                  asset.installedAt
                    ? dateFormatter.format(asset.installedAt)
                    : "—"
                }
              />
              <Detail
                label={locale === "th" ? "การรับประกัน" : "Warranty"}
                value={
                  asset.warranty.status === "active" && asset.warranty.expiresAt
                    ? `${locale === "th" ? "ใช้งานถึง" : "Active until"} ${dateFormatter.format(asset.warranty.expiresAt)}`
                    : asset.warranty.status
                }
              />
              <Detail
                label={locale === "th" ? "GPS ติดตั้ง" : "Installation GPS"}
                value={
                  asset.installationLatitude !== null &&
                  asset.installationLongitude !== null
                    ? `${asset.installationLatitude.toFixed(6)}, ${asset.installationLongitude.toFixed(6)}`
                    : "—"
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {locale === "th" ? "รายละเอียด" : "Description"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {asset.description ||
                  (locale === "th" ? "ไม่มีรายละเอียด" : "No description")}
              </p>
              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                <Detail
                  label={locale === "th" ? "สร้างเมื่อ" : "Created"}
                  value={dateFormatter.format(asset.createdAt)}
                />
                <Detail
                  label="Public ID"
                  value={
                    asset.publicId ??
                    (locale === "th" ? "รอการย้ายข้อมูล" : "Pending migration")
                  }
                />
                <Detail
                  label={locale === "th" ? "แก้ไขล่าสุด" : "Last updated"}
                  value={dateFormatter.format(asset.updatedAt)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "timeline" ? (
        <AssetEventList
          emptyMessage={
            locale === "th" ? "ยังไม่มีไทม์ไลน์" : "No timeline events"
          }
          events={filteredEvents}
        />
      ) : null}

      {activeTab === "repair" ? (
        <AssetEventList
          emptyMessage={
            locale === "th" ? "ยังไม่มีประวัติการซ่อม" : "No repair history"
          }
          events={filteredEvents}
        />
      ) : null}

      {activeTab === "pm" ? (
        <AssetEventList
          emptyMessage={
            locale === "th"
              ? "ยังไม่มีประวัติ Preventive Maintenance"
              : "No preventive maintenance history"
          }
          events={filteredEvents}
        />
      ) : null}

      {activeTab === "installation" ? (
        <AssetEventList
          emptyMessage={
            locale === "th"
              ? "ยังไม่มีประวัติการติดตั้ง"
              : "No installation history"
          }
          events={filteredEvents}
        />
      ) : null}

      {activeTab === "documents" ? (
        asset.documents.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <FileText
              aria-hidden="true"
              className="text-muted-foreground mx-auto mb-3 size-8"
            />
            <p className="text-muted-foreground text-sm">
              {locale === "th"
                ? "ยังไม่มีเอกสารสำหรับทรัพย์สินนี้"
                : "No documents for this asset"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {asset.documents.map((document) => (
              <Card className="py-0" key={document.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <FileText
                    aria-hidden="true"
                    className="text-muted-foreground size-5"
                  />
                  <div>
                    <p className="font-medium">{document.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {document.contentType} · {Math.ceil(document.size / 1024)}{" "}
                      KB
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
