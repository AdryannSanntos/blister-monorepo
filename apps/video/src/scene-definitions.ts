import { Scene01Opening } from "./scenes/scene-01-opening";
import { Scene02Fragmentation } from "./scenes/scene-02-fragmentation";
import { Scene03CompanyContainer } from "./scenes/scene-03-company-container";
import { Scene04TeamAccess } from "./scenes/scene-04-team-access";
import { Scene05Onboarding } from "./scenes/scene-05-onboarding";
import { Scene06Brain } from "./scenes/scene-06-brain";
import { Scene07Assets } from "./scenes/scene-07-assets";
import { Scene08Agents } from "./scenes/scene-08-agents";
import { Scene09Credits } from "./scenes/scene-09-credits";
import { Scene10History } from "./scenes/scene-10-history";
import { Scene11Integrations } from "./scenes/scene-11-integrations";
import { Scene12Templates } from "./scenes/scene-12-templates";
import { Scene13Analytics } from "./scenes/scene-13-analytics";
import { Scene14Synthesis } from "./scenes/scene-14-synthesis";
import { Scene15Closing } from "./scenes/scene-15-closing";

export const TRANSITION_FRAMES = 15;

export const scenes = [
  { id: "Scene01-Opening", component: Scene01Opening, duration: 120 },
  { id: "Scene02-Fragmentation", component: Scene02Fragmentation, duration: 150 },
  { id: "Scene03-CompanyContainer", component: Scene03CompanyContainer, duration: 150 },
  { id: "Scene04-TeamAccess", component: Scene04TeamAccess, duration: 150 },
  { id: "Scene05-Onboarding", component: Scene05Onboarding, duration: 150 },
  { id: "Scene06-Brain", component: Scene06Brain, duration: 180 },
  { id: "Scene07-Assets", component: Scene07Assets, duration: 150 },
  { id: "Scene08-Agents", component: Scene08Agents, duration: 180 },
  { id: "Scene09-Credits", component: Scene09Credits, duration: 120 },
  { id: "Scene10-History", component: Scene10History, duration: 120 },
  { id: "Scene11-Integrations", component: Scene11Integrations, duration: 120 },
  { id: "Scene12-Templates", component: Scene12Templates, duration: 150 },
  { id: "Scene13-Analytics", component: Scene13Analytics, duration: 120 },
  { id: "Scene14-Synthesis", component: Scene14Synthesis, duration: 120 },
  { id: "Scene15-Closing", component: Scene15Closing, duration: 120 },
] as const;

export const MASTER_DURATION =
  scenes.reduce((sum, scene) => sum + scene.duration, 0) -
  TRANSITION_FRAMES * (scenes.length - 1);
