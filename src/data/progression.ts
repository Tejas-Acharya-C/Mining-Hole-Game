// Progression communication system types

export type ObjectiveStage =
  | 'new_game'
  | 'early_dig'
  | 'find_artifact'
  | 'artifact_found'
  | 'return_to_terminal'
  | 'terminal_activated'
  | 'find_facility_key'
  | 'facility_unlocked'
  | 'find_world_core'
  | 'core_reached'
  | 'find_fracture'
  | 'fracture_reached'
  | 'ending_choice';

export interface ObjectiveState {
  stage: ObjectiveStage;
  title: string;
  description: string;
  progress?: { current: number; target: number };
  subtasks?: string[];
}

export type JournalEntry =
  | { type: 'milestone'; title: string; date: number }
  | { type: 'discovery'; title: string; date: number }
  | { type: 'quest'; title: string; date: number };

export type HintCategory = 'general' | 'artifact' | 'terminal' | 'facility' | 'core' | 'fracture' | 'ending';
