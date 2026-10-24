import React, { useRef, useState } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Trash2, 
  ChevronRight, 
  FileText,
  DollarSign,
  Puzzle,
  Download,
  ArrowRight,
  Home
} from 'lucide-react';
import { HistoryRecord } from '../utils/historyDb';

interface FileUploaderProps {
  onFileLoaded: (fileBuffer: ArrayBuffer, fileName: string) => void;
  onLoadDemo: () => void;
  onOpenExtensionModal?: () => void;
  onGoHome?: () => void;
  isLoading: boolean;
  historyRecords: HistoryRecord[];
  onLoadHistory: (record: HistoryRecord) => void;
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileLoaded,
  onLoadDemo,
  onOpenExtensionModal,
  onGoHome,
  isLoading,
  historyRecords,
  onLoadHistory,
  onDeleteHistory,
  onClearHistory
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result instanceof ArrayBuffer) {
        onFileLoaded(e.target.result, file.name);
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

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Top Navigation Row */}
      {onGoHome && (
        <div className="flex items-center justify-between">
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition shadow-sm active:scale-95"
          >
            <Home className="w-3.5 h-3.5 text-amber-500" />
            <span>← 返回官网介绍主页</span>
          </button>
          <span className="text-xs text-slate-400 font-mono">
            广告调价工作台 · 待载入报表
          </span>
        </div>
      )}

      {/* Privacy Guarantee Pill */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>数据在本地浏览器沙盒内存中完成解析，<strong>绝不向任何外部服务器上传</strong>您的店铺与广告数据</span>
        </div>
      </div>

      {/* Browser Extension Announcement Hero Banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 transition-all">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
            <Puzzle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wide">
                全新发布
              </span>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                晓林广告助手【浏览器插件 v1.7.0】
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                · 适配紫鸟超级浏览器 / Hubstudio / 谷歌 Chrome
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              无需频繁手动导出报表，直接在亚马逊卖家后台<strong>实时透视广告关键词、识别0单吸血词、自动拓展买家搜索长尾下拉词、狙击弱势竞品 ASIN</strong>！
            </p>
          </div>
        </div>

        {onOpenExtensionModal && (
          <button
            onClick={onOpenExtensionModal}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>免费下载插件 &amp; 图文安装教程</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Drop Zone Box */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition cursor-pointer group ${
          isDragOver
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/5'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/90 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center mb-4 group-hover:scale-105 transition border border-amber-200 dark:border-amber-500/20">
            {isLoading ? (
              <div className="w-7 h-7 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            拖拽亚马逊广告报表到这里，或 <span className="text-amber-600 dark:text-amber-400 underline decoration-amber-500/50 underline-offset-4">点击浏览选择</span>
          </h3>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
            支持亚马逊官方导出的 <strong className="text-slate-800 dark:text-slate-200">批量操作表（Bulk Operations .xlsx）</strong>、<strong className="text-slate-800 dark:text-slate-200">投放 Targeting 报表 (.csv)</strong> 以及 <strong className="text-slate-800 dark:text-slate-200">搜索词报表</strong>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 支持 .xlsx, .xls, .csv
            </span>
            <span>·</span>
            <span>自动保存历史上传</span>
            <span>·</span>
            <span>中英文报表自适应解析</span>
          </div>
        </div>
      </div>

      {/* History Records Section */}
      {historyRecords.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                历史报表记录
              </h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                {historyRecords.length} 份记录
              </span>
            </div>
            <button
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-rose-500 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空历史</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
            {historyRecords.map(record => (
              <div
                key={record.id}
                onClick={() => onLoadHistory(record)}
                className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-900 transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-xs text-slate-900 dark:text-white truncate">
                      <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate">{record.fileName}</span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteHistory(record.id);
                      }}
                      className="text-slate-300 hover:text-rose-500 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-0 group-hover:opacity-100"
                      title="删除该记录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>上传时间：{record.uploadTime}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 text-[11px]">
                      {record.itemCount} 条数据
                    </span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400 text-[11px]">
                      花费: ${record.totalSpend.toFixed(2)}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                      ACOS: {record.overallAcos}%
                    </span>
                  </div>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5 text-xs group-hover:translate-x-1 transition-transform">
                    载入分析 <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Demo Data Option */}
      <div className="text-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-300 mb-1">
          手头还没有下载报表？
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          内置典型亚马逊广告亏损店铺数据（包含高点击0单吸血词、超标高ACOS词、黄金收割词），一键体验全部调优功能：
        </p>
        <button
          onClick={onLoadDemo}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-md shadow-amber-500/20 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          一键载入演示数据 (Demo 体验)
        </button>
      </div>

    </div>
  );
};
