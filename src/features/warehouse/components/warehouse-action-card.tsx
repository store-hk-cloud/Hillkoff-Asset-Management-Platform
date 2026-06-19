import type { ReactNode } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

type WarehouseActionCardProps = Readonly<{
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}>;

export function WarehouseActionCard({
  href,
  title,
  description,
  icon,
}: WarehouseActionCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:bg-accent/40 h-full transition-colors">
        <CardContent className="flex items-start gap-4">
          <div className="bg-primary text-primary-foreground rounded-lg p-3">
            {icon}
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
