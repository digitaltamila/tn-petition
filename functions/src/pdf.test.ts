import { describe, expect, it } from "vitest";
import { makePdf } from "./pdf.js";

const student = {
  name: "Sudarvannan S",
  email: "student@example.com",
  mobile: "9876543210",
  address: "1 Main Road",
  town: "Dharmapuri",
  district: "Dharmapuri",
  state: "Tamil Nadu",
  pin: "636704",
  constituency: "Dharmapuri",
  exam: "SI",
  examYear: "2026",
  registration: "",
  dob: "",
};

const signature =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("petition PDF", () => {
  it("does not append blank pages while adding footers", async () => {
    const pdf = await makePdf(
      student,
      signature,
      "TNPR-2026-000001",
      "2026-07-16T10:00:00.000Z",
      "mla",
      "Member of Legislative Assembly — Dharmapuri",
    );
    const pageCount = (
      pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) || []
    ).length;

    expect(pageCount).toBeGreaterThan(0);
    expect(pageCount).toBeLessThanOrEqual(2);
  });
});
