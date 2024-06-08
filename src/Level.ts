import { mat4, vec2, vec3 } from "gl-matrix";
import { Background } from "./Background";
import { Layer } from "./Layer";
import { Shader } from "./Shader";
import { SpriteBatch } from "./SpriteBatch";
import { TexturePool } from "./TexturePool";
import { Tile } from "./Tile";
import { SoundEffectPool } from './SoundEffectPool';
import { SoundEffect } from './SoundEffect';
import { Texture } from './Texture';
import { Hero } from './Hero';
import { KeyHandler } from './KeyHandler';
import { ControllerHandler } from './ControllerHandler';
import { IGameobject } from './IGameobject';
import { IProjectile } from './Projectiles/IProjectile';
import { IEndConditionsMetEventListener, LevelEnd } from './LevelEnd';
import { DragonEnemy } from './Enemies/DragonEnemy';
import { SlimeEnemy } from './Enemies/SlimeEnemy';
import { Spike } from './Enemies/Spike';
import { Cactus } from './Enemies/Cactus';
import { CoinObject } from './Pickups/CoinObject';
import { HealthPickup } from './Pickups/HealthPickup';
import { INextLevelEvent, IRestartListener } from './Game';
import { IDisposable } from './IDisposable';

type TileEntity = {
    xPos: number,
    yPos: number,
    texture: string
}

type LayerEntity = {
    tiles: TileEntity[]
}

type GameObjectEntity = {
    type: string,
    xPos: number,
    yPos: number,
}

type LevelEndEntity = {
    xPos: number,
    yPos: number
}

type StartEntity = {
    xPos: number,
    yPos: number
}

type LevelEntity = {
    background: string,
    music: string,
    layers: LayerEntity[],
    gameObjects: GameObjectEntity[],
    levelEnd: LevelEndEntity,
    start: StartEntity,
    nextLevel: string,
    defaultLayer: number
}

// TODO: parallax scrolling
export class Level implements IDisposable {
    private Background: SpriteBatch;
    private BackgroundViewMatrix = mat4.create();
    private gameObjects: IGameobject[] = [];
    private attack: IProjectile;
    private hero: Hero;
    private levelEndSoundPlayed: boolean = false;
    // Makes the game "pause" for some time when the level end was reached
    public updateDisabled: boolean = false;
    private restartEventListeners: IRestartListener[] = [];
    private nextLevelEventListeners: INextLevelEvent[] = [];
    private endConditionsMetEventListeners: IEndConditionsMetEventListener[] = [];

    private constructor(private layers: Layer[], private defaultLayer: number, bgShader: Shader, bgTexture: Texture, private music: SoundEffect, private levelDescriptor: LevelEntity,
        private levelEndOpenSoundEffect: SoundEffect, private keyHandler: KeyHandler, private gamepadHandler: ControllerHandler
    ) {
        this.Background = new SpriteBatch(bgShader, [new Background()], bgTexture);
    }

    public static async Create(levelName: string, keyHandler: KeyHandler, gamepadHandler: ControllerHandler): Promise<Level> {
        levelName = levelName + '?version=' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

        const texturePool = TexturePool.GetInstance();
        const levelJsonString = await (await fetch(levelName)).text();
        const levelDescriptor = JSON.parse(levelJsonString) as LevelEntity;
        const loadedLayers = await Promise.all(levelDescriptor.layers.map(async layer => {
            const loadedTiles = await Promise.all(layer.tiles.map(async tile => {
                const texure = await texturePool.GetTexture(tile.texture);
                return new Tile(tile.xPos, tile.yPos, texure)
            }));

            return await Layer.Create(loadedTiles);
        }));

        const bgShader: Shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');
        const bgTexture = await TexturePool.GetInstance().GetTexture(levelDescriptor.background);
        const music = await SoundEffectPool.GetInstance().GetAudio(levelDescriptor.music, false);

        const levelEndOpenSoundEffect = await SoundEffectPool.GetInstance().GetAudio('audio/bell.wav', false);

        return new Level(loadedLayers,
            levelDescriptor.defaultLayer,
            bgShader,
            bgTexture,
            music,
            levelDescriptor,
            levelEndOpenSoundEffect,
            keyHandler,
            gamepadHandler);
    }

