import { EmotionType } from '../../types';

// ==========================================
// 1. Raw Inputs Layer
// ==========================================
export type TimeBlock = 
  | 'early_morning' // 05:00 - 08:00
  | 'morning'       // 08:00 - 11:30
  | 'midday'        // 11:30 - 13:30
  | 'afternoon'     // 13:30 - 17:00
  | 'evening'       // 17:00 - 21:00
  | 'night'         // 21:00 - 00:00
  | 'late_night';   // 00:00 - 05:00

export interface EngineInput {
  timeBlock: TimeBlock;
  isWeekend: boolean;
  tabCountBucket: 'light' | 'normal' | 'heavy' | 'overloaded';
  hasAudibleTab: boolean;
  audibleTabCount: number;
  idleBucket: 'active' | 'away' | 'long_away';
  reentryState: 'recent_return' | 'continuous';
  clickedEmotion?: EmotionType;
  // Optional modifiers
  isHoliday?: boolean;
}

// ==========================================
// 2. Scene Layer
// ==========================================
export type BaseTimeScene = 
  | 'morning_buffer' 
  | 'workday_ramp_up' 
  | 'late_morning_flow' 
  | 'midday_transition' 
  | 'afternoon_scatter' 
  | 'late_day_drag' 
  | 'evening_exhale' 
  | 'night_overhang';

export type OverrideScene = 
  | 'quiet_return' 
  | 'overloaded_browser' 
  | 'emotional_checkin';

export type Scene = BaseTimeScene | OverrideScene;

export interface SceneResolution {
  scene: Scene;
  isOverride: boolean;
  dayToneModifier?: 'sunday_reset' | 'soft_weekend' | 'holiday_drift';
}

// ==========================================
// 3. Intent Layer
// ==========================================
export type Intent = 
  | 'contextual_greeting' 
  | 'gentle_re_entry' 
  | 'emotional_acknowledgment' 
  | 'soft_grounding' 
  | 'rhythm_mirroring' 
  | 'light_focus_support' 
  | 'soft_closure';

// ==========================================
// 4. Emotion Bias Layer
// ==========================================
export type EmotionBias = 
  | 'positive' 
  | 'okay' 
  | 'tired' 
  | 'anxious' 
  | 'scattered' 
  | 'heavy';

// ==========================================
// 5. Strategy Layer
// ==========================================
export type ResponseStrategy = 
  | 'mirror' 
  | 'soothe' 
  | 'ground' 
  | 'focus' 
  | 'rhythm' 
  | 'reentry';

// ==========================================
// 6. Complete Pipeline State (passed to LLM)
// ==========================================
export interface PipelineState {
  input: EngineInput;
  sceneResolution: SceneResolution;
  intent: Intent;
  emotionBias: EmotionBias;
  strategy: ResponseStrategy;
  
  // Output limits
  constraints: {
    englishWordsRange: [number, number];
    chineseCharsRange: [number, number];
    maxLengthChars: number;
  };
}
