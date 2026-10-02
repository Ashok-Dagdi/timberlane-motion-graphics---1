/* The engine is a family of classic scripts (no imports/exports) that hang a
   single namespace off the window — the same files the exported HTML pastes
   verbatim. These declarations are what lets the typed React side shake
   hands with them without a bundler trick. */
declare module "*/engine-core.js";
declare module "*/engine-draw.js";
declare module "*/engine-schema.js";
declare module "*/logo.js";
declare module "*/music.js";
declare module "*/scene-timberlane.js";
declare module "*/editor.js";
declare module "*/export-html.js";

interface Window {
  TLM: Record<string, any>;
}