    public get Hero(): Hero {
        return this.hero;
    }

    public Draw(projectionMatrix: mat4, viewMatrix: mat4): void {
        this.Background.Draw(projectionMatrix, this.BackgroundViewMatrix);
        this.layers.forEach((layer, i) => {
            const cameraTranslation = mat4.getTranslation(vec3.create(), viewMatrix);

            // TODO: initial x,y offset per layer
            // TODO: layer based translationfactor
            const layerMatrix = mat4.clone(viewMatrix);
            const xOffset = (i - this.defaultLayer) * cameraTranslation[0] * 0.05;
            const yOffset = (i - this.defaultLayer) * cameraTranslation[1] * 0.1;
            
            const parallaxOffset = vec3.fromValues(xOffset, yOffset, 0);
            mat4.translate(layerMatrix, layerMatrix, parallaxOffset)

            layer.Draw(projectionMatrix, layerMatrix);
            if (i === this.defaultLayer) {
                this.gameObjects.forEach(h => h.Draw(projectionMatrix, viewMatrix));
                this.attack?.Draw(projectionMatrix, viewMatrix);
                this.hero.Draw(projectionMatrix, viewMatrix);
            }
        });
    }

    public async Update(delta: number): Promise<void> {
        if (!this.updateDisabled) {
            this.hero.Update(delta);

            // Kill the hero if fallen into a pit
            if (this.MainLayer.IsUnder(this.hero.BoundingBox)) {
                this.hero.Kill();
            }

            // Handle collisions between hero projectile(s) and game objects.
            await this.attack?.Update(delta);
            if (this.attack && !this.attack.AlreadyHit) {
                const enemiesCollidingWithProjectile = this.gameObjects.filter(e => e.IsCollidingWith(this.attack.BoundingBox, false));
                // Pushback force does not necessarily mean the amount of pushback. A big enemy can ignore a sword attack for example
                enemiesCollidingWithProjectile.forEach(e => e.CollideWithAttack(this.attack));
                this.attack.OnHit();
            }

            this.gameObjects.forEach(async (e: IGameobject) => {
                await e.Update(delta);
                if (e.IsCollidingWith(this.hero.BoundingBox, false)) {
                    this.hero.CollideWithGameObject(e);
                }

                // Despawn out-of-bounds gameobjects. These will be projectiles most of the time.
                if (this.MainLayer.IsOutsideBoundary(e.BoundingBox)) {
                    this.gameObjects = this.gameObjects.filter(item => item !== e);
                    e.Dispose();
                }
            });

            this.CheckForEndCondition();
        }
    }

    public get MainLayer(): Layer {
        return this.layers[this.defaultLayer];
    }

    public PlayMusic(volume: number): void {
        this.music.Play(1, volume, null, true);
    }

    public StopMusic(): void {
        this.music.Stop();
    }

    public SetMusicVolume(volume: number): void {
        this.music.SetVolume(volume);
    }

    private CheckForEndCondition(): void {
        const numberOfEndConditions = this.gameObjects.filter(p => p.EndCondition).length;
        if (numberOfEndConditions === 0 && !this.levelEndSoundPlayed) {
            this.levelEndOpenSoundEffect.Play();
            this.levelEndSoundPlayed = true;

            this.endConditionsMetEventListeners.forEach(l => l.OnEndConditionsMet());
        }
    }

    private async RestartLevel(): Promise<void> {
        this.endConditionsMetEventListeners = [];

        this.hero.Dispose();
        await this.InitHero();

        this.gameObjects.forEach(o => o.Dispose());
        this.gameObjects = [];
        await this.InitGameObjects();
        this.updateDisabled = false;
        this.levelEndSoundPlayed = false;
    }

    public async InitLevel(): Promise<void> {
        this.restartEventListeners.forEach(l => l.OnRestartEvent());
        this.SetMusicVolume(0.4);

        await this.InitHero();
        await this.InitGameObjects();
        this.updateDisabled = false;
        this.levelEndSoundPlayed = false;
    }

    public SubscribeToRestartEvent(listener: IRestartListener): void {
        this.restartEventListeners.push(listener);
    }

    public SubscribeToNextLevelEvent(listener: INextLevelEvent): void {
        this.nextLevelEventListeners.push(listener);
    }

