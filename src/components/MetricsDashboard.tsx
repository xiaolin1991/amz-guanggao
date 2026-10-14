import React from 'react';
import { 
  DollarSign, 
  TrendingDown, 
  AlertOctagon, 
  PiggyBank, 
  CheckCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import { DiagnosisSummary, OptimizerConfig } from '../types/amazon';

interface MetricsDashboardProps {
  summary: DiagnosisSummary;
  config: OptimizerConfig;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ summary, config }) => {
  const isAcosUnhealthy = summary.overallAcos > config.targetAcos;

  return (
    <div className="space-y-4">
      {/* Top 4 Core Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Spend & Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">总花费 / 销售额</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ${summary.totalSpend.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              销售额: <span className="text-slate-700 dark:text-slate-200 font-semibold">${summary.totalSales.toLocaleString()}</span>
              <span className="text-slate-400 dark:text-slate-500">({summary.totalOrders} 笔订单)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Overall ACOS vs Target */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">全局 ACOS / 目标保本</span>
            <div className={`p-2 rounded-xl ${
              isAcosUnhealthy 
                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black tracking-tight ${
                isAcosUnhealthy ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {summary.overallAcos}%
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                / 目标 {config.targetAcos}%
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAcosUnhealthy ? (
                <span className="text-rose-600 dark:text-rose-400/90 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> 严重超标，处于亏损状态
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400/90 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> 整体在保本利润线内
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Wasted Spend (The Bleeding Wound) */}
        <div className="bg-rose-50/70 dark:bg-gradient-to-br dark:from-rose-950/40 dark:to-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">💥 白白浪费的吸血支出</span>
            <div className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-500/30">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              ${summary.wastedSpend.toLocaleString()}
            </div>
            <div className="text-xs text-rose-700 dark:text-rose-300/80 mt-1">
              占总广告费的 <strong className="font-bold">{summary.wastedSpendPercent}%</strong>（0订单纯烧钱）
            </div>
          </div>
        </div>

        {/* Card 4: Potential Monthly Savings */}
        <div className="bg-emerald-50/70 dark:bg-gradient-to-br dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">💰 预计可挽回月度利润</span>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              +${summary.potentialMonthlySavings.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-300/80 mt-1">
              执行否定与保本降价后直接节省的真金白银
            </div>
          </div>
        </div>

      </div>

      {/* Actionable Insights banner */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs transition-colors">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-white">诊断结果简报：</span>
          <span>系统发现</span>
          <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-500/30">
            {summary.bleedingKeywordsCount} 个吸血词
          </span>
          <span>需要紧急否定止血，</span>
          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-500/30">
            {summary.highAcosItemsCount} 个超标词
          </span>
          <span>需要动态下调出价，</span>
          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-500/30">
            {summary.harvestItemsCount} 个黄金词
          </span>
          <span>建议新建精准广告组。</span>
        </div>
        <div className="text-slate-500 dark:text-slate-400 text-xs">
          平均每次点击费用 (CPC): <strong className="text-slate-700 dark:text-slate-200">${summary.averageCpc}</strong> · 总点击: <strong className="text-slate-700 dark:text-slate-200">{summary.totalClicks.toLocaleString()}</strong>
        </div>
      </div>
    </div>
  );
};
