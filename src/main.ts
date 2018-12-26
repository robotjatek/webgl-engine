import domready = require("domready");
import { Game } from "./Game";
import { KeyHandler } from "./KeyHandler";

domready(() => {
    const keyHandler = new KeyHandler();
    const game = new Game(keyHandler);

    const canvas = document.getElementById("canvas");

    canvas.addEventListener("keydown", (event) => {
        keyHandler.SetKey(event.key, true);
    }, false);

    canvas.addEventListener("keyup", (event) => {
        keyHandler.SetKey(event.key, false);
    }, false);

    game.Run();
});