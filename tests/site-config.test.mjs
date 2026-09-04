import test from "node:test";
import assert from "node:assert/strict";

import { configuredSiteOrigin } from "../src/lib/site-config.ts";

test("site origin defaults locally and strips paths", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(configuredSiteOrigin(), "http://localhost:3000");
    process.env.NEXT_PUBLIC_SITE_URL = "https://reports.example/path";
    assert.equal(configuredSiteOrigin(), "https://reports.example");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});

test("site origin rejects non-web schemes", () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "javascript:alert(1)";
    assert.throws(() => configuredSiteOrigin(), /http or https/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});
