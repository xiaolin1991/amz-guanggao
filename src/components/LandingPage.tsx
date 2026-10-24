import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Download, 
  Puzzle, 
  TrendingDown, 
  SlidersHorizontal, 
  Ban, 
  CheckCircle2, 
  FileSpreadsheet, 
  Lock, 
  DollarSign, 
  Target, 
  Cpu, 
  BarChart3, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  UploadCloud, 
  RefreshCw, 
  Layers, 
  Zap, 
  ExternalLink,
  ChevronRight,
  Calculator,
  Flame,
  Clock,
  Laptop
} from 'lucide-react';
import { HistoryRecord } from '../utils/historyDb';

interface LandingPageProps {
  onEnterWorkbench: () => void;
  onLoadDemo: () => void;
  onOpenExtensionModal: () => void;
  onOpenTutorial: () => void;
  onFileLoaded: (fileBuffer: ArrayBuffer, fileName: string) => void;
  historyRecords: HistoryRecord[];
  onLoadHistory: (record: HistoryRecord) => void;
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
  hasLoadedData: boolean;
  loadedItemCount: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterWorkbench,
  onLoadDemo,
  onOpenExtensionModal,
  onOpenTutorial,
  onFileLoaded,
  historyRecords,
  onLoadHistory,
  onDeleteHistory,
  onClearHistory,
  hasLoadedData,
  loadedItemCount
}) => {
  // Interactive Calculator State for demonstration
  const [calcPrice, setCalcPrice] = useState<number>(25.0);
  const [calcCvr, setCalcCvr] = useState<number>(12.5);
  const [calcTargetAcos, setCalcTargetAcos] = useState<number>(25.0);

  // Live Break-even Suggested Bid calculation
  const calculatedBid = Number(((calcPrice * (calcCvr / 100) * (calcTargetAcos / 100))).toFixed(2));

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // File dropzone state in landing page
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result instanceof ArrayBuffer) {
        onFileLoaded(e.target.result, file.name);
        onEnterWorkbench();
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const faqs = [
    {
      q: '为什么说晓林广告助手是“绝对安全、零关联风险”？',
      a: '传统广告 SaaS 需要您将店铺 MWS / SP-API 权限授权给第三方服务器，不仅存在数据泄漏风险，多店铺同一 IP 授权还极易引发关联封店。晓林调价助手采用 100% 纯本地浏览器 JavaScript 内存计算，无需网络请求、无需绑定任何店铺账号、不抓取任何敏感密钥，从物理架构层面彻底隔绝多店铺关联与数据泄露隐患！'
    },
    {
      q: '修改出价和否定后，导出的文件可以直接上传回亚马逊后台吗？',
      a: '可以！系统严格遵循亚马逊官方批量操作（Bulk Operations）标准数据规范，完整保留 Product、Entity、Record ID、Campaign ID、Keyword ID 等所有关键系统字段。导出生成的 Excel 表格在亚马逊卖家后台【广告 -> 批量操作 -> 上传文件】中一键上传，1 秒内批量生效成百上千条竞价调整与否定！'
    },
    {
      q: '“保本竞价推导算法”的核心逻辑是什么？',
      a: '核心计算公式为：【保本建议出价 = 产品客单价 × 真实转化率 (CVR) × 目标 ACOS】。通过严格匹配关键词的历史真实转化能力反推其科学最高可承受出价。低于此出价能保住利润并放大出单，高于此出价则属于亏本烧钱。系统还会根据点击量梯级平滑降价，杜绝“一刀切”导致出单骤降。'
    },
    {
      q: '浏览器插件（v1.7.0）与网页端工作台有什么区别与配合？',
      a: '两者属于“双剑合璧”的协同生态：浏览器插件常驻在紫鸟/Hubstudio/Chrome 浏览器中，当您在亚马逊前台搜索或后台查看时，实时透视竞价、挖掘买家下拉热搜长尾词、拦截弱势竞品 ASIN；而网页端工作台则专门针对月度/季度的全店铺批量表格（Bulk Sheet），进行千行级别的大规模科学降价、0单吸血词精准批量否定与出单收割。'
    },
    {
      q: '我不懂复杂的广告公式，新手运营能快速上手吗？',
      a: '完全零门槛！您只需要在亚马逊后台点击“创建并下载批量表格”，将表格拖入本页面，系统内置的专家算法便会自动完成全量分析。您可以直接点击“一键导出修改表格”，也可以在工作台直观勾选想要调整的关键词，5 分钟即可完成过去需要消耗半天的调价工作。'
    }
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Active Data Notification Pill if user already loaded data */}
      {hasLoadedData && (
        <div className="sticky top-20 z-20 max-w-4xl mx-auto px-4">
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-4 border border-amber-300">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping" />
              <span>当前工作台已载入 <strong>{loadedItemCount}</strong> 条广告关键词分析数据</span>
            </div>
            <button
              onClick={onEnterWorkbench}
              className="px-4 py-1.5 rounded-xl bg-slate-950 text-amber-300 hover:text-white font-black text-xs transition active:scale-95 shadow-md flex items-center gap-1.5 flex-shrink-0"
            >
              <span>进入调价工作台</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative pt-6 sm:pt-12 pb-8 sm:pb-16 overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-amber-500/15 via-blue-500/10 to-emerald-500/15 blur-3xl rounded-full -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center px-4 space-y-6">
          {/* Trust Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 shadow-sm backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">专为亚马逊卖家量身定制 · 纯本地沙盒离线安全计算</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400">0 授权风险</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 dark:text-white tracking-tight leading-[1.15]">
            告别盲目烧钱，让每一分广告预算
            <br />
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              都能精准产出订单与利润
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            基于真实转化率与保本 ACOS 算法，毫秒级诊断 <span className="font-semibold text-rose-600 dark:text-rose-400">0单高花费吸血词</span> 与 <span className="font-semibold text-amber-600 dark:text-amber-400">虚高竞价</span>。原生支持亚马逊批量表格，1 秒一键导出上传后台立即生效！
          </p>

          {/* CTA Buttons Group */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={onEnterWorkbench}
              className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition active:scale-95 flex items-center gap-2 group"
            >
              <span>🚀 立即进入调价工作台</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                onLoadDemo();
                onEnterWorkbench();
              }}
              className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-sm sm:text-base shadow-sm hover:shadow transition active:scale-95 flex items-center gap-2"
            >
              <Play className="w-4 h-4 text-emerald-500" />
              <span>体验演示数据 (免上传体验)</span>
            </button>

            <button
              onClick={onOpenExtensionModal}
              className="px-5 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 font-bold text-sm sm:text-base transition active:scale-95 flex items-center gap-2"
            >
              <Puzzle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>下载浏览器插件 (v1.7.0)</span>
            </button>
          </div>

          {/* Quick Upload Drag & Drop in Hero */}
          <div className="max-w-2xl mx-auto pt-4">
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-2xl border-2 border-dashed cursor-pointer transition text-center ${
                isDragOver
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/40 hover:border-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="flex items-center justify-center gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <UploadCloud className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span>
                  或直接将亚马逊 <strong>Bulk Sheet (.xlsx / .csv)</strong> 拖拽至此处，快速开启智能诊断
                </span>
                <span className="text-amber-600 dark:text-amber-400 font-bold underline">立即上传</span>
              </div>
            </div>
          </div>

          {/* Key Stat Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                -25% ~ -42%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">平均降低无效 ACOS</div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">
                10 秒
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">千行报表全自动诊断</div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
                100%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">纯本地计算·防关联</div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl sm:text-3xl font-black text-rose-500 font-mono">
                $800+
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">平均单店铺月度止血节省</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points vs Solutions */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Pain Points &amp; Solutions
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">
            传统亚马逊广告优化，正在吞噬您的宝贵利润
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            晓林广告助手针对卖家痛点逐一击破，将过去需要耗费半天的繁重手工调价，升级为高确定性的科学自动化决策。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 hover:border-amber-400/50 transition">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ❌
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  0 单高花费吸血词悄悄吞噬预算
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  许多词点击了 15、25 甚至 40 次，却从未产生过 1 单。分散在不同广告组中难以人工排查，一个月白白烧掉几百上千美金。
                </p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>晓林智能止血方案：</strong>内置多阶点击阈值智能判定，毫秒级筛选出所有只耗费不出单的“吸血词”，一键生成精准否定（Negative Exact），立刻止血！
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 hover:border-amber-400/50 transition">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ❌
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  凭借主观感觉盲目出价，ACOS 居高不下
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  加价怕亏、降价怕没单。许多卖家凭感觉直接砍半或微降，导致出单主力词骤然掉出首页，或者劣质词依然超高出价亏本出单。
                </p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>晓林科学保本算法：</strong>根据真实转化率 CVR × 客单价 × 目标 ACOS 推导科学出价上限，配合安全保底底价与微调控制，保住排名的同时极致控本。
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 hover:border-amber-400/50 transition">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ❌
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Excel 手工表格反复 VLOOKUP，效率低下且极易出错
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  多店铺数万行批量数据，手动写公式匹配、改格式经常导致亚马逊报错“Entity Not Found”或竞价小数点写错，引发运营事故。
                </p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>晓林原生批量引擎：</strong>深度兼容亚马逊官方 Bulk 表格数据规范，自动绑定 Keyword ID 与实体层级，一键导出即可在后台上传，0 格式报错！
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 hover:border-amber-400/50 transition">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                ❌
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  第三方 SaaS 按年收费昂贵，且强制授权 API 有封店风险
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  市面多数工具按月收费高达数百美金，还必须授权店铺 MWS/SP-API，不仅商业机密被第三方收集，多店铺同授权甚至存在关联封店风险。
                </p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>晓林纯本地沙盒计算：</strong>零云端服务器传输，不收集任何数据，代码透明可查。可在紫鸟、Hubstudio 或断网环境下自由使用，绝对安全放心！
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Bidding Formula Simulator Widget */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
              <Calculator className="w-3.5 h-3.5" />
              <span>互动演示 · 核心保本竞价测算模型</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              科学竞价推导：每一分钱都有数学依据
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              拖动下方参数，直观体验算法如何根据您的<strong>产品单价、真实转化率与期望 ACOS</strong> 反推最高合理出价（CPC），杜绝盲目调价：
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Input Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* Price Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-300">产品平均售价 (Price)</span>
                  <span className="font-mono text-amber-400 text-base">${calcPrice.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="1"
                  value={calcPrice}
                  onChange={e => setCalcPrice(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>$5</span>
                  <span>$75</span>
                  <span>$150</span>
                </div>
              </div>

              {/* CVR Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-300">关键词历史转化率 (CVR)</span>
                  <span className="font-mono text-emerald-400 text-base">{calcCvr.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="0.5"
                  value={calcCvr}
                  onChange={e => setCalcCvr(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1.0% (低转化)</span>
                  <span>20.0% (均值)</span>
                  <span>40.0% (爆款)</span>
                </div>
              </div>

              {/* Target ACOS Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-300">目标保本 ACOS (Target ACOS)</span>
                  <span className="font-mono text-blue-400 text-base">{calcTargetAcos.toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="1"
                  value={calcTargetAcos}
                  onChange={e => setCalcTargetAcos(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>10% (极致控本)</span>
                  <span>28% (标准保本)</span>
                  <span>60% (激进推新)</span>
                </div>
              </div>
            </div>

            {/* Live Result Display Box */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 text-center space-y-4 shadow-xl">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                算法推导保本竞价 (Max CPC)
              </span>
              <div className="text-4xl sm:text-5xl font-black font-mono text-amber-400 drop-shadow-md">
                ${calculatedBid.toFixed(2)}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                ${calcPrice.toFixed(2)} × {calcCvr.toFixed(1)}% × {calcTargetAcos.toFixed(0)}% = ${calculatedBid.toFixed(2)}
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
                <div>🎯 <strong>出价高于 ${calculatedBid.toFixed(2)}：</strong>ACOS 将直接超标，亏本烧钱。</div>
                <div>✅ <strong>出价低于或等于 ${calculatedBid.toFixed(2)}：</strong>确保每单广告毛利完全在受控范围内。</div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              * 载入您的官方 Bulk 报表后，系统将自动为表格中全部关键词逐一匹配此科学算法并支持批量微调！
            </span>
            <button
              onClick={onEnterWorkbench}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <span>立即为我的报表测算</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Six Core Capabilities */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Core Features
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">
            六大核心功能模块，全方位护航广告盈利
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            从数据透视、保本推导、批量微调，到否定止血与官方格式导出，一站式闭环。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-amber-400/50 transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              🎯 智能竞价调整中心
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              支持目标 ACOS 科学建议竞价测算；具备手动提高/降低竞价自由微调、批量百分比/固定值步进、全选反选及自动数值升降序排列。
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-amber-400/50 transition">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              🛑 高花费 0 转化精准否定
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              快速揪出达到点击阈值却 0 产出的“流血词”，一键生成精准否定（Negative Exact），拦截无效点击浪费，平均立省 25%~40% 预算。
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-amber-400/50 transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              🌾 高转化潜质词拓词收割
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              自动挖掘广泛与词组广告中产生 2 单以上的优质出单买家搜索词，一键升级为独立精准投放词，助力爆款持续放大单量。
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-amber-400/50 transition">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Puzzle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              🧩 浏览器插件生态协同 (v1.7.0)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              搭配专属浏览器插件，适配紫鸟超级浏览器、Hubstudio 与 Chrome，在前台无感透视竞价、挖掘买家下拉热搜词、拦截弱势竞品 ASIN。
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-amber-400/50 transition">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              ⛶ 独立全屏调价工作台
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              支持一键打开独立全屏弹窗工作台，表头与调价工具栏永远置顶，彻底解决表格过长网页滚动冲突，沉浸式极速完成调价。
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3 hover:border-amber-400/50 transition">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              🔒 本地沙盒隐私与历史存储
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              所有文件仅在本地浏览器 IndexedDB 中安全存储，绝无云端偷取风险；支持多份报表历史一键回溯对比，调价记录清晰可循。
            </p>
          </div>
        </div>
      </section>

      {/* 3-Step Simple Workflow */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              3-Step Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">
              三步极简工作流，5 分钟完成过去半天的调价
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              无需任何学习成本，按照标准流程即插即用。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 relative space-y-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                1
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                下载后台 Bulk 报表
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                在亚马逊广告后台进入【批量操作 (Bulk operations)】，选择过去 30 天或 60 天日期范围，创建并下载标准表格。
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 relative space-y-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                2
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                拖入本系统诊断与微调
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                将表格直接拖入本工具，系统自动完成科学竞价推导与 0 单吸血词标记，您可以自由按需微调或直接使用推荐策略。
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 relative space-y-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
                3
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                一键导出上传回亚马逊
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                点击导出标准修改后 Bulk 表格，在亚马逊后台原批量操作处直接上传，几百个关键词竞价调整即刻全自动生效！
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onOpenTutorial}
              className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline"
            >
              <span>查看图文详细下载与上传说明指引</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="text-center space-y-2 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Comparison
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">
            方案对比：为什么选择晓林广告助手？
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold">
                  <th className="p-4 sm:p-5">对比维度</th>
                  <th className="p-4 sm:p-5 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    ⚡ 晓林广告调价助手
                  </th>
                  <th className="p-4 sm:p-5 text-slate-500">人工 Excel 手工调价</th>
                  <th className="p-4 sm:p-5 text-slate-500">传统 API 广告 SaaS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-400">
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-slate-900 dark:text-white">数据安全 &amp; 店铺防关联</td>
                  <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-amber-500/5">
                    ✅ 100% 本地计算，0 授权无关联
                  </td>
                  <td className="p-4 sm:p-5">安全但极容易漏改错改</td>
                  <td className="p-4 sm:p-5 text-rose-500">❌ 需授权 API，有多店铺关联风险</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-slate-900 dark:text-white">使用成本</td>
                  <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-amber-500/5">
                    ✅ 免费开源自主使用
                  </td>
                  <td className="p-4 sm:p-5">消耗大量运营人力工时</td>
                  <td className="p-4 sm:p-5 text-rose-500">❌ 每月 $200~$1000+ 昂贵订阅费</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-slate-900 dark:text-white">千行报表诊断速度</td>
                  <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-amber-500/5">
                    ✅ 10 秒毫秒级全量出价
                  </td>
                  <td className="p-4 sm:p-5">耗费 2~4 小时手工拉表</td>
                  <td className="p-4 sm:p-5">后台拉取延迟数小时</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-slate-900 dark:text-white">出价科学依据</td>
                  <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-amber-500/5">
                    ✅ 保本 CVR × ACOS 动态推导
                  </td>
                  <td className="p-4 sm:p-5">凭运营个人主观感觉盲猜</td>
                  <td className="p-4 sm:p-5">黑盒规则，无法自由透明干预</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-slate-900 dark:text-white">浏览器前台实时透视</td>
                  <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-amber-500/5">
                    ✅ 专属插件（支持紫鸟/Hubstudio）
                  </td>
                  <td className="p-4 sm:p-5">无前台插件</td>
                  <td className="p-4 sm:p-5">部分仅支持原生 Chrome</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-semibold text-slate-900 dark:text-white">上手学习门槛</td>
                  <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-amber-500/5">
                    ✅ 拖入即用，0 门槛傻瓜操作
                  </td>
                  <td className="p-4 sm:p-5">需熟练掌握 Excel 高级函数</td>
                  <td className="p-4 sm:p-5">功能极度臃肿繁琐，需培训</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* History Records Quick Access Section if records exist */}
      {historyRecords.length > 0 && (
        <section className="max-w-5xl mx-auto px-4">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  本地历史诊断报表快速回溯 ({historyRecords.length} 份)
                </h3>
              </div>
              <button
                onClick={onClearHistory}
                className="text-xs text-rose-500 hover:text-rose-600 transition"
              >
                清空全部记录
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              数据加密保存在您当前浏览器的本地数据库中，点击任一历史记录即可重新加载至工作台继续查看：
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {historyRecords.slice(0, 6).map(record => (
                <div
                  key={record.id}
                  onClick={() => {
                    onLoadHistory(record);
                    onEnterWorkbench();
                  }}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-500/10 border border-slate-200 dark:border-slate-700/60 hover:border-amber-400/50 cursor-pointer transition group space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate max-w-[180px]">
                      {record.fileName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {record.uploadTime.split(' ')[0]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>关键词: <strong className="text-slate-800 dark:text-slate-200">{record.itemCount}</strong></span>
                    <span>花费: <strong className="text-rose-600">${record.totalSpend}</strong></span>
                    <span>ACOS: <strong className={record.overallAcos > 28 ? 'text-rose-600' : 'text-emerald-600'}>{record.overallAcos}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Accordion Section */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="text-center space-y-2 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white">
            常见问题与安全解答
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-slate-900 dark:text-white text-xs sm:text-sm hover:text-amber-600 dark:hover:text-amber-400 transition"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Hero Call to Action Banner */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              准备好开始为您当前的广告降本增效了吗？
            </h2>
            <p className="text-xs sm:text-base font-medium text-slate-900/80 max-w-2xl mx-auto">
              不需信用卡、不需注册登录、不索要任何店铺 API，立即开启毫秒级智能广告调价！
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={onEnterWorkbench}
              className="px-8 py-3.5 rounded-2xl bg-slate-950 text-amber-300 hover:text-white font-black text-sm sm:text-base shadow-xl transition active:scale-95 flex items-center gap-2 group"
            >
              <span>🚀 立即进入调价工作台</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                onLoadDemo();
                onEnterWorkbench();
              }}
              className="px-6 py-3.5 rounded-2xl bg-white/90 hover:bg-white text-slate-900 font-bold text-sm sm:text-base shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <Play className="w-4 h-4 text-emerald-600" />
              <span>体验演示数据 (一秒看效果)</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 pt-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
          <button onClick={onEnterWorkbench} className="hover:text-amber-600 dark:hover:text-amber-400 transition">
            调价工作台
          </button>
          <button onClick={onOpenExtensionModal} className="hover:text-amber-600 dark:hover:text-amber-400 transition">
            浏览器插件下载 (v1.7.0)
          </button>
          <button onClick={onOpenTutorial} className="hover:text-amber-600 dark:hover:text-amber-400 transition">
            官方批量表操作教程
          </button>
          <button onClick={() => { onLoadDemo(); onEnterWorkbench(); }} className="hover:text-amber-600 dark:hover:text-amber-400 transition">
            体验演示数据
          </button>
        </div>
        <p>
          © 2026 晓林 Amz 广告调价助手 · 专为跨境电商卖家打造的科学保本调价引擎 · 纯本地沙盒计算 绝对隐私保障
        </p>
      </footer>
    </div>
  );
};
