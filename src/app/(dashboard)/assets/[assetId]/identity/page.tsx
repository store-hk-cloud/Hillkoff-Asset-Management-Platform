import { notFound } from "next/navigation";

import { QrCodeCard } from "@/features/asset-identity/components/qr-code-card";
import { NfcRegistration } from "@/features/asset-identity/components/nfc-registration";
import { requireSession } from "@/lib/auth/dal";
import { AssetIdentityManagementService } from "@/services/asset-identity-management.service";

const service = new AssetIdentityManagementService();
type IdentityPageProps = { params: Promise<{ assetId: string }> };

export const metadata = { title: "QR และ NFC" };

export default async function IdentityPage({ params }: IdentityPageProps) {
  const { profile } = await requireSession();
  const { assetId } = await params;
  const { asset } = await service.get(assetId, profile);

  if (!asset.publicId || !asset.qrUrl || !asset.nfcUrl) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-muted-foreground font-mono text-sm">
          {asset.assetCode}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          QR และ NFC · {asset.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Public ID: {asset.publicId}
        </p>
      </div>
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
