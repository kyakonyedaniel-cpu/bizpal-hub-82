import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1Y = interpolate(
    spring({ frame, fps, config: { damping: 20, stiffness: 180 } }),
    [0, 1], [60, 0]
  );
  const line1Op = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const line2Y = interpolate(
    spring({ frame: frame - 15, fps, config: { damping: 20, stiffness: 180 } }),
    [0, 1], [60, 0]
  );
  const line2Op = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });

  const strikeProgress = interpolate(frame, [50, 70], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const bgGlow = interpolate(frame, [0, 120], [0, 0.15], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 60%, rgba(39, 158, 110, ${bgGlow}), #0F1420 70%)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
    }}>
      <div style={{
        transform: `translateY(${line1Y}px)`,
        opacity: line1Op,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 72,
        fontWeight: 700,
        color: "#E8ECF1",
        letterSpacing: -2,
        textAlign: "center",
      }}>
        Running a business is
      </div>
      <div style={{
        transform: `translateY(${line2Y}px)`,
        opacity: line2Op,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 72,
        fontWeight: 700,
        color: "#E5A519",
        letterSpacing: -2,
        textAlign: "center",
        position: "relative",
        marginTop: 8,
      }}>
        overwhelming.
        <div style={{
          position: "absolute",
          top: "54%",
          left: 0,
          width: `${strikeProgress}%`,
          height: 5,
          backgroundColor: "#E5A519",
          borderRadius: 3,
        }} />
      </div>

      <Caption
        text="Juggling sales, stock, expenses, and customers — it's a lot."
        startFrame={25}
        highlight="it's a lot"
      />
    </AbsoluteFill>
  );
};
