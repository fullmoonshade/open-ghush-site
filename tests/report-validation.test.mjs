import test from "node:test";
import assert from "node:assert/strict";

import {
  containsDisallowedIdentifyingInformation,
  validateConfirmationSubmission,
  validateReportSubmission,
} from "../src/lib/report-model.ts";

const validReport = {
  department: "Land Office",
  service: "  Mutation   application  ",
  city: " Dhaka ",
  district: "Dhaka",
  amount: 5_000,
  outcome: "refused",
  description:
    "An unofficial payment was requested before the application would move.",
  website: "",
  elapsedMs: 10_000,
};

test("valid report input is normalized into the database contract", () => {
  const result = validateReportSubmission(validReport);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.service, "Mutation application");
  assert.equal(result.value.city, "Dhaka");
  assert.deepEqual(Object.keys(result.value).sort(), [
    "amount",
    "city",
    "department",
    "description",
    "district",
    "outcome",
    "service",
  ]);
});

test("new office categories are accepted by the submission contract", () => {
  for (const department of [
    "Accounts Office",
    "Tax Office",
    "Customs Office",
    "Education Office",
  ]) {
    const result = validateReportSubmission({ ...validReport, department });
    assert.equal(result.ok, true, `${department} should be accepted`);
  }
});

test("honeypot and implausibly fast submissions are rejected", () => {
  assert.equal(
    validateReportSubmission({ ...validReport, website: "spam.example" }).ok,
    false,
  );
  assert.equal(
    validateReportSubmission({ ...validReport, elapsedMs: 500 }).ok,
    false,
  );
});

test("server validation rejects values outside controlled vocabularies", () => {
  assert.equal(
    validateReportSubmission({ ...validReport, district: "Not a division" }).ok,
    false,
  );
  assert.equal(
    validateReportSubmission({ ...validReport, amount: 5_000.5 }).ok,
    false,
  );
});

test("identifying information is rejected before moderation", () => {
  for (const description of [
    "The officer can be reached at person@example.com for the payment.",
    "The requested contact number was 01712-345678 for payment.",
    "They sent a payment link through https://example.com/request.",
    "The demand was made at House 12, Road 4 after filing.",
    "Mr Rahim Ahmed requested the unofficial payment directly.",
    "জনাব রহিম আহমেদ সরাসরি অতিরিক্ত টাকা দাবি করেন।",
  ]) {
    assert.equal(
      validateReportSubmission({ ...validReport, description }).ok,
      false,
      description,
    );
  }
});

test("PII screening does not reject public-service names", () => {
  assert.equal(
    containsDisallowedIdentifyingInformation(
      "Birth Certificate",
      "Mymensingh",
      "The office requested an unofficial payment before processing.",
    ),
    false,
  );
});

test("confirmation input accepts only UUID report identifiers", () => {
  assert.deepEqual(
    validateConfirmationSubmission({
      reportId: "4fb3ae77-f1e4-4b4c-89a6-20b8645336e0",
    }),
    { ok: true, value: "4fb3ae77-f1e4-4b4c-89a6-20b8645336e0" },
  );
  assert.equal(validateConfirmationSubmission({ reportId: "not-a-uuid" }).ok, false);
});
