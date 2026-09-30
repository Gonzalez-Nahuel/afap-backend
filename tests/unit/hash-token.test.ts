import { expect, describe, it } from "vitest";
import { hashToken } from "../../src/lib/hash-token.js";

describe("hashToken", () => {
  it("genera el hash SHA-256 de un token", () => {
    const result = hashToken("abc");

    expect(result).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
