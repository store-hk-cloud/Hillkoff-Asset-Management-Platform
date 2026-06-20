"use client";

import { useLanguage } from "@/components/providers/language-provider";
import type { AssetEvent } from "@/domain/entities/asset-event";

type AssetEventListProps = Readonly<{
  events: readonly AssetEvent[];
  emptyMessage: string;
}>;

export function AssetEventList({ events, emptyMessage }: AssetEventListProps) {
  const { locale } = useLanguage();
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "th" ? "th-TH" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    },
  );

  if (events.length === 0) {
    return (
      <div className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {events.map((event) => (
        <li className="relative border-l pl-5" key={event.id}>
          <span className="bg-primary absolute top-1.5 -left-1.5 size-3 rounded-full" />
          <div className="bg-card rounded-lg border p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">{event.title}</p>
              <time className="text-muted-foreground text-xs">
                {dateFormatter.format(event.occurredAt)}
              </time>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {event.description}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              {locale === "th" ? "โดย" : "By"} {event.actorDisplayName} ·{" "}
              {event.actorRole}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
