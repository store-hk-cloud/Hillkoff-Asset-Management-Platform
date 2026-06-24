"use client";

type BarcodeDetectorConstructor = new (options?: {
  formats?: readonly string[];
}) => {
  detect(source: CanvasImageSource): Promise<readonly { rawValue: string }[]>;
};

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { BarcodeDetector?: unknown })
    .BarcodeDetector;
  return typeof candidate === "function"
    ? (candidate as BarcodeDetectorConstructor)
    : null;
}

export function supportsQrScanning(): boolean {
  return Boolean(getBarcodeDetector()) && Boolean(navigator.mediaDevices);
}

export async function scanQrCode(): Promise<string> {
  const BarcodeDetector = getBarcodeDetector();

  if (!BarcodeDetector || !navigator.mediaDevices) {
    throw new Error(
      "อุปกรณ์นี้ไม่รองรับการสแกน QR ผ่านเบราว์เซอร์ กรุณาใช้กล้องสแกน QR แล้ววาง URL/Serial Number แทน",
    );
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  const video = document.createElement("video");
  const detector = new BarcodeDetector({ formats: ["qr_code"] });

  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;

  try {
    await video.play();
    const startedAt = Date.now();

    while (Date.now() - startedAt < 30_000) {
      const barcodes = await detector.detect(video);
      const qrCode = barcodes.find((barcode) => barcode.rawValue.trim());

      if (qrCode) {
        return qrCode.rawValue.trim();
      }

      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }

    throw new Error("หมดเวลารอสแกน QR Code");
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}
