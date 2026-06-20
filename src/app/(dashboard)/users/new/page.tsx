import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserForm } from "@/features/users/components/user-form";
import { requireSession } from "@/lib/auth/dal";

export const metadata = { title: "เพิ่มผู้ใช้งาน" };

export default async function NewUserPage() {
  const { profile } = await requireSession();
  if (profile.role !== "admin") notFound();

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>เพิ่มผู้ใช้งาน</CardTitle>
          <CardDescription>
            ระบบจะส่งอีเมลให้ผู้ใช้ตั้งรหัสผ่านด้วยตนเอง
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm currentUserId={profile.uid} />
        </CardContent>
      </Card>
    </section>
  );
}
