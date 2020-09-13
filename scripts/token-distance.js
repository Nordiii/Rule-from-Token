import {patchRuler} from "./ruler-hook.js";

Hooks.once('init', function () {
    game.settings.register('rulerfromtoken', "maxTerrainMultiplier", {
        name: "rulerfromtoken.maxTerrainMultiplier.n",
        hint: "rulerfromtoken.maxTerrainMultiplier.h",
        scope: "world",
        config: true,
        default: 2,
        type: Number
    });
    game.settings.register('rulerfromtoken', "terrainMultiplierSteps", {
        name: "rulerfromtoken.terrainMultiplierSteps.n",
        hint: "rulerfromtoken.terrainMultiplierSteps.h",
        scope: "world",
        config: true,
        default: 1,
        type: Number
    });
    game.settings.register('rulerfromtoken', "incrementSpeed", {
        name: "rulerfromtoken.incrementSpeed.n",
        hint: "rulerfromtoken.incrementSpeed.h",
        scope: "client",
        config: true,
        default: 200,
        type: Number
    });
    game.settings.register('rulerfromtoken', "difficultTerrainAnyRuler", {
        name: "rulerfromtoken.difficultTerrainAnyRuler.n",
        hint: "rulerfromtoken.difficultTerrainAnyRuler.h",
        scope: "world",
        config: true,
        default: false,
        type: Boolean
    });
    game.settings.register('rulerfromtoken', "resetLocalData", {
        name: "rulerfromtoken.resetLocalData.n",
        hint: "rulerfromtoken.resetLocalData.h",
        scope: "client",
        config: true,
        default: true,
        type: Boolean
    });
});
Hooks.on("canvasReady", ()=> patchRuler());