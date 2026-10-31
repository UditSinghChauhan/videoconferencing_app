import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
    { name: "landing", path: "/" },
    { name: "sign in", path: "/auth" },
    { name: "sign up", path: "/auth?mode=signup" },
    { name: "demo lobby", path: "/demo" },
    { name: "not found", path: "/does-not-exist" }
];

for (const { name, path } of PAGES) {
    test(`${name} has no WCAG 2.1 AA violations`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
}

test("demo room has no WCAG 2.1 AA violations", async ({ page }) => {
    await page.goto("/demo");
    await page.getByTestId("join-meeting-button").click();
    await expect(page.getByTestId("video-tile")).toHaveCount(4);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("the sign-in form works with the keyboard alone", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByLabel("Username")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Show" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password", { exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Enter your username.")).toBeVisible();
});
