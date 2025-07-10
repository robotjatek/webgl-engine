import { IState } from '../../IState';
import { Hero } from '../Hero';
import { vec2, vec3 } from 'gl-matrix';
import { Animation } from '../../Components/Animation';
import { SoundEffect } from '../../SoundEffect';

export class DeadState implements IState {

    private timeLeftInDeadState = 3000;
    private dirOnDeath: vec3 = vec3.create();

    public constructor(private hero: Hero,
                       private onDeath: () => void,
                       private dieSound: SoundEffect,
                       private sharedStateVariables: { bbSize: vec2, bbOffset: vec3, rotation: number },
                       private animation: Animation) {
    }

    public async Enter(): Promise<void> {
                await this.dieSound.Play();
                await this.animation.Stop();
    }

    public async Exit(): Promise<void> {
        await this.animation.Start();
    }

    public async Update(delta: number): Promise<void> {

        this.timeLeftInDeadState -= delta;
        if (this.timeLeftInDeadState <= 0) {
            this.onDeath();
        }
        this.dirOnDeath = vec3.clone(this.hero.FacingDirection);
        this.sharedStateVariables.bbSize = vec2.fromValues(this.sharedStateVariables.bbSize[1], this.sharedStateVariables.bbSize[0]);

        // This is only kind-of correct, but im already in dead state so who cares if the bb is not correctly aligned.
        // The only important thing is not to fall through the geometry...
        this.sharedStateVariables.bbOffset[1] = this.dirOnDeath[0] > 0 ?
            1.5 - this.sharedStateVariables.bbOffset[1] : 1.5 - this.sharedStateVariables.bbOffset[1];
        this.sharedStateVariables.rotation = this.dirOnDeath[0] > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
}
