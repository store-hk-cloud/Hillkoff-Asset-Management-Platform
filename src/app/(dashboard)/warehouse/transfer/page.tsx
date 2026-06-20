import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MovementForm } from "@/features/warehouse/components/movement-form";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";
import { WarehouseManagementService } from "@/services/warehouse-management.service";

const warehouseService = new WarehouseManagementService();
export const metadata = { title: "โอนสาขา" };

export default async function TransferPage() {
  const { locale } = await getServerTranslator();
  const { profile } = await requireSession();
  if (!warehouseService.canTransfer(profile)) notFound();

  return (
    <section className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "th"
              ? "โอนทรัพย์สินระหว่างสาขา"
              : "Transfer asset between branches"}
          </CardTitle>
          <CardDescription>
            {locale === "th"
              ? "ระบบตรวจสาขาต้นทางและป้องกันการโอนไปสาขาเดิม"
              : "The system validates the source branch and prevents transfers to the same branch."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementForm action="transfer" />
        </CardContent>
      </Card>
    </section>
  );
}
