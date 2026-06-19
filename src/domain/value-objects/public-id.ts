declare const publicIdBrand: unique symbol;

export type PublicId = string & {
  readonly [publicIdBrand]: "PublicId";
};

const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function createPublicId(value: string): PublicId {
  if (!PUBLIC_ID_PATTERN.test(value)) {
    throw new Error("Invalid public ID.");
  }

  return value as PublicId;
}

export function generatePublicId(): PublicId {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );
  return createPublicId(
    btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  );
}
