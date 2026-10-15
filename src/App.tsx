import React, { useState, useMemo, useEffect } from 'react';
import { 
  OptimizerConfig, 
  NormalizedAdItem, 
  BidAdjustmentAction, 
  NegativeTargetAction, 
  HarvestAction 
} from './types/amazon';
import { parseAmazonExcel, ParseResult } from './utils/amazonBulkParser';
import { runOptimizationDiagnosis } from './utils/optimizerEngine';
import { exportUpdatedBulkFile, exportAuditReviewFile } from './utils/bulkExporter';
import { 
  HistoryRecord, 
  saveHistoryReport, 
  getHistoryReports, 
  deleteHistoryReport, 
  clearAllHistoryReports 
} from './utils/historyDb';
import { MOCK_AD_ITEMS } from './data/mockBulkData';

import { Header } from './components/Header';
import { TutorialModal } from './components/TutorialModal';
import { FileUploader } from './components/FileUploader';
import { ConfigBar } from './components/ConfigBar';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ActionTabs } from './components/ActionTabs';
import { ExportBar } from './components/ExportBar';
import { FloatingSupport } from './components/FloatingSupport';

export const App: React.FC = () => {
  // Theme state: defaults to 'light' (pure white & soft clean slate), switchable to 'dark' for night
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('amz_theme');
    return saved === 'dark' ? 'dark' : 'light'; // default 'light'
  });

  // Full-width mode state: defaults to true for wide screen table view
  const [isFullWidth, setIsFullWidth] = useState<boolean>(() => {
    const saved = localStorage.getItem('amz_full_width');
    return saved !== null ? saved === 'true' : true; // default true (wide screen mode)
  });

  // History records list
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  useEffect(() => {
    localStorage.setItem('amz_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('amz_full_width', String(isFullWidth));
  }, [isFullWidth]);

  // Load history records from IndexedDB on startup
  useEffect(() => {
    getHistoryReports().then(records => {
      setHistoryRecords(records);
    }).catch(err => {
      console.warn('Failed to load history records:', err);
    });
  }, []);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const [config, setConfig] = useState<OptimizerConfig>({
    targetAcos: 28,
    zeroOrderClickThreshold: 10,
    maxBidDecreasePercent: 30,
    minBidFloor: 0.15,
    autoHarvestExact: true,
    harvestMinOrders: 2
  });

  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [items, setItems] = useState<NormalizedAdItem[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isDashboardVisible, setIsDashboardVisible] = useState<boolean>(true);

  // Custom action states overrides (selected, userCustomBid)
  const [customBidOverrides, setCustomBidOverrides] = useState<Record<string, number>>({});
  const [actionSelectionOverrides, setActionSelectionOverrides] = useState<Record<string, boolean>>({});

  // Parse file and persist into History DB
  const handleFileLoaded = async (buffer: ArrayBuffer, name: string) => {
    setIsLoading(true);
    try {
      const result = parseAmazonExcel(buffer, name);
      setParseResult(result);
      setItems(result.items);
      setFileName(name);
      setCustomBidOverrides({});
      setActionSelectionOverrides({});

      // Calculate brief summary for history card
      const totalSpend = result.items.reduce((sum, i) => sum + i.spend, 0);
      const totalSales = result.items.reduce((sum, i) => sum + i.sales, 0);
      const overallAcos = totalSales > 0 ? Number(((totalSpend / totalSales) * 100).toFixed(2)) : (totalSpend > 0 ? 100 : 0);

      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const historyItem: HistoryRecord = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        fileName: name,
        uploadTime: dateStr,
        itemCount: result.items.length,
        totalSpend: Number(totalSpend.toFixed(2)),
        totalSales: Number(totalSales.toFixed(2)),
        overallAcos,
        items: result.items,
        rawRows: result.rawRows,
        sheetName: result.sheetName
      };

      await saveHistoryReport(historyItem);
      const updatedRecords = await getHistoryReports();
      setHistoryRecords(updatedRecords);
    } catch (err: any) {
      alert(`解析失败: ${err.message || '文件格式不正确，请确保上传亚马逊官方报表'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load from History record
  const handleLoadHistory = (record: HistoryRecord) => {
    setParseResult({
      sheetName: record.sheetName || 'Sponsored Products',
      workbook: null as any,
      items: record.items,
      rawRows: record.rawRows || [],
      totalRowCount: record.items.length
    });
    setItems(record.items);
    setFileName(record.fileName);
    setCustomBidOverrides({});
    setActionSelectionOverrides({});
  };

  // Delete single history record
  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteHistoryReport(id);
      const updated = await getHistoryReports();
      setHistoryRecords(updated);
    } catch (err) {
      console.error('Failed to delete history record:', err);
    }
  };

  // Clear all history records
  const handleClearHistory = async () => {
    if (confirm('确定要清空所有本地保存的报表历史记录吗？')) {
      try {
        await clearAllHistoryReports();
        setHistoryRecords([]);
      } catch (err) {
        console.error('Failed to clear history:', err);
      }
    }
  };

  // Load demo mock data
  const handleLoadDemo = () => {
    setParseResult(null);
    setItems(MOCK_AD_ITEMS);
    setFileName('演示数据_Amazon_Bulk_SP_30Days.xlsx');
    setCustomBidOverrides({});
    setActionSelectionOverrides({});
  };

  // Reset / Return to Home
  const handleReset = () => {
    setParseResult(null);
    setItems([]);
    setFileName('');
    setCustomBidOverrides({});
    setActionSelectionOverrides({});
  };

  // Run diagnosis whenever items or config changes
  const { summary, baseBidActions, baseNegativeActions, baseHarvestActions } = useMemo(() => {
    if (items.length === 0) {
      return {
        summary: {
          totalSpend: 0,
          totalSales: 0,
          overallAcos: 0,
          totalOrders: 0,
          totalClicks: 0,
          averageCpc: 0,
          wastedSpend: 0,
          wastedSpendPercent: 0,
          bleedingKeywordsCount: 0,
          highAcosItemsCount: 0,
          harvestItemsCount: 0,
          zeroImpressionItemsCount: 0,
          potentialMonthlySavings: 0
        },
        baseBidActions: [] as BidAdjustmentAction[],
        baseNegativeActions: [] as NegativeTargetAction[],
        baseHarvestActions: [] as HarvestAction[]
      };
    }
    const res = runOptimizationDiagnosis(items, config);
    return {
      summary: res.summary,
      baseBidActions: res.bidActions,
      baseNegativeActions: res.negativeActions,
      baseHarvestActions: res.harvestActions
    };
  }, [items, config]);

  // Apply overrides
  const bidActions = useMemo(() => {
    return baseBidActions.map(action => ({
      ...action,
      selected: actionSelectionOverrides[action.id] !== undefined 
        ? actionSelectionOverrides[action.id] 
        : action.selected,
      userCustomBid: customBidOverrides[action.id] !== undefined
        ? customBidOverrides[action.id]
        : action.currentBid
    }));
  }, [baseBidActions, actionSelectionOverrides, customBidOverrides]);

  const negativeActions = useMemo(() => {
    return baseNegativeActions.map(action => ({
      ...action,
      selected: actionSelectionOverrides[action.id] !== undefined
        ? actionSelectionOverrides[action.id]
        : action.selected
    }));
  }, [baseNegativeActions, actionSelectionOverrides]);

  const harvestActions = useMemo(() => {
    return baseHarvestActions.map(action => ({
      ...action,
      selected: actionSelectionOverrides[action.id] !== undefined
        ? actionSelectionOverrides[action.id]
        : action.selected
    }));
  }, [baseHarvestActions, actionSelectionOverrides]);

  // Toggle handlers with Shift-range support
  const handleToggleBidAction = (id: string, shiftRangeIds?: string[]) => {
    if (shiftRangeIds && shiftRangeIds.length > 0) {
      const newOverrides = { ...actionSelectionOverrides };
      shiftRangeIds.forEach(rangeId => {
        newOverrides[rangeId] = true;
      });
      setActionSelectionOverrides(newOverrides);
    } else {
      const cur = bidActions.find(b => b.id === id);
      if (cur) {
        setActionSelectionOverrides(prev => ({ ...prev, [id]: !cur.selected }));
      }
    }
  };

  const handleToggleNegativeAction = (id: string, shiftRangeIds?: string[]) => {
    if (shiftRangeIds && shiftRangeIds.length > 0) {
      const newOverrides = { ...actionSelectionOverrides };
      shiftRangeIds.forEach(rangeId => {
        newOverrides[rangeId] = true;
      });
      setActionSelectionOverrides(newOverrides);
    } else {
      const cur = negativeActions.find(n => n.id === id);
      if (cur) {
        setActionSelectionOverrides(prev => ({ ...prev, [id]: !cur.selected }));
      }
    }
  };

  const handleToggleHarvestAction = (id: string) => {
    const cur = harvestActions.find(h => h.id === id);
    if (cur) {
      setActionSelectionOverrides(prev => ({ ...prev, [id]: !cur.selected }));
    }
  };

  const handleToggleAllNegatives = (selected: boolean) => {
    const newOverrides = { ...actionSelectionOverrides };
    negativeActions.forEach(n => {
      newOverrides[n.id] = selected;
    });
    setActionSelectionOverrides(newOverrides);
  };

  const handleToggleAllBids = (selected: boolean, targetFilterIds?: string[]) => {
    const newOverrides = { ...actionSelectionOverrides };
    if (targetFilterIds && targetFilterIds.length > 0) {
      targetFilterIds.forEach(id => {
        newOverrides[id] = selected;
      });
    } else {
      bidActions.forEach(b => {
        newOverrides[b.id] = selected;
      });
    }
    setActionSelectionOverrides(newOverrides);
  };

  const handleCustomBidChange = (id: string, newBid: number) => {
    setCustomBidOverrides(prev => ({ ...prev, [id]: newBid }));
  };

  // Batch Apply Bids
  const handleBatchApplyBids = (updatesMap: Record<string, number>) => {
    setCustomBidOverrides(prev => ({
      ...prev,
      ...updatesMap
    }));
  };

  // Reset Bids to Original Bids (原出价/原竞价)
  const handleResetBidsToOriginal = () => {
    setCustomBidOverrides({});
  };

  // Reset Bids to Algorithmic Suggested Bids (算法保本建议价)
  const handleResetBidsToSuggested = () => {
    const map: Record<string, number> = {};
    bidActions.forEach(b => {
      map[b.id] = b.suggestedBid;
    });
    setCustomBidOverrides(map);
  };

  // Check if loaded file is standard Amazon Bulk format (has Product/Entity/Operation columns)
  const isRealBulkFormat = useMemo(() => {
    if (!parseResult || !parseResult.rawRows || parseResult.rawRows.length === 0) return true;
    const firstRow = parseResult.rawRows[0];
    const keys = Object.keys(firstRow).map(k => k.trim().toLowerCase());
    const hasProduct = keys.some(k => k === 'product' || k === '产品');
    const hasEntity = keys.some(k => k === 'entity' || k === '实体' || k === '实体层级');
    const hasOperation = keys.some(k => k === 'operation' || k === '操作');
    return hasProduct && hasEntity && hasOperation;
  }, [parseResult]);

  // Export standard Amazon file
  const handleExport = () => {
    exportUpdatedBulkFile(parseResult, bidActions, negativeActions, harvestActions);
  };

  // Export internal review audit report
  const handleExportReview = () => {
    exportAuditReviewFile(bidActions, negativeActions, harvestActions);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-28 transition-colors">
      {/* Top Header */}
      <Header
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onLoadDemo={handleLoadDemo}
        onGoHome={handleReset}
        hasData={items.length > 0}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content */}
      <main className={`flex-1 w-full mx-auto px-3 sm:px-6 py-6 space-y-6 transition-all duration-300 ${
        isFullWidth ? 'max-w-[99%]' : 'max-w-[95%] 2xl:max-w-[1700px]'
      }`}>
        {items.length === 0 ? (
          <FileUploader
            onFileLoaded={handleFileLoaded}
            onLoadDemo={handleLoadDemo}
            isLoading={isLoading}
            historyRecords={historyRecords}
            onLoadHistory={handleLoadHistory}
            onDeleteHistory={handleDeleteHistory}
            onClearHistory={handleClearHistory}
          />
        ) : (
          <>
            {/* File Info Bar */}
            <div className="flex flex-wrap items-center justify-between bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs shadow-sm transition-colors gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-500 dark:text-slate-400">已载入广告报表：</span>
                <span className="font-semibold text-slate-900 dark:text-white">{fileName}</span>
                <span className="text-slate-500 dark:text-slate-400">
                  （共识别 {items.length} 个投放词/Targeting，包含 {items.filter(i => i.clicks > 0 || i.spend > 0).length} 个产生点击花费的数据项）
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-medium flex items-center gap-1"
                >
                  更换其他报表
                </button>
                <span>·</span>
                <button
                  onClick={() => setIsTutorialOpen(true)}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-500 underline underline-offset-2 flex items-center gap-1 font-medium"
                >
                  如何上传回亚马逊后台？
                </button>
              </div>
            </div>

            {/* Non-Bulk (Targeting CSV) Warm Guidance Banner */}
            {!isRealBulkFormat && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5 shadow-sm">
                <span className="text-base flex-shrink-0">💡</span>
                <div className="flex-1 leading-relaxed">
                  <strong>报表格式提示：</strong>您当前导入的是广告管理【投放明细 Targeting 报表】。工具已为您完成全量出价诊断与计算！
                  <span className="text-slate-600 dark:text-slate-300 ml-1">
                    由于此类报表缺少亚马逊系统内部的数字 Keyword ID，如需在亚马逊【批量操作 (Bulk Operations)】一键上传自动生效，请从广告后台批量操作下载 30/60 天官方 Bulk 表格。
                  </span>
                  <button
                    onClick={() => setIsTutorialOpen(true)}
                    className="ml-1 text-blue-600 dark:text-blue-400 font-bold underline hover:text-blue-500"
                  >
                    👉 1分钟下载官方 Bulk 表教程
                  </button>
                </div>
              </div>
            )}

            {/* Config Control Bar */}
            <ConfigBar config={config} onChange={setConfig} />

            {/* Metrics Dashboard with 1-click Toggle to expand table workspace */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsDashboardVisible(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition active:scale-95 shadow-sm"
                  title="点击可一键收起或展开图表大盘，腾出大面积垂直视野专心调价"
                >
                  <span>{isDashboardVisible ? '🔼 收起大盘图表 (最大化报表视野)' : '🔽 展开大盘图表 (查看核心诊断卡)'}</span>
                </button>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                  <span>广告总花费: <strong className="text-rose-600">${summary.totalSpend.toFixed(2)}</strong></span>
                  <span>·</span>
                  <span>总销售额: <strong className="text-slate-900 dark:text-white">${summary.totalSales.toFixed(2)}</strong></span>
                  <span>·</span>
                  <span>整体ACOS: <strong className={summary.overallAcos > 28 ? 'text-rose-600' : 'text-emerald-600'}>{summary.overallAcos}%</strong></span>
                  <span>·</span>
                  <span>建议调价: <strong className="text-amber-600">{bidActions.length}项</strong></span>
                  <span>·</span>
                  <span>建议否定: <strong className="text-rose-600">{negativeActions.length}个</strong></span>
                </div>
              </div>

              {isDashboardVisible && <MetricsDashboard summary={summary} config={config} />}
            </div>

            {/* Action Tables */}
            <ActionTabs
              bidActions={bidActions}
              negativeActions={negativeActions}
              harvestActions={harvestActions}
              allItems={items}
              onToggleBidAction={handleToggleBidAction}
              onToggleNegativeAction={handleToggleNegativeAction}
              onToggleHarvestAction={handleToggleHarvestAction}
              onToggleAllNegatives={handleToggleAllNegatives}
              onToggleAllBids={handleToggleAllBids}
              onCustomBidChange={handleCustomBidChange}
              onBatchApplyBids={handleBatchApplyBids}
              onResetBidsToOriginal={handleResetBidsToOriginal}
              onResetBidsToSuggested={handleResetBidsToSuggested}
              isFullWidth={isFullWidth}
              onToggleFullWidth={() => setIsFullWidth(!isFullWidth)}
            />

            {/* Bottom Export Bar */}
            <ExportBar
              bidActions={bidActions}
              negativeActions={negativeActions}
              harvestActions={harvestActions}
              onExport={handleExport}
              onExportReview={handleExportReview}
              onOpenTutorial={() => setIsTutorialOpen(true)}
            />
          </>
        )}
      </main>

      {/* Tutorial Guide Modal */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Floating Online Customer Support & Back to Top */}
      <FloatingSupport />
    </div>
  );
};
export default App;
