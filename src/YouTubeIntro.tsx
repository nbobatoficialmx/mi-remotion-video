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
 * Asset: public/personaje-axolote.png.
 * The artwork itself is never modified — only transformed (scale/translate/rotate).
 */
const CHARACTER_SRC = staticFile("personaje-axolote.png");

/**
 * Timeline at 30fps / 150 frames (5s total). Frame numbers are the
 * *end* of each phase, matching the seconds breakdown from the brief.
 */
const T = {
  appearEnd: 15, // 0.0s - 0.5s: fade/scale-in, character reads as "somewhat far" (not a speck)
  approachEnd: 66, // 0.5s - 2.2s: fast accelerating approach toward camera
  overshootEnd: 84, // 2.2s - 2.8s: elastic arrival with overshoot + squash/stretch
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
// the composition height. The source artwork has a lot of empty side
// margins, so this is tuned higher than the character's own pixel ratio.
const BASE_HEIGHT_PERCENT = 58;

const START_SCALE = 0.22; // readable from frame 1 — not a distant speck
const APPEAR_SCALE = 0.28;
const APPROACH_PEAK_SCALE = 1.3;
const REST_SCALE = 1.05;

type Pose = {
  scale: number;
  rotateX: number; // 3D tip (deg) — sells depth, not just size change
  rotateY: number; // 3D turn (deg) — sells the character rotating toward camera
  rotateZ: number; // in-plane tilt (deg) — personality/greeting
  translateX: number;
  translateY: number;
  squash: number; // 0 = none. Drives non-uniform scaleX/scaleY (cartoon impact)
};

/** Pure function of frame -> pose, so it can be sampled twice (for velocity/blur). */
function getPose(frame: number, fps: number): Pose {
  if (frame <= T.appearEnd) {
    const scale = interpolate(frame, [0, T.appearEnd], [START_SCALE, APPEAR_SCALE], {
      easing: EASE_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const rotateX = interpolate(frame, [0, T.appearEnd], [9, 6], {
      easing: EASE_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const translateY = interpolate(frame, [0, T.appearEnd], [22, 12], {
      easing: EASE_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { scale, rotateX, rotateY: -13, rotateZ: 0, translateX: 0, translateY, squash: 0 };
  }

  if (frame <= T.approachEnd) {
    // Fast, accelerating approach. rotateX/rotateY turning to 0 as it
    // "faces" the camera is what reads as real 3D motion instead of a flat zoom.
    const scale = interpolate(frame, [T.appearEnd, T.approachEnd], [APPEAR_SCALE, APPROACH_PEAK_SCALE], {
      easing: ACCELERATE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const rotateX = interpolate(frame, [T.appearEnd, T.approachEnd], [6, 0], {
      easing: ACCELERATE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const rotateY = interpolate(frame, [T.appearEnd, T.approachEnd], [-13, 0], {
      easing: ACCELERATE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const rotateZ = interpolate(frame, [T.appearEnd, T.approachEnd], [-4, 0], {
      easing: ACCELERATE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const translateY = interpolate(frame, [T.appearEnd, T.approachEnd], [12, 0], {
      easing: ACCELERATE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { scale, rotateX, rotateY, rotateZ, translateX: 0, translateY, squash: 0 };
  }

  if (frame <= T.overshootEnd) {
    // Elastic "PUM, llegué" arrival: overshoots past rest scale, then settles.
    const scale = spring({
      frame: frame - T.approachEnd,
      fps,
      from: APPROACH_PEAK_SCALE,
      to: REST_SCALE,
      config: { damping: 7, mass: 0.7, stiffness: 110 },
    });
    const overshootDelta = scale - REST_SCALE;
    return {
      scale,
      rotateX: overshootDelta * -10, // pitches forward slightly on impact, rocks back
      rotateY: 0,
      rotateZ: 0,
      translateX: 0,
      translateY: overshootDelta * -12, // weight dip on landing
      squash: overshootDelta * 0.34, // pronounced but still tasteful squash & stretch
    };
  }

  if (frame <= T.idleEnd) {
    // Idle: breathing + sway + gentle 3D wobble so it never reads as frozen.
    const t = (frame - T.overshootEnd) / fps;
    const scale = REST_SCALE + Math.sin(t * Math.PI * 1.4) * 0.028;
    const rotateX = Math.cos(t * Math.PI * 1.4) * 1.6;
    const rotateY = Math.sin(t * Math.PI * 0.9) * 3.2;
    const rotateZ = Math.sin(t * Math.PI * 1.1) * 2.4;
    const translateY = Math.cos(t * Math.PI * 1.4) * 8;
    return { scale, rotateX, rotateY, rotateZ, translateX: 0, translateY, squash: 0 };
  }

  if (frame <= T.greetEnd) {
    // Greeting: lean-in bump, a friendly nod (rotateX) and a side-to-side
    // turn+shift (rotateY + translateX moving together, like a real turn).
    const g = frame - T.idleEnd; // 0..15
    const scale = interpolate(g, [0, 6, 15], [REST_SCALE, REST_SCALE + 0.12, REST_SCALE + 0.04], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const rotateX = interpolate(g, [0, 6, 15], [0, 6, 0], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const rotateY = interpolate(g, [0, 4, 9, 15], [0, -5, 4, 0], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const rotateZ = interpolate(g, [0, 4, 9, 15], [0, -6, 4, 0], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const translateX = interpolate(g, [0, 4, 9, 15], [0, -14, 10, 0], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const translateY = interpolate(g, [0, 6, 15], [0, -8, 0], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { scale, rotateX, rotateY, rotateZ, translateX, translateY, squash: (scale - REST_SCALE) * 0.4 };
  }

  // Final settle: quick spring from the greeting bump down to a clean 1.0.
  const scale = spring({
    frame: frame - T.greetEnd,
    fps,
    from: REST_SCALE + 0.04,
    to: 1,
    config: { damping: 16, mass: 0.5, stiffness: 170 },
  });
  return { scale, rotateX: 0, rotateY: 0, rotateZ: 0, translateX: 0, translateY: 0, squash: 0 };
}

export const YouTubeIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pose = getPose(frame, fps);

  // Cheap motion blur: sample the pose one frame earlier and blur
  // proportionally to how fast the scale is changing. This is what
  // separates "camera rushing toward the character" from a static resize.
  const prevPose = getPose(Math.max(frame - 1, 0), fps);
  const speed = Math.abs(pose.scale - prevPose.scale);
  const motionBlur = Math.min(speed * 55, 7);

  const opacity = interpolate(frame, [0, 10], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background: minimal white with a very soft, slowly breathing halo.
  const haloOpacity = interpolate(
    frame,
    [0, T.appearEnd, T.approachEnd, 150],
    [0, 0.06, 0.1, 0.09],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Grounding shadow: separate from the image's own baked-in shadow,
  // grows/darkens with proximity to sell physical weight and depth.
  const shadowOpacity = interpolate(pose.scale, [0.2, 1.3], [0.04, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          transform: [
            `translate(${pose.translateX}px, ${pose.translateY}px)`,
            `rotateX(${pose.rotateX}deg)`,
            `rotateY(${pose.rotateY}deg)`,
            `rotateZ(${pose.rotateZ}deg)`,
            `scale(${pose.scale})`,
          ].join(" "),
          transformOrigin: "center center",
          filter: motionBlur > 0.3 ? `blur(${motionBlur}px)` : undefined,
        }}
      >
        {/* Contact shadow — child of the same transform, so it tracks the
            character's size/position without inheriting its squash. */}
        <div
          style={{
            position: "absolute",
            bottom: "-4%",
            left: "50%",
            width: "62%",
            height: "9%",
            transform: "translateX(-50%)",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 72%)",
            opacity: shadowOpacity,
          }}
        />

        <div
          style={{
            height: "100%",
            transform: `scale(${1 + pose.squash}, ${1 - pose.squash})`,
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
