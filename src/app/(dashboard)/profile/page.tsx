import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/features/user-profile/components/profile-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";

export const metadata = {
  title: "โปรไฟล์",
};

export default async function ProfilePage() {
  const { locale, t } = await getServerTranslator();
  const { profile } = await requireSession();

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("profile.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("profile.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "th" ? "ข้อมูลส่วนตัว" : "Personal information"}
          </CardTitle>
          <CardDescription>
            {locale === "th"
              ? "ข้อมูลนี้ใช้แสดงภายในแพลตฟอร์ม"
              : "This information is displayed within the platform."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </section>
  );
}
