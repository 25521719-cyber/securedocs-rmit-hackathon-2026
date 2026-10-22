import { expect, test } from "@playwright/test";

test("document create, edit, view, request, grant, revoke, and delete", async ({ page }) => {
  const title = "E2E sample document";
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Permission story, made visible" })).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByRole("button", { name: "New document" }).first().click();
  await page.getByRole("button", { name: "Save document" }).click();
  await expect(page.locator(".error-message")).toContainText("Add a document title and content");
  await page.getByRole("textbox", { name: "Document title" }).fill(title);
  await page.getByRole("textbox", { name: "Document content" }).fill("Public browser test content");
  await page.getByRole("button", { name: "Save document" }).click();
  await expect(page.getByRole("button", { name: `View ${title}` })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: `View ${title}` })).toBeVisible();

  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await page.getByRole("textbox", { name: "Document content" }).fill("Edited public browser test content");
  await page.getByRole("button", { name: "Save document" }).click();
  await page.getByRole("button", { name: `View ${title}` }).click();
  await expect(page.getByRole("complementary", { name: "Document preview" }).getByText("Edited public browser test content")).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).last().click();

  await page.getByRole("button", { name: /Collaborator$/ }).click();
  await page.getByRole("button", { name: `View ${title}` }).click();
  const preview = page.getByRole("complementary", { name: "Document preview" });
  await expect(preview.getByText("Content not available")).toBeVisible();
  await preview.getByRole("button", { name: "Request access" }).click();
  await expect(preview.getByRole("button", { name: "Request pending" })).toBeDisabled();
  await page.getByRole("button", { name: "Close panel" }).last().click();

  await page.getByRole("button", { name: /Owner$/ }).click();
  await page.getByRole("button", { name: `Share ${title}` }).click();
  await page.getByRole("complementary", { name: "Sharing settings" }).getByRole("button", { name: "Approve access" }).click();
  await expect(page.getByText("Access granted")).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).last().click();

  await page.getByRole("button", { name: /Collaborator$/ }).click();
  await page.getByRole("button", { name: `View ${title}` }).click();
  await expect(preview.getByText("Edited public browser test content")).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).last().click();

  await page.getByRole("button", { name: /Owner$/ }).click();
  await page.getByRole("button", { name: `Share ${title}` }).click();
  await page.getByRole("complementary", { name: "Sharing settings" }).getByRole("button", { name: "Revoke access" }).click();
  await page.getByRole("button", { name: "Close panel" }).last().click();
  await page.getByRole("button", { name: /Collaborator$/ }).click();
  await page.getByRole("button", { name: `View ${title}` }).click();
  await expect(preview.getByText("Content not available")).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).last().click();

  await page.getByRole("button", { name: /Owner$/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(page.getByRole("button", { name: `View ${title}` })).toHaveCount(0);
});

test("five-step presenter flow ends with administrator content denied", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByText("Privacy Research Brief")).toBeVisible();
  const longRow = page.locator(".document-row").filter({ hasText: "Tide UNLOCKED Challenge Notes" });
  const titleBox = await longRow.locator(".doc-identity strong").boundingBox();
  const ownerBox = await longRow.locator(".owner-cell").boundingBox();
  expect(titleBox && ownerBox && titleBox.x + titleBox.width <= ownerBox.x).toBeTruthy();
  await page.screenshot({ path: "test-results/shared-with-me.png", fullPage: true });
  for (let step = 1; step <= 4; step++) {
    await page.getByRole("button", { name: "Run next step" }).click();
    await expect(page.getByText(`STEP ${step + 1} OF 5`)).toBeVisible();
  }
  const preview = page.getByRole("complementary", { name: "Document preview" });
  await expect(preview.getByText(/This document is used to show explicit access decisions/)).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).last().click();
  await page.getByRole("button", { name: "Show denial" }).click();
  await expect(page.getByRole("button", { name: /Administrator$/ })).toHaveClass(/selected/);
  await expect(preview.getByText("Content not available")).toBeVisible();
  await expect(preview.getByText(/This document is used to show explicit access decisions/)).toHaveCount(0);
});

test("search, access filter, and integration readiness navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "View Privacy Research Brief" })).toBeVisible();
  await page.getByPlaceholder("Search documents").fill("Privacy");
  await expect(page.getByRole("button", { name: "View Privacy Research Brief" })).toBeVisible();
  await expect(page.getByRole("button", { name: "View Tide UNLOCKED Challenge Notes" })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Filter access" }).selectOption("owner");
  await expect(page.getByRole("button", { name: "View Privacy Research Brief" })).toBeVisible();
  await page.getByRole("button", { name: "View integration readiness" }).click();
  await expect(page.getByRole("heading", { name: "Integration readiness" })).toBeVisible();
  await expect(page.getByText("Ready for a real integration, not pretending to have one.")).toBeVisible();
});
