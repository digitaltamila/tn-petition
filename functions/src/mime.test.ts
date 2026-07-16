import { describe, expect, it } from "vitest";
import { mime } from "./index.js";

describe("mime", () => {
  it("keeps the required MIME header and part separators", () => {
    const raw = mime(
      "sender@example.com",
      [
        {
          id: "recipient",
          departmentName: "Recipient",
          email: "recipient@example.com",
          recipientType: "government_department",
          delivery: "to",
          active: true,
          verificationStatus: "verified",
        },
        {
          id: "copy",
          departmentName: "Copy",
          email: "copy@example.com",
          recipientType: "cc_copy",
          delivery: "cc",
          active: true,
          verificationStatus: "verified",
        },
      ],
      "Test subject",
      "Test body",
      [
        {
          kind: "government",
          departmentName: "Recipient",
          fileName: "petition.pdf",
          pdf: Buffer.from("test pdf"),
        },
      ],
    );

    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    expect(decoded).toContain("Cc: copy@example.com");
    expect(decoded).toContain("\r\n\r\n--tnpr_");
    expect(decoded).toContain(
      "Content-Transfer-Encoding: base64\r\n\r\nVGVzdCBib2R5",
    );
    expect(decoded).toContain('Content-Disposition: attachment; filename="petition.pdf"');
  });
});
