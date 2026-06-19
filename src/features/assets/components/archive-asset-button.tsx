"use client";

import { useState } from "react";
import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { archiveAsset } from "@/features/assets/services/asset-api.service";

type ArchiveAssetButtonProps = Readonly<{
  assetId: string;
  assetCode: string;
}>;

export function ArchiveAssetButton({
  assetId,
  assetCode,
}: ArchiveAssetButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleArchive() {
    const confirmed = window.confirm(
      `ยืนยันการ Archive ทรัพย์สิน ${assetCode}?`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    try {
      await archiveAsset(assetId);
      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "ไม่สามารถ Archive ทรัพย์สินได้",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button
      disabled={submitting}
      onClick={handleArchive}
      type="button"
      variant="destructive"
    >
      <Archive aria-hidden="true" className="size-4" />
      Archive
    </Button>
  );
}
