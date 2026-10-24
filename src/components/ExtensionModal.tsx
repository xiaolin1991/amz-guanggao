import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Download, 
  FolderArchive, 
  Puzzle, 
  Chrome, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert,
  HelpCircle, 
  Layers, 
  ArrowRight, 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  Settings, 
  Monitor, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Info,
  Package
} from 'lucide-react';
import { trackDownload } from '../utils/analytics';

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtensionModal: React.FC<ExtensionModalProps> = ({ isOpen, onClose }) => {
  // Intelligent Client Browser Detection
  const browserInfo = useMemo(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const uaLower = ua.toLowerCase();
    const isZiniao = uaLower.includes('superbrowser') || uaLower.includes('ziniao');
    const isHubstudio = uaLower.includes('hubstudio');
    const isEdge = uaLower.includes('edg/');
    const isChrome = Boolean((window as any).chrome) && !isEdge && !isZiniao && !isHubstudio;
    // Google Chrome & Edge strictly reject off-store CRX with "CRX_REQUIRED_PROOF_MISSING"
    const isStrictCrxBlocked = isChrome || isEdge;

    let detectedTab: 'ziniao' | 'hubstudio' | 'chrome' = 'ziniao';
    if (isHubstudio) detectedTab = 'hubstudio';
    else if (isChrome || isEdge) detectedTab = 'chrome';

    return {
      isZiniao,
      isHubstudio,
      isChrome,
      isEdge,
      isStrictCrxBlocked,
      detectedTab,
      browserName: isZiniao 
        ? '紫鸟超级浏览器' 
        : isHubstudio 
        ? 'Hubstudio 指纹浏览器' 
        : isEdge 
        ? 'Microsoft Edge' 
        : isChrome 
        ? 'Google Chrome' 
        : '标准浏览器'
    };
  }, []);

  const [activeBrowser, setActiveBrowser] = useState<'ziniao' | 'hubstudio' | 'chrome'>(() => browserInfo.detectedTab);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showCrxGuide, setShowCrxGuide] = useState(false);
  const [showCrxInterceptModal, setShowCrxInterceptModal] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCrxInterceptModal) {
          setShowCrxInterceptModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showCrxInterceptModal]);

  if (!isOpen) return null;

  const handleCopyExtensionsUrl = () => {
    navigator.clipboard.writeText('chrome://extensions/');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleDirectDownload = (type: 'zip' | 'crx') => {
    // Record download analytics
    trackDownload(type === 'zip' ? 'ZIP' : 'CRX', `通过安装弹窗下载 (${activeBrowser})`);

    const fileName = type === 'zip' ? 'xiaolin-ad-assistant.zip' : 'xiaolin-ad-assistant.crx';
    const filePath = `./app/${fileName}`;
    
    // Create an invisible anchor tag and trigger click
    const a = document.createElement('a');
    a.href = filePath;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Intercept CRX download attempts in Chrome/Edge to prevent CRX_REQUIRED_PROOF_MISSING error
  const handleCrxDownloadClick = () => {
    if (browserInfo.isStrictCrxBlocked) {
      setShowCrxInterceptModal(true);
    } else {
      handleDirectDownload('crx');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="fixed inset-0 cursor-default" 
        onClick={onClose} 
      />

      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-colors z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-600 dark:text-amber-400 shadow-sm">
              <Puzzle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  晓林广告助手 · 浏览器插件下载中心
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-sm">
                  v1.7.0 官方版
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" /> Manifest V3 安全规范
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                支持紫鸟超级浏览器、HubStudio 指纹浏览器、Google Chrome、微软 Edge · 亚马逊后台实时诊断
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            title="关闭窗口 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* Download Action Hero Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              
              {/* Plugin Info Left */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 p-2 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <img 
                    src="./app/assets/icon128.png" 
                    alt="晓林广告助手插件图标" 
                    className="w-12 h-12 object-contain"
                    onError={(e) => {
                      // Fallback icon if image not reachable
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Puzzle className="w-8 h-8 text-amber-400 hidden only:block" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black tracking-tight text-white">
                      晓林广告助手 - 亚马逊广告优化专家
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                    专为亚马逊卖家研发的后台实时广告插件。自动识别高花费 0 单吸血词、实时测算保本建议出价、深度拓搜买家下拉词、精准狙击弱势竞品 ASIN！
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-amber-300">
                      文件大小: 约 543 KB
                    </span>
                    <span>·</span>
                    <span>更新时间: 2026-10</span>
                    <span>·</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> 纯本地脚本 · 不跨店铺关联 · 绝无外部上传
                    </span>
                  </div>
                </div>
              </div>

              {/* Download Buttons Right */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0 min-w-[280px]">
                {/* Method 1: ZIP (Recommended) */}
                <button
                  onClick={() => handleDirectDownload('zip')}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  title="推荐使用 ZIP 解压安装，100% 成功，无需验证报错"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderArchive className="w-5 h-5 flex-shrink-0" />
                    <div className="text-left">
                      <div className="leading-tight flex items-center gap-1.5">
                        <span>下载 ZIP 安装包</span>
                        {browserInfo.isStrictCrxBlocked && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950/20 text-slate-950 font-bold">
                            {browserInfo.browserName.includes('Chrome') ? 'Chrome专属推荐' : '推荐'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-normal opacity-90">
                        {browserInfo.isStrictCrxBlocked 
                          ? '解压加载 · 100% 成功 · 绝不报签名错误' 
                          : '推荐 · 解压加载 · 100% 成功'}
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 flex-shrink-0" />
                </button>

                {/* Method 2: CRX (Alternative / Intercepted in Chrome) */}
                <button
                  onClick={handleCrxDownloadClick}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-semibold transition group ${
                    browserInfo.isStrictCrxBlocked
                      ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-amber-500/40 hover:border-amber-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                  title={
                    browserInfo.isStrictCrxBlocked 
                      ? 'Google Chrome 限制外部 CRX 直装，点击查看解决方案' 
                      : '适用于支持 CRX 拖入安装的浏览器'
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Package className={`w-4 h-4 flex-shrink-0 ${browserInfo.isStrictCrxBlocked ? 'text-amber-400' : 'text-slate-400'}`} />
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span>下载 CRX 安装包</span>
                        {browserInfo.isStrictCrxBlocked && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                            Chrome受限
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {browserInfo.isStrictCrxBlocked 
                          ? '点击查看谷歌拦截说明 & 替代方案' 
                          : '支持直接拖拽安装'}
                      </div>
                    </div>
                  </div>
                  {browserInfo.isStrictCrxBlocked ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Plugin Core Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">后台实时竞价透视</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  无需频繁下载报表，直接在亚马逊广告页面显示保本竞价与 ACOS 诊断。
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
              <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">0单吸血词即时止损</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  高点击0转化词高亮预警，支持一键加入否定词库，立刻堵死预算黑洞。
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">官方下拉热搜词拓展</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  在亚马逊搜索框输入主词，自动递归挖掘买家高频搜索长尾词库。
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex items-start gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">弱势竞品 ASIN 狙击</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  浏览竞品页面自动抓取差评多、高价格的弱势对手，一键生成商品定位投放。
                </p>
              </div>
            </div>
          </div>

          {/* Browser Selection Tabs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="w-4 h-4 text-amber-500" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  请选择您的浏览器，查看手把手安装图文教程：
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyExtensionsUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
                  title="点击复制扩展页面网址 chrome://extensions/"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 font-bold">已复制扩展网址</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>复制 chrome://extensions/</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Browser Selector Pill Switcher */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => setActiveBrowser('ziniao')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm transition-all ${
                  activeBrowser === 'ziniao'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 shadow-sm ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                  紫
                </div>
                <span>紫鸟超级浏览器</span>
                <span className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                  跨境卖家首选
                </span>
              </button>

              <button
                onClick={() => setActiveBrowser('hubstudio')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm transition-all ${
                  activeBrowser === 'hubstudio'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  Hub
                </div>
                <span>Hubstudio 浏览器</span>
                <span className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  支持团队分发
                </span>
              </button>

              <button
                onClick={() => setActiveBrowser('chrome')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2.5 font-bold text-xs sm:text-sm transition-all ${
                  activeBrowser === 'chrome'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 shadow-sm ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Chrome className="w-5 h-5 text-amber-500" />
                <span>Google Chrome / Edge</span>
                <span className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                  通用标准浏览器
                </span>
              </button>
            </div>

            {/* TAB CONTENT 1: 紫鸟超级浏览器安装教程 */}
            {activeBrowser === 'ziniao' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 rounded-2xl p-4 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-3">
                  <div className="p-1.5 bg-purple-500 text-white rounded-lg flex-shrink-0 mt-0.5">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm">紫鸟超级浏览器使用说明：</strong>
                    <p className="mt-1 leading-relaxed opacity-90">
                      紫鸟超级浏览器底层基于 Chromium 深度优化，完全兼容 Chrome 扩展标准。您可以在<strong>具体店铺环境内部直接加载</strong>，也可以在紫鸟客户端【生态中心 / 插件中心】批量导入同步到所有店铺环境。安装过程不到 1 分钟！
                    </p>
                  </div>
                </div>

                {/* Step Cards with Visual UI Diagrams */}
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        1
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        第一步：下载并解压插件压缩包 (ZIP)
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 ml-10">
                      点击上方 <button onClick={() => handleDirectDownload('zip')} className="text-purple-600 dark:text-purple-400 font-bold underline hover:text-purple-500">【下载 ZIP 安装包】</button>，将下载得到的 <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-purple-600 font-mono text-[11px] rounded">xiaolin-ad-assistant.zip</code> <strong>解压到电脑的固定文件夹</strong>（例如 <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] rounded">D:\跨境工具\xiaolin-ad-assistant</code>）。
                    </p>
                    
                    {/* Visual UI Diagram 1: Unzip Folder Simulation */}
                    <div className="ml-10 bg-slate-100 dark:bg-slate-950/80 rounded-xl p-3 border border-slate-200 dark:border-slate-800 font-mono text-xs">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                        <FolderArchive className="w-3.5 h-3.5 text-amber-500" />
                        <span>解压后的文件夹结构（确保能看到 manifest.json 文件）:</span>
                      </div>
                      <div className="space-y-1 text-slate-700 dark:text-slate-300 text-[11px]">
                        <div className="flex items-center gap-1.5 font-bold text-purple-600 dark:text-purple-400">
                          <span>📁 xiaolin-ad-assistant/</span> <span className="text-[10px] text-slate-400 font-normal">（← 待会儿选择的就是这个文件夹）</span>
                        </div>
                        <div className="pl-4 text-slate-500 flex items-center gap-2">
                          <span>📄 manifest.json</span>
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.2 rounded">插件核心配置</span>
                        </div>
                        <div className="pl-4 text-slate-500">📁 background/ (后台服务)</div>
                        <div className="pl-4 text-slate-500">📁 content/ (亚马逊后台注入脚本)</div>
                        <div className="pl-4 text-slate-500">📁 popup/ (插件弹窗设置)</div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        2
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        第二步：在紫鸟店铺环境中打开「扩展程序」管理页
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 ml-10">
                      启动紫鸟浏览器并进入具体的亚马逊店铺环境。在地址栏直接输入 <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-purple-600 font-mono text-[11px] rounded">chrome://extensions/</code> 并按回车，或点击浏览器右上角【🧩 拼图图标】选择【管理扩展程序】。
                    </p>

                    {/* Visual UI Diagram 2: Address Bar Mockup */}
                    <div className="ml-10 bg-slate-900 rounded-xl p-3 border border-slate-800 text-white shadow-inner">
                      <div className="flex items-center gap-2 bg-slate-800/90 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-slate-400 text-[11px]">🔒</span>
                        <span className="text-purple-400 font-mono font-bold">chrome://extensions/</span>
                        <button
                          onClick={handleCopyExtensionsUrl}
                          className="ml-auto text-[10px] text-slate-300 hover:text-white bg-purple-600 hover:bg-purple-500 px-2 py-0.5 rounded transition"
                        >
                          {copiedUrl ? '已复制！' : '点此复制网址'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 & 4 */}
                  <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        3
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        第三步：打开右上角【开发者模式】，点击【加载已解压的扩展程序】
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 ml-10">
                      1. 在扩展程序管理页面右上角，找到并勾选开启 <strong className="text-purple-600 dark:text-purple-400 font-bold">【开发者模式 (Developer mode)】</strong> 开关；<br/>
                      2. 开关打开后，页面左上方会出现工具栏，点击最左侧的 <strong className="text-purple-600 dark:text-purple-400 font-bold">【加载已解压的扩展程序 (Load unpacked)】</strong>；<br/>
                      3. 在弹出的文件选择器中，选中第一步解压出来的 <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono text-[11px] rounded text-purple-600">xiaolin-ad-assistant</code> 文件夹，点击“选择文件夹”。
                    </p>

                    {/* Visual UI Diagram 3: Chrome Extensions Top Bar Mockup */}
                    <div className="ml-10 bg-slate-100 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <button className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 animate-pulse">
                            <FolderArchive className="w-3.5 h-3.5" />
                            <span>1. 加载已解压的扩展程序</span>
                          </button>
                          <span className="text-[11px] text-slate-400">打包扩展程序</span>
                        </div>

                        <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 px-3 py-1 rounded-full">
                          <span className="text-xs font-bold text-purple-900 dark:text-purple-300">开发者模式</span>
                          <div className="w-8 h-4.5 bg-purple-600 rounded-full flex items-center p-0.5 justify-end">
                            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                          </div>
                        </div>
                      </div>

                      {/* Success Card Mockup */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-start justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold">
                            <Puzzle className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                              <span>晓林广告助手 - 亚马逊广告优化专家</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-mono">1.7.0</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              ID: mckh... · 检查视图: service worker
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 已成功启用
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                        4
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        第四步：在工具栏【📌 固定插件】，进入亚马逊后台即可实时体验！
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 ml-10">
                      点击浏览器右上角的【🧩 拼图图标】，在列表中找到“晓林广告助手”，点击右侧的【📌 图钉图标】固定到工具栏。现在打开您的亚马逊广告管理后台，即可享受实时出价诊断与拦截功能！
                    </p>
                  </div>
                </div>

                {/* Ziniao Multi-Store Batch Sync Tip */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>紫鸟超级浏览器【多店铺一次性批量分发】技巧：</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    如果您管理着数十个紫鸟店铺环境，无需每个环境逐一安装：打开紫鸟客户端主界面 -&gt; 进入左侧<strong>【生态中心 / 插件中心】</strong> -&gt; 点击<strong>【本地导入】</strong> -&gt; 选择本插件 ZIP 包 -&gt; 勾选所有需要分配的店铺，紫鸟系统将自动为您批量同步部署！
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Hubstudio 浏览器安装教程 */}
            {activeBrowser === 'hubstudio' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                  <div className="p-1.5 bg-blue-500 text-white rounded-lg flex-shrink-0 mt-0.5">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm">HubStudio 指纹浏览器使用说明：</strong>
                    <p className="mt-1 leading-relaxed opacity-90">
                      HubStudio 专门为跨境卖家团队设计，支持两种安装方式：<strong>方式一（单环境加载解压程序，即刻测试）</strong>；<strong>方式二（在客户端“团队插件”批量上传，所有店铺环境自动云端同步）</strong>！
                    </p>
                  </div>
                </div>

                {/* Two Methods for Hubstudio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Method A */}
                  <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-700">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">A</span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        方式一：在已打开的环境中直接加载（推荐）
                      </h4>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <li>
                        下载并解压 <button onClick={() => handleDirectDownload('zip')} className="text-blue-600 dark:text-blue-400 font-bold underline">xiaolin-ad-assistant.zip</button>；
                      </li>
                      <li>
                        在 HubStudio 打开的店铺浏览器中，进入 <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono text-[11px] rounded text-blue-600">chrome://extensions/</code>；
                      </li>
                      <li>
                        开启右上角<strong>【开发者模式】</strong>开关；
                      </li>
                      <li>
                        点击左上角<strong>【加载已解压的扩展程序】</strong>，选择解压后的文件夹；
                      </li>
                      <li>
                        插件立即生效，点击拼图图标固定即可！
                      </li>
                    </ol>
                  </div>

                  {/* Method B */}
                  <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-700">
                      <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">B</span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        方式二：客户端【团队插件】批量分发所有环境
                      </h4>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      <li>
                        打开 HubStudio 客户端主程序，点击左侧菜单<strong>【插件中心】/【团队插件】</strong>；
                      </li>
                      <li>
                        点击<strong>【添加插件】-&gt;【上传本地插件】</strong>；
                      </li>
                      <li>
                        直接选择下载的 <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono text-[11px] rounded text-emerald-600">xiaolin-ad-assistant.zip</code> 或 <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono text-[11px] rounded">.crx</code> 安装包；
                      </li>
                      <li>
                        插件名称填写“晓林广告助手”，勾选需要生效的全部环境分组；
                      </li>
                      <li>
                        点击确认，下次启动任意环境时，插件将自动加载就绪！
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Hubstudio Safety Guarantee */}
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>
                    HubStudio 环境隔离机制：晓林广告助手不修改任何浏览器指纹参数（如 Canvas、WebGL、User-Agent 等），各环境存储完全沙盒隔离，100% 确保防关联安全性。
                  </span>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Chrome / Edge 标准浏览器教程 */}
            {activeBrowser === 'chrome' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Visual Error Explanation Banner */}
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-900/50 rounded-2xl p-4 text-xs text-rose-950 dark:text-rose-200 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>Chrome 常见报错：程序包无效 "CRX_REQUIRED_PROOF_MISSING" 原理说明</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-bold">
                      谷歌内核限制
                    </span>
                  </div>

                  {/* Visual mockup of the Chrome error */}
                  <div className="bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl px-3.5 py-2 flex items-center justify-between font-mono text-[11px] text-slate-800 dark:text-slate-200 shadow-inner">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span>程序包无效: <strong className="text-rose-600 dark:text-rose-400">"CRX_REQUIRED_PROOF_MISSING"</strong></span>
                    </span>
                    <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded text-[10px] font-sans font-bold">确定</span>
                  </div>

                  <p className="leading-relaxed text-[11px] text-slate-700 dark:text-slate-300">
                    <strong>为什么 Chrome 会弹窗报错？</strong> 谷歌在新版 Chromium 中加固了签名机制，直接在网页下载或拖拽未上架 Google Web Store 的 <code className="px-1 py-0.5 bg-rose-100 dark:bg-rose-900/40 rounded font-mono">.crx</code> 文件时，浏览器底层会因缺少谷歌官方 proof 签名而直接拦截并报错。
                  </p>
                  <p className="leading-relaxed text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    ✅ <strong>100% 成功解决方案：</strong>请直接使用下方的<strong>【4 步 ZIP 解压加载法】</strong>（开发者模式 ➔ 加载已解压的扩展程序）。这是谷歌官方为独立开发者扩展预留的正规通道，无需任何官方签名，30 秒即可加载成功且永久稳定！
                  </p>
                </div>

                {/* Chrome 4 Steps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      1
                    </div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">下载并解压 ZIP</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      下载 <button onClick={() => handleDirectDownload('zip')} className="text-amber-600 font-bold underline">ZIP安装包</button>，解压到一个固定目录（如 D 盘）。
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      2
                    </div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">打开扩展管理页</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      地址栏输入 <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-mono rounded">chrome://extensions/</code>，Edge 输入 <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-mono rounded">edge://extensions/</code>。
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      3
                    </div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">开启开发者模式</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      点击页面右上角<strong>【开发者模式】</strong>滑动开关使其处于开启状态。
                    </p>
                  </div>

                  <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      4
                    </div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">加载已解压程序</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      点击左上角<strong>【加载已解压的扩展程序】</strong>，选择解压出的目录完成安装！
                    </p>
                  </div>
                </div>

                {/* Collapsible CRX Drag Method Guide */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowCrxGuide(!showCrxGuide)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 transition"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-500" />
                      <span>查看方式二：如何使用 .CRX 文件直接拖拽安装？</span>
                    </div>
                    {showCrxGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showCrxGuide && (
                    <div className="p-4 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 space-y-2 border-t border-slate-200 dark:border-slate-800">
                      <p>
                        1. 点击上方<strong>【下载 CRX 安装包】</strong>保存到本地；<br/>
                        2. 打开 <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono rounded">chrome://extensions/</code> 并<strong>务必开启右上角【开发者模式】</strong>；<br/>
                        3. 打开电脑的文件管理器，将下载的 <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono rounded">xiaolin-ad-assistant.crx</code> 文件直接鼠标拖入扩展管理页面中央；<br/>
                        4. 浏览器会弹出询问“要添加晓林广告助手吗？”，点击<strong>【添加扩展程序】</strong>即可！<br/>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          💡 注意：若拖入提示“无法从该网站添加应用”或“程序包无效 CRX_HEADER_INVALID”，说明您的浏览器内核版本限制了本地 CRX，请直接改用上述第一种【ZIP 解压加载法】，100% 成功。
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Important Avoid Pits FAQ */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span>常见避坑问答 (FAQ)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  ⚠️ 1. 解压出来的文件夹安装后能删除吗？
                </h5>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>绝对不能删除或重命名！</strong> Chrome 开发者模式插件需要从本地该文件夹实时读取代码。若删除了文件夹，插件会报废并提示“找不到文件”。建议解压后放在不会误删的稳定磁盘路径。
                </p>
              </div>

              <div className="space-y-1">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  🔄 2. 后续插件如何更新？
                </h5>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  有新版本发布时，直接下载新版 ZIP 包，将解压后的文件直接覆盖替换原文件夹；然后在 <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 font-mono text-[10px] rounded">chrome://extensions/</code> 中点击插件卡片右下角的<strong>【刷新 🔄】</strong>按钮即可完成热更新！
                </p>
              </div>

              <div className="space-y-1">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  🛡️ 3. 插件会导致亚马逊店铺关联吗？
                </h5>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  <strong>100% 不会导致关联。</strong> 晓林广告助手是纯前端脚本工具，不与任何外部第三方服务器通讯，不保存账号信息，在紫鸟/Hubstudio 各环境内完全独立沙盒运行。
                </p>
              </div>

              <div className="space-y-1">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  🎯 4. 插件安装后在哪里看到效果？
                </h5>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  打开亚马逊卖家后台的“广告活动管理 (Campaign Manager)”页面，插件会自动注入数据透视栏；在亚马逊买家搜索框中输入产品词，也会自动出现深度下拉拓展热搜词卡片。
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>若在紫鸟或 Hubstudio 中安装遇到疑问，随时点击右下角【在线客服】提供远程协助</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDirectDownload('zip')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>立即下载 ZIP 安装包</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition"
            >
              完成并返回
            </button>
          </div>
        </div>

      </div>

      {/* Google Chrome & Edge CRX Interception Modal */}
      {showCrxInterceptModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div 
            className="fixed inset-0"
            onClick={() => setShowCrxInterceptModal(false)}
          />
          <div className="relative bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl text-slate-100 z-10 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Google Chrome 安全策略拦截提示
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    检测到您当前使用 {browserInfo.browserName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCrxInterceptModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Error Alert Banner */}
            <div className="bg-slate-950 border border-rose-500/40 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono bg-rose-950/40 border border-rose-800/40 rounded-xl px-3 py-2 text-rose-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <span>❌ 程序包无效:</span>
                  <span className="text-rose-200">"CRX_REQUIRED_PROOF_MISSING"</span>
                </span>
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-sans font-bold">确定</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                👆 <strong>这是谷歌浏览器的底层策略拦截：</strong>谷歌对所有未上架 Chrome Web Store 官方应用商店的 <code className="text-slate-300 font-mono">.crx</code> 文件进行签名强校验，直接下载或拖入会导致浏览器报错拦截。
              </p>
            </div>

            {/* Solution Recommendation */}
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-200 space-y-2">
              <div className="font-bold flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>官方推荐唯一 100% 成功安装方案：</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                针对 Google Chrome / Edge，请直接使用<strong>【ZIP 源码安装包】</strong>！下载后解压到文件夹，在 <code className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-emerald-400">chrome://extensions/</code> 开启【开发者模式】，点击【加载已解压的扩展程序】即可秒级安装，<strong>完全避开谷歌签名校验，100% 成功且稳定可用！</strong>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => {
                  setShowCrxInterceptModal(false);
                  handleDirectDownload('zip');
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <FolderArchive className="w-4 h-4" />
                <span>立即改下 ZIP 安装包 (强烈推荐 · 100% 成功)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  onClick={() => setShowCrxInterceptModal(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    setShowCrxInterceptModal(false);
                    handleDirectDownload('crx');
                  }}
                  className="text-slate-500 hover:text-amber-400 transition text-[11px] underline"
                >
                  我已知晓，仍要强制下载 .CRX 文件
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal mini icon helper
const BookOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);
