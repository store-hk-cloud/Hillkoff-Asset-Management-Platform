import { HelpCenter } from "@/features/help/components/help-center";
import { requireSession } from "@/lib/auth/dal";

export const metadata = {
  title: "User Guide | Hillkoff Machine Management",
};

export default async function HelpPage() {
  const { profile } = await requireSession();

  return <HelpCenter role={profile.role} />;
}
