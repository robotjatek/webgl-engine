import { IControlSource } from './IControlSource';
import { Keys } from '../../Keys';
import { KeyHandler } from '../../KeyHandler';
import { ControllerHandler } from '../../ControllerHandler';
import { XBoxControllerKeys } from '../../XBoxControllerKeys';

export class PlayerControlSource implements IControlSource {

    public constructor(private keyHandler: KeyHandler, private gamepadHandler: ControllerHandler) {
    }

    public Attack(): boolean {
        return (this.keyHandler.IsPressed(Keys.E) || this.gamepadHandler.IsPressed(XBoxControllerKeys.X) ||
            this.keyHandler.IsPressed(Keys.LEFT_CONTROL) || this.keyHandler.IsPressed(Keys.RIGHT_SHIFT));

    }

    public Dash(): boolean {
        return (this.keyHandler.IsPressed(Keys.LEFT_SHIFT) ||
            this.gamepadHandler.IsPressed(XBoxControllerKeys.RB));

    }

    public Jump(): boolean {
        return (this.keyHandler.IsPressed(Keys.SPACE) ||
            this.keyHandler.IsPressed(Keys.UP_ARROW) ||
            this.keyHandler.IsPressed(Keys.W) ||
            this.gamepadHandler.IsPressed(XBoxControllerKeys.A));

    }

    public Left(): boolean {
        return (this.keyHandler.IsPressed(Keys.A) ||
            this.keyHandler.IsPressed(Keys.LEFT_ARROW) ||
            this.gamepadHandler.IsPressed(XBoxControllerKeys.LEFT) ||
            this.gamepadHandler.LeftStick[0] < -0.5);


    }

    public Right(): boolean {
        return (this.keyHandler.IsPressed(Keys.D) ||
            this.keyHandler.IsPressed(Keys.RIGHT_ARROW) ||
            this.gamepadHandler.IsPressed(XBoxControllerKeys.RIGHT) ||
            this.gamepadHandler.LeftStick[0] > 0.5);


    }

    public Stomp(): boolean {
        return (this.keyHandler.IsPressed(Keys.S) ||
            this.keyHandler.IsPressed(Keys.DOWN_ARROW) ||
            this.gamepadHandler.IsPressed(XBoxControllerKeys.DOWN) ||
            this.gamepadHandler.LeftStick[1] > 0.8);
    }
}
