class waypoint {
    constructor( difficultMultiplier) {
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

class gameSettingsData{
    constructor(max, increment, interval) {
        this.max = max;
        this.incremt = increment;
        this.interval = interval;
    }
}

export function patchRuler() {
    let ctrlPushed = false;
    let ctrlReleased = false;
    let isDifficultTerrain = false;
    let keyPushedLast = Date.now();
    let waypoints = [];
    let allWaypoints = new Map();
    let difficultTerrainMultiplier = 1;
    let gameSettings;
    const oldClear = canvas.controls.ruler.clear;
    const oldKeyEvent = KeyboardManager.prototype.getKey;
    const handleMouseMove = event => {
        if (ctrlPushed) drawFromToken(event, waypoints);
    };
    const handleClick = () => {
        if (ctrlReleased) return canvas.controls.ruler.clear();
        waypoints.push(new waypoint(difficultTerrainMultiplier));
    };

    const oldBoradcast = game.user.broadcastActivity
    game.user.broadcastActivity = function (activityData) {
        if (activityData.ruler !== null) {
            let token = canvas.tokens.controlled['0'];
            if (token === undefined) return oldBoradcast.apply(this, arguments);
            const startPoint = activityData.ruler.waypoints[0];
            if (!(startPoint.x === token.center.x && startPoint.y === token.center.y)) return oldBoradcast.apply(this, arguments);

            activityData.ruler = Object.assign({
                difficultTerrain: waypoints,
                difficultMultiplier: difficultTerrainMultiplier
            }, activityData.ruler)
        }
        oldBoradcast.apply(this, arguments);
    }

    const oldRulerUpdate = canvas.controls.updateRuler;
    canvas.controls.updateRuler = function (user, ruler) {
        if (ruler !== null)
            allWaypoints.set(user.id, new detailedWaypointData(ruler.waypoints[0], ruler.destination, ruler.difficultTerrain, ruler.difficultMultiplier))
        oldRulerUpdate.apply(this, arguments)
    }

    const oldHexDist = HexagonalGrid.prototype.measureDistances;
    HexagonalGrid.prototype.measureDistances = function (segments, options = {}) {
        let currentWaypoints = null;
        let currentMultiplier;
        allWaypoints.forEach(value => {
            if (value.startPoint.x === segments[0].ray.A.x && value.startPoint.y === segments[0].ray.A.y
                && value.endPoint.x === segments[segments.length - 1].ray.B.x && value.endPoint.y === segments[segments.length - 1].ray.B.y){
                currentWaypoints = value.difficultWaypoints;
                currentMultiplier = value.difficultMultiplierNow
            }
        });
        let token = canvas.tokens.controlled['0'];
        if (token !== undefined && currentWaypoints === null) {
            if (segments.length === 0 || (segments[0].ray.A.x !== token.center.x || segments[0].ray.A.y !== token.center.y)) {
                return oldHexDist.apply(this, arguments)
            }
        }

        if (currentWaypoints === null){
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
        let currentWaypoints = null;
        let currentMultiplier;
        if(segments.length === 0)
            return oldSquareDist.apply(this,arguments);
        allWaypoints.forEach(value => {
            if (value.startPoint.x === segments[0].ray.A.x && value.startPoint.y === segments[0].ray.A.y
                && value.endPoint.x === segments[segments.length - 1].ray.B.x && value.endPoint.y === segments[segments.length - 1].ray.B.y){
                currentWaypoints = value.difficultWaypoints;
                currentMultiplier = value.difficultMultiplierNow
            }
        });
        let token = canvas.tokens.controlled['0'];
        if (token !== undefined && currentWaypoints === null) {
            if ( (segments[0].ray.A.x !== token.center.x || segments[0].ray.A.y !== token.center.y)) {
                return oldSquareDist.apply(this, arguments)
            }
        }

        if (currentWaypoints === null){
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

    canvas.controls.ruler.clear = function () {
        oldClear.apply(this, arguments);
        if (ctrlReleased) {
            canvas.app.stage.removeListener('pointermove', handleMouseMove);
            canvas.app.stage.removeListener('pointerdown', handleClick);
            ctrlPushed = ctrlReleased = isDifficultTerrain = false;
            difficultTerrainMultiplier = 1;
            keyPushedLast = Date.now();
            waypoints = [];
        }
    };

    KeyboardManager.prototype.getKey = function (e) {
        if (e.ctrlKey && !ctrlPushed) {
            gameSettings = new gameSettingsData(
                game.settings.get("rulerfromtoken","maxTerrainMultiplier"),
                game.settings.get("rulerfromtoken","terrainMultiplierSteps"),
                game.settings.get("rulerfromtoken","incrementSpeed")
            )
            canvas.app.stage.addListener('pointermove', handleMouseMove);
            canvas.app.stage.addListener('pointerdown', handleClick);
            ctrlPushed = true;
            ctrlReleased = false;
            isDifficultTerrain = false;
            keyPushedLast = Date.now();
            waypoints = [];
            drawFromToken(e, waypoints);
        }
        if (e.keyCode === 88 && ctrlPushed) {
            if (Date.now() - keyPushedLast > gameSettings.interval) {
                // isDifficultTerrain = !isDifficultTerrain;
                if (difficultTerrainMultiplier >= gameSettings.max)
                    difficultTerrainMultiplier = 1;
                else
                    difficultTerrainMultiplier += gameSettings.incremt;
                if (difficultTerrainMultiplier > gameSettings.max)
                    difficultTerrainMultiplier = gameSettings.max
                keyPushedLast = Date.now();
                drawFromToken(e, waypoints);
            }
        }
        if (e.keyCode === 89 && ctrlPushed) {
            if (Date.now() - keyPushedLast > gameSettings.interval) {
                // isDifficultTerrain = !isDifficultTerrain;
                if (difficultTerrainMultiplier <= 1)
                    difficultTerrainMultiplier = gameSettings.max;
                else
                    difficultTerrainMultiplier -= gameSettings.incremt;
                if (difficultTerrainMultiplier < 1)
                    difficultTerrainMultiplier = 1
                keyPushedLast = Date.now();
                drawFromToken(e, waypoints);
            }
        }

        ctrlReleased = !e.ctrlKey;
        return oldKeyEvent.apply(this, arguments);
    };

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
