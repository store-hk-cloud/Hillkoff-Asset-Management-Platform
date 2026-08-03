import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HelpManual } from "@/features/help/components/help-manual";
import { helpGuides } from "@/features/help/help-content";
import { requireSession } from "@/lib/auth/dal";
import { getServerTranslator } from "@/lib/i18n/server";

type HelpSectionPageProps = Readonly<{
  params: Promise<{ section: string }>;
}>;

export const dynamicParams = false;

export function generateStaticParams() {
  return helpGuides.map((guide) => ({ section: guide.id }));
}

export async function generateMetadata({
  params,
}: HelpSectionPageProps): Promise<Metadata> {
  const { section } = await params;
  const guide = helpGuides.find((item) => item.id === section);

  return guide
    ? { title: `${guide.title.en} | Hillkoff User Guide` }
    : { title: "User Guide | Hillkoff Machine Management" };
}

export default async function HelpSectionPage({
  params,
}: HelpSectionPageProps) {
  const { section } = await params;
  const { profile } = await requireSession();
  const guide = helpGuides.find((item) => item.id === section);

  if (
    !guide ||
    (!guide.roles.includes("all") && !guide.roles.includes(profile.role))
  ) {
    notFound();
  }

  const { locale } = await getServerTranslator();
  const visibleGuides = helpGuides.filter(
    (item) => item.roles.includes("all") || item.roles.includes(profile.role),
  );
  const index = visibleGuides.findIndex((item) => item.id === guide.id);

  const previousGuide = visibleGuides[index - 1];
  const nextGuide = visibleGuides[index + 1];

  return (
    <HelpManual
      {...(nextGuide ? { nextGuide } : {})}
      {...(previousGuide ? { previousGuide } : {})}
      guide={guide}
      locale={locale}
    />
  );
}
