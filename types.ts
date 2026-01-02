export interface ModelDimensions {
  width: number;
  height: number;
  depth: number;
  volume: number;
}

export interface AnalysisMessage {
  role: 'user' | 'ai';
  content: string;
  isError?: boolean;
}

export enum ViewerMode {
  VIEW = 'VIEW',
  MEASURE = 'MEASURE',
  AI_ANALYSIS = 'AI_ANALYSIS',
  ALIGN = 'ALIGN'
}