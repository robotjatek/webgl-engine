import { mat4, vec2, vec3 } from "gl-matrix";
import { Background } from "./Background";
import { Layer } from "./Layer";
import { Shader } from "./Shader";
import { SpriteBatch } from "./SpriteBatch";
import { TexturePool } from "./TexturePool";
import { Tile } from "./Tile";
import { Environment } from './Environment';
import { SoundEffectPool } from './SoundEffectPool';
import { SoundEffect } from './SoundEffect';
import { Texture } from './Texture';
import { Hero } from './Hero';
import { KeyHandler } from './KeyHandler';
import { ControllerHandler } from './ControllerHandler';
import { IEnemy } from './Enemies/IEnemy';
import { IGameobject } from './IGameobject';
import { IProjectile } from './Projectiles/IProjectile';
import { LevelEnd } from './LevelEnd';
import { DragonEnemy } from './Enemies/DragonEnemy';
import { SlimeEnemy } from './Enemies/SlimeEnemy';
import { Spike } from './Enemies/Spike';
import { Cactus } from './Enemies/Cactus';
import { CoinObject } from './Pickups/CoinObject';
import { HealthPickup } from './Pickups/HealthPickup';
import { IRestartListener } from './Game';
import { IDisposable } from './IDisposable';

type TileEntity = {
    xPos: number,
    yPos: number,
    texture: "string"
}

type LayerEntity = {
    tiles: TileEntity[]
}

type GameObjectEntity = {
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
    start: StartEntity
}


// TODO: parallax scrolling
export class Level implements IDisposable {
    private Background: SpriteBatch;
    private BackgroundViewMatrix = mat4.create();
    private gameObjects: IGameobject[] = [];
    private attack: IProjectile;
    private hero: Hero;

    private levelEndSoundPlayed: boolean = false;
    private canUpdate: boolean = false;
    private restartEventListeners: IRestartListener[] = [];

    private constructor(private layers: Layer[], bgShader: Shader, bgTexture: Texture, private music: SoundEffect,
        private levelEnd: LevelEnd, private levelEndOpenSoundEffect: SoundEffect, private keyHandler: KeyHandler, private gamepadHandler: ControllerHandler
    ) {
        this.Background = new SpriteBatch(bgShader, [new Background()], bgTexture);
    }

    public static async Create(keyHandler: KeyHandler, gamepadHandler: ControllerHandler): Promise<Level> {
        const texturePool = TexturePool.GetInstance();
        const levelJsonString = await (await fetch('levels/level1.json')).text();
        const level = JSON.parse(levelJsonString) as LevelEntity;

        const loadedLayers = await Promise.all(level.layers.map(async layer => {
            const loadedTiles = await Promise.all(layer.tiles.map(async tile => {
                const texure = await texturePool.GetTexture('textures/' + tile.texture);
                return new Tile(tile.xPos, tile.yPos, texure)
            }));
            
            return await Layer.Create(loadedTiles);
        }));
    
        const bgShader: Shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');
        const bgTexture = await TexturePool.GetInstance().GetTexture(level.background);
        const music = await SoundEffectPool.GetInstance().GetAudio(level.music, false);

        const levelEnd = await LevelEnd.Create(vec3.fromValues(level.levelEnd.xPos, level.levelEnd.yPos, 0));
        const levelEndOpenSoundEffect = await SoundEffectPool.GetInstance().GetAudio('audio/bell.wav', false);

        return new Level(loadedLayers, bgShader, bgTexture, music, levelEnd, levelEndOpenSoundEffect, keyHandler, gamepadHandler);

    }

    public get Hero(): Hero {
        return this.hero;
    }

    public Draw(projectionMatrix: mat4, viewMatrix: mat4): void {
        this.Background.Draw(projectionMatrix, this.BackgroundViewMatrix);
        this.layers.forEach((layer) => {
            layer.Draw(projectionMatrix, viewMatrix);
        });

        this.gameObjects.forEach(h => h.Draw(projectionMatrix, viewMatrix));
        this.levelEnd.Draw(projectionMatrix, viewMatrix);
        this.attack?.Draw(projectionMatrix, viewMatrix);
        this.hero.Draw(projectionMatrix, viewMatrix);
    }

