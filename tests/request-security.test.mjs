import test from "node:test";
import assert from "node:assert/strict";

import {
  isTrustedWriteOrigin,
  safeErrorMetadata,
  selectClientNetworkAddress,
} from "../src/lib/server/request-security.ts";

test("write origins ignore spoofable forwarded host headers", () => {
  const request = new Request("https://app.example/api/reports", {
    headers: {
      origin: "https://evil.example",
      "sec-fetch-site": "same-origin",
      "x-forwarded-host": "evil.example",
    },
  });

  assert.equal(isTrustedWriteOrigin(request, undefined), false);
});

test("configured browser origin supports a trusted reverse proxy", () => {
  const request = new Request("http://internal:3000/api/reports", {
    headers: {
      origin: "https://reports.example",
      "sec-fetch-site": "same-origin",
    },
  });

  assert.equal(
    isTrustedWriteOrigin(request, "https://reports.example/path"),
    true,
  );
});

test("client addresses fail closed unless supplied by a trusted source", () => {
  const spoofed = new Request("https://app.example/api/reports", {
    headers: { "x-forwarded-for": "203.0.113.10" },
  });
  assert.equal(selectClientNetworkAddress(spoofed, undefined, undefined), null);

  const trusted = new Request("https://app.example/api/reports", {
    headers: { "x-real-ip": "2001:db8::1, 203.0.113.10" },
  });
  assert.equal(
    selectClientNetworkAddress(trusted, undefined, "x-real-ip"),
    "2001:db8::1",
  );
  assert.equal(
    selectClientNetworkAddress(trusted, "198.51.100.4", "x-real-ip"),
    "198.51.100.4",
  );
});

test("malformed network addresses are rejected", () => {
  const request = new Request("https://app.example/api/reports", {
    headers: { "x-real-ip": "not-an-ip" },
  });
  assert.equal(
    selectClientNetworkAddress(request, undefined, "x-real-ip"),
    null,
  );
});

test("error logging metadata excludes confidential database details", () => {
  const error = Object.assign(
    new Error("Failing row contains confidential report text"),
    {
      code: "23514",
      details: "private allegation",
      hint: "private identifier",
    },
  );
  const metadata = safeErrorMetadata(error);

  assert.deepEqual(metadata, { errorName: "Error", code: "23514" });
  assert.equal(JSON.stringify(metadata).includes("confidential"), false);
  assert.equal(JSON.stringify(metadata).includes("private"), false);
});
