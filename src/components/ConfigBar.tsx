import React from 'react';
import { Sliders, Zap, Shield, Flame } from 'lucide-react';
import { OptimizerConfig } from '../types/amazon';

interface ConfigBarProps {
  config: OptimizerConfig;
  onChange: (newConfig: OptimizerConfig) => void;
}

export const ConfigBar: React.FC<ConfigBarProps> = ({ config, onChange }) => {
  const applyPreset = (preset: 'aggressive' | 'balanced' | 'gentle') => {
    if (preset === 'aggressive') {
      onChange({
        ...config,
        targetAcos: 24,
        zeroOrderClickThreshold: 8,
        maxBidDecreasePercent: 35
      });
    } else if (preset === 'balanced') {
      onChange({
        ...config,
        targetAcos: 28,
        zeroOrderClickThreshold: 12,
        maxBidDecreasePercent: 25
      });
    } else if (preset === 'gentle') {
      onChange({
        ...config,
        targetAcos: 38,
        zeroOrderClickThreshold: 16,
        maxBidDecreasePercent: 15
      });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">调优策略与止血参数控制</h3>
          <span className="text-xs text-slate-400">（调整参数可即时重新计算诊断结果）</span>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">预设模式:</span>
          <button
            onClick={() => applyPreset('aggressive')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
              config.zeroOrderClickThreshold <= 9
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Flame className="w-3 h-3 text-rose-500 dark:text-rose-400" /> 紧急止血模式
          </button>
          <button
            onClick={() => applyPreset('balanced')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
              config.zeroOrderClickThreshold >= 10 && config.zeroOrderClickThreshold <= 14
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Shield className="w-3 h-3 text-amber-500 dark:text-amber-400" /> 平衡稳健 (推荐)
          </button>
          <button
            onClick={() => applyPreset('gentle')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
              config.zeroOrderClickThreshold >= 15
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Zap className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> 温和放量模式
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
        
        {/* Slider 1: Target ACOS */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">目标保本 ACOS:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 text-sm bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
              {config.targetAcos}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="60"
            step="1"
            value={config.targetAcos}
            onChange={e => onChange({ ...config, targetAcos: Number(e.target.value) })}
            className="w-full accent-amber-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>激进保利润 (15%)</span>
            <span>通常等于产品毛利率</span>
            <span>宽松冲销量 (50%)</span>
          </div>
        </div>

        {/* Slider 2: Click threshold */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">止血阈值 (零转化否定点击数):</span>
            <span className="font-bold text-rose-600 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-500/20">
              ≥ {config.zeroOrderClickThreshold} 次
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="25"
            step="1"
            value={config.zeroOrderClickThreshold}
            onChange={e => onChange({ ...config, zeroOrderClickThreshold: Number(e.target.value) })}
            className="w-full accent-rose-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>严苛快速止血 (5次)</span>
            <span>行业经验 (10~12次)</span>
            <span>宽容观察 (25次)</span>
          </div>
        </div>

        {/* Slider 3: Max bid decrease percent */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">单次调价最大降幅保护:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 text-sm bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
              {config.maxBidDecreasePercent}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="50"
            step="5"
            value={config.maxBidDecreasePercent}
            onChange={e => onChange({ ...config, maxBidDecreasePercent: Number(e.target.value) })}
            className="w-full accent-blue-500 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>平滑微调 (10%)</span>
            <span>防止单次出价暴跌断流</span>
            <span>强力降本 (50%)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
