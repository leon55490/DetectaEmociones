export type EmotionKey =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'surprise'
  | 'fear'
  | 'disgust'
  | 'neutral';

export interface EmotionScores {
  happy: number;
  sad: number;
  angry: number;
  surprise: number;
  fear: number;
  disgust: number;
  neutral: number;
}

export interface FacialArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EmotionAnalysisResponse {
  success: boolean;
  face_detected: boolean;
  faces_count: number;
  dominant_emotion: EmotionKey | null;
  dominant_emotion_label: string | null;
  confidence: number | null;
  emotions: EmotionScores | null;
  facial_area: FacialArea | null;
  message: string | null;
  processing_time_ms: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  detector_backend: string;
  model_loaded: boolean;
}

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'permission_denied'
  | 'no_device'
  | 'error';

export interface EmotionMeta {
  key: EmotionKey;
  label: string;
  emoji: string;
  color: string;
  barClass: string;
  badgeClass: string;
  description: string;
}

export const EMOTION_CATALOG: Record<EmotionKey, EmotionMeta> = {
  happy: {
    key: 'happy',
    label: 'Feliz',
    emoji: '😊',
    color: '#16A34A',
    barClass: 'bg-[#16A34A]',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    description: 'Comisuras labiales elevadas y activación orbicular.',
  },
  surprise: {
    key: 'surprise',
    label: 'Sorprendido',
    emoji: '😮',
    color: '#14B8A6',
    barClass: 'bg-[#14B8A6]',
    badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30',
    description: 'Cejas arqueadas y apertura ocular o mandibular.',
  },
  neutral: {
    key: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    color: '#4F46E5',
    barClass: 'bg-[#4F46E5]',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    description: 'Rostro en reposo sin contracciones musculares marcadas.',
  },
  sad: {
    key: 'sad',
    label: 'Triste',
    emoji: '😢',
    color: '#3B82F6',
    barClass: 'bg-blue-500',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    description: 'Descenso en comisuras labiales y cejas internas.',
  },
  angry: {
    key: 'angry',
    label: 'Enojado',
    emoji: '😠',
    color: '#DC2626',
    barClass: 'bg-[#DC2626]',
    badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
    description: 'Ceño fruncido y tensión en la región interciliar y labial.',
  },
  fear: {
    key: 'fear',
    label: 'Con miedo',
    emoji: '😨',
    color: '#D97706',
    barClass: 'bg-[#D97706]',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    description: 'Tensión ocular superior y cejas elevadas juntas.',
  },
  disgust: {
    key: 'disgust',
    label: 'Disgustado',
    emoji: '🤢',
    color: '#9333EA',
    barClass: 'bg-purple-600',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    description: 'Contracción nasal y elevación asimétrica del labio superior.',
  },
};

export const EMOTION_ORDER: EmotionKey[] = [
  'happy',
  'neutral',
  'surprise',
  'sad',
  'angry',
  'fear',
  'disgust',
];
