import { IState } from '../../../Enemies/IState';
import { Hero } from '../../../Hero';
import { Level } from '../../../Level';
import { SharedBossEventVariables } from '../SharedBossEventVariables';
import { BossEvent } from '../BossEvent';

/**
 * The part of the boss event after the boss died.
 * Takes the hero's controls and fades-out the boss music
 * After some wait time, changes the state to HeroExitState
 */
export class BossDeathState implements IState {

    private timeSinceBossDied = 0;

    public constructor(private context: BossEvent, private hero: Hero, private level: Level,
                       private shared: SharedBossEventVariables) {
    }

    public async Update(delta: number): Promise<void> {
        // OnBoss death state
        // move hero to the end marker
        this.hero.AcceptInput = false;
        this.timeSinceBossDied += delta;

        const musicStep = this.shared.startMusicVolume / (3000 / delta);
        this.shared.musicVolume -= musicStep;
        this.level.SetMusicVolume(this.shared.musicVolume);

        // wait for some time before moving the hero
        if (this.timeSinceBossDied > 3000) {
            await this.context.ChangeState(this.context.HERO_EXIT_STATE());
        }
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}