/** Ambient stubs so TypeScript passes before optional WebGL packages are installed. */
declare module '@react-three/fiber' {
  import type { ReactNode } from 'react';
  export function Canvas(props: Record<string, unknown>): JSX.Element;
  export function useFrame(cb: (state: { clock: { elapsedTime: number } }) => void): void;
}
declare module '@react-three/drei' {
  import type { ReactNode } from 'react';
  export function Float(props: Record<string, unknown> & { children?: ReactNode }): JSX.Element;
  export function Line(props: Record<string, unknown>): JSX.Element;
  export function Text(props: Record<string, unknown>): JSX.Element;
}
declare module 'three' {
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    normalize(): this;
  }
  export const ACESFilmicToneMapping: number;
  export type Group = { rotation: { x: number; y: number; z: number } };
  export type Mesh = {
    scale: { setScalar: (n: number) => void };
    position: { set: (x: number, y: number, z: number) => void };
  };
}
