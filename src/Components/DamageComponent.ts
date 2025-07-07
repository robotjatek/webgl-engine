import { vec3 } from 'gl-matrix';
import { FlashOverlayComponent } from './FlashOverlayComponent';
import { SoundEffect } from '../SoundEffect';
import { PhysicsComponent } from './PhysicsComponent';

export interface IDamageable {
    get Health(): number;
    set Health(value: number);
    Damage(force: vec3, damageAmount: number): Promise<void>;
    DamageWithInvincibilityConsidered(pushbackForce: vec3, damage: number): Promise<void>;
}

export class DamageComponent {

    private invincible = false;
    private invincibleTime = 0;
    private isDamaged = false;
    private remainingJumpTime = 0;
    private pushbackForce = vec3.create();

    public constructor(private entity: IDamageable,
                       private flashOverlay: FlashOverlayComponent,
                       private damageSound: SoundEffect,
                       private physicsComponent: PhysicsComponent,
                       private invincibleFrames: number) {}

    public Update(delta: number): void {
        this.DisableInvincibleStateAfter(delta, this.invincibleFrames);
        this.flashOverlay.Update(delta);

        if (this.invincible) {
            this.invincibleTime += delta;
        }

        if (this.isDamaged && this.remainingJumpTime > 0) {
            this.Pushback(delta, this.pushbackForce);
        } else {
            this.isDamaged = false;
        }
    }

    public async Damage(force: vec3, damageAmount: number): Promise<void> {
        // Damage method should not consider the invincible flag because I don't want to cancel damage with projectiles when stomping
        if (this.entity.Health > 0) {
            this.invincible = true;
            this.flashOverlay.Flash(this.flashOverlay.DAMAGE_OVERLAY_COLOR,
                this.flashOverlay.DAMAGE_FLASH_DURATION);

            await this.damageSound.Play();
            this.entity.Health -= damageAmount;
            this.isDamaged = true;
            this.pushbackForce = vec3.clone(force);
            this.remainingJumpTime = 150; // Time remaining in air after pushback. This is needed to keep adding force to the physics component for a given time
        }
    }

    public async DamageWithInvincibilityConsidered(pushbackForce: vec3, damage: number): Promise<void> {
        if (!this.invincible) {
            await this.Damage(pushbackForce, damage);
        }
    }

    private Pushback(delta: number, force: vec3): void {
        const jDelta = Math.min(this.remainingJumpTime, delta);
        this.physicsComponent.AddToExternalForce(force);
        this.remainingJumpTime -= jDelta;
    }

    private DisableInvincibleStateAfter(delta: number, numberOfFrames: number): void {
        if (this.invincibleTime > 1.0 / 60 * 1000 * numberOfFrames) {
            this.invincible = false;
            this.invincibleTime = 0;
        }
        this.invincible ? this.invincibleTime += delta : this.invincibleTime = 0;
    }
}
