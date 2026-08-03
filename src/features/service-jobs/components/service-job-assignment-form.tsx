"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function ServiceJobAssignmentForm({
  jobId,
  technicians,
}: {
  jobId: string;
  technicians: readonly { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [lead, setLead] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected.length === 0 || !lead) return;
      }}
    >
      <fieldset className="grid gap-2">
        <legend className="font-medium">Technicians</legend>
        {technicians.map((technician) => (
          <label
            className="flex items-center gap-2 text-sm"
            key={technician.id}
          >
            <input
              checked={selected.includes(technician.id)}
              onChange={(event) =>
                setSelected((current) =>
                  event.target.checked
                    ? [...current, technician.id]
                    : current.filter((id) => id !== technician.id),
                )
              }
              type="checkbox"
            />
            {technician.name}
          </label>
        ))}
      </fieldset>
      <label className="grid gap-2 text-sm">
        Lead technician
        <select
          className="input"
          value={lead}
          onChange={(event) => setLead(event.target.value)}
        >
          <option value="">Select lead</option>
          {technicians
            .filter((item) => selected.includes(item.id))
            .map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
        </select>
      </label>
      <Button disabled={!lead || selected.length === 0} type="submit">
        Assign team
      </Button>
      <input name="jobId" type="hidden" value={jobId} />
    </form>
  );
}
