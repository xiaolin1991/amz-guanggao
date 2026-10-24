import React from 'react';
import { ShieldCheck, BookOpen, Sparkles, Home, Sun, Moon, Puzzle, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  currentView: 'home' | 'workbench';
  onChangeView: (view: 'home' | 'workbench') => void;
  onOpenTutorial: () => void;
  onOpenExtensionModal: () => void;
  onLoadDemo: () => void;
  hasData: boolean;
  loadedItemCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onChangeView,
  onOpenTutorial,
  onOpenExtensionModal,
  onLoadDemo,
  hasData,
  loadedItemCount,
  theme,
  onToggleTheme
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-30 transition-colors shadow-sm">
      <div className="w-full max-w-[99%] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand / Logo & Name */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onChangeView('home')} 
            className="flex items-center gap-3 text-left group transition"
            title="点击返回官网主页"
          >
            <div className="w-11 h-11 flex items-center justify-center relative flex-shrink-0">
              <img 
                src="/logo.png" 
                alt="晓林Amz广告调价助手 Logo" 
                className="w-11 h-11 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  晓林Amz广告调价助手
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3" /> 纯本地计算·绝对隐私
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                亚马逊广告批量操作表（Bulk Sheet）智能止血诊断与保本调价系统
              </p>
            </div>
          </button>
        </div>

        {/* Center / Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => onChangeView('home')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              currentView === 'home'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-amber-500" />
            <span>官网主页</span>
          </button>

          <button
            onClick={() => onChangeView('workbench')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              currentView === 'workbench'
                ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
            <span>广告调价工作台</span>
            {hasData && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold animate-pulse">
                {loadedItemCount}
              </span>
            )}
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mobile view switch button */}
          <div className="flex md:hidden items-center">
            {currentView === 'home' ? (
              <button
                onClick={() => onChangeView('workbench')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow-sm"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>进入工作台</span>
              </button>
            ) : (
              <button
                onClick={() => onChangeView('home')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <Home className="w-3.5 h-3.5 text-amber-500" />
                <span>返回主页</span>
              </button>
            )}
          </div>

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

          {/* Browser Extension Download Button */}
          <button
            onClick={onOpenExtensionModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-950 dark:text-slate-900 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 transition shadow-sm active:scale-95"
            title="免费下载晓林广告助手浏览器插件（支持紫鸟/Hubstudio/Chrome）"
          >
            <Puzzle className="w-3.5 h-3.5 text-amber-950" />
            <span className="hidden sm:inline">浏览器插件下载</span>
            <span className="sm:hidden">插件</span>
            <span className="hidden xl:inline-block px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950/15 text-amber-950 font-black">
              v1.7.0
            </span>
          </button>

          {/* Tutorial Button */}
          <button
            onClick={onOpenTutorial}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>使用指南</span>
          </button>

          {/* Demo Button (only if no data loaded) */}
          {!hasData && (
            <button
              onClick={() => {
                onLoadDemo();
                onChangeView('workbench');
              }}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition shadow-sm shadow-amber-400/20 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>载入演示数据</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
