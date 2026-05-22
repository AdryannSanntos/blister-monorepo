import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { MASTER_DURATION, scenes, TRANSITION_FRAMES } from "./scene-definitions";

export const MasterVideo: React.FC = () => {
  return (
    <TransitionSeries>
      {scenes.map((scene, i) => {
        const SceneComponent = scene.component;
        const elements: React.ReactNode[] = [
          <TransitionSeries.Sequence
            key={`scene-${i}`}
            durationInFrames={scene.duration}
          >
            <SceneComponent />
          </TransitionSeries.Sequence>,
        ];

        if (i < scenes.length - 1) {
          elements.push(
            <TransitionSeries.Transition
              key={`transition-${i}`}
              presentation={fade()}
              timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
            />,
          );
        }

        return elements;
      })}
    </TransitionSeries>
  );
};
