import { z } from "zod";
export const studentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(200),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  address: z.string().trim().min(8).max(300),
  town: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  state: z.literal("Tamil Nadu"),
  pin: z.string().regex(/^\d{6}$/),
  constituency: z.string().trim().max(100),
  exam: z.string().trim().min(2).max(100),
  examYear: z.string().regex(/^20\d{2}$/),
  registration: z
    .string()
    .trim()
    .max(50)
    .regex(/^[\w\-/]*$/),
  dob: z.string().max(10),
});
export const draftSchema = z
  .object({
    student: studentSchema,
    signature: z.string().startsWith("data:image/png;base64,").max(400_000),
    consents: z.array(z.literal(true)).length(4),
    consentVersion: z.literal("1.0"),
    recipientIds: z.array(z.string().min(1).max(128)).min(1).max(10),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
export const sendSchema = z
  .object({
    gmailAccessToken: z.string().min(20).max(4096),
    reference: z.string().regex(/^TNPR-2026-\d{6}$/),
    idempotencyKey: z.string().min(5).max(100),
    sealed: z.string().min(20).max(1_000_000),
  })
  .strict();

const savedStudentSchema = z
  .object({
    name: z.string().max(100),
    email: z.string().trim().toLowerCase().email().max(200),
    mobile: z.string().regex(/^(|[6-9]\d{0,9})$/),
    address: z.string().max(300),
    town: z.string().max(100),
    district: z.string().max(100),
    state: z.literal("Tamil Nadu"),
    pin: z.string().regex(/^\d{0,6}$/),
    constituency: z.string().max(100),
    exam: z.string().max(100),
    examYear: z.string().regex(/^(|20\d{0,2})$/),
    registration: z.string().max(50).regex(/^[\w\-/]*$/),
    dob: z.string().max(10),
  })
  .strict();

export const resumeProgressSchema = z
  .object({
    student: savedStudentSchema,
    signature: z.string().max(400_000),
    consents: z.array(z.boolean()).max(4),
    selected: z.array(z.string().min(1).max(128)).max(10),
    step: z.number().int().min(0).max(4),
  })
  .strict();

export const saveResumeSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(200),
    resumeToken: z.string().uuid(),
    progress: resumeProgressSchema,
  })
  .strict();

export const getResumeSchema = z
  .object({ resumeToken: z.string().uuid() })
  .strict();
