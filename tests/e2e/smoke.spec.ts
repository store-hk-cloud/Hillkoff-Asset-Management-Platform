import { expect, test } from "@playwright/test";

test.describe("enterprise smoke checks", () => {
  test("health endpoint is available and correlated", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.ok()).toBe(true);
    expect(response.headers()["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/i);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
    });
  });

  test("protected service workspace redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/service-jobs");

    await expect(page).toHaveURL(/\/login\?next=%2Fservice-jobs$/);
  });

  test("protected technician workspace redirects unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/technician");

    await expect(page).toHaveURL(/\/login\?next=%2Ftechnician$/);
  });
});
