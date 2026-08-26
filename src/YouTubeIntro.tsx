import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  // Uncomment when audio assets are added to public/audio/:
  // Audio,
} from "remotion";

/**
 * Asset: put the character illustration at public/personaje-axolote.png.
 * The artwork itself is never modified — only transformed (scale/translate/rotate).
 */
const CHARACTER_SRC = staticFile("personaje-axolote.png");

/**
 * Timeline at 30fps / 150 frames (5s total). Frame numbers are the
 * *end* of each phase, matching the seconds breakdown from the brief.
 */
const T = {
  appearEnd: 15, // 0.0s - 0.5s: small fade/scale-in, character reads as "far away"
  approachEnd: 66, // 0.5s - 2.2s: fast accelerating approach toward camera
  overshootEnd: 84, // 2.2s - 2.8s: elastic arrival with slight overshoot
  idleEnd: 126, // 2.8s - 4.2s: idle secondary motion (breathing/sway)
  greetEnd: 141, // 4.2s - 4.7s: friendly greeting gesture
  // 4.7s - 5.0s (up to frame 150): final settle, clean last frame
} as const;

// Strong ease-in curve: starts calmer, accelerates hard toward the end.
// Gives the "rushing toward camera" feeling instead of a linear zoom.
const ACCELERATE = Easing.bezier(0.55, 0.055, 0.675, 0.19);
const EASE_OUT = Easing.out(Easing.quad);
const EASE_IN_OUT = Easing.inOut(Easing.quad);

// How large the character reads at rest (scale === 1), as a fraction of
// the composition height. Tune this if the final artwork has a lot of
// internal empty space around the character.
const BASE_HEIGHT_PERCENT = 58;

export const YouTubeIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ---------------------------------------------------------------------
  // Opacity: quick fade-in only, fully visible for the rest of the intro.
  // ---------------------------------------------------------------------
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ---------------------------------------------------------------------
  // Uniform base scale across the whole timeline (continuous, no pops).
  // ---------------------------------------------------------------------
  let scale = 1;
  // Delta used to drive squash & stretch during the arrival bounce.
  let overshootDelta = 0;

  if (frame <= T.appearEnd) {
    scale = interpolate(frame, [0, T.appearEnd], [0.08, 0.12], {
      easing: EASE_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame <= T.approachEnd) {
    scale = interpolate(frame, [T.appearEnd, T.approachEnd], [0.12, 1.25], {
      easing: ACCELERATE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame <= T.overshootEnd) {
    // Elastic "PUM, llegué" arrival: overshoots past the rest scale, then settles.
    scale = spring({
      frame: frame - T.approachEnd,
      fps,
      from: 1.25,
      to: 1.05,
      config: { damping: 9, mass: 0.7, stiffness: 110 },
    });
    overshootDelta = scale - 1.05;
  } else if (frame <= T.idleEnd) {
    // Idle: gentle breathing so it doesn't feel like a frozen zoom.
    const t = (frame - T.overshootEnd) / fps;
    scale = 1.05 + Math.sin(t * Math.PI * 1.4) * 0.018;
  } else if (frame <= T.greetEnd) {
    // Greeting: small friendly "lean in" bump.
    const g = frame - T.idleEnd; // 0..15
    scale = interpolate(g, [0, 6, 15], [1.05, 1.12, 1.08], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else {
    // Final settle: quick spring from the greeting bump down to a clean 1.0.
    scale = spring({
      frame: frame - T.greetEnd,
      fps,
      from: 1.08,
      to: 1,
      config: { damping: 16, mass: 0.5, stiffness: 170 },
    });
  }

  // ---------------------------------------------------------------------
  // Squash & stretch: purely a function of the overshoot, so it's
  // automatically zero everywhere except the arrival bounce. Subtle
  // (max ~3%) so the illustration never looks deformed.
  // ---------------------------------------------------------------------
  const squash = overshootDelta * 0.16;
  const scaleX = scale * (1 + squash);
  const scaleY = scale * (1 - squash);

  // ---------------------------------------------------------------------
  // Rotation (deg): subtle turn-in during the approach, idle sway,
  // a friendly tilt on the greeting, then settles back to 0.
  // ---------------------------------------------------------------------
  let rotate = 0;
  if (frame <= T.appearEnd) {
    rotate = 0;
  } else if (frame <= T.approachEnd) {
    rotate = interpolate(frame, [T.appearEnd, T.approachEnd], [-4, 0], {
      easing: ACCELERATE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame <= T.idleEnd) {
    const t = (frame - T.overshootEnd) / fps;
    rotate = Math.sin(t * Math.PI * 1.1) * 1.4;
  } else if (frame <= T.greetEnd) {
    const g = frame - T.idleEnd;
    rotate = interpolate(g, [0, 4, 9, 15], [0, -3.5, 2.5, 0], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else {
    rotate = interpolate(frame, [T.greetEnd, 150], [0, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // ---------------------------------------------------------------------
  // Translation (px): a small rise during the approach (feels like
  // coming up toward the viewer), a weight-dip coupled to the overshoot,
  // gentle idle bob, and a friendly side-to-side wave on the greeting.
  // ---------------------------------------------------------------------
  let translateY = 0;
  let translateX = 0;

  if (frame <= T.appearEnd) {
    translateY = interpolate(frame, [0, T.appearEnd], [24, 12], {
      easing: EASE_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame <= T.approachEnd) {
    translateY = interpolate(frame, [T.appearEnd, T.approachEnd], [12, 0], {
      easing: ACCELERATE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  } else if (frame <= T.overshootEnd) {
    // Weight dip tied to the same spring driving the scale overshoot.
    translateY = overshootDelta * -14;
  } else if (frame <= T.idleEnd) {
    const t = (frame - T.overshootEnd) / fps;
    translateY = Math.cos(t * Math.PI * 1.4) * 5;
  } else if (frame <= T.greetEnd) {
    const g = frame - T.idleEnd;
    translateY = interpolate(g, [0, 6, 15], [0, -6, 0], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    translateX = interpolate(g, [0, 4, 9, 15], [0, -9, 7, 0], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  // ---------------------------------------------------------------------
  // Background: minimal white with a very soft, slowly breathing halo
  // behind the character so it never competes for attention.
  // ---------------------------------------------------------------------
  const haloOpacity = interpolate(
    frame,
    [0, T.appearEnd, T.approachEnd, 150],
    [0, 0.06, 0.1, 0.09],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        perspective: 1200,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "70%",
          height: "70%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(230,60,70,0.5) 0%, rgba(230,60,70,0) 70%)",
          opacity: haloOpacity,
        }}
      />

      <div
        style={{
          height: `${BASE_HEIGHT_PERCENT}%`,
          opacity,
          transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scaleX}, ${scaleY})`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={CHARACTER_SRC}
          style={{
            height: "100%",
            width: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      {/*
        Audio hook points (no files added yet — add real assets under
        public/audio/ and uncomment when available):

        <Audio src={staticFile("audio/whoosh.mp3")} startFrom={0} endAt={T.approachEnd - 10} volume={0.6} />
        <Audio src={staticFile("audio/pop.mp3")} startFrom={0} />  // Sequence it to start at T.approachEnd
        <Audio src={staticFile("audio/cheer.mp3")} startFrom={0} /> // Sequence it to start at T.idleEnd
      */}
    </AbsoluteFill>
  );
};
