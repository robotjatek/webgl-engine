import { GameStateBase } from './GameStateBase';
import { SharedGameStateVariables } from './SharedGameStateVariables';
import { mat4 } from 'gl-matrix';
import { Level } from '../Level';
import { Game } from './Game';

export class NextLevelLoadState extends GameStateBase {
    public constructor(private game: Game, sharedGameStateVariables: SharedGameStateVariables, private levelName: string) {
        super(sharedGameStateVariables);
    }

    public Draw(elapsed: number, projectionMatrix: mat4): void {
    }

    protected override async UpdateState(delta: number): Promise<void> {
        await this.game.ChangeState(this.game.IN_GAME_STATE());
    }

    public async Enter(): Promise<void> {
        const oldLevel = this.game.Level;
        oldLevel?.StopMusic();
        oldLevel?.Dispose();
        this.game.Camera.Reset();
        this.game.Level = null;
    }

    public async Exit(): Promise<void> {
        const nextLevel = await Level.Create(this.levelName, this.game.KeyHandler, this.game.GamepadHandler, this.game.UiService, this.game.Camera, this.game);
        nextLevel.SubscribeToNextLevelEvent(this.game);
        nextLevel.SubscribeToRestartEvent(this.game);
        await nextLevel.InitLevel();
        this.game.Level = nextLevel;
    }
}
