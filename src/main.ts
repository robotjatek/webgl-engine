import domready = require("domready");
import { Game } from "./Game";
import { KeyHandler } from "./KeyHandler";
import { Keys } from './Keys';

domready(() => {
  const keyHandler = new KeyHandler();
  const game = new Game(keyHandler);

  const isSpecialKey = (code: string) => {
    const specialKeys = [Keys.LEFT_CONTROL, Keys.RIGHT_CONTROL, Keys.SPACE];
    return specialKeys.indexOf(code) > -1;
  }

  const canvas = document.getElementById("canvas");

  canvas.addEventListener("keydown", (event) => {
    keyHandler.SetKey(event.code, true);
    if (isSpecialKey(event.code)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, false);

  canvas.addEventListener("keyup", (event) => {
    keyHandler.SetKey(event.code, false);
    if (isSpecialKey(event.code)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, false);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      game.Pause();
    } else {
      game.Play();
    }
  });

  canvas.focus();
  game.Run();
});