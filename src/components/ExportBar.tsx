import React from 'react';
import { Download, CheckCircle, UploadCloud, FileSpreadsheet } from 'lucide-react';
import { BidAdjustmentAction, NegativeTargetAction, HarvestAction } from '../types/amazon';

interface ExportBarProps {
  bidActions: BidAdjustmentAction[];
  negativeActions: NegativeTargetAction[];
  harvestActions: HarvestAction[];
  onExport: () => void;
  onExportReview?: () => void;
  onOpenTutorial: () => void;
}

export const ExportBar: React.FC<ExportBarProps> = ({
  bidActions,
  negativeActions,
  harvestActions,
  onExport,
  onExportReview,
  onOpenTutorial
}) => {
  const selectedBidsCount = bidActions.filter(b => b.selected).length;
  const selectedNegativesCount = negativeActions.filter(n => n.selected).length;
  const totalSelected = selectedBidsCount + selectedNegativesCount;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-lg px-4 py-3.5 shadow-2xl transition-colors">
      <div className="w-full max-w-[99%] mx-auto flex flex-wrap items-center justify-between gap-4">
        
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
              <span>包含 <strong className="text-slate-700 dark:text-slate-300">{selectedBidsCount}</strong> 个关键词出价调整</span>
              <span>·</span>
              <span><strong className="text-slate-700 dark:text-slate-300">{selectedNegativesCount}</strong> 个吸血词精准否定止血</span>
            </div>
          </div>
        </div>

        {/* Right buttons */}
        <div className="flex items-center gap-2.5">
          {onExportReview && (
            <button
              onClick={onExportReview}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition"
              title="下载包含本次所有调价依据、幅度与诊断原因的明细表（仅供卖家内部留存复盘）"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
              <span>下载调价复盘明细</span>
            </button>
          )}

          <button
            onClick={onOpenTutorial}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition"
          >
            <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>传回后台教程</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm rounded-xl transition shadow-lg shadow-amber-500/25 active:scale-95"
            title="采用亚马逊官方标准格式（Product/Entity/Operation），无多余工作表，防后台报错"
          >
            <Download className="w-4 h-4" />
            <span>一键导出亚马逊 Bulk 批量更新表 (.xlsx)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
