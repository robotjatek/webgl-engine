import { IGameState } from './IGameState';
import { MainScreen } from '../MainScreen';
import { mat4 } from 'gl-matrix';
import { SoundEffectPool } from '../SoundEffectPool';
import { ResourceTracker } from '../ResourceTracker';
import { Game } from './Game';

export class StartScreenState implements IGameState {

    public constructor(private readonly game: Game,
                       private readonly mainScreen: MainScreen) {
    }

    public async Update(delta: number): Promise<void> {
        await this.mainScreen.Update(delta);
    }

    public Draw(elapsed: number, projectionMatrix: mat4): void {
        this.mainScreen?.Draw(projectionMatrix);
    }

    public async Enter(): Promise<void> {
        this.game.Level!.StopMusic();
        this.game.Level!.Dispose();
        this.game.Level = null;

        this.game.Camera.Reset();
        SoundEffectPool.GetInstance().StopAll();
        this.game.SetFadeOut(0);
        ResourceTracker.GetInstance().StopTracking();
    }

    public async Exit(): Promise<void> {
        ResourceTracker.GetInstance().StartTracking();
        await this.game.Level?.InitLevel();
    }

}
