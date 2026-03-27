import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } from "remotion";
import { loadFont } from "@remotion/google-fonts/IBMPlexSansCondensed";

const { fontFamily } = loadFont("normal", {
  weights: ["700"],
  subsets: ["latin"],
});

// Ease-in-out cubic for smooth acceleration/deceleration
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const CountdownSpinner: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const TARGET = 20_000_000;
  const holdFrames = 30; // 1 second static at the end
  const animFrames = durationInFrames - holdFrames;

  // Progress 0→1 over animation portion, then hold at 1
  const rawProgress = Math.min(frame / (animFrames - 1), 1);
  const easedProgress = easeInOutCubic(rawProgress);

  const currentValue = Math.round(easedProgress * TARGET);
  const displayValue = currentValue.toLocaleString("en-US");

  // Subtle glow pulse synced to counting speed
  const countSpeed = Math.abs(easedProgress - easeInOutCubic(Math.max(0, (frame - 1) / (durationInFrames - 1))));
  const glowIntensity = interpolate(countSpeed, [0, 0.01], [20, 60], {
    extrapolateRight: "clamp",
  });

  // Slight scale bounce at the very end when hitting 20M
  const endScale = frame >= durationInFrames - 15
    ? interpolate(frame, [durationInFrames - 15, durationInFrames - 8, durationInFrames - 1], [1, 1.04, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // Fade in at start
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#00ff00",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: 280,
          color: "#0081fa",
          textShadow: `0 0 ${glowIntensity}px rgba(0, 129, 250, 0.4), 0 0 ${glowIntensity * 2}px rgba(0, 129, 250, 0.15)`,
          transform: `scale(${endScale})`,
          opacity,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {displayValue}
      </div>
    </AbsoluteFill>
  );
};
