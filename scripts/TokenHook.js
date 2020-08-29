export function Patch_Drag() {
    let oldKeyEvent = KeyboardEvent.prototype.getKey;

    KeyboardEvent.prototype.getKey = function (e) {
        oldKeyEvent.apply(this,arguments);
        console.log(e);
    }
}