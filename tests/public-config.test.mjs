import test from "node:test";
import assert from "node:assert/strict";

import { optionalHttpsUrl } from "../src/lib/public-config.ts";

test("optional public links accept only HTTPS URLs", () => {
  assert.equal(optionalHttpsUrl("https://example.com/help"), "https://example.com/help");
  assert.equal(optionalHttpsUrl("http://example.com/help"), "");
  assert.equal(optionalHttpsUrl("javascript:alert(1)"), "");
  assert.equal(optionalHttpsUrl("not a url"), "");
  assert.equal(optionalHttpsUrl(undefined), "");
});
