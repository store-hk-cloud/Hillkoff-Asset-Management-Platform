"use client";

import {
  useState,
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
} from "react";
import { Camera, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  InstallationChecklistItem,
  InstallationLocation,
} from "@/domain/entities/installation";
import { SignaturePad } from "@/features/installations/components/signature-pad";
import {
  completeInstallation,
  startInstallation,
} from "@/features/installations/services/installation-api.service";
import {
  uploadCustomerSignature,
  uploadInstallationPhoto,
  type UploadedInstallationFile,
} from "@/features/installations/services/installation-storage.service";

type InstallationWorkFormProps = Readonly<{
  installationId: string;
  initialVersion: number;
  initialStatus: string;
  initialChecklist: readonly InstallationChecklistItem[];
}>;

export function InstallationWorkForm({
  installationId,
  initialVersion,
  initialStatus,
  initialChecklist,
}: InstallationWorkFormProps) {
  const router = useRouter();
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState(initialStatus);
  const [checklist, setChecklist] = useState([...initialChecklist]);
  const [location, setLocation] = useState<InstallationLocation | null>(null);
  const [photos, setPhotos] = useState<UploadedInstallationFile[]>([]);
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const result = await startInstallation(installationId);
      setVersion(Number(result.version));
      setStatus("in_progress");
      router.refresh();
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : "เริ่มงานไม่ได้",
      );
    } finally {
      setBusy(false);
    }
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      setError("อุปกรณ์นี้ไม่รองรับ GPS");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date(),
        }),
      () => setError("ไม่สามารถอ่าน GPS ได้ กรุณาอนุญาต Location"),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    try {
      const uploaded: UploadedInstallationFile[] = [];
      for (const file of files) {
        uploaded.push(await uploadInstallationPhoto(installationId, file));
      }
      setPhotos((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปไม่ได้",
      );
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location || !signatureBlob) {
      setError("ต้องมี GPS และลายเซ็นลูกค้า");
      return;
    }
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const signaturePath = await uploadCustomerSignature(
        installationId,
        signatureBlob,
      );
      await completeInstallation(installationId, {
        expectedVersion: version,
        checklist,
        gpsLocation: {
          ...location,
          capturedAt: location.capturedAt.toISOString(),
        },
        photos,
        training: {
          completed: data.get("trainingCompleted") === "on",
          traineeName: data.get("traineeName"),
          topics: String(data.get("trainingTopics") ?? "")
            .split(",")
            .map((topic) => topic.trim())
            .filter(Boolean),
          notes: data.get("trainingNotes"),
        },
        signature: {
          signerName: data.get("signerName"),
          storagePath: signaturePath,
        },
      });
      router.replace(`/installations/${installationId}?completed=1`);
      router.refresh();
    } catch (completeError) {
      setError(
        completeError instanceof Error
          ? completeError.message
          : "ปิดงานติดตั้งไม่ได้",
      );
    } finally {
      setBusy(false);
    }
  }

  if (status === "completed") {
    return (
      <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
        งานติดตั้งเสร็จสมบูรณ์และเปิด Warranty แล้ว
      </p>
    );
  }

  return (
    <form className="space-y-8" onSubmit={submit}>
      {status === "scheduled" ? (
        <Button
          className="h-12 w-full"
          disabled={busy}
          onClick={start}
          type="button"
        >
          เริ่มงานติดตั้ง
        </Button>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">Installation Checklist</h2>
        {checklist.map((item, index) => (
          <label
            className="flex min-h-12 items-start gap-3 rounded-lg border p-3"
            key={item.id}
          >
            <input
              checked={item.completed}
              className="mt-1 size-5"
              onChange={(event) =>
                setChecklist((current) =>
                  current.map((value, itemIndex) =>
                    itemIndex === index
                      ? { ...value, completed: event.target.checked }
                      : value,
                  ),
                )
              }
              type="checkbox"
            />
            <span className="text-sm">{item.label}</span>
          </label>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">GPS Location</h2>
        <Button onClick={captureLocation} type="button" variant="outline">
          <MapPin aria-hidden="true" className="size-4" />
          บันทึกตำแหน่งปัจจุบัน
        </Button>
        {location ? (
          <p className="text-muted-foreground text-sm">
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            {location.accuracy ? ` · ±${Math.round(location.accuracy)}m` : ""}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Installation Photos</h2>
        <Label
          className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border"
          htmlFor="installationPhotos"
        >
          <Camera aria-hidden="true" className="size-4" />
          ถ่ายหรือเลือกรูป
        </Label>
        <input
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          id="installationPhotos"
          multiple
          onChange={uploadPhotos}
          type="file"
        />
        <p className="text-muted-foreground text-sm">
          อัปโหลดแล้ว {photos.length} รูป
        </p>
      </section>

      <section className="grid gap-4">
        <h2 className="font-semibold">Customer Training</h2>
        <label className="flex items-center gap-3">
          <input className="size-5" name="trainingCompleted" type="checkbox" />
          <span className="text-sm">อบรมลูกค้าเสร็จแล้ว</span>
        </label>
        <Field label="ชื่อผู้รับการอบรม" name="traineeName" required />
        <Field
          label="หัวข้ออบรม (คั่นด้วย comma)"
          name="trainingTopics"
          required
        />
        <Field label="หมายเหตุการอบรม" name="trainingNotes" />
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Customer Signature</h2>
        <Field label="ชื่อผู้ลงนาม" name="signerName" required />
        <SignaturePad onChange={setSignatureBlob} />
      </section>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        className="h-12 w-full"
        disabled={busy || status === "scheduled"}
        type="submit"
      >
        {busy ? "กำลังบันทึก…" : "Complete Installation & Activate Warranty"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
