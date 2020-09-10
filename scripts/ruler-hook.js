class waypoint {
    constructor(difficultMultiplier) {
        this.difficultMultiplier = difficultMultiplier;
    }
}

class detailedWaypointData {
    constructor(startPoint, endPoint, difficultWaypoints, difficultMultiplierNow) {
        this.endPoint = endPoint;
        this.difficultWaypoints = difficultWaypoints;
        this.difficultMultiplierNow = difficultMultiplierNow;
        this.startPoint = startPoint;
    }
}

class gameSettingsData {
    constructor(max, increment, interval) {
        this.max = max;
        this.incremt = increment;
        this.interval = interval;
    }
}

export function patchRuler() {
    let ctrlPushed = false;
    let ctrlReleased = false;
    let keyPushedLast = Date.now();
    let waypoints = [];
    let allWaypoints = new Map();
    let difficultTerrainMultiplier = 1;
    let gameSettings;


    const handleMouseMove = event => {
        if (ctrlPushed) drawFromToken(event, waypoints);
    };
    const handleClick = () => {
        if (ctrlReleased) return canvas.controls.ruler.clear();
        waypoints.push(new waypoint(difficultTerrainMultiplier));
    };

    const oldBroadcast = game.user.broadcastActivity;
    game.user.broadcastActivity = function (activityData) {
        if (activityData.ruler !== null) {
            let token = canvas.tokens.controlled['0'];
            if (token === undefined) return oldBroadcast.apply(this, arguments);
            const startPoint = activityData.ruler.waypoints[0];
            if (!(startPoint.x === token.center.x && startPoint.y === token.center.y)) return oldBroadcast.apply(this, arguments);

            activityData.ruler = Object.assign({
                difficultTerrain: waypoints,
                difficultMultiplier: difficultTerrainMultiplier
            }, activityData.ruler)
        }
        oldBroadcast.apply(this, arguments);
    };

    const oldRulerUpdate = canvas.controls.updateRuler;
    canvas.controls.updateRuler = function (user, ruler) {
        if (ruler !== null)
            allWaypoints.set(user.id, new detailedWaypointData(ruler.waypoints[0], ruler.destination, ruler.difficultTerrain, ruler.difficultMultiplier))
        oldRulerUpdate.apply(this, arguments)
    };

    function getCurrentTerrainData(segments) {
        let currentWaypoints = null;
        let currentMultiplier = 1;
        allWaypoints.forEach(value => {
            if (value.startPoint.x === segments[0].ray.A.x && value.startPoint.y === segments[0].ray.A.y
                && value.endPoint.x === segments[segments.length - 1].ray.B.x && value.endPoint.y === segments[segments.length - 1].ray.B.y) {
                currentWaypoints = value.difficultWaypoints;
                currentMultiplier = value.difficultMultiplierNow
            }
        });

        return [currentWaypoints, currentMultiplier]
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
        if (token !== undefined && currentWaypoints === null) {
            if (segments.length === 0 || (segments[0].ray.A.x !== token.center.x || segments[0].ray.A.y !== token.center.y)) {
                return oldHexDist.apply(this, arguments)
            }
        }

        if (currentWaypoints === null) {
            currentWaypoints = waypoints;
            currentMultiplier = difficultTerrainMultiplier
        }

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
        if (token !== undefined && currentWaypoints === null) {
            if ((segments[0].ray.A.x !== token.center.x || segments[0].ray.A.y !== token.center.y)) {
                return oldSquareDist.apply(this, arguments)
            }
        }

        if (currentWaypoints === null) {
            currentWaypoints = waypoints;
            currentMultiplier = difficultTerrainMultiplier
        }
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
        oldClear.apply(this, arguments);
        if (ctrlReleased) {
            canvas.app.stage.removeListener('pointermove', handleMouseMove);
            canvas.app.stage.removeListener('pointerdown', handleClick);
            ctrlPushed = ctrlReleased = false;
            difficultTerrainMultiplier = 1;
            keyPushedLast = Date.now();
            waypoints = [];
        }
    };

    const oldKeyEvent = KeyboardManager.prototype.getKey;
    KeyboardManager.prototype.getKey = function (e) {
        if (e.ctrlKey && !ctrlPushed) {
            gameSettings = new gameSettingsData(
                game.settings.get("rulerfromtoken", "maxTerrainMultiplier"),
                game.settings.get("rulerfromtoken", "terrainMultiplierSteps"),
                game.settings.get("rulerfromtoken", "incrementSpeed")
            );
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
        drawFromToken(e, waypoints);
    }
}

function drawFromToken(e, waypoints) {
    let token = canvas.tokens.controlled['0'];
    if (token === undefined) return;

    let newEvent = {};

    newEvent.data = {origin: token.center, destination: {}, originalEvent: e};
    if (canvas.controls.ruler.waypoints.length <= 0)
        canvas.controls.ruler._onDragStart(newEvent);
    else
        newEvent.data.origin = canvas.controls.ruler.waypoints[canvas.controls.ruler.waypoints.length - 1];


    while (canvas.controls.ruler.waypoints.length <= waypoints.length) waypoints.pop();

    newEvent.data.destination = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.app.stage);
    canvas.controls.ruler._onMouseMove(newEvent);
}