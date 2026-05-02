import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { Caption } from "../components/Caption";

export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ctaScale = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 150 } });
  const ctaOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const urlOp = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const urlY = interpolate(
    spring({ frame: frame - 30, fps, config: { damping: 20, stiffness: 150 } }),
    [0, 1], [25, 0]
  );

  const pulse = Math.sin(frame * 0.1) * 0.03 + 1;
  const tagOp = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });

  const particles = Array.from({ length: 12 }, (_, i) => ({
    x: ((i * 173) % 1920),
    y: ((i * 241) % 1080),
    size: 3 + (i % 4) * 2,
    speed: 0.3 + (i % 3) * 0.2,
    delay: i * 5,
  }));

  return (
    <AbsoluteFill style={{
      background: "radial-gradient(ellipse at 50% 50%, rgba(39, 158, 110, 0.25), #0F1420 60%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
    }}>
      {particles.map((p, i) => {
        const pOp = interpolate(frame, [p.delay, p.delay + 20], [0, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const pY = p.y + Math.sin((frame + p.delay) * p.speed * 0.1) * 30;
        return (
          <div key={i} style={{
            position: "absolute",
            left: p.x, top: pY,
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: "#279E6E",
            opacity: pOp,
          }} />
        );
      })}

      <div style={{
        opacity: ctaOp,
        transform: `scale(${ctaScale})`,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 88,
        fontWeight: 700,
        color: "#E8ECF1",
        letterSpacing: -3,
        textAlign: "center",
        marginBottom: 24,
      }}>
        Start <span style={{ color: "#279E6E" }}>Free</span> Today
      </div>

      <div style={{
        opacity: ctaOp,
        transform: `scale(${ctaScale * pulse})`,
        background: "linear-gradient(135deg, #279E6E, #1E7A54)",
        borderRadius: 16,
        padding: "20px 64px",
        boxShadow: "0 20px 60px rgba(39, 158, 110, 0.4)",
        marginBottom: 40,
      }}>
        <div style={{
          fontFamily: "'Space Grotesk'",
          fontSize: 30,
          fontWeight: 600,
          color: "white",
          letterSpacing: 1,
        }}>
          Get SmartBiz Manager →
        </div>
      </div>

      <div style={{
        opacity: urlOp,
        transform: `translateY(${urlY}px)`,
        fontFamily: "'Inter', sans-serif",
        fontSize: 22,
        color: "rgba(232, 236, 241, 0.5)",
        letterSpacing: 2,
      }}>
        bizpal-hub-82.lovable.app
      </div>

      <div style={{
        opacity: tagOp,
        position: "absolute",
        bottom: 130,
        fontFamily: "'Inter', sans-serif",
        fontSize: 16,
        color: "rgba(232, 236, 241, 0.3)",
        letterSpacing: 3,
        textTransform: "uppercase",
      }}>
        No credit card required • Works on any device
      </div>

      <Caption
        text="Sign up now at bizpal-hub-82.lovable.app — it's completely free to start!"
        startFrame={15}
        highlight="completely free"
      />
    </AbsoluteFill>
  );
};
