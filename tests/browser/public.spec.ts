import { test, expect } from "@playwright/test";

test("example opens evidence and exports without any analysis request", async ({
  page,
}) => {
  const errors: string[] = [];
  const calls: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("/api/analyze")) calls.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Create conversation brief" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Explore an example" }).click();
  await expect(
    page.getByRole("heading", { name: "Renewable energy presentation" }),
  ).toBeVisible();
  const evidence = page
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "View source" }) })
    .first();
  await evidence.locator("summary").click();
  await expect(evidence.locator("blockquote").first()).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export brief" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "threadmark-example.md",
  );
  await page.getByRole("button", { name: "New analysis" }).click();
  await expect(page.getByRole("textbox")).toHaveValue("");
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});

test("public policy and account pages are accessible without login", async ({
  page,
}) => {
  for (const [path, title] of [
    ["/privacy", "Privacy Notice"],
    ["/terms", "Terms of Use"],
    ["/account", "Account & deletion"],
    ["/accessibility", "Accessibility"],
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to Threadmark" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("imported markup remains text and oversize input cannot analyse", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Import a text file")
    .setInputFiles({
      name: "example.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Customer: <img src=x onerror=alert(1)> Please send a fictional invoice.",
      ),
    });
  await expect(page.getByRole("textbox")).toHaveValue(/<img src=x/);
  expect(await page.locator("img[src=x]").count()).toBe(0);
  await page.getByRole("textbox").fill("x".repeat(20001));
  await expect(
    page.getByRole("button", { name: "Create conversation brief" }),
  ).toBeDisabled();
});

test("closed endpoint and environment paths do not expose secrets", async ({
  request,
}) => {
  const response = await request.post("/api/analyze", {
    data: { conversation: "A fictional conversation for testing" },
  });
  expect(response.status()).toBe(503);
  expect(response.headers()["cache-control"]).toBe("no-store");
  for (const path of ["/.env.local", "/.git/config"]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  const page = await request.get("/");
  expect(page.headers()["x-content-type-options"]).toBe("nosniff");
  expect(page.headers()["x-frame-options"]).toBe("DENY");
});
