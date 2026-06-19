"use client";

export function supportsWebNfc(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

export function assertNfcCapacity(
  url: string,
  tagType: "ntag213" | "ntag215",
): void {
  const capacity = tagType === "ntag213" ? 144 : 504;
  const estimatedNdefBytes = new TextEncoder().encode(url).length + 16;

  if (estimatedNdefBytes > capacity) {
    throw new Error(
      `URL ยาวเกินความจุ ${tagType.toUpperCase()} (${capacity} bytes)`,
    );
  }
}

export async function writeNfcUrl(url: string): Promise<void> {
  if (!supportsWebNfc()) {
    throw new Error(
      "อุปกรณ์นี้ไม่รองรับ Web NFC กรุณาใช้ Chrome บน Android ที่เปิด NFC",
    );
  }

  const reader = new NDEFReader();
  await reader.write({
    records: [{ recordType: "url", data: url }],
  });
}

export async function scanNfcUrl(): Promise<{
  url: string;
  serialNumber: string | null;
}> {
  if (!supportsWebNfc()) {
    throw new Error(
      "อุปกรณ์นี้ไม่รองรับ Web NFC กรุณาใช้ Chrome บน Android ที่เปิด NFC",
    );
  }

  const reader = new NDEFReader();
  const controller = new AbortController();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      controller.abort();
      reject(new Error("หมดเวลารอ NFC tag"));
    }, 30_000);

    reader.onreadingerror = () => {
      window.clearTimeout(timeout);
      controller.abort();
      reject(new Error("ไม่สามารถอ่าน NFC tag ได้"));
    };

    reader.onreading = (event) => {
      const urlRecord = event.message.records.find(
        (record) => record.recordType === "url" && record.data,
      );

      window.clearTimeout(timeout);
      controller.abort();

      if (!urlRecord?.data) {
        reject(new Error("NFC tag ไม่มี URL record"));
        return;
      }

      resolve({
        url: new TextDecoder().decode(urlRecord.data),
        serialNumber: event.serialNumber || null,
      });
    };

    void reader.scan({ signal: controller.signal }).catch((error) => {
      window.clearTimeout(timeout);
      reject(error instanceof Error ? error : new Error("NFC scan failed"));
    });
  });
}
