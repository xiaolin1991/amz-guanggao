import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (fileBuffer: ArrayBuffer, fileName: string) => void;
  onLoadDemo: () => void;
  isLoading: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileLoaded,
  onLoadDemo,
  isLoading
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
    <div className="max-w-4xl mx-auto py-10 px-4">
      {/* Privacy Guarantee Pill */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 shadow-md">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>数据在本地浏览器沙盒内存中完成解析，<strong>绝不向任何外部服务器上传</strong>您的店铺与广告数据</span>
        </div>
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
        className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition cursor-pointer group ${
          isDragOver
            ? 'border-amber-400 bg-amber-500/5'
            : 'border-slate-700 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-900/90'
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
          <div className="w-20 h-20 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5 group-hover:scale-105 transition border border-amber-500/20">
            {isLoading ? (
              <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-10 h-10" />
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            拖拽亚马逊广告报表到这里，或 <span className="text-amber-400 underline decoration-amber-400/50 underline-offset-4">点击浏览选择</span>
          </h3>
          
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            支持亚马逊官方导出的 <strong className="text-slate-200">批量操作表（Bulk Operations .xlsx）</strong> 以及 <strong className="text-slate-200">搜索词报表（Search Term Report）</strong>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> 支持 .xlsx, .xls, .csv
            </span>
            <span>·</span>
            <span>中英文报表自适应解析</span>
            <span>·</span>
            <span>支持多广告活动批量诊断</span>
          </div>
        </div>
      </div>

      {/* Demo Data Option */}
      <div className="mt-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-slate-300 mb-1">
          手头还没有下载报表？
        </h4>
        <p className="text-xs text-slate-500 mb-4">
          内置典型亚马逊广告亏损店铺数据（包含高点击0单吸血词、超标高ACOS词、黄金收割词），一键体验全部调优功能：
        </p>
        <button
          onClick={onLoadDemo}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          一键载入演示数据 (Demo 体验)
        </button>
      </div>

    </div>
  );
};
