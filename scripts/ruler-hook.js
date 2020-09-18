class waypoint {
    constructor(difficultMultiplier) {
        this.difficultMultiplier = difficultMultiplier;
    }
}

class detailedWaypointData {
    constructor(waypoints, endPoint, difficultWaypoints, difficultMultiplierNow) {
        this.endPoint = endPoint;
        this.difficultWaypoints = difficultWaypoints;
        this.difficultMultiplierNow = difficultMultiplierNow;
        this.waypoints = waypoints
    }
}

class gameSettingsData {
    constructor(max, increment, interval, difficultTerrainAnyRuler, enableReset) {
        this.max = max;
        this.incremt = increment;
        this.interval = interval;
        this.difficultTerrainAnyRuler = difficultTerrainAnyRuler;
        this.enableReset = enableReset;
    }
}

export function patchRuler() {
    let ctrlPushed = false;
    let ctrlReleased = false;
    let keyPushedLast = Date.now();
    let waypoints = [];
    let allWaypoints = new Map();
    let difficultTerrainMultiplier = 1;
    let gameSettings = updateSettings();

    Hooks.on("closeSettingsConfig", () => gameSettings = updateSettings());

    const handleMouseMove = event => {
        if (ctrlPushed) drawFromToken(event, waypoints);
    };
    const handleClick = () => {
        if (ctrlReleased) {
            reset();
            return canvas.controls.ruler.clear();
        }
        waypoints.push(new waypoint(difficultTerrainMultiplier));
    };

    function reset() {
        canvas.app.stage.removeListener('pointermove', handleMouseMove);
        canvas.app.stage.removeListener('pointerdown', handleClick);
        ctrlPushed = ctrlReleased = false;
        difficultTerrainMultiplier = 1;
        keyPushedLast = Date.now();
        waypoints = [];
    }

    const oldBroadcast = game.user.broadcastActivity;
    game.user.broadcastActivity = function (activityData) {
        if (activityData.ruler === null || activityData.ruler === undefined)
            return oldBroadcast.apply(this, arguments);

        if (!gameSettings.difficultTerrainAnyRuler) {
            let token = canvas.tokens.controlled['0'];
            if (token === undefined) return oldBroadcast.apply(this, arguments);

            let rulerWaypoints = activityData.ruler.waypoints;
            if (!(rulerWaypoints[0].x === token.center.x && rulerWaypoints[0].y === token.center.y))
                return oldBroadcast.apply(this, arguments);
        }
        activityData.ruler = Object.assign({
            difficultTerrain: waypoints,
            difficultMultiplier: difficultTerrainMultiplier
        }, activityData.ruler);

        oldBroadcast.apply(this, arguments);
    };

    const oldMoveToken = Ruler.prototype.moveToken;
    Ruler.prototype.moveToken = function () {
        if (ctrlReleased) reset();
        return oldMoveToken.apply(this, arguments);
    };

    const oldRulerUpdate = canvas.controls.updateRuler;
    canvas.controls.updateRuler = function (user, ruler) {
        if (ruler !== null && ruler !== undefined) {
            allWaypoints.set(user.id, new detailedWaypointData(ruler.waypoints, ruler.destination, ruler.difficultTerrain, ruler.difficultMultiplier));
        }
        oldRulerUpdate.apply(this, arguments)
    };

    function getCurrentTerrainData(segments) {
        for (const [key, value] of allWaypoints.entries()) {
            if (value.waypoints === null || value.waypoints === undefined || value.endPoint === null || value.endPoint === undefined)
                continue;
            if (value.waypoints.length < segments.length || value.waypoints.length - 1 > segments.length)
                continue;

            if (!(value.waypoints[0].x === segments[0].ray.A.x && value.waypoints[0].y === segments[0].ray.A.y
                && value.endPoint.x === segments[segments.length - 1].ray.B.x && value.endPoint.y === segments[segments.length - 1].ray.B.y))
                continue;
            let matches = true;
            for (let i = 1; i < segments.length - 1; i++)
                if (!(value.waypoints[i].x === segments[i].ray.A.x && value.waypoints[i].y === segments[i].ray.A.y)) {
                    matches = false;
                    break;
                }

            if (!matches)
                continue;

            allWaypoints.delete(key);

            return [value.difficultWaypoints, value.difficultMultiplierNow];
        }
        return [null, 1]
    }

    const oldHexDist = HexagonalGrid.prototype.measureDistances;
    HexagonalGrid.prototype.measureDistances = function (segments, options = {}) {
        if (segments.length === 0)
            return oldHexDist.apply(this, arguments);
        let currentWaypoints = null;
        let currentMultiplier;
        let data = getCurrentTerrainData(segments);
        currentWaypoints = data[0];
        currentMultiplier = data[1];
        let token = canvas.tokens.controlled['0'];
        if (token == null && !gameSettings.difficultTerrainAnyRuler && currentWaypoints === null)
            return oldHexDist.apply(this, arguments);
        if (token !== undefined && currentWaypoints === null && !gameSettings.difficultTerrainAnyRuler) {
            if ((segments[0].ray.A.x !== token.center.x || segments[0].ray.A.y !== token.center.y)) {
                return oldHexDist.apply(this, arguments)
            }
        }

        if (currentWaypoints === null) {
            currentWaypoints = waypoints;
            currentMultiplier = difficultTerrainMultiplier
        }
        if (currentWaypoints === undefined || currentWaypoints === null)
            return oldHexDist.apply(this, arguments);

        return segments.map((s, i) => {
            let r = s.ray;
            let [r0, c0] = this.getGridPositionFromPixels(r.A.x, r.A.y);
            let [r1, c1] = this.getGridPositionFromPixels(r.B.x, r.B.y);

            // Use cube conversion to measure distance
            let hex0 = this._offsetToCube(r0, c0);
            let hex1 = this._offsetToCube(r1, c1);
            let distance = this._cubeDistance(hex0, hex1);
            if (currentWaypoints.length > i)
                return distance * canvas.dimensions.distance * currentWaypoints[i].difficultMultiplier;
            return distance * canvas.dimensions.distance * currentMultiplier;

        });
    };

    const oldSquareDist = SquareGrid.prototype.measureDistances;
    SquareGrid.prototype.measureDistances = function (segments, options = {}) {
        if (segments.length === 0)
            return oldSquareDist.apply(this, arguments);

        let currentWaypoints = null;
        let currentMultiplier;
        let data = getCurrentTerrainData(segments);
        currentWaypoints = data[0];
        currentMultiplier = data[1];
        let token = canvas.tokens.controlled['0'];
        if (token == null && !gameSettings.difficultTerrainAnyRuler && currentWaypoints === null)
            return oldSquareDist.apply(this, arguments);
        if (token !== undefined && currentWaypoints === null && !gameSettings.difficultTerrainAnyRuler) {
            if ((segments[0].ray.A.x !== token.center.x || segments[0].ray.A.y !== token.center.y)) {
                return oldSquareDist.apply(this, arguments)
            }
        }

        if (currentWaypoints === null) {
            currentWaypoints = waypoints;
            currentMultiplier = difficultTerrainMultiplier
        }
        if (currentWaypoints === undefined || currentWaypoints === null)
            return oldSquareDist.apply(this, arguments);
        //Basically the original function just with difficult terrain factored in, this will probably break other modules using rulers
        const d = canvas.dimensions;
        return segments.map((s, i) => {
            let r = s.ray;
            let nx = Math.abs(Math.ceil(r.dx / d.size));
            let ny = Math.abs(Math.ceil(r.dy / d.size));

            // Determine the number of straight and diagonal moves
            let nd = Math.min(nx, ny);
            let ns = Math.abs(ny - nx);
            // Linear distance for all moves
            if (currentWaypoints.length > i)
                return (nd + ns) * d.distance * currentWaypoints[i].difficultMultiplier;
            return (nd + ns) * d.distance * currentMultiplier;
        });
    };

    const oldClear = canvas.controls.ruler.clear;
    canvas.controls.ruler.clear = function () {
        if (ctrlReleased)
            reset();

        oldClear.apply(this, arguments);
    };

    const oldKeyEvent = KeyboardManager.prototype.getKey;
    KeyboardManager.prototype.getKey = function (e) {
        if (e.shiftKey && e.altKey && (e.keyCode === 88 || e.keyCode === 89) && gameSettings.enableReset) {
            reset();
            canvas.controls.ruler.clear();
        }

        if (e.ctrlKey && !ctrlPushed) {
            canvas.app.stage.addListener('pointermove', handleMouseMove);
            canvas.app.stage.addListener('pointerdown', handleClick);
            ctrlPushed = true;
            drawFromToken(e, waypoints);
        }

        if (e.keyCode === 88 && ctrlPushed) {
            applyMultiplier(gameSettings.incremt, e)
        }
        if (e.keyCode === 89 && ctrlPushed) {
            applyMultiplier(-gameSettings.incremt, e)
        }

        ctrlReleased = !e.ctrlKey;
        return oldKeyEvent.apply(this, arguments);
    };


    function applyMultiplier(value, e) {
        if (Date.now() - keyPushedLast < gameSettings.interval)
            return;

        if (difficultTerrainMultiplier <= 1 && value < 0)
            difficultTerrainMultiplier = gameSettings.max;
        else if (difficultTerrainMultiplier >= gameSettings.max && value > 0)
            difficultTerrainMultiplier = 1;
        else {
            difficultTerrainMultiplier += value;
            if (difficultTerrainMultiplier < 1)
                difficultTerrainMultiplier = 1;
            else if (difficultTerrainMultiplier > gameSettings.max)
                difficultTerrainMultiplier = gameSettings.max;
        }

        keyPushedLast = Date.now();
        drawFromToken(e, waypoints, true, gameSettings.difficultTerrainAnyRuler);
    }
}

