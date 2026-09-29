// These types describe composition intent. They have no dependency on React or the DOM.
export const SYSTEM_IDS = ['ORDER', 'SILENCE', 'TENSION'] as const;
export type SystemId = (typeof SYSTEM_IDS)[number];

export const LOCK_KEYS = ['GRID', 'TYPE', 'IMAGE', 'TEXTURE'] as const;
export type LockKey = (typeof LOCK_KEYS)[number];
export type CompositionLocks = Record<LockKey, boolean>;

export interface ImageAsset {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  origin: 'sample' | 'local';
}

export interface CompositionInput {
  title: string;
  metadata: string;
  image: ImageAsset | null;
}

export interface StudySession {
  system: SystemId;
  input: CompositionInput;
  locks: CompositionLocks;
}
