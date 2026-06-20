import Link from "next/link";
import { CloudOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerTranslator } from "@/lib/i18n/server";

export const metadata = { title: "Offline" };

export default async function OfflinePage() {
  const { t } = await getServerTranslator();

  return (
    <main className="bg-muted/40 grid min-h-dvh place-items-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CloudOff
            aria-hidden="true"
            className="text-muted-foreground size-9"
          />
          <CardTitle>{t("offline.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {t("offline.description")}
          </p>
          <Button asChild className="w-full">
            <Link href="/">{t("action.retry")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
