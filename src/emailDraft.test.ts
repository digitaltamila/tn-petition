import { describe, expect, it } from "vitest";
import { emailDraftUrl } from "./emailDraft";

const prepared = {
  recipients: [
    { email: "mla@example.com", delivery: "to" },
    { email: "tnusrb@nic.in", delivery: "cc" },
  ],
  emailSubject: "Petition subject",
  emailBody: "Petition body",
} as never;

describe("emailDraftUrl", () => {
  it("creates a Gmail draft with To, CC, subject and body", () => {
    const url = new URL(emailDraftUrl(prepared, "gmail"));
    expect(url.hostname).toBe("mail.google.com");
    expect(url.searchParams.get("to")).toBe("mla@example.com");
    expect(url.searchParams.get("cc")).toBe("tnusrb@nic.in");
    expect(url.searchParams.get("su")).toBe("Petition subject");
    expect(url.searchParams.get("body")).toBe("Petition body");
  });

  it("creates a standard mailto draft", () => {
    const url = emailDraftUrl(prepared, "default");
    expect(url).toContain("mailto:?");
    expect(url).toContain("subject=Petition+subject");
  });
});
