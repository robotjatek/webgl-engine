import { vec2 } from 'gl-matrix';

export class ControllerHandler {
  private activeControllerId: number;

  public ActivateGamepad(index: number): void {
    this.activeControllerId = index;
  }

  public IsPressed(keyId: number): boolean {
    const activeController = navigator.getGamepads()[this.activeControllerId];
    if (activeController) {
      return activeController.buttons[keyId].pressed;
    }

    return false;
  }

  public get LeftStick(): vec2 {
    const activeController = navigator.getGamepads()[this.activeControllerId];
    if (activeController) {
      const x = activeController.axes[0];
      const y = activeController.axes[1];
      return vec2.fromValues(x, y);
    }

    return vec2.create();
  }

}
