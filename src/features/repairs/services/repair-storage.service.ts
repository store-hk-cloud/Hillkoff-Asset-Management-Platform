"use client";

import { ref, uploadBytes } from "firebase/storage";

import { getFirebaseAuth } from "@/firebase/auth";
import { getFirebaseStorage } from "@/firebase/storage";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface UploadedRepairPhoto {
  readonly id: string;
  readonly name: string;
  readonly storagePath: string;
  readonly contentType: string;
  readonly size: number;
}

export async function uploadRepairPhoto(
  repairId: string,
  file: File,
): Promise<UploadedRepairPhoto> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Authentication is required.");
  if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) {
    throw new Error("รองรับ JPG, PNG หรือ WebP ขนาดไม่เกิน 10 MB");
  }

  const id = crypto.randomUUID();
  const extension = file.type.split("/")[1] ?? "image";
  const storagePath = `repairs/${repairId}/photos/${id}.${extension}`;
  await uploadBytes(ref(getFirebaseStorage(), storagePath), file, {
    contentType: file.type,
    customMetadata: {
      repairId,
      uploadedBy: user.uid,
    },
  });
  return {
    id,
    name: file.name,
    storagePath,
    contentType: file.type,
    size: file.size,
  };
}
