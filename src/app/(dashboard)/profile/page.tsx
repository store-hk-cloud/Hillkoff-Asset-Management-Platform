import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/features/user-profile/components/profile-form";
import { requireSession } from "@/lib/auth/dal";

export const metadata = {
  title: "โปรไฟล์",
};

export default async function ProfilePage() {
  const { profile } = await requireSession();

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">โปรไฟล์ผู้ใช้</h1>
        <p className="text-muted-foreground text-sm">
          แก้ไขข้อมูลส่วนตัวที่อนุญาต บทบาทและสถานะจัดการโดยผู้ดูแลระบบ
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          <CardDescription>ข้อมูลนี้ใช้แสดงภายในแพลตฟอร์ม</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </section>
  );
}
