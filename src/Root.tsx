import "./index.css";
import { Composition } from "remotion";
import { YouTubeIntro } from "./YouTubeIntro";
import { WeeklyVideoCard } from "./WeeklyVideoCard";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="YouTubeIntro"
        component={YouTubeIntro}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="WeeklyVideoCard"
        component={WeeklyVideoCard}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          line1: "NUEVO VIDEO",
          line2: "CADA SEMANA",
          badge: "SUSCRÍBETE",
        }}
      />
    </>
  );
};
