import { mat4, vec2, vec3, vec4 } from 'gl-matrix';
import { BoundingBox } from './BoundingBox';
import { ICollider } from './ICollider';
import { Shader } from './Shader';
import { Sprite } from './Sprite';
import { SpriteBatch } from './SpriteBatch';
import { Texture } from './Texture';
import { TexturePool } from './TexturePool';
import { Utils } from './Utils';
import { Hero } from './Hero';
import { SoundEffectPool } from './SoundEffectPool';
import { IProjectile } from './Projectiles/IProjectile';
import { Fireball } from './Projectiles/Fireball';
import { BiteProjectile } from './Projectiles/BiteProjectile';

// TODO: dragon should signal the short range attack before attacking
// TODO: do regular collision with the dragon should happen? Should stomp on dragon be possible?
export class DragonEnemy implements ICollider {
    // Animation related
    private currentFrameTime: number = 0;
    private currentAnimationFrame: number = 0;
    private leftFacingAnimationFrames = [
        vec2.fromValues(3 / 12, 3 / 8),
        vec2.fromValues(4 / 12, 3 / 8),
        vec2.fromValues(5 / 12, 3 / 8),
    ];
    private rightFacingAnimationFrames = [
        vec2.fromValues(3 / 12, 1 / 8),
        vec2.fromValues(4 / 12, 1 / 8),
        vec2.fromValues(5 / 12, 1 / 8),
    ];
    private currentFrameSet = this.leftFacingAnimationFrames;

    // Rendering related
    private texture: Texture = TexturePool.GetInstance().GetTexture('monster2.png');
    private shader: Shader = new Shader('shaders/VertexShader.vert', 'shaders/Hero.frag');
    private sprite: Sprite = new Sprite(
        Utils.DefaultSpriteVertices,
        Utils.CreateTextureCoordinates(0.0 / 12.0, 0.0 / 8.0,
            1.0 / 12.0, 1.0 / 8.0)
    );
    private batch: SpriteBatch = new SpriteBatch(this.shader, [this.sprite], this.texture);

    // Behaviour related
    private timeSinceLastAttack = 0;
    private lastFacingDirection = vec3.fromValues(-1, 0, 0); // Facing right by default

    private health = 3;
    private enemyDamageSound = SoundEffectPool.GetInstance().GetAudio('audio/enemy_damage.wav');
    private enemyDeathSound = SoundEffectPool.GetInstance().GetAudio('audio/enemy_death.wav');
    private biteAttackSound = SoundEffectPool.GetInstance().GetAudio('audio/bite2.wav');
    private damagedTime = 0;
    private damaged = false;

    private bbSize = vec2.fromValues(4.8, 3);
    private bbOffset = vec3.fromValues(0.1, 1.5, 0);

    private bbShader = new Shader('shaders/VertexShader.vert', 'shaders/Colored.frag');
    private bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
    private bbBatch: SpriteBatch = new SpriteBatch(this.bbShader, [this.bbSprite], this.texture);

    constructor(
        private position: vec3,
        private visualScale: vec2, // TODO: this should not be a parameter but hardcoded
        private collider: ICollider,
        private hero: Hero,
        private onDeath: (sender: DragonEnemy) => void,
        private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void
    ) {
        this.sprite.textureOffset = this.leftFacingAnimationFrames[0];
        //this.bbShader.SetVec4Uniform('clr', vec4.fromValues(1, 0, 0, 0.4));
    }

    public get Position(): vec3 {
        return this.position;
    }

    public get CenterPosition(): vec3 {
        return vec3.fromValues(
            this.position[0] + this.visualScale[0] / 2,
            this.position[1] + this.visualScale[1] / 2,
            0);
    }

    public get FacingDirection(): vec3 {
        return this.lastFacingDirection;
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(vec3.add(vec3.create(), this.position, this.bbOffset), this.bbSize);
    }

    public IsCollidingWidth(boundingBox: BoundingBox): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public Damage(pushbackForce: vec3): void {
        this.enemyDamageSound.Play();
        this.health--;
        this.shader.SetVec4Uniform('colorOverlay', vec4.fromValues(1, 0, 0, 0));
        // TODO: dragon does not have velocity at the moment
        //vec3.set(this.velocity, pushbackForce[0], pushbackForce[1], 0);
        // Dragon ignores pushback at the moment

        this.damaged = true;
        if (this.health <= 0) {
            if (this.onDeath) {
                this.enemyDeathSound.Play();
                this.onDeath(this);
            }
        }
    }

