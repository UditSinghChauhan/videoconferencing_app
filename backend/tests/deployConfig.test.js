import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Guards the deploy failure after PR #1: an unbounded engines range let the
// host jump to the newest Node major, and a test-only dependency downloaded
// a 122 MB MongoDB binary during every production install.
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

test("engines.node pins a single major so the host cannot drift to a new release", () => {
    assert.match(pkg.engines?.node ?? "", /^\d+\.x$/);
});

test("the MongoDB test binary is not downloaded during npm install", () => {
    assert.equal(pkg.config?.mongodbMemoryServer?.disablePostinstall, "1");
});

test("production dependencies need no install scripts or native builds", () => {
    const withScripts = Object.entries(lock.packages)
        .filter(([path, meta]) => path && meta.hasInstallScript && !meta.dev)
        .map(([path]) => path);

    assert.deepEqual(withScripts, []);
});
