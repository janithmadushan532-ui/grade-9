import { useState } from 'react';
import { BookOpen, CheckCircle2, Layers, Play, Sparkles, X } from 'lucide-react';
import { ALL_MCQ_QUESTIONS, SCIENCE_UNITS } from '../data/mcqBank';
import { SelectedUnitId } from '../data/mcqTypes';
import { SaveData } from '../game/types';

interface UnitSelectModalProps {
  save: SaveData;
  mode: 'play' | 'select';
  onConfirm: (unitId: SelectedUnitId, startImmediately: boolean) => void;
  onClose: () => void;
}

export function UnitSelectModal({
  save,
  mode,
  onConfirm,
  onClose,
}: UnitSelectModalProps) {
  const [draftUnit, setDraftUnit] = useState<SelectedUnitId>(
    save.selectedScienceUnit,
  );
  const [partFilter, setPartFilter] = useState<'ALL' | 'I' | 'II'>('ALL');

  const filteredUnits = SCIENCE_UNITS.filter((u) =>
    partFilter === 'ALL' ? true : u.part === partFilter,
  );

  const totalUsedAll = SCIENCE_UNITS.reduce(
    (sum, u) => sum + (save.usedMcqIdsByUnit[u.id]?.length || 0),
    0,
  );

  const selectedUnitInfo =
    draftUnit === 'all'
      ? null
      : SCIENCE_UNITS.find((u) => u.id === draftUnit) || SCIENCE_UNITS[0];

  const accuracyPct =
    save.mcqStats.answered > 0
      ? Math.round((save.mcqStats.correct / save.mcqStats.answered) * 100)
      : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-2.5 sm:p-5">
      <div className="w-full max-w-2xl max-h-[90dvh] flex flex-col bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-white/10 bg-slate-950/70">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400 shrink-0" />
              <h2 className="font-sinhala text-base sm:text-lg font-bold text-white truncate">
                9 ශ්‍රේණිය විද්‍යාව — ඒකක තේරීම
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
              Grade 9 Science Textbook Units · Select 1 unit for MCQ Power-Ups
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Unit Selection"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Part Filter + Stats Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-950/50 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            {(['ALL', 'I', 'II'] as const).map((part) => (
              <button
                key={part}
                type="button"
                onClick={() => setPartFilter(part)}
                className={`min-h-[34px] px-3 rounded-lg text-xs font-bold transition-colors ${
                  partFilter === part
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {part === 'ALL' ? 'All (19)' : `Part ${part}`}
              </button>
            ))}
          </div>

          {accuracyPct !== null && (
            <div className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded-lg px-2.5 py-1">
              MCQ Score: {save.mcqStats.correct}/{save.mcqStats.answered} ({accuracyPct}%)
            </div>
          )}
        </div>

        {/* Unit List */}
        <div className="flex-1 overflow-y-auto modal-scroll p-3 sm:p-4 space-y-2.5">
          {/* ALL UNITS Option */}
          <button
            type="button"
            onClick={() => setDraftUnit('all')}
            className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              draftUnit === 'all'
                ? 'bg-gradient-to-r from-violet-600/35 to-cyan-600/25 border-cyan-400 ring-1 ring-cyan-400/60'
                : 'bg-slate-950/75 border-white/10 hover:border-white/25'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  draftUnit === 'all'
                    ? 'bg-cyan-400 text-slate-950'
                    : 'bg-violet-500/20 text-violet-300 border border-violet-400/30'
                }`}
              >
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-sinhala text-sm sm:text-base font-bold text-white truncate">
                  සියලුම ඒකක (ALL UNITS)
                </div>
                <div className="text-xs text-slate-300">
                  All 19 Grade 9 Science Units · {totalUsedAll}/{ALL_MCQ_QUESTIONS.length} asked
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/10 font-mono-num text-xs font-bold text-cyan-300">
                {ALL_MCQ_QUESTIONS.length} MCQs
              </span>
              {draftUnit === 'all' && (
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              )}
            </div>
          </button>

          {/* Individual 19 Units Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filteredUnits.map((unit) => {
              const isSelected = draftUnit === unit.id;
              const usedCount = save.usedMcqIdsByUnit[unit.id]?.length || 0;
              const remaining = Math.max(0, unit.questionCount - usedCount);

              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setDraftUnit(unit.id)}
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 ring-1 ring-cyan-400/60'
                      : 'bg-slate-950/75 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md font-sinhala text-[11px] font-bold ${
                          isSelected
                            ? 'bg-cyan-400 text-slate-950'
                            : 'bg-slate-800 text-cyan-300'
                        }`}
                      >
                        ඒකකය {String(unit.id).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Part {unit.part}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/90 border border-white/10 font-mono-num text-[11px] font-bold text-amber-300 shrink-0">
                      {unit.questionCount} MCQs
                    </span>
                  </div>

                  <div>
                    <div className="font-sinhala text-sm font-bold text-white leading-snug">
                      {unit.titleSi}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {unit.subtitleEn}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[11px]">
                    <span className="text-slate-400 font-mono-num">
                      {usedCount === 0
                        ? `Fresh cycle (${unit.questionCount} left)`
                        : `${remaining} left in cycle (${usedCount}/${unit.questionCount})`}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Confirm / Select CTA */}
        <div className="p-3.5 border-t border-white/10 bg-slate-950/85 space-y-2.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-400 shrink-0">Selected:</span>
            <span className="font-sinhala font-bold text-cyan-300 truncate">
              {selectedUnitInfo
                ? `ඒකකය ${String(selectedUnitInfo.id).padStart(2, '0')} — ${selectedUnitInfo.titleSi} (${selectedUnitInfo.questionCount} MCQs)`
                : `සියලුම ඒකක — All 19 Units (${ALL_MCQ_QUESTIONS.length} MCQs)`}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm"
            >
              Back
            </button>

            <button
              type="button"
              onClick={() => onConfirm(draftUnit, mode === 'play')}
              className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display text-base sm:text-lg font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
            >
              {mode === 'play' ? (
                <>
                  <Play className="w-5 h-5 fill-slate-950" />
                  <span>SELECT &amp; RUN</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>SELECT UNIT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
