import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageProvider } from "@/components/providers/language-provider";
import { USER_ROLES } from "@/domain/value-objects/user-role";
import { HelpCenter } from "@/features/help/components/help-center";
import { HelpManual } from "@/features/help/components/help-manual";
import { helpCategoryOrder, helpGuides } from "@/features/help/help-content";

describe("in-app help content", () => {
  it("covers every help category with actionable content", () => {
    const categories = new Set(helpGuides.map((guide) => guide.category));

    expect(helpGuides.length).toBeGreaterThanOrEqual(9);
    expect(
      helpCategoryOrder.every((category) => categories.has(category)),
    ).toBe(true);
    expect(new Set(helpGuides.map((guide) => guide.id)).size).toBe(
      helpGuides.length,
    );
  });

  it("keeps every guide usable by at least one role", () => {
    for (const guide of helpGuides) {
      expect(guide.steps.length).toBeGreaterThanOrEqual(3);
      expect(guide.checklist.length).toBeGreaterThanOrEqual(3);
      expect(guide.cautions.length).toBeGreaterThanOrEqual(1);
      expect(
        guide.roles.every(
          (role) => role === "all" || USER_ROLES.includes(role),
        ),
      ).toBe(true);
      expect(
        guide.steps
          .filter((step) => step.href)
          .every((step) => step.href?.startsWith("/")),
      ).toBe(true);
    }
  });

  it("renders the guide center with role-aware content and navigation", () => {
    const markup = renderToStaticMarkup(
      createElement(
        LanguageProvider as ComponentType<{ locale: "en" }>,
        { locale: "en" },
        createElement(HelpCenter, { role: "admin" }),
      ),
    );

    expect(markup).toContain('data-help-center="true"');
    expect(markup).toContain("In-app user guide");
    expect(markup).toContain("Standard operating flow");
    expect(markup).toContain("Users, roles, and access control");
    expect(markup).toContain("/profile");
    expect(markup).toContain("/help/start-here");
  });

  it("renders a dedicated manual page with procedure and controls", () => {
    const guide = helpGuides.find((item) => item.id === "service-lifecycle");
    if (!guide) throw new Error("Expected service lifecycle guide.");

    const markup = renderToStaticMarkup(
      createElement(HelpManual, { guide, locale: "en" }),
    );

    expect(markup).toContain('data-help-manual="service-lifecycle"');
    expect(markup).toContain("Standard operating procedure");
    expect(markup).toContain("Handoff checklist");
    expect(markup).toContain("/service-jobs/new");
  });
});
