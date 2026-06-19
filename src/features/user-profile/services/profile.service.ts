"use client";

import {
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata,
} from "firebase/storage";

import type { UserProfile } from "@/domain/entities/user-profile";
import { getFirebaseAuth } from "@/firebase/auth";
import { getFirebaseStorage } from "@/firebase/storage";
import type { ProfileUpdateInput } from "@/features/user-profile/schemas/profile.schema";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function uploadProfileImage(file: File): Promise<string> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    throw new Error("Authentication is required.");
  }

  if (
    file.size > MAX_PROFILE_IMAGE_BYTES ||
    !ALLOWED_PROFILE_IMAGE_TYPES.has(file.type)
  ) {
    throw new Error("รองรับ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB");
  }

  const extension = file.type.split("/")[1] ?? "image";
  const storageReference = ref(
    getFirebaseStorage(),
    `users/${user.uid}/profile/avatar-${crypto.randomUUID()}.${extension}`,
  );
  const metadata: UploadMetadata = {
    contentType: file.type,
    customMetadata: {
      ownerUid: user.uid,
    },
  };
  const snapshot = await uploadBytes(storageReference, file, metadata);
  return getDownloadURL(snapshot.ref);
}

export async function updateProfile(
  input: ProfileUpdateInput,
): Promise<UserProfile> {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as {
    data?: UserProfile;
    error?: { message?: string };
  };

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message ?? "ไม่สามารถบันทึกโปรไฟล์ได้");
  }

  return payload.data;
}
