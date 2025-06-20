import { Hero } from 'src/Hero';
import { DragonEnemy } from '../../DragonEnemy';
import { DragonStateBase } from '../DragonStateBase';
import { IState } from '../../../IState';
import { RushState } from './RushState';

export class StartState extends DragonStateBase implements IState {

    public constructor(hero: Hero, dragon: DragonEnemy, private context: RushState) {
        super(hero, dragon);
    }

    public async Enter(): Promise<void> {
        // do nothing
    }

    public async Exit(): Promise<void> {
        // do nothing
    }

    public override async Update(delta: number): Promise<void> {
        await this.context.ChangeState(this.context.BACKING_STATE());
        this.MatchHeroHeight(delta);
    }
}
