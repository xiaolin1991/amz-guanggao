import React from 'react';
import { Download, CheckCircle, UploadCloud } from 'lucide-react';
import { BidAdjustmentAction, NegativeTargetAction, HarvestAction } from '../types/amazon';

interface ExportBarProps {
  bidActions: BidAdjustmentAction[];
  negativeActions: NegativeTargetAction[];
  harvestActions: HarvestAction[];
  onExport: () => void;
  onOpenTutorial: () => void;
}

export const ExportBar: React.FC<ExportBarProps> = ({
  bidActions,
  negativeActions,
  harvestActions,
  onExport,
  onOpenTutorial
}) => {
  const selectedBidsCount = bidActions.filter(b => b.selected).length;
  const selectedNegativesCount = negativeActions.filter(n => n.selected).length;
  const totalSelected = selectedBidsCount + selectedNegativesCount;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-lg px-4 py-3.5 shadow-2xl transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Left summary */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>待执行调整方案已就绪</span>
              <span className="text-xs font-normal text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                共 {totalSelected} 项优化动作
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
              <span>包含 <strong className="text-slate-700 dark:text-slate-300">{selectedBidsCount}</strong> 个词降价控本</span>
              <span>·</span>
              <span><strong className="text-slate-700 dark:text-slate-300">{selectedNegativesCount}</strong> 个吸血词精准否定止血</span>
            </div>
          </div>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTutorial}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>导出后如何传回后台？</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-xl transition shadow-lg shadow-amber-500/25 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>一键导出亚马逊 Bulk 批量更新表 (.xlsx)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
