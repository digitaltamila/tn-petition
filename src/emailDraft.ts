import type { Prepared } from "./types";

export function emailDraftUrl(
  prepared: Pick<Prepared, "recipients" | "emailSubject" | "emailBody">,
  service: "gmail" | "default",
) {
  const to = prepared.recipients
      .filter((recipient) => recipient.delivery === "to")
      .map((recipient) => recipient.email)
      .join(","),
    cc = prepared.recipients
      .filter((recipient) => recipient.delivery === "cc")
      .map((recipient) => recipient.email)
      .join(",");
  if (service === "gmail") {
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to,
      cc,
      su: prepared.emailSubject,
      body: prepared.emailBody,
    });
    return `https://mail.google.com/mail/?${params}`;
  }
  const params = new URLSearchParams({
    to,
    cc,
    subject: prepared.emailSubject,
    body: prepared.emailBody,
  });
  return `mailto:?${params}`;
}
