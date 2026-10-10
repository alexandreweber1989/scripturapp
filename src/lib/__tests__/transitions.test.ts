import { describe, expect, it } from "vitest";
import { navigationTypes } from "../transitions";

describe("navigation transition types", () => {
  it("slides between main-menu sections in menu order", () => {
    expect(navigationTypes("/", "/trilhas")).toEqual(["tab-next"]);
    expect(navigationTypes("/perfil", "/biblia")).toEqual(["tab-prev"]);
    expect(navigationTypes("/biblia/genesis/1", "/jogos")).toEqual(["tab-next"]);
  });

  it("pushes forward into details and back out of them", () => {
    expect(navigationTypes("/trilhas", "/trilhas/vida-de-davi")).toEqual(["nav-forward"]);
    expect(navigationTypes("/trilhas/vida-de-davi/desafio", "/trilhas/vida-de-davi")).toEqual(["nav-back"]);
    expect(navigationTypes("/biblia/joao", "/biblia")).toEqual(["nav-back"]);
    expect(navigationTypes("/", "/biblia/mateus/5?trilha=primeiros-passos")).toEqual(["nav-forward"]);
    expect(navigationTypes("/jogos", "/memorizar")).toEqual(["nav-forward"]);
  });

  it("turns Bible pages in canonical order, across books too", () => {
    expect(navigationTypes("/biblia/genesis/1", "/biblia/genesis/2")).toEqual(["tab-next"]);
    expect(navigationTypes("/biblia/exodo/1", "/biblia/genesis/50")).toEqual(["tab-prev"]);
  });

  it("does not animate same-page or unknown links", () => {
    expect(navigationTypes("/biblia/genesis/1", "/biblia/genesis/1?trilha=x")).toEqual([]);
    expect(navigationTypes("/", "https://example.com")).toEqual([]);
    expect(navigationTypes("/", "/auth/callback")).toEqual([]);
  });
});
