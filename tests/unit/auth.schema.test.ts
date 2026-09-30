import { describe, it, expect } from "vitest";
import {
  loginUserSchema,
  registerUserSchema,
} from "../../src/modules/auth/auth.schema.js";

describe("registerUserSchema", () => {
  it("acepta un registro válido y normaliza el email", () => {
    const result = registerUserSchema.parse({
      body: {
        username: "nahuel_dev",
        email: "NAhuelk123@gmail.com",
        password: "Secure123!",
      },
    });

    expect(result.body.email).toBe("nahuelk123@gmail.com");
  });

  it("rechaza una contraseña demasiado corta", () => {
    const result = registerUserSchema.safeParse({
      body: {
        username: "nahuel_dev",
        email: "NAhuelk123@gmail.com",
        password: "Abc1!",
      },
    });

    if (result.success)
      throw new Error("Se esperaba que el registro fuera rechazado");

    const passwordTooShort = result.error?.issues.some(
      (issue) =>
        issue.path.join(".") === "body.password" && issue.code === "too_small",
    );

    expect(passwordTooShort).toBe(true);
  });
});

describe("loginUserSchema", () => {
  it("rechaza el login si falta x-client-type", () => {
    const result = loginUserSchema.safeParse({
      headers: {},
      body: {
        email: "nahuelk123@gmail.com",
        password: "Secure123!",
      },
    });

    if (result.success)
      throw new Error("se esperaba un error por falta de x-client-type");

    const missingClientType = result.error.issues.some(
      (issue) => issue.path.join(".") === "headers.x-client-type",
    );

    expect(missingClientType).toBe(true);
  });
});
