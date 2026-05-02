import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 180 } });
  const logoOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const tagOp = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const tagY = interpolate(
    spring({ frame: frame - 30, fps, config: { damping: 20, stiffness: 150 } }),
    [0, 1], [30, 0]
  );

  const lineWidth = interpolate(frame, [20, 50], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = Math.sin(frame * 0.08) * 0.03 + 1;

  return (
    <AbsoluteFill style={{
      background: "radial-gradient(ellipse at 50% 40%, rgba(39, 158, 110, 0.2), #0F1420 65%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
    }}>
      <div style={{
        width: 100, height: 100,
        borderRadius: 24,
        background: "linear-gradient(135deg, #279E6E, #1E7A54)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${logoScale * pulse})`,
        opacity: logoOp,
        boxShadow: "0 20px 60px rgba(39, 158, 110, 0.4)",
        marginBottom: 32,
      }}>
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>

      <div style={{
        opacity: logoOp,
        transform: `scale(${logoScale})`,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 80,
        fontWeight: 700,
        letterSpacing: -3,
        textAlign: "center",
      }}>
        <span style={{ color: "#279E6E" }}>Smart</span>
        <span style={{ color: "#E8ECF1" }}>Biz</span>
      </div>

      <div style={{
        width: lineWidth,
        height: 3,
        background: "linear-gradient(90deg, transparent, #279E6E, transparent)",
        marginTop: 16,
        marginBottom: 16,
        borderRadius: 2,
      }} />

      <div style={{
        opacity: tagOp,
        transform: `translateY(${tagY}px)`,
        fontFamily: "'Inter', sans-serif",
        fontSize: 28,
        color: "rgba(232, 236, 241, 0.7)",
        letterSpacing: 4,
        textTransform: "uppercase",
      }}>
        Manage smarter, not harder
      </div>

      <Caption
        text="Meet SmartBiz Manager — your all-in-one business dashboard."
        startFrame={20}
        highlight="SmartBiz Manager"
      />
    </AbsoluteFill>
  );
};
