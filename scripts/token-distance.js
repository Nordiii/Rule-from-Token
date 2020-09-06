import {patchRuler} from "./ruler-hook.js";

Hooks.once('init', function () {
    game.settings.register('rulerfromtoken', "maxTerrainMultiplier", {
        name: "Maximal Terrain multiplier",
        hint: "Maximal amount which can get multiplied into the movement distance (only works with the fake rule this module creates)",
        scope: "world",
        config: true,
        default: 2,
        type: Number
    });
    game.settings.register('rulerfromtoken', "terrainMultiplierSteps", {
        name: "Amount to increment",
        hint: "Amount to increase/decrease the current multiplier when pressing x/y",
        scope: "world",
        config: true,
        default: 1,
        type: Number
    });
    game.settings.register('rulerfromtoken', "incrementSpeed", {
        name: "Time between registered x/y push (client)",
        hint: "Time (1 second = 1000) between x/y applying increment/decrease difficult terrain value",
        scope: "client",
        config: true,
        default: 200,
        type: Number
    });
});
Hooks.on("canvasReady", ()=> patchRuler());