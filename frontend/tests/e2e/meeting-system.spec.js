const { test, expect, request: playwrightRequest } = require("@playwright/test");
const AUTH_TIMEOUT = 20000;

function randomId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function mockMedia(context) {
  await context.addInitScript(() => {
    const createVideoTrack = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const drawing = canvas.getContext("2d");
      drawing.fillStyle = "#020617";
      drawing.fillRect(0, 0, canvas.width, canvas.height);
      drawing.fillStyle = "#fb923c";
      drawing.fillRect(40, 40, 180, 90);
      drawing.fillStyle = "#38bdf8";
      drawing.fillRect(260, 120, 240, 120);
      const stream = canvas.captureStream(12);
      return stream.getVideoTracks()[0];
    };

    const createAudioTrack = () => {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextCtor();
      const oscillator = audioContext.createOscillator();
      const destination = oscillator.connect(audioContext.createMediaStreamDestination());
      oscillator.start();
      const [track] = destination.stream.getAudioTracks();
      track.enabled = false;
      return track;
    };

    const createMockStream = () => new MediaStream([createVideoTrack(), createAudioTrack()]);

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => createMockStream(),
        getDisplayMedia: async () => createMockStream(),
        enumerateDevices: async () => [
          { deviceId: "cam-1", kind: "videoinput", label: "Mock Camera" },
          { deviceId: "mic-1", kind: "audioinput", label: "Mock Microphone" }
        ]
      }
    });

    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function play() {
      return originalPlay ? originalPlay.call(this).catch(() => Promise.resolve()) : Promise.resolve();
    };
  });
}

function monitorConsole(page, collector) {
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      collector.push(`console:${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    collector.push(`pageerror:${error.message}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      collector.push(`response:${response.status()}:${response.url()}`);
    }
  });
}

async function registerAndLogin(page, { name, username, password }) {
  await page.goto("/auth");
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Create Account" }).click();
  await expect(page.getByLabel("Your name")).toHaveCount(0, { timeout: AUTH_TIMEOUT });
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: AUTH_TIMEOUT });
}

async function loginOnly(page, { username, password }) {
  await page.goto("/auth");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: AUTH_TIMEOUT });
}

async function goToMeetingLobby(page, meetingId) {
  await page.getByLabel("Meeting Code").fill(meetingId);
  await page.getByRole("button", { name: "Join Room" }).click();
  await expect(page).toHaveURL(new RegExp(`/room/${meetingId}$`), { timeout: AUTH_TIMEOUT });
  await expect(page.getByTestId("join-meeting-button")).toBeVisible();
}

async function joinMeetingFromLobby(page) {
  await page.getByTestId("join-meeting-button").click();
  await expect(page.getByTestId("participant-roster")).toBeVisible({ timeout: AUTH_TIMEOUT });
}

async function openChat(page) {
  await page.getByLabel("Open chat").click();
  await expect(page.getByRole("heading", { name: "Team Chat" })).toBeVisible();
}

async function sendChatMessage(page, message) {
  await page.getByLabel("Message").fill(message);
  await page.getByRole("button", { name: "Send" }).click();
}

async function extractToken(page) {
  return page.evaluate(() => window.localStorage.getItem("token"));
}

async function createApiContext(token, forwardedFor) {
  return playwrightRequest.newContext({
    baseURL: "http://127.0.0.1:8100",
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      "X-Forwarded-For": forwardedFor
    }
  });
}

