import { McqQuestion, SelectedUnitId, UnitInfo } from './mcqTypes';
import {
  UNIT_1_QUESTIONS,
  UNIT_2_QUESTIONS,
  UNIT_3_QUESTIONS,
  UNIT_4_QUESTIONS,
  UNIT_5_QUESTIONS,
} from './units1to5';
import { UNIT_6_QUESTIONS, UNIT_7_QUESTIONS } from './units6to7';
import { UNIT_8_QUESTIONS, UNIT_9_QUESTIONS } from './units8to9';
import { UNIT_10_QUESTIONS, UNIT_11_QUESTIONS } from './units10to11';
import { UNIT_12_QUESTIONS, UNIT_13_QUESTIONS } from './units12to13';
import { UNIT_14_QUESTIONS, UNIT_15_QUESTIONS } from './units14to15';
import { UNIT_16_QUESTIONS, UNIT_17_QUESTIONS } from './units16to17';
import { UNIT_18_QUESTIONS, UNIT_19_QUESTIONS } from './units18to19';

export const SCIENCE_UNITS: UnitInfo[] = [
  { id: 1, titleSi: 'ක්ෂුද්‍ර ජීවීන්ගේ භාවිත', subtitleEn: 'Applications of Microorganisms', part: 'I', questionCount: 35 },
  { id: 2, titleSi: 'ඇස සහ කන', subtitleEn: 'Eye and Ear', part: 'I', questionCount: 35 },
  { id: 3, titleSi: 'පදාර්ථයේ ස්වභාවය හා ගුණ', subtitleEn: 'Nature and Properties of Matter', part: 'I', questionCount: 35 },
  { id: 4, titleSi: 'බලය හා සම්බන්ධ මූලික සංකල්ප', subtitleEn: 'Basic Concepts Associated with Force', part: 'I', questionCount: 35 },
  { id: 5, titleSi: 'ඝන ද්‍රව්‍ය මගින් ඇති කරන පීඩනය', subtitleEn: 'Pressure Exerted by Solid Objects', part: 'I', questionCount: 35 },
  { id: 6, titleSi: 'මානව රුධිර සංසරණ පද්ධතිය', subtitleEn: 'Human Blood Circulatory System', part: 'I', questionCount: 35 },
  { id: 7, titleSi: 'ශාක වර්ධක ද්‍රව්‍ය', subtitleEn: 'Plant Growth Substances', part: 'I', questionCount: 35 },
  { id: 8, titleSi: 'ජීවීන්ගේ සන්ධාරණය හා චලනය', subtitleEn: 'Support and Movements of Organisms', part: 'I', questionCount: 35 },
  { id: 9, titleSi: 'පරිණාමික ක්‍රියාවලිය', subtitleEn: 'The Evolutionary Process', part: 'I', questionCount: 35 },
  { id: 10, titleSi: 'විද්‍යුත් විච්ඡේදනය', subtitleEn: 'Electrolysis', part: 'II', questionCount: 35 },
  { id: 11, titleSi: 'ඝනත්වය', subtitleEn: 'Density', part: 'II', questionCount: 35 },
  { id: 12, titleSi: 'ජෛව විවිධත්වය', subtitleEn: 'Bio-diversity', part: 'II', questionCount: 35 },
  { id: 13, titleSi: 'කෘත්‍රිම පරිසරය හා හරිත සංකල්පය', subtitleEn: 'Artificial Environment & Green Concept', part: 'II', questionCount: 35 },
  { id: 14, titleSi: 'තරංග පරාවර්තනය හා වර්තනය', subtitleEn: 'Reflection & Refraction of Waves', part: 'II', questionCount: 35 },
  { id: 15, titleSi: 'සරල යන්ත්‍ර', subtitleEn: 'Simple Machines', part: 'II', questionCount: 35 },
  { id: 16, titleSi: 'නැනෝ තාක්ෂණය හා එහි භාවිත', subtitleEn: 'Nano Technology & Its Uses', part: 'II', questionCount: 35 },
  { id: 17, titleSi: 'අකුණු අනතුරු', subtitleEn: 'Lightning Accidents', part: 'II', questionCount: 35 },
  { id: 18, titleSi: 'ස්වාභාවික ආපදා', subtitleEn: 'Natural Disasters', part: 'II', questionCount: 35 },
  { id: 19, titleSi: 'ස්වාභාවික සම්පත් තිරසරව භාවිතය', subtitleEn: 'Sustainable Use of Natural Resources', part: 'II', questionCount: 35 },
];

