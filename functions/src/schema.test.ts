import { describe, expect, it } from "vitest";
import { draftSchema, saveResumeSchema } from "./schema.js";
const valid = {
  student: {
    name: "தமிழரசன்",
    email: "student@example.com",
    mobile: "9876543210",
    address: "1 Main Road, Chennai",
    town: "Chennai",
    district: "Chennai",
    state: "Tamil Nadu",
    pin: "600001",
    constituency: "",
    exam: "SI",
    examYear: "2026",
    registration: "",
    dob: "",
  },
  signature: `data:image/png;base64,${"a".repeat(100)}`,
  consents: [true, true, true, true],
  consentVersion: "1.0",
  recipientIds: ["verified-id"],
  idempotencyKey: "3f4fbe6b-e8df-46fb-a66c-1a13f781f64e",
};
describe("server validation", () => {
  it("accepts a bounded petition", () =>
    expect(draftSchema.safeParse(valid).success).toBe(true));
  it("rejects Aadhaar-like extra fields", () =>
    expect(
      draftSchema.safeParse({ ...valid, aadhaar: "123412341234" }).success,
    ).toBe(false));
  it("requires every consent", () =>
    expect(
      draftSchema.safeParse({ ...valid, consents: [true, false, true, true] })
        .success,
    ).toBe(false));
  it("rejects oversized signatures", () =>
    expect(
      draftSchema.safeParse({
        ...valid,
        signature: `data:image/png;base64,${"a".repeat(400001)}`,
      }).success,
    ).toBe(false));
  it("accepts an in-progress petition for secure resume", () =>
    expect(
      saveResumeSchema.safeParse({
        email: valid.student.email,
        resumeToken: valid.idempotencyKey,
        progress: {
          student: valid.student,
          signature: "",
          consents: [true],
          selected: [],
          step: 1,
        },
      }).success,
    ).toBe(true));
  it("requires the saved form email to be valid", () =>
    expect(
      saveResumeSchema.safeParse({
        email: "student@example.com",
        resumeToken: valid.idempotencyKey,
        progress: {
          student: { ...valid.student, email: "not-an-email" },
          signature: "",
          consents: [],
          selected: [],
          step: 0,
        },
      }).success,
    ).toBe(false));
});
