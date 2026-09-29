import type { SystemId } from './composition';

interface SystemDefinition {
  id: SystemId;
  description: string;
}

export const SYSTEMS = [
  { id: 'ORDER', description: 'Structure, alignment, repetition.' },
  { id: 'SILENCE', description: 'Space, restraint, quiet emphasis.' },
  { id: 'TENSION', description: 'Contrast, imbalance, opposing forces.' },
] as const satisfies readonly SystemDefinition[];
