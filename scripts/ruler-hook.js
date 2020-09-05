class waypoint {
    constructor(difficultTerrain) {
        this.difficultTerrain = difficultTerrain;
    }
}

class detailedWaypointData {
    constructor(startPoint, endPoint, difficultWaypoints, isDifficultNow) {
        this.endPoint = endPoint;
        this.difficultWaypoints = difficultWaypoints;
        this.isDifficultNow = isDifficultNow;
        this.startPoint = startPoint;
    }
}

export function patchRuler() {
    let ctrlPushed = false;
    let ctrlReleased = false;
    let isDifficultTerrain = false;
    let keyPushedLast = Date.now();
    let waypoints = [];
    let allWaypoints = new Map();
    let difficultTerrainMultiplier = game.settings.get("rulerfromtoken", "diffTerrainMultiplier");

    const oldClear = canvas.controls.ruler.clear;
    const oldKeyEvent = KeyboardManager.prototype.getKey;
    const handleMouseMove = event => {
        if (ctrlPushed) drawFromToken(event, waypoints);
    };
    const handleClick = () => {
        if (ctrlReleased) return canvas.controls.ruler.clear();
        waypoints.push(new waypoint(isDifficultTerrain));
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
                isCurrentlyDifficult: isDifficultTerrain
            }, activityData.ruler)
        }
        oldBoradcast.apply(this, arguments);
    }

    const oldRulerUpdate = canvas.controls.updateRuler;
    canvas.controls.updateRuler = function (user, ruler) {
        if (ruler !== null)
            allWaypoints.set(user.id, new detailedWaypointData(ruler.waypoints[0], ruler.destination, ruler.difficultTerrain, ruler.isCurrentlyDifficult))
        oldRulerUpdate.apply(this, arguments)
    }

    const oldHexDist = HexagonalGrid.prototype.measureDistances;
    HexagonalGrid.prototype.measureDistances = function (segments, options = {}) {
        let currentWaypoints = null;
        let currentlyDifficult;

        allWaypoints.forEach(value => {
            if (value.startPoint.x === segments[0].ray.A.x && value.startPoint.y === segments[0].ray.A.y
                && value.endPoint.x === segments[segments.length - 1].ray.B.x && value.endPoint.y === segments[segments.length - 1].ray.B.y){
                currentWaypoints = value.difficultWaypoints;
                currentlyDifficult = value.isDifficultNow
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
            currentlyDifficult = isDifficultTerrain
        }

        return segments.map((s, i) => {
            let r = s.ray;
            let [r0, c0] = this.getGridPositionFromPixels(r.A.x, r.A.y);
            let [r1, c1] = this.getGridPositionFromPixels(r.B.x, r.B.y);

            // Use cube conversion to measure distance
            let hex0 = this._offsetToCube(r0, c0);
            let hex1 = this._offsetToCube(r1, c1);
            let distance = this._cubeDistance(hex0, hex1);
            if (waypoints.length <= i)
                return distance * canvas.dimensions.distance * (currentlyDifficult ? difficultTerrainMultiplier : 1);
            return distance * canvas.dimensions.distance * (currentWaypoints[i].difficultTerrain ? difficultTerrainMultiplier : 1);

        });
    };


    const oldSquareDist = SquareGrid.prototype.measureDistances;
    SquareGrid.prototype.measureDistances = function (segments, options = {}) {
        let currentWaypoints = null;
        let currentlyDifficult;
        console.log(segments)
        console.log(segments.length)
        if(segments.length === 0)
            return oldSquareDist.apply(this,arguments);
        allWaypoints.forEach(value => {
            if (value.startPoint.x === segments[0].ray.A.x && value.startPoint.y === segments[0].ray.A.y
                && value.endPoint.x === segments[segments.length - 1].ray.B.x && value.endPoint.y === segments[segments.length - 1].ray.B.y){
                currentWaypoints = value.difficultWaypoints || [];
                console.log(currentWaypoints)
                currentlyDifficult = value.isDifficultNow
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
            currentlyDifficult = isDifficultTerrain
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
            if (currentWaypoints.length <= i)
                return (nd + ns) * d.distance * (currentlyDifficult ? difficultTerrainMultiplier : 1);
            return (nd + ns) * d.distance * (currentWaypoints[i].difficultTerrain ? difficultTerrainMultiplier : 1);
        });
    };

    canvas.controls.ruler.clear = function () {
        oldClear.apply(this, arguments);
        if (ctrlReleased) {
            canvas.app.stage.removeListener('pointermove', handleMouseMove);
            canvas.app.stage.removeListener('pointerdown', handleClick);
            ctrlPushed = ctrlReleased = isDifficultTerrain = false;
            keyPushedLast = Date.now();
            waypoints = [];
        }
    };

    KeyboardManager.prototype.getKey = function (e) {
        if (e.ctrlKey && !ctrlPushed) {
            canvas.app.stage.addListener('pointermove', handleMouseMove);
            canvas.app.stage.addListener('pointerdown', handleClick);
            ctrlPushed = true;
            ctrlReleased = false;
            isDifficultTerrain = false;
            keyPushedLast = Date.now();
            waypoints = [];
            difficultTerrainMultiplier = game.settings.get("rulerfromtoken", "diffTerrainMultiplier");
            drawFromToken(e, waypoints);
        }

        if (e.keyCode === 88) {
            if (Date.now() - keyPushedLast > 200) {
                isDifficultTerrain = !isDifficultTerrain;
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
