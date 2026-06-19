"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/domain/entities/user-profile";
import { profileUpdateSchema } from "@/features/user-profile/schemas/profile.schema";
import {
  updateProfile,
  uploadProfileImage,
} from "@/features/user-profile/services/profile.service";

type ProfileFormProps = Readonly<{
  profile: UserProfile;
}>;

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoURL, setPhotoURL] = useState(profile.photoURL);
  const [version, setVersion] = useState(profile.version);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      setPhotoURL(await uploadProfileImage(file));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "ไม่สามารถอัปโหลดรูปได้",
      );
    } finally {
      setSubmitting(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const result = profileUpdateSchema.safeParse({
      displayName: formData.get("displayName"),
      phoneNumber: formData.get("phoneNumber") || null,
      photoURL,
      expectedVersion: version,
    });

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    setSubmitting(true);

    try {
      const updatedProfile = await updateProfile(result.data);
      setPhotoURL(updatedProfile.photoURL);
      setVersion(updatedProfile.version);
      setMessage("บันทึกโปรไฟล์แล้ว");
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "ไม่สามารถบันทึกโปรไฟล์ได้",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const initials = profile.displayName.slice(0, 2).toUpperCase();

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex items-center gap-4">
        <Avatar className="size-20">
          {photoURL ? (
            <AvatarImage alt={profile.displayName} src={photoURL} />
          ) : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div>
          <Button
            disabled={submitting}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            <Camera aria-hidden="true" className="size-4" />
            เปลี่ยนรูป
          </Button>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleImageChange}
            ref={fileInputRef}
            type="file"
          />
          <p className="text-muted-foreground mt-2 text-xs">
            JPG, PNG หรือ WebP สูงสุด 5 MB
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="displayName">ชื่อที่แสดง</Label>
          <Input
            defaultValue={profile.displayName}
            id="displayName"
            maxLength={120}
            name="displayName"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">อีเมล</Label>
          <Input disabled id="email" value={profile.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">บทบาท</Label>
          <Input disabled id="role" value={profile.role} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="phoneNumber">เบอร์โทรศัพท์</Label>
          <Input
            defaultValue={profile.phoneNumber ?? ""}
            id="phoneNumber"
            maxLength={30}
            name="phoneNumber"
            type="tel"
          />
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-green-700" role="status">
          {message}
        </p>
      ) : null}

      <Button disabled={submitting} type="submit">
        {submitting ? "กำลังบันทึก…" : "บันทึกโปรไฟล์"}
      </Button>
    </form>
  );
}
