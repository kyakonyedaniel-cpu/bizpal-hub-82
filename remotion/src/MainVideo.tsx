import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { Scene1 } from "./scenes/Scene1";
import { Scene2 } from "./scenes/Scene2";
import { Scene3 } from "./scenes/Scene3";
import { Scene4 } from "./scenes/Scene4";
import { Scene5 } from "./scenes/Scene5";

loadSpaceGrotesk();
loadInter();

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();

  // Persistent subtle grid overlay
  const gridOp = interpolate(frame, [0, 30], [0, 0.03], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#0F1420" }}>
      {/* Subtle grid */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: gridOp,
        backgroundImage: `
          linear-gradient(rgba(39, 158, 110, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(39, 158, 110, 0.3) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px",
        zIndex: 0,
      }} />

      {/* Scenes with transitions */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene1 />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene2 />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene3 />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 25 })}
        />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene4 />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: 20 })}
        />

        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene5 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
