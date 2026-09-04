export const departments = [
  "Land Office",
  "Accounts Office",
  "Tax Office",
  "Customs Office",
  "Traffic Police",
  "BRTA",
  "Passport Office",
  "City Corporation",
  "Sub-Registry Office",
  "Education Office",
  "Public Hospital",
  "Other public service",
] as const;

export const divisions = [
  "Barishal",
  "Chattogram",
  "Dhaka",
  "Khulna",
  "Mymensingh",
  "Rajshahi",
  "Rangpur",
  "Sylhet",
] as const;

export const reportOutcomes = ["paid", "refused", "pending"] as const;

export type ReportOutcome = (typeof reportOutcomes)[number];

export type BribeReport = {
  id: string;
  created_at: string;
  department: string;
  service: string;
  city: string;
  district: string;
  amount: number;
  outcome: ReportOutcome;
  description: string;
  confirmation_count: number;
};

export const reportSorts = ["hot", "newest", "amount", "confirmed"] as const;
export type ReportSort = (typeof reportSorts)[number];

export type ReportPageRequest = {
  offset: number;
  limit: number;
  outcome?: ReportOutcome;
  department?: string;
  search?: string;
  aliases?: string[];
  sort: ReportSort;
};

export type ReportPage = {
  reports: BribeReport[];
  total: number;
};

export type ReportSummary = {
  totals: {
    count: number;
    amount: number;
    minimumAmount: number;
    maximumAmount: number;
    underFiveThousandRate: number;
    refusalRate: number;
    paidCount: number;
    refusedCount: number;
    pendingCount: number;
    districts: number;
    spanDays: number;
  };
  amountBands: {
    upTo1000: number;
    from1001To5000: number;
    from5001To10000: number;
    above10000: number;
  };
  districtRows: Array<{
    name: string;
    reports: number;
    amount: number;
  }>;
  departmentRows: Array<{
    name: string;
    reports: number;
    amount: number;
  }>;
  latestReport: Pick<
    BribeReport,
    "id" | "created_at" | "department" | "city" | "outcome"
  > | null;
};

export type BribeReportInput = Omit<
  BribeReport,
  "id" | "created_at" | "confirmation_count"
>;


export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };
type UntrustedReportSubmission = {
  department?: unknown;
  service?: unknown;
  city?: unknown;
  district?: unknown;
  amount?: unknown;
  outcome?: unknown;
  description?: unknown;
  website?: unknown;
  elapsedMs?: unknown;
};

type UntrustedConfirmationSubmission = {
  reportId?: unknown;
};


const MINIMUM_FILL_TIME_MS = 3_000;
const MAXIMUM_FORM_AGE_MS = 24 * 60 * 60 * 1_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORBIDDEN_CONTROL_CHARACTERS =
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const CONTACT_OR_IDENTIFIER_PATTERN =
  /(?:https?:\/\/|www\.|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?88[\s-]?)?01[3-9](?:[\s-]?\d){8}|\b\d{7,}\b|(?:এনআইডি|জাতীয় পরিচয়|পাসপোর্ট নম্বর|লাইসেন্স নম্বর|জিডি নম্বর))/iu;
const EXACT_ADDRESS_PATTERN =
  /\b(?:house|holding|flat|apartment|road|street|lane)\s*(?:no\.?\s*)?[#\w-]+|(?:বাড়ি|বাসা|হোল্ডিং|ফ্ল্যাট|রোড|সড়ক|লেন)\s*(?:নং|নম্বর|#)?\s*[০-৯\d-]+/iu;
const EXPLICIT_PERSON_NAME_PATTERN =
  /\b(?:mr|mrs|ms|dr)\.?\s+[A-Z][A-Za-z'-]{1,30}\s+[A-Z][A-Za-z'-]{1,30}\b|(?:জনাব|জনাবা|শ্রী|শ্রীমতি|মোঃ|ডাঃ)\s+[\p{Script=Bengali}]{2,}(?:\s+[\p{Script=Bengali}]{2,}){1,3}/iu;

export function containsDisallowedIdentifyingInformation(
  ...values: string[]
): boolean {
  const text = values.join("\n");
  return (
    CONTACT_OR_IDENTIFIER_PATTERN.test(text) ||
    EXACT_ADDRESS_PATTERN.test(text) ||
    EXPLICIT_PERSON_NAME_PATTERN.test(text)
  );
}


function isAllowed<const T extends readonly string[]>(
  values: T,
  value: unknown,
): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

function cleanText(
  value: unknown,
  minimumLength: number,
  maximumLength: number,
): string | null {
  if (typeof value !== "string" || FORBIDDEN_CONTROL_CHARACTERS.test(value)) {
    return null;
  }

  const cleaned = value.trim().replace(/\s+/gu, " ");
  if (cleaned.length < minimumLength || cleaned.length > maximumLength) {
    return null;
  }
  return cleaned;
}

export function validateReportSubmission(
  value: unknown,
): ValidationResult<BribeReportInput> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, message: "The request body is invalid." };
  }
  const submission = value as UntrustedReportSubmission;

  if (
    typeof submission.website !== "string" ||
    submission.website.length > 0
  ) {
    return { ok: false, message: "The report could not be submitted." };
  }

  if (
    typeof submission.elapsedMs !== "number" ||
    !Number.isSafeInteger(submission.elapsedMs) ||
    submission.elapsedMs < MINIMUM_FILL_TIME_MS
  ) {
    return {
      ok: false,
      message: "Please take a moment to complete the report before submitting.",
    };
  }

  if (submission.elapsedMs > MAXIMUM_FORM_AGE_MS) {
    return {
      ok: false,
      message: "This form has expired. Refresh the page and try again.",
    };
  }

  const service = cleanText(submission.service, 3, 100);
  const city = cleanText(submission.city, 2, 60);
  const description = cleanText(submission.description, 20, 700);

  if (
    !isAllowed(departments, submission.department) ||
    !service ||
    !city ||
    !isAllowed(divisions, submission.district) ||
    typeof submission.amount !== "number" ||
    !Number.isSafeInteger(submission.amount) ||
    submission.amount < 1 ||
    submission.amount > 100_000_000 ||
    !isAllowed(reportOutcomes, submission.outcome) ||
    !description
  ) {
    return {
      ok: false,
      message: "Complete every field with a valid value before submitting.",
    };
  }
  if (containsDisallowedIdentifyingInformation(service, city, description)) {
    return {
      ok: false,
      message:
        "Remove names, addresses, contact details, links, and identifying numbers before submitting.",
    };
  }

  return {
    ok: true,
    value: {
      department: submission.department,
      service,
      city,
      district: submission.district,
      amount: submission.amount,
      outcome: submission.outcome,
      description,
    },
  };
}

export function validateConfirmationSubmission(
  value: unknown,
): ValidationResult<string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, message: "A valid report is required." };
  }
  const submission = value as UntrustedConfirmationSubmission;
  if (typeof submission.reportId !== "string") {
    return { ok: false, message: "A valid report is required." };
  }

  const reportId = submission.reportId.trim();
  if (!UUID_PATTERN.test(reportId)) {
    return { ok: false, message: "A valid report is required." };
  }

  return { ok: true, value: reportId };
}
