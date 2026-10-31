import { expect, test } from "@playwright/test";

const PASSWORD = "Passw0rd!";
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function collectErrors(page, sink) {
    page.on("pageerror", (error) => sink.push(`pageerror: ${error.message}`));
    page.on("response", (response) => {
        if (response.status() >= 500) sink.push(`${response.status()} ${response.url()}`);
    });
}

async function signUp(browser, name) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const username = `${name.split(" ")[0].toLowerCase()}_${uid()}`;

    await page.goto("/auth?mode=signup");
    await page.getByLabel("Your name").fill(name);
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/home$/);

    return { context, page, name, username };
}

const tiles = (page) => page.getByTestId("video-tile");

test.describe("Bridge meeting lifecycle", () => {
    test("two people meet, chat, mute, leave, get removed, and the host ends with a recap", async ({ browser }) => {
        const errors = [];
        const host = await signUp(browser, "Hannah Host");
        const guest = await signUp(browser, "Gabe Guest");
        collectErrors(host.page, errors);
        collectErrors(guest.page, errors);

        // Host starts a meeting with a generated code.
        await host.page.getByTestId("new-meeting-button").click();
        await expect(host.page).toHaveURL(/\/room\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
        const meetingId = host.page.url().split("/room/")[1];
        await expect(host.page.getByRole("heading", { name: "Your meeting is ready" })).toBeVisible();
        await host.page.getByTestId("join-meeting-button").click();
        await expect(tiles(host.page)).toHaveCount(1);

        // Guest joins by pasting the full invite link.
        await guest.page.getByTestId("meeting-code-input").fill(`http://127.0.0.1:3100/room/${meetingId}`);
        await guest.page.getByRole("button", { name: "Join", exact: true }).click();
        await expect(guest.page.getByRole("heading", { name: "Ready to join?" })).toBeVisible();
        await guest.page.getByTestId("join-meeting-button").click();

        await expect(tiles(host.page)).toHaveCount(2);
        await expect(tiles(guest.page)).toHaveCount(2);

        // Media actually flows peer to peer.
        await expect.poll(() => host.page.evaluate(() =>
            [...document.querySelectorAll("video")].filter((video) => video.videoWidth > 0).length
        )).toBeGreaterThanOrEqual(2);

        // Roster shows display names.
        await host.page.getByRole("button", { name: /People/ }).click();
        const roster = host.page.getByTestId("participant-roster");
        await expect(roster).toContainText("Hannah Host");
        await expect(roster).toContainText("Gabe Guest");

        // Chat both ways.
        await guest.page.getByRole("button", { name: "Chat" }).click();
        await guest.page.getByLabel("Message everyone").fill("Ship the release Thursday, I will follow up with QA.");
        await guest.page.keyboard.press("Enter");
        await host.page.getByRole("button", { name: "Chat" }).click();
        await expect(host.page.getByTestId("chat-log")).toContainText("Ship the release Thursday");
        await host.page.getByLabel("Message everyone").fill("Deadline Thursday, Gabe owns the QA follow up.");
        await host.page.keyboard.press("Enter");
        await expect(guest.page.getByTestId("chat-log")).toContainText("Gabe owns the QA follow up");

        // Mute is visible to others.
        await guest.page.getByRole("button", { name: "Turn off microphone" }).click();
        await expect(host.page.getByRole("figure", { name: "Gabe Guest, muted" })).toBeVisible();

        // Guest leaves, then rejoins.
        await guest.page.getByTestId("leave-button").click();
        await expect(guest.page.getByRole("heading", { name: "You left the meeting" })).toBeVisible();
        await expect(tiles(host.page)).toHaveCount(1);
        await guest.page.getByRole("button", { name: "Rejoin" }).click();
        await guest.page.getByTestId("join-meeting-button").click();
        await expect(tiles(host.page)).toHaveCount(2);

        // Only the host can remove people.
        await host.page.getByRole("button", { name: /People/ }).click();
        await host.page.getByRole("button", { name: "Remove Gabe Guest from the call" }).click();
        await expect(guest.page.getByRole("heading", { name: "You were removed from this meeting" })).toBeVisible();
        await expect(tiles(host.page)).toHaveCount(1);

        // Host ends the meeting and lands on the recap.
        await host.page.getByTestId("leave-button").click();
        await host.page.getByTestId("confirm-end-meeting").click();
        await expect(host.page).toHaveURL(new RegExp(`/meetings/${meetingId}$`));
        await expect(host.page.getByRole("heading", { name: "Meeting recap" })).toBeVisible();
        await expect(host.page.getByRole("heading", { name: "Key points" })).toBeVisible();
        await expect(host.page.getByText("Ship the release Thursday", { exact: false }).first()).toBeVisible();
        await expect(host.page.getByText(/Chat transcript · 2 messages/)).toBeVisible();

        // Both see it in history; the guest can open the recap too.
        await guest.page.goto("/history");
        await guest.page.getByRole("link", { name: meetingId }).click();
        await expect(guest.page.getByRole("heading", { name: "Meeting recap" })).toBeVisible();

        // The room link now explains the meeting is over.
        await guest.page.goto(`/room/${meetingId}`);
        await expect(guest.page.getByRole("heading", { name: "This meeting has ended" })).toBeVisible();

        expect(errors).toEqual([]);
        await host.context.close();
        await guest.context.close();
    });

    test("people outside a meeting cannot read its recap, and unknown codes are explained", async ({ browser }) => {
        const host = await signUp(browser, "Olivia Owner");
        await host.page.getByTestId("new-meeting-button").click();
        await expect(host.page).toHaveURL(/\/room\//);
        const meetingId = host.page.url().split("/room/")[1];
        await host.page.getByTestId("join-meeting-button").click();
        await host.page.getByTestId("leave-button").click();
        await host.page.getByTestId("confirm-end-meeting").click();
        await expect(host.page.getByRole("heading", { name: "Meeting recap" })).toBeVisible();

        const outsider = await signUp(browser, "Oscar Outsider");
        await outsider.page.goto(`/meetings/${meetingId}`);
        await expect(outsider.page.getByRole("heading", { name: "Recap not available" })).toBeVisible();

        await outsider.page.goto("/room/zzz-zzzz-zzz");
        await expect(outsider.page.getByRole("heading", { name: "No meeting with that code" })).toBeVisible();

        await host.context.close();
        await outsider.context.close();
    });

    test("protected pages send visitors to sign in with a return path and validate input", async ({ page }) => {
        await page.goto("/history");
        await expect(page).toHaveURL(/\/auth\?next=%2Fhistory$/);
        await page.getByRole("button", { name: "Sign in" }).click();
        await expect(page.getByText("Enter your username.")).toBeVisible();
        await expect(page.getByText("Enter your password.")).toBeVisible();
    });

    test("the public demo works without an account", async ({ page }) => {
        await page.goto("/demo");
        await page.getByTestId("join-meeting-button").click();
        await expect(tiles(page)).toHaveCount(4);
        await page.getByRole("button", { name: "Chat" }).click();
        await page.getByLabel("Message everyone").fill("Hello team");
        await page.keyboard.press("Enter");
        await expect(page.getByTestId("chat-log")).toContainText("Hello team");
        await page.getByTestId("leave-button").click();
        await page.getByTestId("confirm-end-meeting").click();
        await expect(page.getByRole("heading", { name: "That's the demo" })).toBeVisible();
    });
});
