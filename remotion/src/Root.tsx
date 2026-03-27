import { Composition } from "remotion";
import { CountdownSpinner } from "./CountdownSpinner";

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={CountdownSpinner}
    durationInFrames={300}
    fps={30}
    width={3840}
    height={2160}
  />
);
