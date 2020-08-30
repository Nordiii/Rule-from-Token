import { patchRuler } from "./ruler-hook.js";
Hooks.on("canvasReady", ()=> patchRuler());