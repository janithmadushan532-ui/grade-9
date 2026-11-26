export interface UnitInfo {
  id: number; // 1 to 19
  titleSi: string;
  subtitleEn: string;
  part: 'I' | 'II';
  questionCount: number;
}

export interface McqQuestion {
  id: string;
  unitId: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export type SelectedUnitId = number | 'all';
