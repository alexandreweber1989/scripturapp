import { describe, expect, it } from "vitest";
import { authErrorMessage, passwordStrength, safeNext } from "../auth-errors";

describe("auth helpers", () => {
  it("translates known Supabase errors and falls back for unknown ones", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe("E-mail ou senha incorretos.");
    expect(authErrorMessage({ status: 429 })).toContain("Aguarde");
    expect(authErrorMessage({ code: "something_new" })).toContain("Não foi possível");
    expect(authErrorMessage(null)).toContain("Não foi possível");
  });

  it("rates passwords and enforces the minimum length", () => {
    expect(passwordStrength("")).toMatchObject({ score: 0, acceptable: false });
    expect(passwordStrength("abc123")).toMatchObject({ score: 1, acceptable: false });
    expect(passwordStrength("abcdefgh")).toMatchObject({ score: 2, acceptable: true });
    expect(passwordStrength("abcd1234")).toMatchObject({ score: 3, acceptable: true });
    expect(passwordStrength("Peregrino#2026")).toMatchObject({ score: 4, acceptable: true });
  });

  it("only allows same-site redirects", () => {
    expect(safeNext("/trilhas")).toBe("/trilhas");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