    public SubscribeToEndConditionsMetEvent(listener: IEndConditionsMetEventListener): void {
        this.endConditionsMetEventListeners.push(listener);
    }

    private async InitHero(): Promise<void> {
        this.hero = await Hero.Create(
            vec3.fromValues(this.levelDescriptor.start.xPos - 0.9, this.levelDescriptor.start.yPos - 1.91, 1), // shift heroes spawn position by the height of its bounding box
            vec2.fromValues(3, 3),
            this.MainLayer,
            async () => await this.RestartLevel(),
            (sender: Hero, projectile: IProjectile) => this.attack = projectile,
            (attack: IProjectile) => this.DespawnAttack(attack),
            this.keyHandler,
            this.gamepadHandler
        );
    }

    private async CreateGameObject(descriptor: GameObjectEntity): Promise<IGameobject> {
        switch (descriptor.type) {
            case 'coin':
                return await CoinObject.Create(
                    vec3.fromValues(descriptor.xPos, descriptor.yPos, 1), (c) => this.RemoveGameObject(c));
            case 'health':
                return await HealthPickup.Create(
                    vec3.fromValues(descriptor.xPos, descriptor.yPos - 1, 1), (c) => this.RemoveGameObject(c));
            case 'spike':
                return await Spike.Create(
                    vec3.fromValues(descriptor.xPos, descriptor.yPos, 1), vec2.fromValues(1, 1));
            case 'cactus':
                return await Cactus.Create(
                    vec3.fromValues(descriptor.xPos, descriptor.yPos - 2, 1), (c) => this.RemoveGameObject(c));
            case 'slime':
                return await SlimeEnemy.Create(
                    vec3.fromValues(descriptor.xPos, descriptor.yPos - 1.8, 1), vec2.fromValues(3, 3), this.MainLayer,
                    (c) => this.RemoveGameObject(c));
            case 'dragon':
                return await DragonEnemy.Create(
                    vec3.fromValues(descriptor.xPos, descriptor.yPos - 4, 1),
                    vec2.fromValues(5, 5),
                    this.MainLayer,
                    this.hero, // To track where the hero is, i want to move as much of the game logic from the update loop as possible
                    (sender: DragonEnemy) => { this.RemoveGameObject(sender) }, // onDeath
                    // Spawn projectile
                    (sender: DragonEnemy, projectile: IProjectile) => {
                        this.gameObjects.push(projectile);
                        // Despawn projectile that hit
                        // TODO: instead of accessing a public array, projectiles should have a subscribe method
                        projectile.OnHitListeners.push(s => this.RemoveGameObject(s)); // TODO: despawning hero attack should be like this
                    }
                );
            default:
                throw new Error('Unknown object type');
        }
    }

    private RemoveGameObject(toRemove: IGameobject): void {
        this.gameObjects = this.gameObjects.filter(e => e !== toRemove);
        toRemove.Dispose();
    }

    private DespawnAttack(attack: IProjectile): void {
        // TODO: Attack as a gameobject?
        attack?.Dispose();
        this.attack = null;
    }

    private async InitGameObjects(): Promise<void> {
        const objects = await Promise.all(this.levelDescriptor.gameObjects.map(async (o) => await this.CreateGameObject(o)));
        this.gameObjects.push(...objects);

        const levelEnd = await LevelEnd.Create(vec3.fromValues(this.levelDescriptor.levelEnd.xPos - 1, this.levelDescriptor.levelEnd.yPos, 0),
            async () => {
                this.nextLevelEventListeners.forEach(l => l.OnNextLevelEvent(this.levelDescriptor.nextLevel));
            }, this
        );
        this.SubscribeToEndConditionsMetEvent(levelEnd);
        this.gameObjects.push(levelEnd);
        // TODO: 2) change level format and jsons to support multiple levelends
    }

    public Dispose(): void {
        this.layers.forEach(l => l.Dispose());
        this.layers = [];
        this.Background.Dispose();
        this.Hero.Dispose();
        this.attack?.Dispose();
        this.gameObjects.forEach(e => e.Dispose());
        this.gameObjects = [];
        this.restartEventListeners = [];
        this.nextLevelEventListeners = [];
        this.endConditionsMetEventListeners = [];
    }
}
