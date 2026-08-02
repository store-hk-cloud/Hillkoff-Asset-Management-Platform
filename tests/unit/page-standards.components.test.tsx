import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Package } from "lucide-react";
import Link from "next/link";
import { z } from "zod";

import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { getFieldErrors } from "@/lib/validation/field-errors";

describe("Enterprise page standard components", () => {
  it("renders a complete page header with an optional primary action", () => {
    const markup = renderToStaticMarkup(
      <PageHeader
        action={<Link href="/assets/new">Add machine</Link>}
        description="Manage machines and their current status."
        eyebrow="Asset management"
        title="Machines"
      />,
    );

    expect(markup).toContain("Asset management");
    expect(markup).toContain("Machines");
    expect(markup).toContain("Manage machines and their current status.");
    expect(markup).toContain("Add machine");
    expect(markup).toContain("sm:items-end");
  });

  it("renders an accessible icon and message for an empty state", () => {
    const markup = renderToStaticMarkup(
      <EmptyState icon={Package} message="No machines found." />,
    );

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("border-dashed");
    expect(markup).toContain("No machines found.");
  });

  it("renders required-field metadata and an inline error", () => {
    const markup = renderToStaticMarkup(
      <FormField
        error="Machine code is required."
        htmlFor="assetCode"
        label="Machine code"
        required
      >
        <Input id="assetCode" name="assetCode" />
      </FormField>,
    );

    expect(markup).toContain("Machine code");
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain("Machine code is required.");
    expect(markup).toContain("text-destructive");
  });

  it("maps the first Zod issue for each field to an inline error", () => {
    const result = z
      .object({
        assetCode: z.string().min(1, "Machine code is required."),
        name: z.string().min(1, "Machine name is required."),
      })
      .safeParse({ assetCode: "", name: "" });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(getFieldErrors(result.error)).toEqual({
      assetCode: "Machine code is required.",
      name: "Machine name is required.",
    });
  });
});
