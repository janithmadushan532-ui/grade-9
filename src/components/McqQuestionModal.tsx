import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { McqQuestion } from '../data/mcqTypes';
import { gameAudio } from '../game/audio';
import { POWER_UPS } from '../game/constants';
import { PowerUpType } from '../game/types';
import { PowerUpIcon } from './PowerUpIcon';

interface McqQuestionModalProps {
  question: McqQuestion;
  unitTitleSi: string;
  rewardType: PowerUpType;
  usedCountInCycle: number;
  totalInUnit: number;
  onComplete: (correct: boolean) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function McqQuestionModal({
  question,
  unitTitleSi,
  rewardType,
  usedCountInCycle,
  totalInUnit,
  onComplete,
}: McqQuestionModalProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const powerCfg = POWER_UPS[rewardType];
  const answered = selectedIdx !== null;
  const isCorrect = answered && selectedIdx === question.correctIndex;

  const handleSelectOption = (idx: number) => {
    if (answered) return;
    setSelectedIdx(idx);
    if (idx === question.correctIndex) {
      gameAudio.playReward();
    } else {
      gameAudio.playShieldBreak();
    }
  };

  // Keyboard support: A/B/C/D or 1/2/3/4 to answer, Enter/Space to resume after answering
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const key = e.key.toLowerCase();
      if (!answered) {
        if (key === 'a' || key === '1') {
          e.preventDefault();
          handleSelectOption(0);
        } else if (key === 'b' || key === '2') {
          e.preventDefault();
          handleSelectOption(1);
        } else if (key === 'c' || key === '3') {
          e.preventDefault();
          handleSelectOption(2);
        } else if (key === 'd' || key === '4') {
          e.preventDefault();
          handleSelectOption(3);
        }
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onComplete(isCorrect);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/88 p-3 sm:p-5">
      <div className="w-full max-w-lg max-h-[92dvh] flex flex-col bg-slate-900 border border-cyan-400/35 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header: Science Unit & Question Cycle */}
        <div className="px-4 py-3 bg-slate-950/85 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-sinhala text-xs sm:text-sm font-bold text-cyan-300 truncate">
              ඒකකය {String(question.unitId).padStart(2, '0')} · {unitTitleSi}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-white/10 font-mono-num text-[11px] font-bold text-slate-200 shrink-0">
            {usedCountInCycle}/{totalInUnit}
          </span>
        </div>

        {/* Reward Power Preview Strip */}
        <div
          className={`px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-3 transition-colors ${
            isCorrect
              ? 'bg-gradient-to-r from-emerald-900/80 via-cyan-900/70 to-emerald-900/80'
              : 'bg-gradient-to-r from-violet-950/80 via-slate-900 to-cyan-950/70'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-slate-950 shrink-0 shadow-md transition-transform duration-300 ${
                isCorrect ? 'scale-110 ring-2 ring-emerald-300 animate-pulse' : ''
              }`}
              style={{ backgroundColor: powerCfg.color }}
            >
              <PowerUpIcon type={rewardType} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div
                className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isCorrect ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{isCorrect ? 'Power Unlocked!' : 'MCQ Power Reward'}</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white truncate">
                {powerCfg.name}
              </div>
            </div>
          </div>

          <span className="font-sinhala text-[11px] font-semibold text-slate-300 text-right">
            {isCorrect
              ? 'බලය සක්‍රිය කිරීමට සූදානම්!'
              : 'නිවැරදිව පිළිතුරු දී බලය දිනන්න'}
          </span>
        </div>

        {/* Question & Options Scroll Area */}
        <div className="flex-1 overflow-y-auto modal-scroll p-4 space-y-3.5">
          {/* Question Prompt */}
          <div className="p-3.5 rounded-xl bg-slate-950/75 border border-white/10">
            <p className="font-sinhala text-sm sm:text-base font-bold text-white leading-relaxed">
              {question.question}
            </p>
          </div>

          {/* 4 Answer Options */}
          <div className="space-y-2">
            {question.options.map((opt, idx) => {
              const isThisSelected = selectedIdx === idx;
              const isThisCorrect = idx === question.correctIndex;

              let btnStyle =
                'bg-slate-950/70 border-white/15 hover:border-cyan-400/70 hover:bg-slate-800/80 text-slate-100';
              let badgeStyle = 'bg-slate-800 text-cyan-300 border-white/10';

              if (answered) {
                if (isThisCorrect) {
                  btnStyle =
                    'bg-emerald-500/20 border-emerald-400 text-white ring-1 ring-emerald-400/60';
                  badgeStyle = 'bg-emerald-400 text-slate-950 border-emerald-300';
                } else if (isThisSelected && !isThisCorrect) {
                  btnStyle =
                    'bg-rose-500/20 border-rose-400 text-rose-100 ring-1 ring-rose-400/50';
                  badgeStyle = 'bg-rose-400 text-slate-950 border-rose-300';
                } else {
                  btnStyle = 'bg-slate-950/40 border-white/5 text-slate-400 opacity-75';
                  badgeStyle = 'bg-slate-900 text-slate-500 border-white/5';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={answered}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left min-h-[48px] p-3 rounded-xl border transition-all flex items-center gap-3 active:scale-[0.99] ${btnStyle}`}
                >
                  <span
                    className={`w-7 h-7 rounded-lg border font-display text-xs font-bold flex items-center justify-center shrink-0 ${badgeStyle}`}
                  >
                    {OPTION_LETTERS[idx]}
                  </span>
                  <span className="font-sinhala text-xs sm:text-sm font-semibold leading-snug flex-1">
                    {opt}
                  </span>
                  {answered && isThisCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {answered && isThisSelected && !isThisCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Immediate Result + Sinhala Explanation */}
          {answered && (
            <div
              className={`p-3.5 rounded-xl border space-y-2 ${
                isCorrect
                  ? 'bg-emerald-950/60 border-emerald-400/60'
                  : 'bg-rose-950/55 border-rose-400/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <span
                    className={`font-sinhala text-sm font-bold ${
                      isCorrect ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {isCorrect
                      ? `නිවැරදියි! ${powerCfg.name} බලය සක්‍රිය විය!`
                      : 'වැරදියි! මෙවර බලය හිමි නොවේ.'}
                  </span>
                </div>
              </div>

              {!isCorrect && (
                <div className="font-sinhala text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-400/25 rounded-lg px-2.5 py-1.5">
                  නිවැරදි පිළිතුර ({OPTION_LETTERS[question.correctIndex]}):{' '}
                  {question.options[question.correctIndex]}
                </div>
              )}

              <p className="font-sinhala text-xs sm:text-sm text-slate-100 leading-relaxed">
                {question.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Resume CTA after answering */}
        {answered && (
          <div className="p-3.5 border-t border-white/10 bg-slate-950/85">
            <button
              type="button"
              onClick={() => onComplete(isCorrect)}
              className={`w-full min-h-[50px] rounded-xl font-display text-base sm:text-lg font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform ${
                isCorrect
                  ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950'
              }`}
            >
              <span className="font-sinhala text-sm sm:text-base font-bold">
                ඉදිරියට දුවන්න
              </span>
              <span>· RESUME</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
