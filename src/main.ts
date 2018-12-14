import { Game } from "./Game";

let game: Game;

window.addEventListener("load", () => {
    let mousePressed = false;
    let x = 0;
    let y = 0;

    game = new Game();
    const canvas = document.getElementById("canvas");

    canvas.addEventListener("wheel", (event) => {
        game.MouseScroll(event);
        return false;
    });

    canvas.addEventListener("mousedown", (event) => {
        mousePressed = true;
        x = event.clientX;
        y = event.clientY;
    });

    canvas.addEventListener("mousemove", (event) => {
        if (mousePressed)
        {
            const offsetX = x - event.clientX;
            const offsetY = y - event.clientY;
            game.DragTo(offsetX, offsetY);
            x = event.clientX;
            y = event.clientY;
        }
    });

    canvas.addEventListener("mouseup", () => {
        mousePressed = false;
    });

    game.Run();
}, false);

window.addEventListener("resize", () => {
    game.Resize();
}, false);