    public Draw(proj: mat4, view: mat4): void {
        this.batch.Draw(proj, view);
        mat4.translate(this.batch.ModelMatrix, mat4.create(), this.position);
        mat4.scale(this.batch.ModelMatrix,
            this.batch.ModelMatrix,
            vec3.fromValues(this.visualScale[0], this.visualScale[1], 1));

        // TODO: bounding box drawing
        this.bbBatch.Draw(proj, view);
        mat4.translate(this.bbBatch.ModelMatrix, mat4.create(), this.BoundingBox.position);
        mat4.scale(
            this.bbBatch.ModelMatrix,
            this.bbBatch.ModelMatrix,
            vec3.fromValues(this.bbSize[0], this.bbSize[1], 1));
    }

    public Update(delta: number): void {
        // TODO: separate timers for the long range and the short range attacks
        // TODO: short range attack only when the hero spent some time near
        // TODO: uncomment to make dragon to be able to attack
        this.timeSinceLastAttack += delta;

        // Face in the direction of the hero
        const dir = vec3.sub(vec3.create(), this.CenterPosition, this.hero.CenterPosition);
        if (dir[0] < 0) {
            this.currentFrameSet = this.rightFacingAnimationFrames;
            vec3.set(this.lastFacingDirection, -1, 0, 0);
        } else if (dir[0] > 0) {
            this.currentFrameSet = this.leftFacingAnimationFrames;
            vec3.set(this.lastFacingDirection, 1, 0, 0);
        }
        this.Animate(delta);

        this.RemoveDamageOverlayAfter(delta, 1. / 60 * 1000 * 15);

        // Attack when hero is near
        const distance = vec3.distance(this.CenterPosition, this.hero.CenterPosition);
        if (this.timeSinceLastAttack > 3000) {
            this.timeSinceLastAttack = 0;

            if (distance < 30 && distance > 10) {
                const projectileCenter = this.FacingDirection[0] > 0 ?
                    vec3.add(vec3.create(), this.CenterPosition, vec3.fromValues(-3, 1, 0)) :
                    vec3.add(vec3.create(), this.CenterPosition, vec3.fromValues(3, 1, 0));
                const fireball = new Fireball(
                    projectileCenter,
                    vec3.clone(this.FacingDirection),
                    this.collider);

                this.spawnProjectile(this, fireball);
            } else if (distance < 5) {
                const projectileCenter = this.FacingDirection[0] > 0 ?
                    vec3.add(vec3.create(), this.CenterPosition, vec3.fromValues(-3, 1, 0)) :
                    vec3.add(vec3.create(), this.CenterPosition, vec3.fromValues(3, 1, 0));
                const bite = new BiteProjectile(projectileCenter, this.FacingDirection);
                this.biteAttackSound.Play();
                this.spawnProjectile(this, bite);
            }
        }

        // Follow hero on the Y axis with a little delay.
        // "Delay" is achieved by moving the dragon slower than the hero movement speed.
        this.MatchHeroHeight(delta);

        // TODO: gravity to velocity -- flying enemy maybe does not need gravity?
        // TODO: velocity to position
    }

    // TODO: duplicated all over the place
    private RemoveDamageOverlayAfter(delta: number, showOverlayTime: number) {
        if (this.damaged) {
            this.damagedTime += delta;
        }

        if (this.damagedTime > showOverlayTime) {
            this.damagedTime = 0;
            this.damaged = false;
            this.shader.SetVec4Uniform('colorOverlay', vec4.create());
        }
    }

    private MatchHeroHeight(delta: number): void {
        // Reduce shaking by only moving when the distance is larger than a limit
        const distance = Math.abs(this.hero.CenterPosition[1] - this.CenterPosition[1]);
        if (distance > 0.2) {
            const dir = vec3.sub(vec3.create(), this.CenterPosition, this.hero.CenterPosition);
            if (dir[1] > 0) {
                this.MoveOnY(-0.0025, delta);
            } else if (dir[1] < 0) {
                this.MoveOnY(0.0025, delta);
            }
        }
    }

    private MoveOnY(amount: number, delta: number): void {
        const nextPosition = vec3.fromValues(this.position[0], this.position[1] + amount * delta, 0);
        if (!this.CheckCollisionWithCollider(nextPosition)) {
            this.position = nextPosition;
        }
    }

    private CheckCollisionWithCollider(nextPosition: vec3): boolean {
        const nextBoundingBox = new BoundingBox(vec3.add(vec3.create(), nextPosition, this.bbOffset), this.bbSize);
        return this.collider.IsCollidingWidth(nextBoundingBox, false);
    }

    private Animate(delta: number): void {
        this.currentFrameTime += delta;
        if (this.currentFrameTime > 264) {
            this.currentAnimationFrame++;
            if (this.currentAnimationFrame > 2) {
                this.currentAnimationFrame = 0;
            }

            const currentFrame = this.currentFrameSet[this.currentAnimationFrame];
            this.sprite.textureOffset = currentFrame;
            this.currentFrameTime = 0;
        }
    }

}