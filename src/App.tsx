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
import { exportUpdatedBulkFile } from './utils/bulkExporter';
import { MOCK_AD_ITEMS } from './data/mockBulkData';

import { Header } from './components/Header';
import { TutorialModal } from './components/TutorialModal';
import { FileUploader } from './components/FileUploader';
import { ConfigBar } from './components/ConfigBar';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ActionTabs } from './components/ActionTabs';
import { ExportBar } from './components/ExportBar';

export const App: React.FC = () => {
  // Theme state: defaults to 'light' (pure white & soft clean slate), switchable to 'dark' for night
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('amz_theme');
    return saved === 'dark' ? 'dark' : 'light'; // default 'light'
  });

  useEffect(() => {
    localStorage.setItem('amz_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

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

  // Custom action states overrides (selected, userCustomBid)
  const [customBidOverrides, setCustomBidOverrides] = useState<Record<string, number>>({});
  const [actionSelectionOverrides, setActionSelectionOverrides] = useState<Record<string, boolean>>({});

  // Parse file
  const handleFileLoaded = (buffer: ArrayBuffer, name: string) => {
    setIsLoading(true);
    try {
      const result = parseAmazonExcel(buffer);
      setParseResult(result);
      setItems(result.items);
      setFileName(name);
      setCustomBidOverrides({});
      setActionSelectionOverrides({});
    } catch (err: any) {
      alert(`解析失败: ${err.message || '文件格式不正确，请确保上传亚马逊官方报表'}`);
    } finally {
      setIsLoading(false);
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

  // Reset
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
        : action.suggestedBid
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

  // Toggle handlers
  const handleToggleBidAction = (id: string) => {
    const cur = bidActions.find(b => b.id === id);
    if (cur) {
      setActionSelectionOverrides(prev => ({ ...prev, [id]: !cur.selected }));
    }
  };

  const handleToggleNegativeAction = (id: string) => {
    const cur = negativeActions.find(n => n.id === id);
    if (cur) {
      setActionSelectionOverrides(prev => ({ ...prev, [id]: !cur.selected }));
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

  const handleToggleAllBids = (selected: boolean) => {
    const newOverrides = { ...actionSelectionOverrides };
    bidActions.forEach(b => {
      newOverrides[b.id] = selected;
    });
    setActionSelectionOverrides(newOverrides);
  };

  const handleCustomBidChange = (id: string, newBid: number) => {
    setCustomBidOverrides(prev => ({ ...prev, [id]: newBid }));
  };

  // Export
  const handleExport = () => {
    exportUpdatedBulkFile(parseResult, bidActions, negativeActions, harvestActions);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-28 transition-colors">
      {/* Top Header */}
      <Header
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onLoadDemo={handleLoadDemo}
        onReset={handleReset}
        hasData={items.length > 0}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {items.length === 0 ? (
          <FileUploader
            onFileLoaded={handleFileLoaded}
            onLoadDemo={handleLoadDemo}
            isLoading={isLoading}
          />
        ) : (
          <>
            {/* File Info Bar */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs shadow-sm transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-500 dark:text-slate-400">当前已载入报表：</span>
                <span className="font-semibold text-slate-800 dark:text-white">{fileName}</span>
                <span className="text-slate-400 dark:text-slate-500">（共计识别 {items.length} 条广告投放数据）</span>
              </div>
              <button
                onClick={() => setIsTutorialOpen(true)}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-500 underline underline-offset-2 flex items-center gap-1 font-medium"
              >
                如何上传回亚马逊后台？
              </button>
            </div>

            {/* Config Control Bar */}
            <ConfigBar config={config} onChange={setConfig} />

            {/* Metrics Dashboard */}
            <MetricsDashboard summary={summary} config={config} />

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
            />

            {/* Bottom Export Bar */}
            <ExportBar
              bidActions={bidActions}
              negativeActions={negativeActions}
              harvestActions={harvestActions}
              onExport={handleExport}
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
    </div>
  );
};
export default App;
