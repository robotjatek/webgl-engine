import { ILevelEvent } from './ILevelEvent';
import { Hero } from '../Hero';
import { Camera } from '../Camera';
import { vec2, vec3 } from 'gl-matrix';
import { Environment } from '../Environment';
import { Level } from '../Level';
import { OldMan } from '../Actors/OldMan';
import { SoundEffectPool } from '../SoundEffectPool';
import { SoundEffect } from '../SoundEffect';
import { IFadeOut, IQuitEventListener } from '../Game';
import { UIService } from '../UIService';
import { Textbox } from '../Textbox';
import { Sequence } from '../Sequence/Sequence';
import { SequenceBuilder } from '../Sequence/SequenceBuilder';
import { ISequenceStep } from '../Sequence/ISequenceStep';

class MoveToWaypoint implements ISequenceStep {

    public constructor(private hero: Hero, private waypoint: vec3) {
    }

    public async Update(delta: number): Promise<boolean> {
        this.hero.AcceptInput = false;
        const distanceFromWaypoint = vec3.distance(this.waypoint, this.hero.CenterPosition);
        if (distanceFromWaypoint > 0.5) {
            this.hero.Move(vec3.fromValues(0.005, 0, 0), delta);
            return false;
        } else {
            return true;
        }
    }
}

class SpawnOldMan implements ISequenceStep {
    private timeAfterSpawn = 0;

    public constructor(private level: Level, private oldMan: OldMan) {
    }

    public async Update(delta: number): Promise<boolean> {
        // Spawn old man
        if (this.timeAfterSpawn === 0) {
            this.level.AddGameObject(this.oldMan);
        }
        this.timeAfterSpawn += delta;
        return this.timeAfterSpawn > 2000;
    }

}

class DragonRoar implements ISequenceStep {
    private roarFinished = false;
    private static readonly FADE_OUT_TIME = 10000;
    private _timeSinceFadeOutStarted = 0;
    private _fadeState = 0;

    public constructor(private dragonRoar: SoundEffect, private _game: IFadeOut) {
    }

    public async Update(delta: number): Promise<boolean> {
        // Dragon roar
        if (this._timeSinceFadeOutStarted === 0) {
            this.dragonRoar.Play(1, 1, () => this.roarFinished = true, false);
        }

        this._timeSinceFadeOutStarted += delta;
        const fadeStep = 1.0 / (DragonRoar.FADE_OUT_TIME / delta);
        this._fadeState += fadeStep;

        this._game.SetFadeOut(this._fadeState);

        return this.roarFinished;
    }

}

// This is now hardcoded for the last level. In the future this event could be a scriptable event
// TODO: show picture boxes for the talking characters
export class OutroEvent implements ILevelEvent {
    public static EVENT_KEY = 'outro_event';

    private sequence: Sequence;
    private conversationSequence: Sequence;

    private constructor(private hero: Hero, private camera: Camera, private level: Level, private oldMan: OldMan,
                        private dragonRoar: SoundEffect, private game: (IQuitEventListener & IFadeOut),
                        private uiService: UIService, private textBox: Textbox) {
        this.sequence = this.CreateSequence();
        this.conversationSequence = this.ConversationSequence();
    }

    public static async Create(hero: Hero, camera: Camera, level: Level, game: IQuitEventListener & IFadeOut,
                               uiService: UIService): Promise<OutroEvent> {
        const oldMan = await OldMan.Create(vec3.fromValues(33, 13, 0), level.MainLayer);
        const dragonRoar = await SoundEffectPool.GetInstance().GetAudio('audio/wrong_dragon.mp3', false);
        const textbox = await uiService.AddTextbox();
        return new OutroEvent(hero, camera, level, oldMan, dragonRoar, game, uiService, textbox);
    }

    public async Update(delta: number): Promise<void> {
        // Lock camera in position
        const vec = vec3.fromValues(Environment.HorizontalTiles / 2, Environment.VerticalTiles, 0);
        this.camera.LookAtPosition(vec, this.level.MainLayer);
        await this.sequence.Update(delta);
    }

    public get CanStart(): boolean {
        return true;
    }

    public get EventKey(): string {
        return OutroEvent.EVENT_KEY;
    }

    public Dispose(): void {
        // old man shouldn't be disposed as it is added to the game objects, so it will be automatically disposed
        this.uiService.RemoveTextbox(this.textBox);
    }

    private ConversationSequence(): Sequence {
        return new SequenceBuilder()
            .Action(async (_) => {
                this.textBox.WithText('What are you doing here?',
                    this.TextboxPositionForActor(this.oldMan.Position), 0.5);
                return true;
            }).Wait(3000)
            .Action(async (_) => {
                this.textBox.WithText('I\'ve killed the dragon',
                    this.TextboxPositionForActor(this.hero.Position), 0.5);
                return true;
            })
            .Wait(3000)
            .Action(async (_) => {
                this.textBox.WithText('You mean that little lizard down in the valley?',
                    this.TextboxPositionForActor(this.oldMan.Position), 0.5);
                return true;
            }).Wait(3000)
            .Action(async (_) => {
                this.textBox.WithText('We eat those things for breakfast back in the village',
                    this.TextboxPositionForActor(this.oldMan.Position), 0.5);
                return true;
            }).Wait(3000)
            .Action(async (_) => {
                this.textBox.WithText('I\'m afraid you\'ve killed the wrong dragon',
                    this.TextboxPositionForActor(this.oldMan.Position), 0.5);
                return true;
            }).Wait(3000)
            .Action(async (_) => {
                this.textBox.WithText('What do you mean the \"wrong dragon\"?',
                    this.TextboxPositionForActor(this.hero.Position), 0.5);
                return true;
            }).Wait(3000)
            .Build();
    }

    private TextboxPositionForActor(actorPosition: vec3): vec2 {
        return vec2.fromValues(this.uiService.TileWidth * actorPosition[0],
            this.uiService.TileHeight * actorPosition[1] - this.uiService.TileHeight);
    }

    private CreateSequence() {
        return new SequenceBuilder()
            .Add(new MoveToWaypoint(this.hero, vec3.fromValues(10, 15, 0)))
            .Action(async (delta: number) => {
                // hero looks back where he came from
                this.hero.Move(vec3.fromValues(-0.035, 0, 0), delta);
                return true;
            })
            .Add(new SpawnOldMan(this.level, this.oldMan))
            .Action(async (delta: number) => {
                // old man moves towards the hero
                const oldManDistanceToHero = vec3.distance(this.oldMan.CenterPosition, this.hero.CenterPosition);
                if (oldManDistanceToHero > 3) {
                    this.oldMan.Move(vec3.fromValues(-0.005, 0, 0), delta);
                    return false;
                }
                return true;
            })
            .Action(async (delta: number) => {
                // Hero looks at the old man
                this.hero.Move(vec3.fromValues(0.0025, 0, 0), delta);
                return true;
            })
            .Action(async (delta: number) => {
                // Conversation with a lot of text
                return await this.conversationSequence.Update(delta);
            })
            .Add(new DragonRoar(this.dragonRoar, this.game))
            .Action(async (_: number) => {
                // go to main menu
                await this.game.Quit();
                return true;
            }).Build();
    }
}