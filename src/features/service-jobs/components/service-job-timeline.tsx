export function ServiceJobTimeline({
  events,
}: {
  events: readonly { label: string; at: string; actor: string }[];
}) {
  return (
    <ol className="space-y-3 border-l pl-4">
      {events.map((event) => (
        <li key={`${event.at}-${event.label}`}>
          <p className="font-medium">{event.label}</p>
          <p className="text-muted-foreground text-xs">
            {event.actor} • {event.at}
          </p>
        </li>
      ))}
    </ol>
  );
}
