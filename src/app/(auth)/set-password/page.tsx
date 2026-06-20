import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserManagementError } from "@/domain/errors/user-management.error";
import { RedeemInvitationButton } from "@/features/users/components/redeem-invitation-button";
import { getServerTranslator } from "@/lib/i18n/server";
import { UserInvitationManagementService } from "@/services/user-invitation-management.service";

const service = new UserInvitationManagementService();

export const metadata = { title: "ตั้งรหัสผ่าน" };
export const dynamic = "force-dynamic";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { locale } = await getServerTranslator();
  const token = (await searchParams).token ?? "";

  const result = await service
    .inspect(token)
    .then((invitation) => ({ invitation, error: null }))
    .catch((error: unknown) => ({ invitation: null, error }));

  if (!result.invitation) {
    const message =
      result.error instanceof UserManagementError
        ? result.error.message
        : "This invitation is invalid.";
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "th" ? "ลิงก์ใช้ไม่ได้" : "Invitation unavailable"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {locale === "th"
              ? "กรุณาติดต่อผู้ดูแลระบบเพื่อส่งคำเชิญใหม่"
              : "Contact an administrator to send a new invitation."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const invitation = result.invitation;
  const expiresAt = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    },
  ).format(invitation.expiresAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {locale === "th" ? "ตั้งรหัสผ่าน" : "Set your password"}
        </CardTitle>
        <CardDescription>
          {locale === "th"
            ? `สวัสดี ${invitation.displayName} บัญชี ${invitation.email}`
            : `Hello ${invitation.displayName}, account ${invitation.email}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-muted-foreground text-sm">
          {locale === "th"
            ? `คำเชิญใช้ได้ถึง ${expiresAt} เมื่อดำเนินการต่อ ระบบจะเปิดหน้าตั้งรหัสผ่านที่ปลอดภัยของ Firebase`
            : `This invitation is valid until ${expiresAt}. Continuing opens Firebase's secure password setup page.`}
        </p>
        <RedeemInvitationButton token={token} />
      </CardContent>
    </Card>
  );
}