function drawFromToken(e, waypoints, isTerrainUpdate = false, difficultTerrainAnyRuler = false) {
    let token = canvas.tokens.controlled['0'];
    if (token == null) {
        if (difficultTerrainAnyRuler && isTerrainUpdate) {
            let newEvent = {};
            newEvent.data = {
                origin: canvas.controls.ruler.waypoints[canvas.controls.ruler.waypoints.length - 1],
                destination: canvas.controls.ruler.destination,
                originalEvent: e
            };
            broadcast(canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.app.stage));
            canvas.controls.ruler._onMouseMove(newEvent);
        }
        return;
    }

    let newEvent = {};
    newEvent.data = {origin: token.center, destination: {}, originalEvent: e};
    if (canvas.controls.ruler.waypoints.length <= 0)
        canvas.controls.ruler._onDragStart(newEvent);
    else
        newEvent.data.origin = canvas.controls.ruler.waypoints[canvas.controls.ruler.waypoints.length - 1];


    while (canvas.controls.ruler.waypoints.length <= waypoints.length) waypoints.pop();

    newEvent.data.destination = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.app.stage);
    canvas.controls.ruler._onMouseMove(newEvent);

    if (isTerrainUpdate)
        broadcast(newEvent.data.destination);

    //Broadcast the terrain update so it does update before a mouse move event
    function broadcast(cursor) {
        if (!game.user.hasPermission("SHOW_RULER"))
            return;
        let ruler = {
            class: "Ruler",
            name: "Ruler." + game.user.id,
            waypoints: canvas.controls.ruler.waypoints,
            destination: canvas.controls.ruler.destination,
            _state: 2
        };
        let activityData = {cursor: cursor, ruler: ruler};
        game.user.broadcastActivity(activityData);
    }
}

function updateSettings() {
    return new gameSettingsData(
        game.settings.get("rulerfromtoken", "maxTerrainMultiplier"),
        game.settings.get("rulerfromtoken", "terrainMultiplierSteps"),
        game.settings.get("rulerfromtoken", "incrementSpeed"),
        game.settings.get("rulerfromtoken", "difficultTerrainAnyRuler"),
        game.settings.get("rulerfromtoken", "resetLocalData")
    );
}
