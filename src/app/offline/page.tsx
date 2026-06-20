import Link from "next/link";
import { CloudOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="bg-muted/40 grid min-h-dvh place-items-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CloudOff
            aria-hidden="true"
            className="text-muted-foreground size-9"
          />
          <CardTitle>ไม่มีการเชื่อมต่ออินเทอร์เน็ต</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            การดูและบันทึกข้อมูลทรัพย์สินต้องเชื่อมต่ออินเทอร์เน็ต
            เพื่อป้องกันข้อมูลซ้ำและความขัดแย้งของรายการธุรกรรม
          </p>
          <Button asChild className="w-full">
            <Link href="/">ลองเชื่อมต่ออีกครั้ง</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
