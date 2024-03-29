import domready = require("domready");
import { Game } from "./Game";
import { KeyHandler } from "./KeyHandler";
import { Keys } from './Keys';

domready(() => {
  const keyHandler = new KeyHandler();
  const game = new Game(keyHandler);

  const canvas = document.getElementById("canvas");

  canvas.addEventListener("keydown", (event) => {
    keyHandler.SetKey(event.code, true);
    if (event.code == Keys.SPACE) {
      event.preventDefault();
    }
  }, false);

  canvas.addEventListener("keyup", (event) => {
    keyHandler.SetKey(event.code, false);
    if (event.code == Keys.SPACE) {
      event.preventDefault();
    }
  }, false);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      game.Pause();
    } else {
      game.Play();
    }
  });

  game.Run();
});