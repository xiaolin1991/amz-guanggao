import React, { useState, useEffect } from 'react';
import { Headphones, ArrowUp, X, MessageCircle, MessageSquare, QrCode } from 'lucide-react';
import qqImg from '../IMG/QQ.jpg';
import weixinImg from '../IMG/weixin.jpg';

export const FloatingSupport: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'weixin' | 'qq'>('weixin');

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="fixed right-5 bottom-24 z-50 flex flex-col items-end gap-3 select-none">
      {/* Expanded Support Card */}
      {isOpen && (
        <div className="w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">在线客服咨询</h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>专属客服在线解答</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="收起客服"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs: WeChat vs QQ */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-3">
            <button
              onClick={() => setActiveTab('weixin')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'weixin'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>微信客服</span>
            </button>
            <button
              onClick={() => setActiveTab('qq')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'qq'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>QQ客服</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex flex-col items-center text-center p-2 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
            {activeTab === 'weixin' ? (
              <div className="space-y-2">
                <div className="w-44 h-44 bg-white p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mx-auto overflow-hidden">
                  <img
                    src={weixinImg}
                    alt="微信客服二维码"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1">
                    <QrCode className="w-3 h-3 text-emerald-500" />
                    <span>扫码添加微信广告客服</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    一对一广告诊断 · 报表调价咨询
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-44 h-44 bg-white p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mx-auto overflow-hidden">
                  <img
                    src={qqImg}
                    alt="QQ客服二维码"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1">
                    <QrCode className="w-3 h-3 text-blue-500" />
                    <span>扫码添加QQ客服</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    技术支持 · 批量操作答疑
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 text-center">
            <span className="text-[10px] text-slate-400">
              工作时间：周一至周日 9:00 - 22:00
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons Stack */}
      <div className="flex flex-col items-end gap-2.5">
        {/* Customer Support Pill Button (Default Collapsed) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full font-bold text-xs shadow-lg transition-all duration-200 border active:scale-95 ${
            isOpen
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 shadow-slate-900/10'
          }`}
          title="点击展开在线客服"
        >
          <div className="relative">
            <Headphones className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <span>在线客服</span>
        </button>

        {/* Back to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:border-amber-400 shadow-lg shadow-slate-900/10 transition-all duration-200 active:scale-95"
            title="一键返回顶部"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
