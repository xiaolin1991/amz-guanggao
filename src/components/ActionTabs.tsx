import React, { useState, useMemo } from 'react';
import { 
  AlertOctagon, 
  TrendingDown, 
  TrendingUp,
  Sparkles, 
  Table, 
  CheckSquare, 
  Square, 
  Search, 
  ArrowDownRight,
  ArrowUpRight,
  ArrowUpDown,
  Maximize2,
  Minimize2,
  Percent,
  DollarSign,
  Zap,
  RotateCcw,
  SlidersHorizontal,
  Flame,
  Check
} from 'lucide-react';
import { 
  BidAdjustmentAction, 
  NegativeTargetAction, 
  HarvestAction, 
  NormalizedAdItem 
} from '../types/amazon';

interface ActionTabsProps {
  bidActions: BidAdjustmentAction[];
  negativeActions: NegativeTargetAction[];
  harvestActions: HarvestAction[];
  allItems: NormalizedAdItem[];
  onToggleBidAction: (id: string, shiftRangeIds?: string[]) => void;
  onToggleNegativeAction: (id: string, shiftRangeIds?: string[]) => void;
  onToggleHarvestAction: (id: string) => void;
  onToggleAllNegatives: (selected: boolean) => void;
  onToggleAllBids: (selected: boolean, targetFilterIds?: string[]) => void;
  onCustomBidChange: (id: string, newBid: number) => void;
  onBatchApplyBids: (adjustedBidsMap: Record<string, number>) => void;
  onResetBidsToOriginal: () => void;
  onResetBidsToSuggested: () => void;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
}

type SortField = 'spend' | 'clicks' | 'impressions' | 'orders' | 'sales' | 'acos' | 'roas' | 'currentBid' | 'ctr' | 'cpc';

