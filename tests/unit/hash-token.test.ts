import { expect, describe, it } from "vitest";
import { hashToken } from "../../src/lib/hash-token.js";

describe("hashToken", () => {
  it("Generate the SHA-256 hash of a token", () => {
    const result = hashToken("abc");

    expect(result).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
