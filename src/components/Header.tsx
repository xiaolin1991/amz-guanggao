import React from 'react';
import { ShieldCheck, BookOpen, Sparkles, RefreshCw, BarChart3, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onOpenTutorial: () => void;
  onLoadDemo: () => void;
  onReset: () => void;
  hasData: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTutorial,
  onLoadDemo,
  onReset,
  hasData,
  theme,
  onToggleTheme
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black text-lg">
            <BarChart3 className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                AMZ 广告智能止血调价助手
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" /> 纯本地计算·绝对隐私
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              基于亚马逊批量操作表（Bulk Sheet）的自动诊断、止血否定与保本调价工具
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition"
            title={theme === 'light' ? '切换为暗色护眼模式' : '切换为亮白清爽模式'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-600" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <button
            onClick={onOpenTutorial}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>下载/上传指南</span>
          </button>

          {!hasData ? (
            <button
              onClick={onLoadDemo}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition shadow-sm shadow-amber-400/20 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>载入演示数据 (Demo)</span>
            </button>
          ) : (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重新上传</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
