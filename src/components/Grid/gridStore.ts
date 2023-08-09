import { atom } from "nanostores";

type Coords = [number, number];
type AId = string | null;

export const initialCoords = atom<Coords>([0, 0]);
export const activeId = atom<AId>(null);
