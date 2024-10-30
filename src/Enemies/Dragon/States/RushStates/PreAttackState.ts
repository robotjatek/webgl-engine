import { Hero } from 'src/Hero';
import { DragonEnemy } from '../../DragonEnemy';
import { DragonStateBase } from '../DragonStateBase';
import { IState } from '../IState';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { RushState } from './RushState';

export class PreAttackState extends DragonStateBase implements IState {
    private timeInPreAttack = 0;

    public constructor(hero: Hero, dragon: DragonEnemy, private context: RushState) {
        super(hero, dragon);
    }

    public async Update(delta: number, shared: SharedDragonStateVariables): Promise<void> {
        // The charge is completed but we wait a couple of frames before executing an attack
        this.timeInPreAttack += delta;

        if (this.timeInPreAttack > 96) {
            this.timeInPreAttack = 0;
            this.context.ChangeState(this.context.ATTACK_STATE());
        }

        this.MatchHeroHeight(delta);
    }

    public Enter(): void {
        this.timeInPreAttack = 0;
    }

    public Exit(): void {
        // Do nothing
    }
}
