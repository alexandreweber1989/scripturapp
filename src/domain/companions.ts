import raw from "@/content/companions.json";

export interface Companion {
  id: string;
  name: string;
  gender: "M" | "F";
  description: string;
  trait: string;
  messages: string[];
  sprite: string;
  /** Speaking-style guide used by the AI mentor. */
  voice: string;
}

export const COMPANIONS = raw as Companion[];
export const DEFAULT_COMPANION_ID = "timoteo";

export function getCompanion(id: string | null | undefined): Companion {
  return COMPANIONS.find((c) => c.id === id) ?? COMPANIONS.find((c) => c.id === DEFAULT_COMPANION_ID)!;
}

export function companionSprite(companion: Companion): string {
  return `/companions/${companion.sprite}.png`;
}
