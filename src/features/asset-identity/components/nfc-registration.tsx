"use client";

import { useState } from "react";
import { Radio, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  registerNfc,
  verifyNfc,
} from "@/features/asset-identity/services/identity-api.service";
import {
  scanNfcUrl,
  assertNfcCapacity,
  writeNfcUrl,
} from "@/features/asset-identity/services/nfc.service";

type NfcRegistrationProps = Readonly<{
  assetId: string;
  nfcUrl: string;
  status: string;
  canRegister: boolean;
  canVerify: boolean;
}>;

export function NfcRegistration({
  assetId,
  nfcUrl,
  status,
  canRegister,
  canVerify,
}: NfcRegistrationProps) {
  const { locale } = useLanguage();
  const router = useRouter();
  const [tagType, setTagType] = useState("ntag213");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function handleRegister() {
    setBusy(true);
    setError(null);
    setMessage("แตะ NFC tag ค้างไว้จนกว่าจะเขียนสำเร็จ");

    try {
      assertNfcCapacity(nfcUrl, tagType as "ntag213" | "ntag215");
      await writeNfcUrl(nfcUrl);
      await registerNfc(assetId, tagType);
      setMessage("ลงทะเบียน NFC สำเร็จ กรุณาทำ Verification ต่อ");
      router.refresh();
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : "ลงทะเบียน NFC ไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setBusy(true);
    setError(null);
    setMessage("แตะ NFC tag ที่ต้องการตรวจสอบ");

    try {
      const scanned = await scanNfcUrl();
      const result = await verifyNfc(
        assetId,
        scanned.url,
        scanned.serialNumber,
      );
      setMessage(
        result.status === "verified"
          ? "NFC tag ถูกต้อง"
          : "NFC tag ไม่ตรงกับทรัพย์สิน",
      );
      router.refresh();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "ตรวจสอบ NFC ไม่สำเร็จ",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio aria-hidden="true" className="size-5" />
          NFC
        </CardTitle>
        <CardDescription>
          NTAG213 {locale === "th" ? "และ" : "and"} NTAG215 ·{" "}
          {locale === "th" ? "สถานะ" : "Status"} {status}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {locale === "th"
            ? "Web NFC ต้องใช้ Chrome บน Android ผ่าน HTTPS และเปิด NFC"
            : "Web NFC requires Chrome on Android over HTTPS with NFC enabled."}
        </p>
        <p className="text-muted-foreground text-xs break-all">{nfcUrl}</p>
        {canRegister ? (
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <select
              className="border-input bg-background h-11 rounded-md border px-3 text-sm"
              onChange={(event) => setTagType(event.target.value)}
              value={tagType}
            >
              <option value="ntag213">NTAG213</option>
              <option value="ntag215">NTAG215</option>
            </select>
            <Button
              className="h-11"
              disabled={busy}
              onClick={handleRegister}
              type="button"
            >
              {locale === "th"
                ? "เขียน URL และลงทะเบียน"
                : "Write URL and register"}
            </Button>
          </div>
        ) : null}
        {canVerify && status !== "unregistered" ? (
          <Button
            className="h-11 w-full"
            disabled={busy}
            onClick={handleVerify}
            type="button"
            variant="outline"
          >
            <ShieldCheck aria-hidden="true" className="size-4" />
            {locale === "th" ? "ตรวจสอบ NFC" : "Verify NFC"}
          </Button>
        ) : null}
        {message ? (
          <p className="text-muted-foreground text-sm" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