export const ActionTabs: React.FC<ActionTabsProps> = ({
  bidActions,
  negativeActions,
  harvestActions,
  allItems,
  onToggleBidAction,
  onToggleNegativeAction,
  onToggleHarvestAction,
  onToggleAllNegatives,
  onToggleAllBids,
  onCustomBidChange,
  onBatchApplyBids,
  onResetBidsToOriginal,
  onResetBidsToSuggested,
  isFullWidth,
  onToggleFullWidth
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'bid' | 'negative' | 'harvest'>('bid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [filterOnlyActive, setFilterOnlyActive] = useState<boolean>(false);

  // Sub-filter inside Bid tab: 'all' | 'decrease' | 'increase' | 'zero' | 'selected'
  const [bidFilter, setBidFilter] = useState<'all' | 'decrease' | 'increase' | 'zero' | 'selected'>('all');

  // Shift-click selection index trackers
  const [lastBidIndex, setLastBidIndex] = useState<number | null>(null);
  const [lastNegIndex, setLastNegIndex] = useState<number | null>(null);

  // Batch Bid Adjustment states - DEFAULT BASE IS 'current' (原出价/进价)
  const [batchMode, setBatchMode] = useState<'percent' | 'fixed'>('percent');
  const [batchDirection, setBatchDirection] = useState<'decrease' | 'increase'>('decrease');
  const [batchPercentValue, setBatchPercentValue] = useState<number>(10);
  const [batchFixedValue, setBatchFixedValue] = useState<number>(0.10);
  const [batchBase, setBatchBase] = useState<'current' | 'suggested'>('current'); // Default is 'current' (原出价)!

  const selectedNegativesCount = negativeActions.filter(n => n.selected).length;
  const selectedBidsCount = bidActions.filter(b => b.selected).length;
  const selectedHarvestCount = harvestActions.filter(h => h.selected).length;

  const totalNegativeSavings = negativeActions
    .filter(n => n.selected)
    .reduce((sum, item) => sum + item.wastedSpend, 0);

  // Filtered Bid Actions
  const filteredBidActions = useMemo(() => {
    return bidActions.filter(action => {
      // Sub-filter
      if (bidFilter === 'decrease' && action.type !== 'decrease_bid') return false;
      if (bidFilter === 'increase' && action.type !== 'increase_bid') return false;
      if (bidFilter === 'zero' && action.type !== 'zero_impression_boost') return false;
      if (bidFilter === 'selected' && !action.selected) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        action.item.keywordText.toLowerCase().includes(term) ||
        action.item.campaignName.toLowerCase().includes(term) ||
        action.item.matchTypeDisplay.toLowerCase().includes(term)
      );
    });
  }, [bidActions, bidFilter, searchTerm]);

  // Counts for Bid Sub-filters
  const decreaseCount = useMemo(() => bidActions.filter(b => b.type === 'decrease_bid').length, [bidActions]);
  const increaseCount = useMemo(() => bidActions.filter(b => b.type === 'increase_bid').length, [bidActions]);
  const zeroImpressionCount = useMemo(() => bidActions.filter(b => b.type === 'zero_impression_boost').length, [bidActions]);

  // Sorting and filtering for Tab 4 (All Items)
  const sortedAndFilteredAllItems = useMemo(() => {
    let result = allItems.filter(item => {
      if (filterOnlyActive && item.clicks === 0 && item.spend === 0) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        item.keywordText.toLowerCase().includes(term) ||
        item.campaignName.toLowerCase().includes(term) ||
        item.matchTypeDisplay.toLowerCase().includes(term) ||
        item.adGroupName.toLowerCase().includes(term)
      );
    });

    result.sort((a, b) => {
      let valA = a[sortField] || 0;
      let valB = b[sortField] || 0;
      if (typeof valA === 'string') valA = parseFloat(valA) || 0;
      if (typeof valB === 'string') valB = parseFloat(valB) || 0;

      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [allItems, searchTerm, sortField, sortAsc, filterOnlyActive]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for metrics
    }
  };

  // Shift-click handler for Bid Actions
  const handleBidClick = (index: number, actionId: string, event: React.MouseEvent) => {
    if (event.shiftKey && lastBidIndex !== null) {
      const start = Math.min(lastBidIndex, index);
      const end = Math.max(lastBidIndex, index);
      const rangeIds = filteredBidActions.slice(start, end + 1).map(b => b.id);
      onToggleBidAction(actionId, rangeIds);
    } else {
      onToggleBidAction(actionId);
    }
    setLastBidIndex(index);
  };

  // Shift-click handler for Negative Actions
  const handleNegClick = (index: number, actionId: string, event: React.MouseEvent) => {
    if (event.shiftKey && lastNegIndex !== null) {
      const start = Math.min(lastNegIndex, index);
      const end = Math.max(lastNegIndex, index);
      const rangeIds = negativeActions.slice(start, end + 1).map(n => n.id);
      onToggleNegativeAction(actionId, rangeIds);
    } else {
      onToggleNegativeAction(actionId);
    }
    setLastNegIndex(index);
  };

  // Execute Batch Bid Adjustment based on chosen base price (default is currentBid 原出价)
  const handleApplyBatchBid = () => {
    const selectedBids = bidActions.filter(b => b.selected);
    if (selectedBids.length === 0) {
      alert('请先勾选需要调整出价的关键词！支持按住 Shift 键批量连选，或点击“全选”。');
      return;
    }

    const updates: Record<string, number> = {};

    selectedBids.forEach(action => {
      // Default base is CURRENT BID (原出价)!
      const basePrice = batchBase === 'current' 
        ? action.currentBid 
        : action.suggestedBid;

      let newPrice = basePrice;

      if (batchMode === 'percent') {
        const factor = batchDirection === 'decrease' ? (1 - batchPercentValue / 100) : (1 + batchPercentValue / 100);
        newPrice = basePrice * factor;
      } else {
        const delta = batchDirection === 'decrease' ? -batchFixedValue : batchFixedValue;
        newPrice = basePrice + delta;
      }

      // Safety floor minimum $0.05
      newPrice = Math.max(0.05, Number(newPrice.toFixed(2)));
      updates[action.id] = newPrice;
    });

    onBatchApplyBids(updates);
  };

  // Helper for inline quick bid adjustments
  const handleInlineDelta = (action: BidAdjustmentAction, deltaType: 'pct' | 'amt', value: number) => {
    const curEffective = action.userCustomBid !== undefined ? action.userCustomBid : action.currentBid;
    let nextPrice = curEffective;
    if (deltaType === 'pct') {
      nextPrice = curEffective * (1 + value / 100);
    } else {
      nextPrice = curEffective + value;
    }
    nextPrice = Math.max(0.05, Number(nextPrice.toFixed(2)));
    onCustomBidChange(action.id, nextPrice);
    if (!action.selected) {
      onToggleBidAction(action.id);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-colors">
      
      {/* Tab Navigation & Width Toggle */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 pt-3 gap-2">
        <div className="flex gap-2 overflow-x-auto">
          {/* Tab: Bid Adjustment (Now Prominent) */}
          <button
            onClick={() => setActiveTab('bid')}
            className={`px-4 py-3 font-semibold text-xs rounded-t-xl flex items-center gap-2 transition whitespace-nowrap border-b-2 ${
              activeTab === 'bid'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-amber-500 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>🎯 智能竞价调整中心</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
              已选 {selectedBidsCount} / 可调 {bidActions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('negative')}
            className={`px-4 py-3 font-semibold text-xs rounded-t-xl flex items-center gap-2 transition whitespace-nowrap border-b-2 ${
              activeTab === 'negative'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border-rose-500 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <span>🛑 止血否定清单</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
              {selectedNegativesCount} / {negativeActions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('harvest')}
            className={`px-4 py-3 font-semibold text-xs rounded-t-xl flex items-center gap-2 transition whitespace-nowrap border-b-2 ${
              activeTab === 'harvest'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span>⭐ 优质拓词收割</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
              {selectedHarvestCount} / {harvestActions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 font-semibold text-xs rounded-t-xl flex items-center gap-2 transition whitespace-nowrap border-b-2 ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-500 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
            }`}
          >
            <Table className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span>📊 原始广告投放全面透视</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {allItems.length}
            </span>
          </button>
        </div>

        {/* Width Expander Button */}
        <div className="pb-2 flex items-center gap-2">
          <button
            onClick={onToggleFullWidth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title={isFullWidth ? '收起为标准宽度' : '拉宽显示全部报告内容'}
          >
            {isFullWidth ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-blue-500" />
                <span>收起标准宽度</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                <span>展开超宽屏显示</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Bid Adjustment Center (MAIN FOCUS) */}
      {activeTab === 'bid' && (
        <div className="p-4 space-y-4">
          
          {/* Sub-Filters and Selection Helper */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-medium">筛选调价类别:</span>
              <button
                onClick={() => setBidFilter('all')}
                className={`px-3 py-1 rounded-lg transition font-medium ${
                  bidFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                全部调价项 ({bidActions.length})
              </button>
              <button
                onClick={() => setBidFilter('decrease')}
                className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                  bidFilter === 'decrease'
                    ? 'bg-rose-500 text-white font-bold shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" /> 建议降价 ({decreaseCount})
              </button>
              <button
                onClick={() => setBidFilter('zero')}
                className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                  bidFilter === 'zero'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" /> 0/低曝光提价激活 ({zeroImpressionCount})
              </button>
              {increaseCount > 0 && (
                <button
                  onClick={() => setBidFilter('increase')}
                  className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                    bidFilter === 'increase'
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> 优质放量提价 ({increaseCount})
                </button>
              )}
              <button
                onClick={() => setBidFilter('selected')}
                className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                  bidFilter === 'selected'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>仅看已勾选 ({selectedBidsCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                🛡️ 出价默认都不勾选，避免误选误改
              </span>
              <span>·</span>
              <span>按住 <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono text-[10px]">Shift</kbd> 键可批量连续勾选</span>
            </div>
          </div>

          {/* Batch Bid Adjustment Toolbar (Defaults to CURRENT BID 原出价!) */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-800/80 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    批量竞价调价工具
                    <span className="text-[11px] font-normal text-slate-500">
                      （当前已选中 <strong className="font-bold text-amber-600 dark:text-amber-400">{selectedBidsCount}</strong> 项待调出价）
                    </span>
                  </h4>
                </div>
              </div>

              {/* Selection helper buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleAllBids(true, filteredBidActions.map(b => b.id))}
                  className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition"
                >
                  勾选当前筛选 ({filteredBidActions.length})
                </button>
                <button
                  onClick={() => onToggleAllBids(false)}
                  className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition"
                >
                  取消全选
                </button>
                <button
                  onClick={onResetBidsToOriginal}
                  className="text-xs text-slate-600 dark:text-slate-300 hover:text-amber-600 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center gap-1 shadow-sm"
                  title="将所有输入出价重置回原出价 (原竞价)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>全部恢复为原出价</span>
                </button>
                <button
                  onClick={onResetBidsToSuggested}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition flex items-center gap-1 shadow-sm"
                  title="将出价一键填入系统算法给出的保本建议价"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>填入算法建议价</span>
                </button>
              </div>
            </div>

            {/* Controls Row: User MANUALLY decides Increase or Decrease, and baseline defaults to CURRENT BID */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              
              {/* Manual Direction Switch: 提高 or 降低 */}
              <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800">
                <button
                  onClick={() => setBatchDirection('decrease')}
                  className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1 transition ${
                    batchDirection === 'decrease'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" /> 降低出价 (降价控本)
                </button>
                <button
                  onClick={() => setBatchDirection('increase')}
                  className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1 transition ${
                    batchDirection === 'increase'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> 提高出价 (提价激活/放量)
                </button>
              </div>

              {/* Mode switch: 比例 % vs 固定金额 $ */}
              <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800">
                <button
                  onClick={() => setBatchMode('percent')}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs flex items-center gap-1 transition ${
                    batchMode === 'percent'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Percent className="w-3 h-3" /> 按比例 (%)
                </button>
                <button
                  onClick={() => setBatchMode('fixed')}
                  className={`px-2.5 py-1 rounded-md font-medium text-xs flex items-center gap-1 transition ${
                    batchMode === 'fixed'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <DollarSign className="w-3 h-3" /> 固定金额 ($)
                </button>
              </div>

              {/* Value Input */}
              {batchMode === 'percent' ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">幅度:</span>
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1">
                    <input
                      type="number"
                      min="1"
                      max="80"
                      value={batchPercentValue}
                      onChange={e => setBatchPercentValue(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-12 text-center text-xs font-bold text-amber-600 dark:text-amber-400 bg-transparent focus:outline-none"
                    />
                    <span className="text-slate-400 font-bold">%</span>
                  </div>
                  {/* Quick pills */}
                  <div className="hidden sm:flex items-center gap-1">
                    {[5, 10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        onClick={() => setBatchPercentValue(pct)}
                        className={`px-2 py-0.5 rounded text-[11px] border transition ${
                          batchPercentValue === pct
                            ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">金额:</span>
                  <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1">
                    <span className="text-slate-400 font-bold mr-0.5">$</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.01"
                      max="5"
                      value={batchFixedValue}
                      onChange={e => setBatchFixedValue(parseFloat(e.target.value) || 0)}
                      className="w-14 text-center text-xs font-bold text-amber-600 dark:text-amber-400 bg-transparent focus:outline-none"
                    />
                  </div>
                  {/* Quick pills */}
                  <div className="hidden sm:flex items-center gap-1">
                    {[0.05, 0.10, 0.15, 0.20].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setBatchFixedValue(amt)}
                        className={`px-2 py-0.5 rounded text-[11px] border transition ${
                          batchFixedValue === amt
                            ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        ${amt.toFixed(2)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Base price reference - DEFAULTS TO 'current' (原出价/进价)! */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">基准:</span>
                <select
                  value={batchBase}
                  onChange={e => setBatchBase(e.target.value as any)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
                >
                  <option value="current">⭐️ 基于【原出价 (原竞价)】微调 (推荐)</option>
                  <option value="suggested">基于【系统算法保本建议价】微调</option>
                </select>
              </div>

              {/* Apply Button */}
              <button
                onClick={handleApplyBatchBid}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1 ml-auto"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>批量应用到已选 {selectedBidsCount} 项</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-10 text-center">选择</th>
                  <th className="p-3">关键词 / 投放</th>
                  <th className="p-3">匹配类型</th>
                  <th className="p-3">原出价 (原竞价)</th>
                  <th className="p-3 text-amber-600 dark:text-amber-400">
                    最终调价 (在原价基础上自由微调)
                  </th>
                  <th className="p-3">调整幅度</th>
                  <th className="p-3">算法保本参考</th>
                  <th className="p-3">展示量 (曝光)</th>
                  <th className="p-3">点击量</th>
                  <th className="p-3">总成本 / 购买量</th>
                  <th className="p-3">当前 ACOS</th>
                  <th className="p-3">调价依据与建议</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {filteredBidActions.map((action, idx) => {
                  // User's active final bid (defaults to currentBid if not customized yet)
                  const effectiveFinalBid = action.userCustomBid !== undefined 
                    ? action.userCustomBid 
                    : action.currentBid; // DEFAULTS TO ORIGINAL BID!

                  const diffPercent = action.currentBid > 0 
                    ? Number((((effectiveFinalBid - action.currentBid) / action.currentBid) * 100).toFixed(1))
                    : 0;

                  return (
                    <tr 
                      key={action.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition select-none ${
                        action.selected ? 'bg-amber-50/40 dark:bg-amber-950/10' : 'opacity-85'
                      }`}
                    >
                      {/* Checkbox (Shift-click range select support, default unchecked) */}
                      <td className="p-3 text-center">
                        <button 
                          onClick={e => handleBidClick(idx, action.id, e)}
                          className="text-slate-400 hover:text-amber-500 dark:hover:text-amber-400"
                          title="按住 Shift 键点击可连续范围勾选"
                        >
                          {action.selected ? (
                            <CheckSquare className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* Keyword */}
                      <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
                        {action.item.keywordText}
                      </td>

                      {/* Match Type */}
                      <td className="p-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200">
                          {action.item.matchTypeDisplay}
                        </span>
                      </td>

                      {/* Original Bid */}
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100 text-sm">
                        ${action.currentBid.toFixed(2)}
                      </td>

                      {/* Final Bid with Inline Quick Helper Buttons */}
                      <td className="p-3 font-sans">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center font-mono font-bold text-amber-600 dark:text-amber-400">
                            <span>$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.05"
                              value={effectiveFinalBid}
                              onChange={e => {
                                onCustomBidChange(action.id, parseFloat(e.target.value) || 0);
                                if (!action.selected) onToggleBidAction(action.id);
                              }}
                              className="w-16 px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-500 shadow-sm"
                            />
                          </div>

                          {/* Inline Quick Tweaks based on Original Bid */}
                          <div className="flex items-center gap-1 font-mono text-[10px]">
                            <button
                              onClick={() => handleInlineDelta(action, 'pct', -10)}
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 text-rose-600 border border-slate-200 transition"
                              title="在当前价基础上下调 10%"
                            >
                              -10%
                            </button>
                            <button
                              onClick={() => handleInlineDelta(action, 'amt', -0.10)}
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-rose-50 text-rose-600 border border-slate-200 transition"
                              title="在当前价基础上下调 $0.10"
                            >
                              -$0.1
                            </button>
                            <button
                              onClick={() => handleInlineDelta(action, 'amt', 0.10)}
                              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 text-emerald-600 border border-slate-200 transition"
                              title="在当前价基础上增加 $0.10"
                            >
                              +$0.1
                            </button>
                            <button
                              onClick={() => {
                                onCustomBidChange(action.id, action.suggestedBid);
                                if (!action.selected) onToggleBidAction(action.id);
                              }}
                              className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-sans transition text-[10px]"
                              title={`填入系统保本建议价 $${action.suggestedBid}`}
                            >
                              填建议价
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Diff Percent */}
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-0.5 font-bold ${
                          diffPercent < 0 
                            ? 'text-rose-600 dark:text-rose-400' 
                            : (diffPercent > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')
                        }`}>
                          {diffPercent < 0 && <ArrowDownRight className="w-3.5 h-3.5" />}
                          {diffPercent > 0 && <ArrowUpRight className="w-3.5 h-3.5" />}
                          {diffPercent === 0 ? '持平' : `${diffPercent}%`}
                        </span>
                      </td>

                      {/* Algorithmic Reference */}
                      <td className="p-3 text-slate-500 font-mono text-xs">
                        <span className="text-slate-400">参考:</span> ${action.suggestedBid.toFixed(2)}
                      </td>

                      {/* Impressions */}
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {action.item.impressions.toLocaleString()}
                      </td>

                      {/* Clicks */}
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {action.item.clicks}
                      </td>

                      {/* Spend / Orders */}
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        ${action.item.spend.toFixed(2)} / {action.item.orders}单
                      </td>

                      {/* Current ACOS */}
                      <td className="p-3">
                        {action.item.orders === 0 && action.item.spend > 0 ? (
                          <span className="text-rose-600 font-bold">999% (0单)</span>
                        ) : (
                          <span className={`font-bold ${action.item.acos > 50 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {action.item.acos}%
                          </span>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="p-3 font-sans text-slate-500 text-[11px] max-w-[260px] truncate" title={action.reason}>
                        {action.type === 'zero_impression_boost' ? (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">💤 {action.reason}</span>
                        ) : (
                          action.reason
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Negative Keywords Table */}
      {activeTab === 'negative' && (
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
              <AlertOctagon className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0" />
              <span>
                已选中 <strong>{selectedNegativesCount}</strong> 个吸血词，确认导出后将生成精准否定，可直接堵住 <strong>${totalNegativeSavings.toFixed(2)}</strong> 的无转化亏损漏洞。
              </span>
              <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                （💡 提示：按住键盘 <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono text-[10px]">Shift</kbd> 键点击复选框，可快速批量连选！）
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleAllNegatives(true)}
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition"
              >
                全选
              </button>
              <button
                onClick={() => onToggleAllNegatives(false)}
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition"
              >
                取消全选
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-10 text-center">状态</th>
                  <th className="p-3">搜索词 / 投放 ASIN</th>
                  <th className="p-3">匹配类型</th>
                  <th className="p-3">展示曝光</th>
                  <th className="p-3">点击量</th>
                  <th className="p-3 text-rose-600 dark:text-rose-400">浪费总成本</th>
                  <th className="p-3">购买量</th>
                  <th className="p-3">建议操作</th>
                  <th className="p-3">诊断依据</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {negativeActions.map((action, idx) => (
                  <tr 
                    key={action.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer select-none ${
                      action.selected ? 'bg-rose-50/40 dark:bg-rose-950/10' : 'opacity-60'
                    }`}
                    onClick={e => handleNegClick(idx, action.id, e)}
                  >
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={e => handleNegClick(idx, action.id, e)}
                        className="text-slate-400 hover:text-rose-500 dark:hover:text-amber-400"
                        title="按住 Shift 可连续范围勾选"
                      >
                        {action.selected ? (
                          <CheckSquare className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white max-w-[220px] truncate">
                      {action.keywordText}
                    </td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200">
                        {action.item.matchTypeDisplay}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {action.item.impressions.toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {action.clicks} 次
                    </td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                      ${action.wastedSpend.toFixed(2)}
                    </td>
                    <td className="p-3 text-slate-500">
                      0 单 (0%)
                    </td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                        {action.type === 'negative_product' ? '否定商品投放' : '精准否定'}
                      </span>
                    </td>
                    <td className="p-3 font-sans text-slate-500 text-[11px] max-w-[300px]">
                      {action.reason}
                    </td>
                  </tr>
                ))}
                {negativeActions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      🎉 太棒了！在当前阈值下未发现明显吸血无转化词。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Harvest Table */}
      {activeTab === 'harvest' && (
        <div className="p-4 space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
            <span>
              以下为在<strong>自动广告或广泛投放</strong>中表现亮眼的高 ROI 搜索词。建议将它们收割提取出来，单独建立<strong>「精准匹配 (Exact Match)」</strong>广告活动，并赋予更高预算！
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">优质搜索词</th>
                  <th className="p-3">原匹配类型</th>
                  <th className="p-3 text-emerald-600 dark:text-emerald-400">购买量 (订单)</th>
                  <th className="p-3">总销售额 (USD)</th>
                  <th className="p-3 text-emerald-600 dark:text-emerald-400">优秀 ACOS</th>
                  <th className="p-3">ROAS</th>
                  <th className="p-3">建议精准出价</th>
                  <th className="p-3">运营建议</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {harvestActions.map(action => (
                  <tr key={action.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-sans font-bold text-slate-900 dark:text-white max-w-[220px] truncate">
                      {action.keywordText}
                    </td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {action.item.matchTypeDisplay}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {action.orders} 笔订单
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-200 font-bold">
                      ${action.sales.toFixed(2)}
                    </td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {action.acos}%
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {action.item.roas}
                    </td>
                    <td className="p-3 font-semibold text-amber-600 dark:text-amber-400">
                      ${action.suggestedBid}
                    </td>
                    <td className="p-3 font-sans text-slate-600 dark:text-slate-300 text-[11px] max-w-[280px]">
                      {action.reason}
                    </td>
                  </tr>
                ))}
                {harvestActions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      暂未发现达到收割门槛（订单≥2且ACOS低于目标）的非精准词。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: All Items Table */}
      {activeTab === 'all' && (
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索关键词、匹配类型、广告活动..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterOnlyActive}
                  onChange={e => setFilterOnlyActive(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <span>仅看有流量/有花费词 ({allItems.filter(i => i.clicks > 0 || i.spend > 0).length}项)</span>
              </label>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>点击表头字段可直接升降序排列</span>
              <span>·</span>
              <span>共显示 <strong className="text-slate-900 dark:text-white">{sortedAndFilteredAllItems.length}</strong> 条数据</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0 select-none">
                <tr>
                  <th className="p-3">关键词 / 投放</th>
                  <th className="p-3">投放匹配类型</th>
                  <th className="p-3">状态</th>
                  <th className="p-3 cursor-pointer hover:text-amber-600" onClick={() => handleSort('currentBid')}>
                    <div className="flex items-center gap-1">
                      <span>竞价 (USD)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-amber-600" onClick={() => handleSort('impressions')}>
                    <div className="flex items-center gap-1">
                      <span>展示量 (曝光)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-amber-600" onClick={() => handleSort('clicks')}>
                    <div className="flex items-center gap-1">
                      <span>点击量</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-amber-600" onClick={() => handleSort('ctr')}>
                    <div className="flex items-center gap-1">
                      <span>点击率 (CTR)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-amber-600" onClick={() => handleSort('cpc')}>
                    <div className="flex items-center gap-1">
                      <span>CPC (USD)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-amber-600" onClick={() => handleSort('spend')}>
                    <div className="flex items-center gap-1">
                      <span>总成本 (USD)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-amber-600" onClick={() => handleSort('orders')}>
                    <div className="flex items-center gap-1">
                      <span>购买量 (订单)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-amber-600" onClick={() => handleSort('sales')}>
                    <div className="flex items-center gap-1">
                      <span>销售额 (USD)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-amber-600" onClick={() => handleSort('acos')}>
                    <div className="flex items-center gap-1">
                      <span>ACOS</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3 cursor-pointer hover:text-amber-600" onClick={() => handleSort('roas')}>
                    <div className="flex items-center gap-1">
                      <span>ROAS</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3">建议竞价区间</th>
                  <th className="p-3">首页展示份额</th>
                  <th className="p-3">智能诊断结论</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {sortedAndFilteredAllItems.map((item, idx) => {
                  const isBleeding = item.orders === 0 && item.spend > 0;
                  const isSevereAcos = item.acos > 50 && item.orders > 0;

                  return (
                    <tr 
                      key={idx} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-xs ${
                        isBleeding ? 'bg-rose-50/20' : (isSevereAcos ? 'bg-amber-50/20' : '')
                      }`}
                    >
                      {/* Keyword */}
                      <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
                        {item.keywordText}
                      </td>

                      {/* Match Type */}
                      <td className="p-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          item.matchTypeDisplay.includes('精准') 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                            : (item.matchTypeDisplay.includes('短语')
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800')
                        }`}>
                          {item.matchTypeDisplay}
                        </span>
                      </td>

                      {/* State */}
                      <td className="p-3 font-sans text-xs">
                        {item.campaignStatusDetail ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                            {item.campaignStatusDetail}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">已启用</span>
                        )}
                      </td>

                      {/* Bid */}
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        ${item.currentBid.toFixed(2)}
                      </td>

                      {/* Impressions */}
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {item.impressions.toLocaleString()}
                      </td>

                      {/* Clicks */}
                      <td className={`p-3 font-semibold ${item.clicks > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                        {item.clicks}
                      </td>

                      {/* CTR */}
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {item.ctr}%
                      </td>

                      {/* CPC */}
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        ${item.cpc.toFixed(2)}
                      </td>

                      {/* Spend */}
                      <td className={`p-3 font-bold ${item.spend > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                        ${item.spend.toFixed(2)}
                      </td>

                      {/* Orders */}
                      <td className={`p-3 font-bold ${item.orders > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {item.orders}
                      </td>

                      {/* Sales */}
                      <td className={`p-3 font-semibold ${item.sales > 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        ${item.sales.toFixed(2)}
                      </td>

                      {/* ACOS */}
                      <td className="p-3">
                        {item.orders === 0 && item.spend > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                            999% (0单纯亏)
                          </span>
                        ) : (
                          <span className={`font-bold ${
                            item.acos > 50 
                              ? 'text-rose-600 dark:text-rose-400' 
                              : (item.acos <= 25 && item.sales > 0 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-slate-700 dark:text-slate-300')
                          }`}>
                            {item.acos}%
                          </span>
                        )}
                      </td>

                      {/* ROAS */}
                      <td className="p-3 font-semibold">
                        <span className={item.roas >= 3 ? 'text-emerald-600' : (item.roas > 0 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400')}>
                          {item.roas}
                        </span>
                      </td>

                      {/* Suggested Bids Low - Med - High */}
                      <td className="p-3 text-[11px] text-slate-500 font-sans">
                        {item.suggestedBidMed ? (
                          <span>${item.suggestedBidLow} - <strong className="text-slate-700 dark:text-slate-300">${item.suggestedBidMed}</strong> - ${item.suggestedBidHigh}</span>
                        ) : '-'}
                      </td>

                      {/* Top of search share */}
                      <td className="p-3 text-slate-600 dark:text-slate-400 font-sans">
                        {item.topOfSearchShare || '-'}
                      </td>

                      {/* Diagnostic conclusion */}
                      <td className="p-3 font-sans">
                        {item.orders === 0 && item.spend > 10 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            🛑 吸血亏损，建议否定
                          </span>
                        ) : (item.acos > 50 && item.orders > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            📉 ACOS过高，建议降价
                          </span>
                        ) : (item.orders > 0 && item.acos <= 25 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ⭐ 黄金好词，建议推排位
                          </span>
                        ) : (item.impressions === 0 ? (
                          <span className="text-slate-400 text-[11px]">💤 0曝光未激活</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">观察中</span>
                        ))))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
