import { describe, expect, it } from "vitest";
import { buildScenePrompt, insertAfter, normalizeClipDuration } from "./scene-prompt";

describe("buildScenePrompt", () => {
  it("adds characters, motion and art style to the scene prompt", () => {
    expect(
      buildScenePrompt({ base: "A dragon lands", characters: "Charizard", motion: "slow push-in", style: "anime" }),
    ).toBe("A dragon lands. Characters: Charizard. Camera and motion: slow push-in. Art style: anime");
  });

  it("lets this generation's style override the storyboard style", () => {
    expect(buildScenePrompt({ base: "Scene", style: "watercolor", storyboardStyle: "cinematic" })).toBe(
      "Scene. Art style: watercolor",
    );
  });

  it("falls back to storyboard settings when fields are empty", () => {
    expect(buildScenePrompt({ base: "Scene", characters: " ", storyboardCharacter: "Sceptile" })).toBe(
      "Scene. Characters: Sceptile",
    );
  });
});

describe("normalizeClipDuration", () => {
  it("only allows 5 or 10 seconds", () => {
    expect(normalizeClipDuration(3)).toBe(5);
    expect(normalizeClipDuration(8)).toBe(5);
    expect(normalizeClipDuration(10)).toBe(10);
    expect(normalizeClipDuration(15)).toBe(10);
  });
});

describe("insertAfter", () => {
  it("places a continuation right after its parent scene", () => {
    expect(insertAfter(["a", "b", "c"], 0, "a2")).toEqual(["a", "a2", "b", "c"]);
    expect(insertAfter(["a", "b"], 1, "b2")).toEqual(["a", "b", "b2"]);
  });
});
