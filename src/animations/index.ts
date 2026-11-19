import type { ComponentType } from "react";
import type { ClipProps } from "../play";
import { Connectors } from "./connectors/Connectors";
import { Patterns, PatternsAct1, PatternsTitle } from "./patterns/Patterns";
import { Explosion } from "./explosion/Explosion";
import { AiChat } from "./ai-chat/AiChat";
import { Notch } from "./notch/Notch";
import { HeroIntro } from "./hero-intro/HeroIntro";
import { ZoomThrough } from "../clips/ZoomThrough";

export type Animation = {
  id: string; // used in the URL: #/animations/<id>
  name: string; // shown in the drawer
  description?: string;
  Comp: ComponentType<ClipProps>;
};

// Add new named sequences here: create a component (or folder) in this directory, then append an entry.
export const ANIMATIONS: Animation[] = [
  {
    id: "connectors",
    name: "Connectors",
    description: "Feature promo animation for Connectors.",
    Comp: Connectors,
  },
  {
    id: "patterns",
    name: "Patterns",
    description: "IQ Patterns announcement film.",
    Comp: Patterns,
  },
  {
    id: "patterns-act1",
    name: "Patterns: Act 1",
    description: "Dinosaurs through to the dark frame after \"...a new era dawns\".",
    Comp: PatternsAct1,
  },
  {
    id: "patterns-title",
    name: "Patterns: Title",
    description: "\"introducing IX PATTERNS\" title card and morph, from the dark frame Act 1 ends on.",
    Comp: PatternsTitle,
  },
  {
    id: "zoom-to-planet",
    name: "Zoom to planet",
    description: "Study for the Patterns zoom out, from the Playground's Zoom through clip: the wide frame shrinks and rounds into a circle that becomes the planet.",
    Comp: ZoomThrough,
  },
  {
    id: "explosion",
    name: "Explosion",
    description: "Hand-drawn explosion from 23 SVG frames: flash, fireball, then smoke breaking up. About 1.1s.",
    Comp: Explosion,
  },
  {
    id: "ai-chat",
    name: "AI chat",
    description: "The portfolio's AI workspace hero: a prompt typed into the chat input and the reply streaming in.",
    Comp: AiChat,
  },
  {
    id: "notch",
    name: "The Notch",
    description: "The portfolio's Notch preview: the laptop's notch springs open on tiles, rings an alert, opens on a notification, on a loop.",
    Comp: Notch,
  },
  {
    id: "hero-intro",
    name: "Portfolio intro",
    description: "The portfolio's intro: \"Hello.\" typed, \"I'm Liam Haire\", the subtitle, four rolling phrase slides, then \"and this is my portfolio\".",
    Comp: HeroIntro,
  },
];
