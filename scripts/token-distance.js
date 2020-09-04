import {patchRuler} from "./ruler-hook.js";

Hooks.once('init', function () {
    game.settings.register('rulerfromtoken', "diffTerrainMultiplier", {
        name: "Difficult Terrain Multiplier",
        hint: "Amount the distance gets multiplied when pressing x (only works with the fake rule this module creates)",
        scope: "world",
        config: true,
        default: 2,
        type: Number
    });
});
Hooks.on("canvasReady", ()=> patchRuler());