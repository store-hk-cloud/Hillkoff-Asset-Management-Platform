import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { QrCodeCard } from "@/features/asset-identity/components/qr-code-card";
import { NfcRegistration } from "@/features/asset-identity/components/nfc-registration";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { AssetIdentityManagementService } from "@/services/asset-identity-management.service";

const service = new AssetIdentityManagementService();
type IdentityPageProps = { params: Promise<{ assetId: string }> };

export const metadata = { title: "QR และ NFC" };

export default async function IdentityPage({ params }: IdentityPageProps) {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  const { assetId } = await params;
  const { asset } = await service.get(assetId, profile);

  if (!asset.publicId || !asset.qrUrl || !asset.nfcUrl) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        description={`Public ID: ${asset.publicId}`}
        eyebrow={`${asset.assetCode} · ${locale === "th" ? "ตัวตนเครื่อง" : "Machine identity"}`}
        title={`${locale === "th" ? "QR และ NFC" : "QR and NFC"} · ${asset.name}`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <QrCodeCard assetId={asset.id} qrUrl={asset.qrUrl} />
        <NfcRegistration
          assetId={asset.id}
          canRegister={service.canRegister(profile)}
          canVerify={service.canVerify(profile)}
          nfcUrl={asset.nfcUrl}
          status={asset.nfcStatus}
        />
      </div>
    </section>
  );
}
