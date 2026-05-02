import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const premiumFeatures = [
  "✦ Unlimited sales & products",
  "✦ AI business insights",
  "✦ Advanced reports & PDF export",
  "✦ Multi-branch support",
  "✦ Staff accounts & roles",
];

export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const badgeScale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });

  const priceOp = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const priceY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 150 } }),
    [0, 1], [40, 0]
  );

  const freeOp = interpolate(frame, [10, 25], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: "radial-gradient(ellipse at 30% 50%, rgba(229, 165, 25, 0.08), #0F1420 60%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 120px",
    }}>
      <div style={{ display: "flex", gap: 48, alignItems: "stretch" }}>
        {/* Free card */}
        <div style={{
          opacity: freeOp,
          transform: `scale(${spring({ frame: frame - 10, fps, config: { damping: 20 } })})`,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24,
          padding: "48px 44px",
          width: 380,
          flexShrink: 0,
        }}>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 600, color: "#E8ECF1", marginBottom: 8 }}>Free Plan</div>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 56, fontWeight: 700, color: "#E8ECF1", marginBottom: 24 }}>UGX 0</div>
          <div style={{ fontFamily: "'Inter'", fontSize: 17, color: "rgba(232,236,241,0.5)", lineHeight: 2 }}>
            • 1 branch<br/>• 50 sales records<br/>• Basic reports<br/>• Inventory tracking
          </div>
        </div>

        {/* Premium card */}
        <div style={{
          opacity: priceOp,
          transform: `translateY(${priceY}px)`,
          background: "linear-gradient(135deg, rgba(39, 158, 110, 0.15), rgba(39, 158, 110, 0.05))",
          border: "2px solid rgba(39, 158, 110, 0.4)",
          borderRadius: 24,
          padding: "48px 44px",
          width: 440,
          position: "relative",
          flexShrink: 0,
          boxShadow: "0 30px 80px rgba(39, 158, 110, 0.15)",
        }}>
          <div style={{
            position: "absolute",
            top: -18,
            left: 32,
            background: "linear-gradient(135deg, #279E6E, #1E7A54)",
            color: "white",
            fontFamily: "'Space Grotesk'",
            fontSize: 14,
            fontWeight: 600,
            padding: "6px 20px",
            borderRadius: 20,
            opacity: badgeOp,
            transform: `scale(${badgeScale})`,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}>
            ★ Popular
          </div>

          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 600, color: "#279E6E", marginBottom: 8 }}>Premium</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 28 }}>
            <span style={{ fontFamily: "'Space Grotesk'", fontSize: 56, fontWeight: 700, color: "#E8ECF1" }}>UGX 30,000</span>
            <span style={{ fontFamily: "'Inter'", fontSize: 18, color: "rgba(232,236,241,0.5)" }}>/month</span>
          </div>

          {premiumFeatures.map((feat, i) => {
            const fDelay = 35 + i * 8;
            const fOp = interpolate(frame, [fDelay, fDelay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const fX = interpolate(frame, [fDelay, fDelay + 12], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                opacity: fOp,
                transform: `translateX(${fX}px)`,
                fontFamily: "'Inter'",
                fontSize: 18,
                color: "rgba(232, 236, 241, 0.8)",
                paddingBottom: 12,
              }}>
                {feat}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