test.describe.serial("Bridge meeting system", () => {
  test("covers auth, meetings, realtime, role restrictions, summaries, and 403 access", async ({ browser }) => {
    const meetingId = randomId("pw-room");
    const privateMeetingId = randomId("pw-private");
    const password = "Playwright@123";
    const userA = {
      name: "Playwright Host",
      username: randomId("host"),
      password
    };
    const userB = {
      name: "Playwright Guest",
      username: randomId("guest"),
      password
    };
    const ipA = `203.0.113.${Math.floor(Math.random() * 70) + 20}`;
    const ipB = `203.0.113.${Math.floor(Math.random() * 70) + 120}`;

    const contextA = await browser.newContext({
      baseURL: "http://127.0.0.1:3100"
    });
    const contextB = await browser.newContext({
      baseURL: "http://127.0.0.1:3100"
    });
    await mockMedia(contextA);
    await mockMedia(contextB);

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const consoleIssues = [];
    monitorConsole(pageA, consoleIssues);
    monitorConsole(pageB, consoleIssues);

    const bootstrapApi = await playwrightRequest.newContext({
      baseURL: "http://127.0.0.1:8100",
      extraHTTPHeaders: { "X-Forwarded-For": ipB }
    });

    await registerAndLogin(pageA, userA);
    const registerB = await bootstrapApi.post("/api/v1/users/register", { data: userB });
    expect(registerB.status()).toBe(201);
    await loginOnly(pageB, userB);

    await pageA.reload();
    await expect(pageA).toHaveURL(/\/home$/);
    await expect(pageA.getByRole("heading", { name: "Start a professional meeting in seconds." })).toBeVisible();

    await goToMeetingLobby(pageA, meetingId);
    await joinMeetingFromLobby(pageA);
    await goToMeetingLobby(pageB, meetingId);
    await joinMeetingFromLobby(pageB);

    await expect(pageA.getByTestId("participant-roster")).toContainText(userA.username);
    await expect(pageA.getByTestId("participant-roster")).toContainText(userB.username);
    await expect(pageB.getByTestId("participant-roster")).toContainText(userA.username);
    await expect(pageB.getByTestId("participant-roster")).toContainText(userB.username);

    await openChat(pageA);
    await openChat(pageB);
    await sendChatMessage(pageA, "Hello from browser A");
    await expect(pageB.getByText("Hello from browser A")).toBeVisible({ timeout: AUTH_TIMEOUT });
    await sendChatMessage(pageB, "Reply from browser B");
    await expect(pageA.getByText("Reply from browser B")).toBeVisible({ timeout: AUTH_TIMEOUT });
    await pageA.getByRole("button", { name: "Close" }).click();
    await pageB.getByRole("button", { name: "Close" }).click();

    await pageB.getByLabel("Leave meeting").click();
    await expect(pageB).toHaveURL(/\/home$/, { timeout: AUTH_TIMEOUT });
    await expect(pageA.getByTestId("participant-roster")).not.toContainText(userB.username, { timeout: AUTH_TIMEOUT });

    await goToMeetingLobby(pageB, meetingId);
    await joinMeetingFromLobby(pageB);
    await expect(pageA.getByTestId("participant-roster")).toContainText(userB.username, { timeout: AUTH_TIMEOUT });
    await expect(pageA.getByTestId("roster-name")).toHaveCount(2);

    const tokenB = await extractToken(pageB);
    const apiB = await createApiContext(tokenB, ipB);
    const forbiddenEnd = await apiB.post(`/api/v1/meetings/${meetingId}/end`);
    expect(forbiddenEnd.status()).toBe(403);
    const tokenA = await extractToken(pageA);
    const apiA = await createApiContext(tokenA, ipA);
    const meA = await apiA.get("/api/v1/users/me");
    const meAJson = await meA.json();
    const hostId = meAJson.data.user.id;
    const forbiddenRemove = await apiB.post(`/api/v1/meetings/${meetingId}/remove-participant`, {
      data: { participantUserId: hostId }
    });
    expect(forbiddenRemove.status()).toBe(403);

    const removeButton = pageA.locator('[data-testid="participant-roster"] button', { hasText: "Remove" }).first();
    await expect(removeButton).toBeVisible();
    await removeButton.click();
    await expect(pageB).toHaveURL(/\/home$/, { timeout: AUTH_TIMEOUT });

    await goToMeetingLobby(pageB, meetingId);
    await joinMeetingFromLobby(pageB);
    await expect(pageA.getByTestId("participant-roster")).toContainText(userB.username, { timeout: AUTH_TIMEOUT });

    await pageA.getByLabel("End meeting").click();
    await expect(pageA).toHaveURL(new RegExp(`/history\\?summary=${meetingId}`), { timeout: AUTH_TIMEOUT });
    await expect(pageB).toHaveURL(new RegExp(`/history\\?summary=${meetingId}`), { timeout: AUTH_TIMEOUT });

    for (const heading of ["Key Points", "Highlights", "Participants", "Keywords", "Conclusion"]) {
      await expect(pageA.getByText(heading)).toBeVisible();
    }

    await pageA.reload();
    await expect(pageA).toHaveURL(new RegExp(`/history\\?summary=${meetingId}`), { timeout: AUTH_TIMEOUT });
    await expect(pageA.getByText("Conclusion")).toBeVisible();

    const createPrivate = await apiA.post("/api/v1/meetings", { data: { meetingId: privateMeetingId } });
    expect(createPrivate.status()).toBe(201);
    const endPrivate = await apiA.post(`/api/v1/meetings/${privateMeetingId}/end`);
    expect(endPrivate.status()).toBe(200);
    const forbiddenSummary = await apiB.get(`/api/v1/meetings/${privateMeetingId}/summary`);
    expect(forbiddenSummary.status()).toBe(403);

    expect(consoleIssues, `Browser console issues:\n${consoleIssues.join("\n")}`).toEqual([]);

    await apiA.dispose();
    await apiB.dispose();
    await bootstrapApi.dispose();
    await contextA.close();
    await contextB.close();
  });
});
