export type Lang = "ta" | "en";
export type Student = {
  name: string;
  email: string;
  mobile: string;
  address: string;
  town: string;
  district: string;
  state: string;
  pin: string;
  constituency: string;
  exam: string;
  examYear: string;
  registration: string;
  dob: string;
};
export type Mla = {
  id: string;
  name: string;
  constituency: string;
  district: string;
  email: string;
  photoUrl: string;
  sourceUrl: string;
  verifiedAt: string;
};
export type Recipient = {
  id: string;
  departmentName: string;
  email: string;
  recipientType: string;
  delivery: "to" | "cc";
  active: boolean;
  verificationStatus: "verified" | "needs_verification";
  lastVerifiedDate?: string;
  sourceUrl?: string;
};
export type Draft = {
  student: Student;
  signature: string;
  consents: boolean[];
  consentVersion: string;
  recipientIds: string[];
  idempotencyKey: string;
};
export type ResumeProgress = {
  student: Student;
  signature: string;
  consents: boolean[];
  selected: string[];
  step: number;
};
export type PetitionAttachment = {
  kind: "government" | "mla";
  departmentName: string;
  pdfBase64: string;
  fileName: string;
};
export type Prepared = {
  reference: string;
  attachments: PetitionAttachment[];
  emailSubject: string;
  emailBody: string;
  recipients: Recipient[];
  expiresAt: string;
  sealed: string;
};
