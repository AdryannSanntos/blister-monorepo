import { Composition, Folder } from "remotion";
import { MasterVideo } from "./MasterVideo";
import { MASTER_DURATION, scenes } from "./scene-definitions";

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="WorkanaAI-Master"
        component={MasterVideo}
        durationInFrames={MASTER_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      <Folder name="Scenes">
        {scenes.map((scene) => (
          <Composition
            key={scene.id}
            id={scene.id}
            component={scene.component}
            durationInFrames={scene.duration}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        ))}
      </Folder>
    </>
  );
}
