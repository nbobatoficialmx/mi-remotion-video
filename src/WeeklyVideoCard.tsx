import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {
  line1?: string;
  line2?: string;
  badge?: string;
};

const DARK = "#232323";
const RED = "#C8102E";
const GREEN = "#006341";

const BellIcon: React.FC<{ size: number; rotate: number; color: string }> = ({
  size,
  rotate,
  color,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ transform: `rotate(${rotate}deg)`, transformOrigin: "50% 10%" }}
  >
    <path
      d="M12 2a1 1 0 0 1 1 1v1.06A7.002 7.002 0 0 1 19 11v3.586l1.707 1.707A1 1 0 0 1 20 18H4a1 1 0 0 1-.707-1.707L5 14.586V11a7.002 7.002 0 0 1 6-6.94V3a1 1 0 0 1 1-1Z"
      fill={color}
    />
    <path d="M9.5 19a2.5 2.5 0 0 0 5 0Z" fill={color} />
  </svg>
);

export const WeeklyVideoCard: React.FC<Props> = ({
  line1 = "NUEVO VIDEO",
  line2 = "CADA SEMANA",
  badge = "SUSCRÍBETE",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Badge pops in first.
  const badgeSpring = spring({ frame, fps, config: { damping: 12, mass: 0.5, stiffness: 180 } });
  const badgeScale = interpolate(badgeSpring, [0, 1], [0.6, 1]);
  const badgeOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Once the badge has settled, the bell rings and decays out.
  const bellDelay = 18;
  const bellT = Math.max(0, frame - bellDelay) / fps;
  const bellRotate =
    frame > bellDelay ? Math.sin(bellT * Math.PI * 3) * 12 * Math.exp(-bellT * 1.8) : 0;

  // Headline: two lines, staggered spring pop-ins.
  const line1Spring = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 11, mass: 0.6, stiffness: 160 },
  });
  const line1Y = interpolate(line1Spring, [0, 1], [40, 0]);
  const line1Scale = interpolate(line1Spring, [0, 1], [0.85, 1]);
  const line1Opacity = interpolate(frame, [12, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const line2Spring = spring({
    frame: Math.max(0, frame - 24),
    fps,
    config: { damping: 11, mass: 0.6, stiffness: 160 },
  });
  const line2Y = interpolate(line2Spring, [0, 1], [40, 0]);
  const line2Scale = interpolate(line2Spring, [0, 1], [0.85, 1]);
  const line2Opacity = interpolate(frame, [24, 34], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Accent underline draws in after both lines have landed.
  const underlineScale = interpolate(frame, [40, 58], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Gentle idle breathing on the whole headline block once settled.
  const idleT = Math.max(0, frame - 60) / fps;
  const idleBreath = frame > 60 ? Math.sin(idleT * Math.PI * 1.2) * 0.01 : 0;

  const haloOpacity = interpolate(frame, [0, 30, 120], [0, 0.08, 0.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "60%",
          height: "60%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${RED}55 0%, transparent 70%)`,
          opacity: haloOpacity,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${1 + idleBreath})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 24px",
            borderRadius: 999,
            backgroundColor: GREEN,
            opacity: badgeOpacity,
            transform: `scale(${badgeScale})`,
            marginBottom: 28,
          }}
        >
          <BellIcon size={26} rotate={bellRotate} color="#ffffff" />
          <span style={{ color: "#ffffff", fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>
            {badge}
          </span>
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: DARK,
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px) scale(${line1Scale})`,
            letterSpacing: 2,
          }}
        >
          {line1}
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: RED,
            opacity: line2Opacity,
            transform: `translateY(${line2Y}px) scale(${line2Scale})`,
            letterSpacing: 2,
            marginTop: 4,
          }}
        >
          {line2}
        </div>

        <div
          style={{
            width: 220,
            height: 8,
            borderRadius: 4,
            backgroundColor: GREEN,
            marginTop: 24,
            transform: `scaleX(${underlineScale})`,
            transformOrigin: "center",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
