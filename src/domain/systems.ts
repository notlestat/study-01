import type { SystemId } from './composition';

interface SystemDefinition {
  id: SystemId;
  description: string;
}

// Only ORDER has a generator in Phase 02.
export const SYSTEMS = [
  { id: 'ORDER', description: 'Structure, alignment, repetition.' },
  { id: 'SILENCE', description: 'Space, restraint, quiet emphasis. Coming later.' },
  { id: 'TENSION', description: 'Contrast, imbalance, opposing forces. Coming later.' },
] as const satisfies readonly SystemDefinition[];
