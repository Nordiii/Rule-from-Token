export function patchRuler() {
    let ctrlPushed = false;
    let ctrlReleased = false;

    const oldClear = canvas.controls.ruler.clear;
    const oldKeyEvent = KeyboardManager.prototype.getKey;

    const handleMouseMove = event => {
        if (ctrlPushed) drawFromToken(event);
    };
    const handleClick = () => {
        if (ctrlReleased) canvas.controls.ruler.clear();
    };

    canvas.controls.ruler.clear = function () {
        oldClear.apply(this, arguments);
        if (ctrlReleased) {
            canvas.app.stage.removeListener('pointermove', handleMouseMove);
            canvas.app.stage.removeListener('pointerdown', handleClick);
            ctrlPushed = ctrlReleased = false;
        }
    };

    KeyboardManager.prototype.getKey = function (e) {
        if (e.ctrlKey && !ctrlPushed) {
            canvas.app.stage.addListener('pointermove', handleMouseMove);
            canvas.app.stage.addListener('pointerdown', handleClick);
            ctrlPushed = true;
            ctrlReleased = false;
            drawFromToken(e);
        }

        ctrlReleased = !e.ctrlKey;
        return oldKeyEvent.apply(this, arguments);
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