import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { Composition } from "./video/Composition";
import { H, W } from "./video/timeline";

/**
 * `?still=<seconds>` renders a single frame of the 9:16 composition.
 * `?cin=<seconds>` renders a single frame of the 2.37:1 cinematic composition.
 * `?pop=<seconds>` renders a single frame of the 1:1 pop composition.
 * `?draft=<seconds>` renders a single frame of the 9:16 blueprint composition.
 * `?doss=<seconds>` renders a single frame of the 9:16 dossier composition.
 */
const params = new URLSearchParams(location.search);
const still = params.get("still");
const cin = params.get("cin");
const pop = params.get("pop");
const draft = params.get("draft");
const doss = params.get("doss");
const story = params.get("story");
const ad = params.get("ad");

import { CinematicComposition } from "./video2/scenes";
import { W as W2, H as H2 } from "./video2/timeline";
import { PopComposition } from "./video3/scenes";
import { W as W3, H as H3 } from "./video3/timeline";
import { DraftComposition } from "./video4/scenes";
import { DossierComposition } from "./video5/scenes";
import { W as W5, H as H5 } from "./video5/timeline";
import { StoryComposition } from "./video6/scenes";
import { W as W6, H as H6 } from "./video6/timeline";
import { AdComposition } from "./video7/scenes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {still !== null ? (
      <div style={{ width: W, height: H }}>
        <Composition t={parseFloat(still) || 0} playing={false} grain guides={false} burnIn={false} />
      </div>
    ) : cin !== null ? (
      <div style={{ width: W2, height: H2 }}>
        <CinematicComposition t={parseFloat(cin) || 0} />
      </div>
    ) : pop !== null ? (
      <div style={{ width: W3, height: H3 }}>
        <PopComposition t={parseFloat(pop) || 0} />
      </div>
    ) : draft !== null ? (
      <div style={{ width: 1080, height: 1920 }}>
        <DraftComposition t={parseFloat(draft) || 0} />
      </div>
    ) : doss !== null ? (
      <div style={{ width: W5, height: H5 }}>
        <DossierComposition t={parseFloat(doss) || 0} />
      </div>
    ) : story !== null ? (
      <div style={{ width: W6, height: H6 }}>
        <StoryComposition t={parseFloat(story) || 0} />
      </div>
    ) : ad !== null ? (
      <div style={{ width: 1080, height: 1920 }}>
        <AdComposition t={parseFloat(ad) || 0} />
      </div>
    ) : (
      <App />
    )}
  </StrictMode>
);