export const UNIT_QUESTION_BANKS: Record<number, McqQuestion[]> = {
  1: UNIT_1_QUESTIONS,
  2: UNIT_2_QUESTIONS,
  3: UNIT_3_QUESTIONS,
  4: UNIT_4_QUESTIONS,
  5: UNIT_5_QUESTIONS,
  6: UNIT_6_QUESTIONS,
  7: UNIT_7_QUESTIONS,
  8: UNIT_8_QUESTIONS,
  9: UNIT_9_QUESTIONS,
  10: UNIT_10_QUESTIONS,
  11: UNIT_11_QUESTIONS,
  12: UNIT_12_QUESTIONS,
  13: UNIT_13_QUESTIONS,
  14: UNIT_14_QUESTIONS,
  15: UNIT_15_QUESTIONS,
  16: UNIT_16_QUESTIONS,
  17: UNIT_17_QUESTIONS,
  18: UNIT_18_QUESTIONS,
  19: UNIT_19_QUESTIONS,
};

export const ALL_MCQ_QUESTIONS: McqQuestion[] = SCIENCE_UNITS.flatMap(
  (unit) => UNIT_QUESTION_BANKS[unit.id] || []
);

export function getUnitInfo(unitId: SelectedUnitId): UnitInfo | null {
  if (unitId === 'all') return null;
  return SCIENCE_UNITS.find((u) => u.id === unitId) || SCIENCE_UNITS[0];
}

export function getQuestionsForUnit(unitId: SelectedUnitId): McqQuestion[] {
  if (unitId === 'all') {
    return ALL_MCQ_QUESTIONS;
  }
  return UNIT_QUESTION_BANKS[unitId] || UNIT_1_QUESTIONS;
}

export interface PickedMcqResult {
  question: McqQuestion;
  nextUsedByUnit: Record<number, string[]>;
  cycleCompletedAndReset: boolean;
}

/**
 * Picks a question strictly from the chosen unit (or all units if 'all')
 * without repeating any previously asked question until all questions in that
 * unit's 35-question cycle have been asked.
 */
export function pickNextMcqQuestion(
  selectedUnit: SelectedUnitId,
  usedByUnit: Record<number, string[]>
): PickedMcqResult {
  const nextUsedByUnit: Record<number, string[]> = {};
  for (const unit of SCIENCE_UNITS) {
    nextUsedByUnit[unit.id] = [...(usedByUnit[unit.id] || [])];
  }

  let cycleCompletedAndReset = false;

  if (selectedUnit === 'all') {
    let available = ALL_MCQ_QUESTIONS.filter(
      (q) => !nextUsedByUnit[q.unitId].includes(q.id)
    );
    if (available.length === 0) {
      // All 665 questions across all units have been completed -> reset all cycles
      for (const unit of SCIENCE_UNITS) {
        nextUsedByUnit[unit.id] = [];
      }
      available = ALL_MCQ_QUESTIONS;
      cycleCompletedAndReset = true;
    }
    const chosen = available[Math.floor(Math.random() * available.length)];
    nextUsedByUnit[chosen.unitId].push(chosen.id);
    if (
      nextUsedByUnit[chosen.unitId].length >=
      (UNIT_QUESTION_BANKS[chosen.unitId]?.length || 35)
    ) {
      // That specific unit's 35 questions just finished; leave full until next reset
    }
    return {
      question: chosen,
      nextUsedByUnit,
      cycleCompletedAndReset,
    };
  }

  const unitBank = getQuestionsForUnit(selectedUnit);
  const currentUsed = nextUsedByUnit[selectedUnit] || [];
  let available = unitBank.filter((q) => !currentUsed.includes(q.id));

  if (available.length === 0) {
    // All 35 questions in this unit were already asked -> reset only this unit's cycle
    nextUsedByUnit[selectedUnit] = [];
    available = unitBank;
    cycleCompletedAndReset = true;
  }

  const chosen = available[Math.floor(Math.random() * available.length)];
  nextUsedByUnit[selectedUnit] = [...nextUsedByUnit[selectedUnit], chosen.id];

  return {
    question: chosen,
    nextUsedByUnit,
    cycleCompletedAndReset,
  };
}
