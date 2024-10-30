import { Hero } from 'src/Hero';
import { DragonEnemy } from '../../DragonEnemy';
import { DragonStateBase } from '../DragonStateBase';
import { IState } from '../IState';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { RushState } from './RushState';

export class StartState extends DragonStateBase implements IState {

    public constructor(hero: Hero, dragon: DragonEnemy, private context: RushState) {
        super(hero, dragon);
    }

    public Enter(): void {
        // do nothing
    }
    public Exit(): void {
        // do nothing
    }

    async Update(delta: number, shared: SharedDragonStateVariables): Promise<void> {
        this.context.ChangeState(this.context.BACKING_STATE());
        this.MatchHeroHeight(delta);
    }
}
