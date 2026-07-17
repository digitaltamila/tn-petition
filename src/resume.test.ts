import { describe, expect, it } from "vitest";
import { resumeTokenFromUrl } from "./resume";

describe("resumeTokenFromUrl", () => {
  it("reads a direct resume token", () => {
    expect(
      resumeTokenFromUrl("https://petition.example/petition?resume=abc"),
    ).toBe("abc");
  });

  it("reads a resume token inside Firebase's continue URL", () => {
    const continueUrl = encodeURIComponent(
      "https://petition.example/petition?resume=def",
    );
    expect(
      resumeTokenFromUrl(
        `https://project.firebaseapp.com/__/auth/action?continueUrl=${continueUrl}`,
      ),
    ).toBe("def");
  });
});
