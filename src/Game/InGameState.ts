import { GameStateBase } from './GameStateBase';
import { Textbox } from '../Textbox';
import { UIService } from '../UIService';
import { KeyHandler } from '../KeyHandler';
import { ControllerHandler } from '../ControllerHandler';
import { SharedGameStateVariables } from './SharedGameStateVariables';
import { Keys } from '../Keys';
import { XBoxControllerKeys } from '../XBoxControllerKeys';
import { mat4, vec2 } from 'gl-matrix';
import { Game } from './Game';

export class InGameState extends GameStateBase {

    private healthTextbox!: Textbox;
    private scoreTextbox!: Textbox;

    public constructor(private readonly game: Game,
                       private readonly uiService: UIService,
                       private keyHandler: KeyHandler,
                       private gamepadHandler: ControllerHandler,
                       sharedGameStateVariables: SharedGameStateVariables) {
        super(sharedGameStateVariables);
    }

    protected override async UpdateState(delta: number): Promise<void> {
        if (this.sharedGameStateVariables.elapsedTimeSinceStateChange > 150 && this.game.Level) {
            if (!this.keyHandler.IsPressed(Keys.ENTER) && !this.gamepadHandler.IsPressed(XBoxControllerKeys.START)
                && !this.sharedGameStateVariables.keyWasReleased && this.sharedGameStateVariables.elapsedTimeSinceStateChange > 100) {
                this.sharedGameStateVariables.keyWasReleased = true;
            }

            if ((this.keyHandler.IsPressed(Keys.ENTER) || this.gamepadHandler.IsPressed(XBoxControllerKeys.START))
                && this.sharedGameStateVariables.keyWasReleased && this.sharedGameStateVariables.elapsedTimeSinceStateChange > 100) {
                await this.game.ChangeState(this.game.PAUSED_STATE());
                this.sharedGameStateVariables.keyWasReleased = false;
                return;
            }
        }

        const healthTextColor = (() => {
            if (this.game.Level!.Hero.Health < 35) {
                return {hue: 0, saturation: 100 / 100, value: 100 / 100};
            } else if (this.game.Level!.Hero.Health > 100) {
                return {hue: 120 / 360, saturation: 100 / 100, value: 100 / 100};
            } else {
                return {hue: 0, saturation: 0, value: 100 / 100};
            }
        })();

        this.healthTextbox
            .WithText(`Health: ${this.game.Level!.Hero.Health}`, vec2.fromValues(10, 0), 0.5)
            .WithHue(healthTextColor.hue)
            .WithSaturation(healthTextColor.saturation)
            .WithValue(healthTextColor.value);

        this.scoreTextbox
            .WithText(`Coins: ${this.game.Level!.Hero.CollectedCoins}`, vec2.fromValues(10, this.healthTextbox.Height), 0.5);

        await this.game.Level!.Update(delta);
    }

    public Draw(elapsed: number, projectionMatrix: mat4): void {
        this.game.Level?.Draw(projectionMatrix);
        this.uiService.Draw(elapsed);
    }

    public async Enter(): Promise<void> {
        this.healthTextbox = await this.uiService.AddTextbox();
        this.scoreTextbox = await this.uiService.AddTextbox();
    }

    public async Exit(): Promise<void> {
        this.uiService.RemoveTextbox(this.healthTextbox);
        this.uiService.RemoveTextbox(this.scoreTextbox);
    }


}