    public async Update(delta: number): Promise<void> {
        if (!this.canUpdate) {
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
        return this.layers[0];
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

    private CheckForEndCondition() {
        const numberOfEndConditions = this.gameObjects.filter(p => p.EndCondition).length;
        this.levelEnd.IsEnabled = numberOfEndConditions === 0;
        if (this.levelEnd.IsEnabled && !this.levelEndSoundPlayed) {
            this.levelEndOpenSoundEffect.Play();
            this.levelEndSoundPlayed = true;
        }

        if (this.levelEnd.IsCollidingWith(this.hero.BoundingBox)) {
            if (this.levelEnd.IsEnabled) {
                this.canUpdate = true;
                this.SetMusicVolume(0.25);
            }

            this.levelEnd.Interact(this.hero, async () => {
                await this.InitLevel(); // TODO: this will be move to next level or something like that when multilevel support is implemented
            });
        }
    }

    public async InitLevel() {
        this.restartEventListeners.forEach(l => l.OnRestartEvent());
        this.SetMusicVolume(0.4);

        // TODO: should I dispose entities in the init method
        // TODO: Create on Next level call
        // TODO: Dispose on level end
        this.gameObjects.forEach(p => p.Dispose());
        this.gameObjects = [];

        if (this.hero) {
            this.hero.Dispose();
            this.hero = null;
        }

        this.levelEnd.Dispose();
        this.levelEnd = await LevelEnd.Create(vec3.fromValues(58, Environment.VerticalTiles - 4, 0));

        await this.InitHero();
        await this.CreateEnemies();
        await this.InitPickups();

        this.canUpdate = false;
        this.levelEndSoundPlayed = false;
    }

    public SubscribeToRestartEvent(listener: IRestartListener): void {
        this.restartEventListeners.push(listener);
    }

    private async InitHero(): Promise<void> {
        this.hero = await Hero.Create(
            vec3.fromValues(0, Environment.VerticalTiles - 5, 1),
            vec2.fromValues(3, 3),
            this.MainLayer,
            // BUG: if a hero dies then the pause button is pressed the level will restart in a paused state. The level should not restart until unpaused
            async () => await this.InitLevel(),
            (sender: Hero, projectile: IProjectile) => this.attack = projectile,
            (attack: IProjectile) => this.DespawnAttack(attack),
            this.keyHandler,
            this.gamepadHandler
        );
    }

    private async CreateEnemies(): Promise<void> {
        const dragons = [
            await DragonEnemy.Create(
                vec3.fromValues(55, Environment.VerticalTiles - 7, 1),
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
            )
        ];

        const slimes = [
            await SlimeEnemy.Create(
                vec3.fromValues(25, Environment.VerticalTiles - 5, 1),
                vec2.fromValues(3, 3),
                this.MainLayer,
                (e) => this.RemoveGameObject(e)),

            await SlimeEnemy.Create(
                vec3.fromValues(34, Environment.VerticalTiles - 5, 1),
                vec2.fromValues(3, 3),
                this.MainLayer,
                (e: IGameobject) => this.RemoveGameObject(e))
        ];

        const spikes = [
            await Spike.Create(
                vec3.fromValues(52, Environment.VerticalTiles - 2, 0),
                vec2.fromValues(1, 1)),

            await Spike.Create(
                vec3.fromValues(53, Environment.VerticalTiles - 2, 0),
                vec2.fromValues(1, 1)),

            await Spike.Create(
                vec3.fromValues(54, Environment.VerticalTiles - 2, 0),
                vec2.fromValues(1, 1)),
        ];

        const cacti: IEnemy[] = [
            await Cactus.Create(
                vec3.fromValues(45, Environment.VerticalTiles - 5, 0),
                (sender: IGameobject) => this.RemoveGameObject(sender)
            )
        ];

        this.gameObjects.push(
            ...slimes,
            ...dragons,
            ...spikes,
            ...cacti);
    }

    private RemoveGameObject(toRemove: IGameobject): void {
        this.gameObjects = this.gameObjects.filter(e => e !== toRemove);
        toRemove.Dispose();
    }

    private DespawnAttack(attack: IProjectile) {
        // TODO: Attack as a gameobject?
        attack?.Dispose();
        this.attack = null;
    }

    private async InitPickups() {
        const coins = [
            await CoinObject.Create(vec3.fromValues(21, 10, 0), c => this.RemoveGameObject(c)),
            await CoinObject.Create(vec3.fromValues(23, 10, 0), c => this.RemoveGameObject(c)),
            await CoinObject.Create(vec3.fromValues(14, Environment.VerticalTiles - 3, 0), c => this.RemoveGameObject(c)),
            await CoinObject.Create(vec3.fromValues(15, Environment.VerticalTiles - 3, 0), c => this.RemoveGameObject(c)),
            await CoinObject.Create(vec3.fromValues(16, Environment.VerticalTiles - 3, 0), c => this.RemoveGameObject(c)),
            await CoinObject.Create(vec3.fromValues(30, Environment.VerticalTiles - 3, 0), c => this.RemoveGameObject(c)),
            await CoinObject.Create(vec3.fromValues(31, Environment.VerticalTiles - 3, 0), c => this.RemoveGameObject(c)),
            await CoinObject.Create(vec3.fromValues(32, Environment.VerticalTiles - 3, 0), c => this.RemoveGameObject(c)),
            await CoinObject.Create(vec3.fromValues(50, Environment.VerticalTiles - 3, 0), c => this.RemoveGameObject(c)),
            await CoinObject.Create(vec3.fromValues(51, Environment.VerticalTiles - 3, 0), c => this.RemoveGameObject(c)),
            await CoinObject.Create(vec3.fromValues(52, Environment.VerticalTiles - 3, 0), c => this.RemoveGameObject(c)),
        ];

        const healthPickups = [
            await HealthPickup.Create(
                vec3.fromValues(28, Environment.VerticalTiles - 4, 0),
                (sender: HealthPickup) => this.RemoveGameObject(sender))
        ];

        this.gameObjects.unshift(...coins, ...healthPickups);
    }

    // TODO: call level dispose when multilevel is implemented
    public Dispose(): void {
        this.layers.forEach(l => l.Dispose());
        this.layers = [];
        this.Background.Dispose();
        this.Hero.Dispose();
        this.attack?.Dispose();
        this.levelEnd.Dispose();
        this.gameObjects.forEach(e => e.Dispose());
    }
}
