import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const features = [
  { icon: "📊", title: "Sales Tracking", desc: "Monitor every sale in real-time" },
  { icon: "📦", title: "Inventory", desc: "Smart stock alerts & management" },
  { icon: "💰", title: "Expenses", desc: "Track spending by category" },
  { icon: "👥", title: "Customers", desc: "CRM & purchase history" },
];

export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 20, stiffness: 150 } }),
    [0, 1], [40, 0]
  );

  return (
    <AbsoluteFill style={{
      background: "#0F1420",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 80,
    }}>
      <div style={{
        opacity: titleOp,
        transform: `translateY(${titleY}px)`,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 52,
        fontWeight: 700,
        color: "#E8ECF1",
        letterSpacing: -1,
        marginBottom: 60,
        textAlign: "center",
      }}>
        Everything you need,{" "}
        <span style={{ color: "#279E6E" }}>one dashboard</span>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 28,
        width: "100%",
        maxWidth: 1100,
      }}>
        {features.map((f, i) => {
          const delay = 20 + i * 12;
          const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 180 } });
          const cardOp = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const cardX = interpolate(s, [0, 1], [i % 2 === 0 ? -80 : 80, 0]);
          const hover = Math.sin((frame - delay) * 0.06) * 3;

          return (
            <div key={i} style={{
              opacity: cardOp,
              transform: `translateX(${cardX}px) translateY(${hover}px)`,
              background: "linear-gradient(135deg, rgba(39, 158, 110, 0.08), rgba(255,255,255,0.03))",
              border: "1px solid rgba(39, 158, 110, 0.2)",
              borderRadius: 20,
              padding: "36px 40px",
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}>
              <div style={{
                fontSize: 44,
                width: 70, height: 70,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(39, 158, 110, 0.15)",
                borderRadius: 16,
                flexShrink: 0,
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 26,
                  fontWeight: 600,
                  color: "#E8ECF1",
                  marginBottom: 4,
                }}>{f.title}</div>
                <div style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 18,
                  color: "rgba(232, 236, 241, 0.5)",
                }}>{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
