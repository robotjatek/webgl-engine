import { IState } from '../IState';
import { mat4 } from 'gl-matrix';

export interface IGameState extends IState {
    Draw(elapsed: number, projectionMatrix: mat4): void;
}
