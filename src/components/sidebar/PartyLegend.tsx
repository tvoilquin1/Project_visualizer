import { cn } from "@/lib/utils";

interface PartyLegendProps {
  parties: { id: string; name: string; color: string }[];
}

export function PartyLegend({ parties }: PartyLegendProps) {
  if (!parties || parties.length === 0) return null;

  return (
    <div className="space-y-1.5 px-3 py-2">
      <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Parties
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {parties.map((party) => (
          <span
            key={party.id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: party.color + "20",
              color: party.color,
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: party.color }}
            />
            {party.name}
          </span>
        ))}
      </div>
    </div>
  );
}
