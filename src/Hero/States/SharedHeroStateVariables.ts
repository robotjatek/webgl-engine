import { vec2, vec3 } from 'gl-matrix';

export type SharedHeroStateVariables = {
    timeSinceLastDash: number,
    dashAvailable: boolean,
    dashUsed: boolean,
    timeSinceLastStomp: number,
    bbOffset: vec3,
    bbSize: vec2,
    rotation: number,
    timeSinceLastMeleeAttack: number,
    timeInOverHeal: number
}
