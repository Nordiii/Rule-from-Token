export function Patch_Drag() {
    const oldClear = canvas.controls.ruler.clear;
    canvas.controls.ruler.clear = function () {
        oldClear.apply(this, arguments);
        if (ctrlReleased) {
            canvas.app.stage.removeListener('pointermove', handleMouseMove);
            canvas.app.stage.removeListener('pointerdown', handleLeftClick);
            ctrlPushed = ctrlReleased = false;
        }
    };
    let ctrlPushed = false;
    let ctrlReleased = false;
    const oldKeyEvent = KeyboardManager.prototype.getKey;
    KeyboardManager.prototype.getKey = function (e) {
        if (e.ctrlKey && !ctrlPushed) {
            canvas.app.stage.addListener('pointermove', handleMouseMove);
            canvas.app.stage.addListener('pointerdown', handleLeftClick);
            ctrlPushed = true;
            ctrlReleased = false;
            drawFromToken(e);
        }

        ctrlReleased = !e.ctrlKey;
        return oldKeyEvent.apply(this, arguments);
    };
    const handleMouseMove = event => {
        drawFromToken(event);
    };

    const handleLeftClick = () => {
        if (ctrlReleased) canvas.controls.ruler.clear();
    };
}

function drawFromToken(e) {
    let token = canvas.tokens.controlled['0'];
    if (token === undefined) return;

    let newEvent = {};
    newEvent.data = {origin: token.center, destination: {}, originalEvent: e};
    if (canvas.controls.ruler.waypoints.length > 1)
        newEvent.data.origin = canvas.controls.ruler.waypoints[canvas.controls.ruler.waypoints.length - 1];
    if (canvas.controls.ruler.waypoints.length === 0)
        canvas.controls.ruler._onDragStart(newEvent);

    newEvent.data.destination = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.app.stage);
    canvas.controls.ruler._onMouseMove(newEvent);
}