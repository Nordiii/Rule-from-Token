export function Patch_Drag() {

    let pushedKey = false;
    const oldKeyEvent = KeyboardManager.prototype.getKey;
    KeyboardManager.prototype.getKey = function (e) {
        if (e.ctrlKey){
            pushedKey = true;

            drawFromToken(e);
        }
        return oldKeyEvent.apply(this, arguments);
    };

    const oldLeftMouse = canvas.controls.ruler._onClickLeft;
    canvas.controls.ruler._onClickLeft = function (e) {
        oldLeftMouse.apply(this,arguments);
        pushedKey = false;
    }
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