"use client";

import { useState } from "react";
import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { archiveAsset } from "@/features/assets/services/asset-api.service";

type ArchiveAssetButtonProps = Readonly<{
  assetId: string;
  assetCode: string;
}>;

export function ArchiveAssetButton({
  assetId,
  assetCode,
}: ArchiveAssetButtonProps) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleArchive() {
    const confirmed = window.confirm(
      locale === "th"
        ? `ยืนยันการเก็บทรัพย์สิน ${assetCode} เป็นรายการถาวร?`
        : `Archive asset ${assetCode}?`,
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
      {t("action.archive")}
    </Button>
  );
}
