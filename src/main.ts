import { Game } from "./Game";

let game: Game;

window.addEventListener("load", () => {
    game = new Game();
    const canvas = document.getElementById("canvas");

    game.Run();
}, false);

window.addEventListener("resize", () => {
    game.Resize();
}, false);
