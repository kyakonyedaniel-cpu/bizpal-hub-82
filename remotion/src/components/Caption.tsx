import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface CaptionProps {
  text: string;
  startFrame?: number;
  style?: React.CSSProperties;
  highlight?: string;
}

export const Caption: React.FC<CaptionProps> = ({ text, startFrame = 0, style, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = frame - startFrame;
  const op = interpolate(relFrame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(
    spring({ frame: Math.max(0, relFrame), fps, config: { damping: 22, stiffness: 140 } }),
    [0, 1], [16, 0]
  );

  if (relFrame < 0) return null;

  const parts = highlight ? text.split(highlight) : [text];

  return (
    <div style={{
      position: "absolute",
      bottom: 80,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      opacity: op,
      transform: `translateY(${y}px)`,
      zIndex: 100,
      ...style,
    }}>
      <div style={{
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "none",
        borderRadius: 14,
        padding: "14px 36px",
        maxWidth: 1200,
      }}>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 28,
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.95)",
          lineHeight: 1.5,
          letterSpacing: 0.3,
        }}>
          {highlight ? (
            <>
              {parts[0]}
              <span style={{ color: "#4ADE80", fontWeight: 600 }}>{highlight}</span>
              {parts[1] || ""}
            </>
          ) : text}
        </span>
      </div>
    </div>
  );
};
