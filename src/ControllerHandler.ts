import { vec2 } from 'gl-matrix';

export class ControllerHandler {
  private activeController: Gamepad;

  public ActivateGamepad(index: number): void {
    this.activeController = navigator.getGamepads()[index];
  }

  public IsPressed(keyId: number): boolean {
    if (this.activeController) {
      return this.activeController.buttons[keyId].pressed;
    }

    return false;
  }

  public get LeftStick(): vec2 {
    if (this.activeController) {
      const x = this.activeController.axes[0];
      const y = this.activeController.axes[1];
      return vec2.fromValues(x, y);
    }

    return vec2.create();
  }

}
