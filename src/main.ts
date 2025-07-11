import domready = require('domready');
import { Game } from './Game';
import { ControllerHandler } from "./ControllerHandler";
import { KeyHandler } from './KeyHandler';
import { Keys } from './Keys';

domready(async () => {
  const keyHandler = new KeyHandler();
  const controllerHandler = new ControllerHandler();

  const game = await Game.Create(keyHandler, controllerHandler);

  const isSpecialKey = (code: string) => {
    const specialKeys = [Keys.LEFT_CONTROL, Keys.RIGHT_CONTROL, Keys.SPACE, Keys.LEFT_SHIFT, Keys.RIGHT_SHIFT,
      Keys.LEFT_ARROW, Keys.RIGHT_ARROW, Keys.UP_ARROW, Keys.DOWN_ARROW];
    return specialKeys.indexOf(code) > -1;
  }

  const canvas = document.getElementById('canvas')!;

  canvas.addEventListener('keydown', (event) => {
    keyHandler.SetKey(event.code, true);
    if (isSpecialKey(event.code)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, false);

  canvas.addEventListener('keyup', (event) => {
    keyHandler.SetKey(event.code, false);
    if (isSpecialKey(event.code)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, false);

  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      await game.ChangeState(game.PAUSED_STATE());
    }
  });

  window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
    controllerHandler.ActivateGamepad(e.gamepad.index);
  });

  canvas.focus();
  await game.Run();
});
