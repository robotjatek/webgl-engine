import { ILevelEvent } from './ILevelEvent';
import { Hero } from '../Hero/Hero';
import { Camera } from '../Camera';
import { vec2, vec3 } from 'gl-matrix';
import { Environment } from '../Environment';
import { Level } from '../Level';
import { OldMan } from '../Actors/OldMan';
import { SoundEffectPool } from '../SoundEffectPool';
import { SoundEffect } from '../SoundEffect';
import { IFadeOut, IQuitEventListener } from '../Game/Game';
import { UIService } from '../UIService';
import { Textbox } from '../Textbox';
import { Sequence } from '../Sequence/Sequence';
import { SequenceBuilder } from '../Sequence/SequenceBuilder';
import { ISequenceStep } from '../Sequence/ISequenceStep';

import { InputSource } from '../Components/Input/InputSource';

class MoveToWaypoint implements ISequenceStep {


    public constructor(private hero: Hero, private waypoint: vec3, private input: InputSource) {
    }

    public async Update(delta: number): Promise<boolean> {
        const distanceFromWaypoint = vec3.distance(this.waypoint, this.hero.CenterPosition);
        if (distanceFromWaypoint > 0.5) {
            this.hero.Speed = 0.0001;
            this.input.PressKey("right");
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
    private roarStarted = false;
    private _timeSinceRoarStarted = 0;
    private heroReactedToRoar = false;
    private _fadeState = 0;

    public constructor(private _dragonRoar: SoundEffect, private _game: IFadeOut, private hero: Hero, private input: InputSource) {
    }

    public async Update(delta: number): Promise<boolean> {
        // Dragon roar
        if (this._timeSinceFadeOutStarted === 0) {
            await this._dragonRoar.Play(1, 1, () => this.roarFinished = true, false);
            this.roarStarted = true;
        }

        this._timeSinceRoarStarted += delta;
        if (this._timeSinceRoarStarted > 500 && !this.heroReactedToRoar) {
            this.heroReactedToRoar = true;
            this.hero.Speed = 0.0005;
            this.input.PressKey("left");
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
    private input: InputSource | null;

    private constructor(private hero: Hero, private camera: Camera, private level: Level, private oldMan: OldMan,
                        private dragonRoar: SoundEffect, private game: (IQuitEventListener & IFadeOut),
                        private uiService: UIService, private textBox: Textbox) {
        this.input = this.hero.TakeoverControl();
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
        this.level.RemoveGameObject(this.oldMan);
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

    private CreateSequence(): Sequence {
        return new SequenceBuilder()
            .Add(new MoveToWaypoint(this.hero, vec3.fromValues(10, 15, 0), this.input!))
            .Action(async (_: number) => {
                // hero looks back where he came from
                this.hero.Speed = 0.00025;
                this.input!.PressKey("left");
                return true;
            })
            .Add(new SpawnOldMan(this.level, this.oldMan))
            .Action(async (_: number) => {
                // old man moves towards the hero
                const oldManDistanceToHero = vec3.distance(this.oldMan.CenterPosition, this.hero.CenterPosition);
                if (oldManDistanceToHero > 3) {
                    this.oldMan.Move(vec3.fromValues(-0.001, 0, 0));
                    return false;
                }
                return true;
            })
            .Action(async (_: number) => {
                // Hero looks at the old man
                this.hero.Speed = 0.00005;
                this.input!.PressKey("right");
                return true;
            })
            .Action(async (delta: number) => {
                // Conversation with a lot of text
                return await this.conversationSequence.Update(delta);
            })
            .Add(new DragonRoar(this.dragonRoar, this.game, this.hero, this.input!))
            .Action(async (_: number) => {
                // go to main menu
                await this.game.Quit();
                return true;
            })
            .Action(async (_: number) => {
                this.hero.ReleaseControl();
                this.hero.Speed = this.hero.DEFAULT_SPEED;
                this.input = null;
                return true
            })
            .Build();
    }
}
