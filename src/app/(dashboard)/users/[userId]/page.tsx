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
import { UserManagementService } from "@/services/user-management.service";

const service = new UserManagementService();
type Props = {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ invitation?: string }>;
};
export const metadata = { title: "จัดการผู้ใช้งาน" };

export default async function UserDetailPage({ params, searchParams }: Props) {
  const { profile } = await requireSession();
  if (profile.role !== "admin") notFound();
  const { userId } = await params;
  const user = await service.get(userId, profile).catch(() => null);
  if (!user) notFound();
  const invitation = (await searchParams).invitation;

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{user.displayName}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          {invitation === "sent" ? (
            <p className="mb-5 text-sm text-emerald-700">
              สร้างบัญชีและส่งคำเชิญตั้งรหัสผ่านแล้ว
            </p>
          ) : invitation === "failed" ? (
            <p className="text-destructive mb-5 text-sm">
              สร้างบัญชีแล้ว แต่ส่งอีเมลไม่สำเร็จ กรุณาตรวจ SMTP
              แล้วกดส่งคำเชิญอีกครั้ง
            </p>
          ) : null}
          <UserForm
            currentUserId={profile.uid}
            initialValues={{
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              role: user.role,
              status: user.status,
              branchId: user.branchId,
              customerId: user.customerId,
              version: user.version,
            }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
