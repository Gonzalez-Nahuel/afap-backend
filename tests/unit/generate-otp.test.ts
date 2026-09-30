import { describe, expect, it } from "vitest";
import { generateOTP } from "../../src/lib/generate-otp-code.js";

describe("generateOTP", () => {
  it("produces six-digit numeric codes", () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      expect(generateOTP()).toMatch(/^\d{6}$/);
    }
  });
});
