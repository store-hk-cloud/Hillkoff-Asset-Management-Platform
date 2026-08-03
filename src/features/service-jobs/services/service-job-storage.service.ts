"use client";

const path =
  /^service-jobs\/[^/]+\/(?:evidence\/|signatures\/)[A-Za-z0-9_-]+(?:\.(?:jpg|jpeg|png|webp|pdf))?$/;
export function validateServiceJobUpload(
  file: Pick<File, "name" | "size" | "type">,
  storagePath: string,
) {
  if (!path.test(storagePath))
    throw new Error("The evidence storage path is invalid.");
  if (file.size <= 0 || file.size > 10 * 1024 * 1024)
    throw new Error("The evidence file size is invalid.");
  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      file.type,
    )
  )
    throw new Error("The evidence file type is invalid.");
  return true;
}
