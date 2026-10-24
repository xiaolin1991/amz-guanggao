import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  ShieldCheck,
  Puzzle
} from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExtensionModal?: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose, onOpenExtensionModal }) => {
  const [activeTab, setActiveTab] = useState<'download' | 'upload' | 'faq'>('download');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-500/20">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                亚马逊批量操作表（Bulk Operations）手把手指南
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                  保姆级教程
                </span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                教你如何 1 分钟从亚马逊后台导出报表，并在优化后一键重新上传生效
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Extension Announcement Banner inside Tutorial Modal */}
        {onOpenExtensionModal && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent px-6 py-2.5 border-b border-amber-200/80 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px]">NEW</span>
              <span><strong>更快捷方式：</strong>安装晓林广告助手浏览器插件，无需下载报表，直接在亚马逊后台实时调价诊断！</span>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenExtensionModal();
              }}
              className="text-amber-700 dark:text-amber-400 font-bold hover:underline flex items-center gap-1 flex-shrink-0"
            >
              <Puzzle className="w-3.5 h-3.5" />
              <span>下载浏览器插件 (紫鸟/Hubstudio/Chrome) &gt;</span>
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 px-6 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('download')}
            className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'download'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" /> 第一步：如何下载后台报表
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" /> 第二步：如何将调整表传回后台
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 border-b-2 transition ${
              activeTab === 'faq'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> 避坑指南与常见问题
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {activeTab === 'download' && (
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <strong>为什么推荐使用「批量操作表」？</strong>
                  <p className="text-amber-700 dark:text-amber-200/80 mt-1">
                    批量操作表（Bulk Operations）包含你店铺所有的广告活动、出价、投放词和否定词。本工具分析后可以直接导出修改版，你传回后台就能自动完成几十个词的调价和否定，彻底告别后台一个个点进广告活动的低效操作！
                  </p>
                </div>
              </div>

              {/* Step by step cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Step 1 */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-600 transition">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                      1
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-white">进入广告活动管理</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    登录亚马逊卖家平台 (Seller Central)，在顶部菜单栏点击：
                  </p>
                  <div className="mt-3 p-2.5 bg-white dark:bg-slate-900 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">广告 (Advertising)</span>
                    <span>&gt;</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">广告活动管理 (Campaign Manager)</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-600 transition">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                      2
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-white">找到「批量操作」入口</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    在左侧边栏图标菜单中，找到并点击带有表格图标的：
                  </p>
                  <div className="mt-3 p-2.5 bg-white dark:bg-slate-900 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">批量操作 (Bulk operations)</span>
                    <span className="text-slate-400 dark:text-slate-500 ml-2">（部分版本位于左侧“管理”子菜单下）</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-600 transition md:col-span-2">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                      3
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-white">配置下载选项（极其关键！）</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                    <div className="bg-white dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">📅 日期范围 (Date Range)</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        选择 <strong className="text-slate-900 dark:text-white">过去 30 天</strong> 或 <strong className="text-slate-900 dark:text-white">过去 60 天</strong>。数据周期越长，算法判断“只点击不出单”的准确率越高！
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">⚠️ 排除归因延迟（必看）</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        勾选 <strong className="text-slate-900 dark:text-white">“排除过去 48 小时的数据”</strong>。因为最新 2 天的订单往往存在归因同步延迟，排除可避免误伤好词。
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">📋 内容筛选 (Filter)</div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        勾选 <strong className="text-slate-900 dark:text-white">已启用的广告活动</strong> 和 <strong className="text-slate-900 dark:text-white">已暂停的广告活动</strong>。不勾选“已存档”以大幅精简文件体积。
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-600 transition md:col-span-2">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                      4
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-white">生成并下载 Excel 文件</h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    点击蓝色的 <strong className="text-amber-600 dark:text-amber-400">「创建用于下载的电子表格 (Create spreadsheet for download)」</strong> 按钮。
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    通常等待 30 秒至 2 分钟，页面下方的列表会显示状态由 “正在进行 (In progress)” 变为可点击的 <span className="text-emerald-600 dark:text-emerald-400 font-semibold underline">“下载 (Download)”</span> 链接，点击保存到电脑即可。
                  </p>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <strong>从本软件导出后，如何让修改生效？</strong>
                  <p className="text-emerald-700 dark:text-emerald-200/80 mt-1">
                    在软件页面核对好建议后，点击「导出修改版 Bulk 批量表 (.xlsx)」。接着只需把这个 Excel 文件重新传回后台，亚马逊官方就会在后台自动完成批处理。
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">打开批量操作页面的上传区</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      同样回到卖家平台 <code className="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400">广告 &gt; 广告活动管理 &gt; 批量操作 (Bulk operations)</code> 页面。
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">找到「上传文件 (Upload spreadsheet)」模块</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      页面通常分为左右两栏或上下两部分。找到 <strong className="text-slate-900 dark:text-white">“上传电子表格以更新广告活动”</strong>。
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">选择文件并提交上传</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      点击 <strong className="text-amber-600 dark:text-amber-400">“选择文件 (Choose file)”</strong>，选中刚才由本软件导出的 <code className="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200">Amazon_Bulk_Adjusted_xxxx.xlsx</code> 文件，点击上传。
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      系统会显示处理进度。通常 1 分钟左右即显示 <span className="text-emerald-600 dark:text-emerald-400 font-bold">“已完成 (Finished)”</span>，所有降价与否定词即刻全局生效！
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
                <h4 className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> 我的广告数据和关键词会被泄露吗？
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  <strong>绝对不会！</strong> 本软件是纯前端架构（SPA），所有 Excel 的读取、计算和文件导出全都在你的<strong>浏览器本地内存</strong>中运行，数据<strong>绝不上传任何云端服务器或数据库</strong>。你可以放心地断开网络进行操作测试。
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
                <h4 className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> 为什么我下载的报表里面有些词显示 ACOS 是负数或很奇怪？
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  在亚马逊原始数据中，如果某个词只产生了花费但订单为 0，销售额即为 0，ACOS 无法除以 0（数学上为无穷大）。本软件会自动将这些词识别为<strong>“大出血无效词”</strong>，直接列入否定清单。
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
                <h4 className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> 我如果只有搜索词报表 (Search Term Report) 能用吗？
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  可以！本软件全面兼容两种格式：
                  <br />1. <strong>批量操作表 (Bulk Operations)</strong>：既能诊断，又能一键传回后台直接生效（推荐）。
                  <br />2. <strong>搜索词报告 (Search Term Report)</strong>：支持拖入进行全面诊断和查看否定建议清单。
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-5">
                <h4 className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> 上传亚马逊报错「标头无效」或「必须确保前三个列的标题是产品、实体层级和操作」？
                </h4>
                <div className="text-sm text-slate-600 dark:text-slate-300 mt-2 space-y-2 leading-relaxed">
                  <p>
                    <strong>原因分析：</strong>
                    <br />
                    1. <strong>报表来源差异</strong>：如果您从广告活动里面的“投放”或“关键词”列表中点击了导出，下载的是单向展示的 CSV 投放报表，它缺少亚马逊后台内部的数字 ID（如 Keyword ID、Campaign ID）。亚马逊的“批量操作（Bulk Operations）”系统无法匹配出价修改。
                    <br />
                    2. <strong>工作表冲突</strong>：亚马逊批量操作验证极其严苛，不允许存在非亚马逊官方的工作表（例如自定义的复盘明细表），且前三列必须严格为 <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-xs">Product</code>、<code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-xs">Entity</code>、<code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-xs">Operation</code>。
                  </p>
                  <p>
                    <strong>✅ 正确解决方案：</strong>
                    <br />
                    请务必在亚马逊卖家平台点击：<strong className="text-amber-600 dark:text-amber-400">广告 &gt; 广告活动管理 &gt; 左侧菜单「批量操作 (Bulk operations)」&gt; 创建并下载 30天或 60天电子表格</strong>。将下载得到的官方表格拖入本工具进行调价，本工具导出的更新表 100% 完美回传，绝不报错！
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            本地计算 · 零数据泄露风险 · 安全合规
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-sm transition shadow-md shadow-amber-500/20"
          >
            我明白了，开始使用
          </button>
        </div>

      </div>
    </div>
  );
};
