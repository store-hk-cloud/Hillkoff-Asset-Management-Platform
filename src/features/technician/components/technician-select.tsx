"use client";

import { useEffect, useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import type { TechnicianSummary } from "@/domain/entities/technician-work";
import { listTechnicians } from "@/features/technician/services/technician-api.service";

type Props = Readonly<{
  id?: string;
  name?: string;
  required?: boolean;
  defaultValue?: string;
  onTechnicianChange?: (technician: TechnicianSummary | null) => void;
}>;

export function TechnicianSelect({
  id = "assignedTechnicianId",
  name = "assignedTechnicianId",
  required = true,
  defaultValue = "",
  onTechnicianChange,
}: Props) {
  const { locale } = useLanguage();
  const [technicians, setTechnicians] = useState<readonly TechnicianSummary[]>(
    [],
  );
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listTechnicians()
      .then((items) => {
        if (active) setTechnicians(items);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load technicians.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <select
        className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
        id={id}
        name={name}
        onChange={(event) => {
          const next = event.currentTarget.value;
          setValue(next);
          onTechnicianChange?.(
            technicians.find((technician) => technician.id === next) ?? null,
          );
        }}
        required={required}
        value={value}
      >
        <option value="">
          {locale === "th" ? "เลือกช่าง" : "Select technician"}
        </option>
        {technicians.map((technician) => (
          <option key={technician.id} value={technician.id}>
            {technician.displayName} · {technician.email}
          </option>
        ))}
      </select>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </>
  );
}
