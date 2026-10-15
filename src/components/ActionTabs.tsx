import React, { useState, useMemo, useRef } from 'react';
import { 
  AlertOctagon, 
  TrendingDown, 
  TrendingUp,
  Sparkles, 
  Table, 
  CheckSquare, 
  Square, 
  Search, 
  Maximize2, 
  Minimize2, 
  Percent, 
  DollarSign, 
  Zap, 
  RotateCcw, 
  SlidersHorizontal, 
  Copy, 
  Check, 
  Type, 
  MoveHorizontal
} from 'lucide-react';
import { 
  BidAdjustmentAction, 
  NegativeTargetAction, 
  HarvestAction, 
  NormalizedAdItem 
} from '../types/amazon';

export interface ColumnVisibility {
  matchType: boolean;
  currentBid: boolean;
  userCustomBid: boolean;
  amazonSuggested: boolean;
  impressions: boolean;
  clicks: boolean;
  ctr: boolean;
  cpc: boolean;
  spend: boolean;
  orders: boolean;
  sales: boolean;
  acos: boolean;
  roas: boolean;
  reason: boolean;
}

export const DEFAULT_COL_VISIBILITY: ColumnVisibility = {
  matchType: true,
  currentBid: true,
  userCustomBid: true,
  amazonSuggested: true,
  impressions: true,
  clicks: true,
  ctr: true,
  cpc: true,
  spend: true,
  orders: true,
  sales: true,
  acos: true,
  roas: true,
  reason: true
};

export type TableDensity = 'compact' | 'normal' | 'spacious';
export type TableFontSize = 'sm' | 'base' | 'lg';

export type SortField = 
  | 'spend' 
  | 'clicks' 
  | 'impressions' 
  | 'orders' 
  | 'sales' 
  | 'acos' 
  | 'roas' 
  | 'currentBid' 
  | 'userCustomBid'
  | 'suggestedBidMed'
  | 'ctr' 
  | 'cpc'
  | 'keywordText'
  | 'matchType';

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

  // Sub-filter inside Bid tab: all | decrease | increase | zero | observation | selected
  const [bidFilter, setBidFilter] = useState<'all' | 'decrease' | 'increase' | 'zero' | 'observation' | 'selected'>('all');

  // Shift-click selection index trackers
  const [lastBidIndex, setLastBidIndex] = useState<number | null>(null);
  const [lastNegIndex, setLastNegIndex] = useState<number | null>(null);

  // Keyword copy tooltip state
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  // Table scroll refs and smooth horizontal scroll handler
  const bidTableRef = useRef<HTMLDivElement>(null);
  const allTableRef = useRef<HTMLDivElement>(null);

  const handleScrollTable = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Table Density & Font Size (User preferences saved in localStorage)
  const [density, setDensity] = useState<TableDensity>(() => {
    return (localStorage.getItem('amz_density') as TableDensity) || 'normal';
  });
  const [fontSize, setFontSize] = useState<TableFontSize>(() => {
    return (localStorage.getItem('amz_font_size') as TableFontSize) || 'base';
  });

  const handleSetDensity = (d: TableDensity) => {
    setDensity(d);
    try { localStorage.setItem('amz_density', d); } catch (e) {}
  };

  const handleSetFontSize = (s: TableFontSize) => {
    setFontSize(s);
    try { localStorage.setItem('amz_font_size', s); } catch (e) {}
  };

  // Column Visibility state & dropdown menu open state
  const [isColVisMenuOpen, setIsColVisMenuOpen] = useState(false);
  const [colVis, setColVis] = useState<ColumnVisibility>(() => {
    try {
      const saved = localStorage.getItem('amz_col_visibility');
      if (saved) return { ...DEFAULT_COL_VISIBILITY, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_COL_VISIBILITY;
  });

  const toggleColumn = (col: keyof ColumnVisibility) => {
    setColVis(prev => {
      const next = { ...prev, [col]: !prev[col] };
      try { localStorage.setItem('amz_col_visibility', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  const handleResetColVis = (showAll = true) => {
    if (showAll) {
      setColVis(DEFAULT_COL_VISIBILITY);
      try { localStorage.setItem('amz_col_visibility', JSON.stringify(DEFAULT_COL_VISIBILITY)); } catch (e) {}
    } else {
      // Compact preset
      const compact: ColumnVisibility = {
        matchType: true,
        currentBid: true,
        userCustomBid: true,
        amazonSuggested: true,
        impressions: true,
        clicks: true,
        ctr: false,
        cpc: false,
        spend: true,
        orders: true,
        sales: false,
        acos: true,
        roas: false,
        reason: true
      };
      setColVis(compact);
      try { localStorage.setItem('amz_col_visibility', JSON.stringify(compact)); } catch (e) {}
    }
  };

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

  // Counts for Bid Sub-filters
  const decreaseCount = useMemo(() => bidActions.filter(b => b.type === 'decrease_bid').length, [bidActions]);
  const increaseCount = useMemo(() => bidActions.filter(b => b.type === 'increase_bid').length, [bidActions]);
  const zeroImpressionCount = useMemo(() => bidActions.filter(b => b.type === 'zero_impression_boost').length, [bidActions]);
  const observationCount = useMemo(() => bidActions.filter(b => b.type === 'observation').length, [bidActions]);

  // Filtered Bid Actions
  const filteredBidActions = useMemo(() => {
    return bidActions.filter(action => {
      // Sub-filter
      if (bidFilter === 'decrease' && action.type !== 'decrease_bid') return false;
      if (bidFilter === 'increase' && action.type !== 'increase_bid') return false;
      if (bidFilter === 'zero' && action.type !== 'zero_impression_boost') return false;
      if (bidFilter === 'observation' && action.type !== 'observation') return false;
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

  // Sorted Bid Actions for Tab 1
  const sortedAndFilteredBidActions = useMemo(() => {
    const list = [...filteredBidActions];
    if (!sortField) return list;

    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'keywordText') {
        valA = a.item.keywordText.toLowerCase();
        valB = b.item.keywordText.toLowerCase();
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'matchType') {
        valA = a.item.matchTypeDisplay;
        valB = b.item.matchTypeDisplay;
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (sortField === 'currentBid') {
        valA = a.currentBid;
        valB = b.currentBid;
      } else if (sortField === 'userCustomBid') {
        valA = a.userCustomBid !== undefined ? a.userCustomBid : a.currentBid;
        valB = b.userCustomBid !== undefined ? b.userCustomBid : b.currentBid;
      } else if (sortField === 'suggestedBidMed') {
        valA = a.item.suggestedBidMed || 0;
        valB = b.item.suggestedBidMed || 0;
      } else {
        valA = (a.item as any)[sortField] ?? 0;
        valB = (b.item as any)[sortField] ?? 0;
      }

      if (typeof valA === 'string') valA = parseFloat(valA) || 0;
      if (typeof valB === 'string') valB = parseFloat(valB) || 0;

      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [filteredBidActions, sortField, sortAsc]);

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
      let valA = (a as any)[sortField] || 0;
      let valB = (b as any)[sortField] || 0;
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
      setSortAsc(false); // default descending for numbers
    }
  };

  // Shift-click handler for Bid Actions
  const handleBidClick = (index: number, actionId: string, event: React.MouseEvent) => {
    if (event.shiftKey && lastBidIndex !== null) {
      const start = Math.min(lastBidIndex, index);
      const end = Math.max(lastBidIndex, index);
      const rangeIds = sortedAndFilteredBidActions.slice(start, end + 1).map(b => b.id);
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

  // Copy keyword to clipboard with visual feedback
  const handleCopyKeyword = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKeyword(text);
      setTimeout(() => {
        setCopiedKeyword(null);
      }, 1800);
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  };

  // Execute Batch Bid Adjustment based on chosen base price (default is currentBid 原出价)
  const handleApplyBatchBid = () => {
    const selectedBids = bidActions.filter(b => b.selected);
    if (selectedBids.length === 0) {
      alert('请先勾选需要调整出价的关键词！支持在表头一键全选，或按住 Shift 键连续连选。');
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

  // Padding based on density setting
  const cellPadding = useMemo(() => {
    if (density === 'compact') return 'px-2 py-1.5';
    if (density === 'spacious') return 'px-5 py-3.5';
    return 'px-3.5 py-2.5';
  }, [density]);

  // Font size class based on fontSize setting
  const fontSizeClass = useMemo(() => {
    if (fontSize === 'sm') return 'text-[11px]';
    if (fontSize === 'lg') return 'text-sm';
    return 'text-xs';
  }, [fontSize]);

  // Helper for sorting header in table
  const renderSortHeader = (label: string, field: SortField, className = '') => {
    const isActive = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)}
        className={`${cellPadding} cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-800 transition select-none ${className} ${
          isActive ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50/50 dark:bg-amber-950/20' : ''
        }`}
        title={`点击按 ${label} ${isActive ? (sortAsc ? '降序排列' : '升序排列') : '大小排序'}`}
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          <span className="text-[10px]">
            {isActive ? (
              sortAsc ? '↑' : '↓'
            ) : (
              <span className="opacity-40 hover:opacity-100 text-slate-400">⇅</span>
            )}
          </span>
        </div>
      </th>
    );
  };

  // Header Select All state for Bid Actions
  const allFilteredSelected = sortedAndFilteredBidActions.length > 0 && 
    sortedAndFilteredBidActions.every(b => b.selected);
  const someFilteredSelected = sortedAndFilteredBidActions.some(b => b.selected);

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

        {/* Global Controls: Density, Font Size & Width Expander */}
        <div className="pb-2 flex flex-wrap items-center gap-2.5">
          {/* Font Size Selector (大中小) */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs shadow-sm">
            <span className="text-[11px] text-slate-400 px-1.5 font-medium flex items-center gap-0.5">
              <Type className="w-3 h-3" /> 字号:
            </span>
            <button
              onClick={() => handleSetFontSize('sm')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                fontSize === 'sm' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="小号字体：紧凑排版，全景展示无横滚"
            >
              小
            </button>
            <button
              onClick={() => handleSetFontSize('base')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                fontSize === 'base' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="中号字体：标准阅读"
            >
              中
            </button>
            <button
              onClick={() => handleSetFontSize('lg')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                fontSize === 'lg' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="大号字体：清晰护眼，支持报表左右平滑滑动"
            >
              大
            </button>
          </div>

          {/* Table Density / Spacing Selector (项目间距自由调整) */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 text-xs shadow-sm">
            <span className="text-[11px] text-slate-400 px-1.5 font-medium flex items-center gap-0.5">
              <MoveHorizontal className="w-3 h-3" /> 间距:
            </span>
            <button
              onClick={() => handleSetDensity('compact')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                density === 'compact' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="紧凑间距：每列间距最小，显示更多数据"
            >
              紧凑
            </button>
            <button
              onClick={() => handleSetDensity('normal')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                density === 'normal' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="适中间距：标准留白"
            >
              适中
            </button>
            <button
              onClick={() => handleSetDensity('spacious')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                density === 'spacious' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="宽敞间距：大留白，阅读舒适"
            >
              宽松
            </button>
          </div>

          {/* Width Expander Button */}
          <button
            onClick={onToggleFullWidth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
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
              {observationCount > 0 && (
                <button
                  onClick={() => setBidFilter('observation')}
                  className={`px-3 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                    bidFilter === 'observation'
                      ? 'bg-slate-700 text-white font-bold shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>👀 流量观察项 ({observationCount})</span>
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

              {/* Selection helper buttons & Reset options */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleAllBids(true, sortedAndFilteredBidActions.map(b => b.id))}
                  className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition"
                >
                  勾选当前筛选 ({sortedAndFilteredBidActions.length})
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

              {/* Requirement 4: 自定义列显示按钮 (放置在批量应用左侧，对应用户图一圈选位置) */}
              <div className="relative ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setIsColVisMenuOpen(!isColVisMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:border-amber-500 transition shadow-sm text-slate-700 dark:text-slate-200"
                  title="自定义表格中每一列的显示或隐藏"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                  <span>⚙️ 自定义列显示</span>
                </button>

                {isColVisMenuOpen && (
                  <>
                    {/* Requirement 1: Click outside backdrop to automatically close popover */}
                    <div 
                      className="fixed inset-0 z-20 cursor-default" 
                      onClick={() => setIsColVisMenuOpen(false)} 
                    />
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3 z-30 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">自定义展示列</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResetColVis(true)}
                            className="text-[10px] text-amber-600 hover:underline"
                          >
                            全部显示
                          </button>
                          <span>·</span>
                          <button
                            onClick={() => handleResetColVis(false)}
                            className="text-[10px] text-blue-600 hover:underline"
                          >
                            精简模式
                          </button>
                          <span>·</span>
                          <button
                            onClick={() => setIsColVisMenuOpen(false)}
                            className="text-[10px] text-slate-400 hover:text-slate-600"
                          >
                            完成
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs py-1 max-h-60 overflow-y-auto">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.matchType} onChange={() => toggleColumn('matchType')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>匹配类型</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.currentBid} onChange={() => toggleColumn('currentBid')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>原出价</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.userCustomBid} onChange={() => toggleColumn('userCustomBid')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>最终出价</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.amazonSuggested} onChange={() => toggleColumn('amazonSuggested')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>建议竞价区间</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.impressions} onChange={() => toggleColumn('impressions')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>展示量 (曝光)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.clicks} onChange={() => toggleColumn('clicks')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>点击量</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.ctr} onChange={() => toggleColumn('ctr')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>点击率 (CTR)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.cpc} onChange={() => toggleColumn('cpc')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>CPC</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.spend} onChange={() => toggleColumn('spend')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>总成本 (花费)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.orders} onChange={() => toggleColumn('orders')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>购买量 (订单)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.sales} onChange={() => toggleColumn('sales')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>销售额</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.acos} onChange={() => toggleColumn('acos')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>当前 ACOS</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.roas} onChange={() => toggleColumn('roas')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>ROAS</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={colVis.reason} onChange={() => toggleColumn('reason')} className="rounded text-amber-500 focus:ring-amber-400" />
                          <span>调价依据与建议</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
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

          {/* Search bar inside Bid Tab */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索当前列表关键词、广告活动名称..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Table Container - supports smooth vertical & horizontal scrolling with sticky header */}
          <div 
            ref={bidTableRef}
            className="max-h-[600px] 2xl:max-h-[720px] overflow-y-auto overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm visible-table-scrollbar relative"
          >
            <table className={`w-full text-left ${fontSizeClass} text-slate-600 dark:text-slate-300 whitespace-nowrap`}>
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase text-[11px] font-bold border-b border-slate-300 dark:border-slate-700 shadow-sm">
                <tr>
                  {/* Requirement 1: Header Select All Checkbox (图一位置) */}
                  <th className={`${cellPadding} w-10 text-center select-none`}>
                    <button
                      onClick={() => onToggleAllBids(!allFilteredSelected, sortedAndFilteredBidActions.map(b => b.id))}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center mx-auto"
                      title={allFilteredSelected ? '取消全选当前显示项' : `全选当前显示的全部 ${sortedAndFilteredBidActions.length} 项`}
                    >
                      {allFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-500" />
                      ) : someFilteredSelected ? (
                        <div className="w-4 h-4 rounded border-2 border-amber-500 bg-amber-500/20 flex items-center justify-center text-amber-500 font-black text-[10px] leading-none">
                          -
                        </div>
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                      )}
                    </button>
                  </th>

                  {renderSortHeader('关键词 / 投放', 'keywordText')}
                  {colVis.matchType && renderSortHeader('投放匹配类型', 'matchType')}
                  {colVis.currentBid && renderSortHeader('原出价 (USD)', 'currentBid')}
                  {colVis.userCustomBid && renderSortHeader('最终出价 (自由微调)', 'userCustomBid', 'text-amber-600 dark:text-amber-400')}
                  {colVis.amazonSuggested && renderSortHeader('建议竞价 (区间)', 'suggestedBidMed')}
                  {colVis.impressions && renderSortHeader('展示量 (曝光)', 'impressions')}
                  {colVis.clicks && renderSortHeader('点击量', 'clicks')}
                  {colVis.ctr && renderSortHeader('点击率 (CTR)', 'ctr')}
                  {colVis.cpc && renderSortHeader('CPC (USD)', 'cpc')}
                  {colVis.spend && renderSortHeader('总成本 (USD)', 'spend')}
                  {colVis.orders && renderSortHeader('购买量 (订单)', 'orders')}
                  {colVis.sales && renderSortHeader('销售额 (USD)', 'sales')}
                  {colVis.acos && renderSortHeader('当前 ACOS', 'acos')}
                  {colVis.roas && renderSortHeader('ROAS', 'roas')}
                  {colVis.reason && <th className={cellPadding}>调价依据与建议</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {sortedAndFilteredBidActions.map((action, idx) => {
                  const effectiveFinalBid = action.userCustomBid !== undefined 
                    ? action.userCustomBid 
                    : action.currentBid; // DEFAULTS TO ORIGINAL BID!

                  return (
                    <tr 
                      key={action.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition select-none ${
                        action.selected ? 'bg-amber-50/40 dark:bg-amber-950/10' : 'opacity-90'
                      }`}
                    >
                      {/* Checkbox (Shift-click range select support, default unchecked) */}
                      <td className={`${cellPadding} text-center`}>
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

                      {/* Requirement 3.3: Click Keyword to Copy (图四) */}
                      <td className={`${cellPadding} font-sans font-semibold text-slate-900 dark:text-white max-w-[260px]`}>
                        <div 
                          onClick={() => handleCopyKeyword(action.item.keywordText)}
                          className="flex items-center gap-1.5 group cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition"
                          title={`点击一键复制关键词: ${action.item.keywordText}`}
                        >
                          <span className="truncate">{action.item.keywordText}</span>
                          {copiedKeyword === action.item.keywordText ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.2 rounded border border-emerald-200">
                              <Check className="w-3 h-3" /> 已复制
                            </span>
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          )}
                        </div>
                      </td>

                      {/* Match Type */}
                      {colVis.matchType && (
                        <td className={`${cellPadding} font-sans`}>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {action.item.matchTypeDisplay}
                          </span>
                        </td>
                      )}

                      {/* Original Bid (原出价) */}
                      {colVis.currentBid && (
                        <td className={`${cellPadding} font-bold text-slate-900 dark:text-slate-100`}>
                          ${action.currentBid.toFixed(2)}
                        </td>
                      )}

                      {/* Final Bid Input (微调，默认显示原出价) */}
                      {colVis.userCustomBid && (
                        <td className={`${cellPadding} font-sans`}>
                          <div className="flex items-center font-mono font-bold text-amber-600 dark:text-amber-400">
                            <span className="mr-0.5">$</span>
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
                        </td>
                      )}

                      {/* Requirement 3.4: 替换为表格里的建议竞价及区间 (图五) */}
                      {colVis.amazonSuggested && (
                        <td className={`${cellPadding} font-mono text-xs`}>
                          {action.item.suggestedBidMed && action.item.suggestedBidMed > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  ${action.item.suggestedBidMed.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-sans">
                                  (${action.item.suggestedBidLow ? action.item.suggestedBidLow.toFixed(2) : '-'} - ${action.item.suggestedBidHigh ? action.item.suggestedBidHigh.toFixed(2) : '-'})
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  onCustomBidChange(action.id, action.item.suggestedBidMed || 0);
                                  if (!action.selected) onToggleBidAction(action.id);
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 transition"
                                title="一键将此亚马逊建议竞价填入最终出价"
                              >
                                填入
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}

                      {/* Impressions */}
                      {colVis.impressions && (
                        <td className={`${cellPadding} text-slate-600 dark:text-slate-400`}>
                          {action.item.impressions.toLocaleString()}
                        </td>
                      )}

                      {/* Clicks */}
                      {colVis.clicks && (
                        <td className={`${cellPadding} font-semibold text-slate-700 dark:text-slate-300`}>
                          {action.item.clicks}
                        </td>
                      )}

                      {/* CTR */}
                      {colVis.ctr && (
                        <td className={`${cellPadding} text-slate-600 dark:text-slate-400`}>
                          {action.item.ctr}%
                        </td>
                      )}

                      {/* CPC */}
                      {colVis.cpc && (
                        <td className={`${cellPadding} text-slate-600 dark:text-slate-400`}>
                          ${action.item.cpc.toFixed(2)}
                        </td>
                      )}

                      {/* Spend */}
                      {colVis.spend && (
                        <td className={`${cellPadding} font-medium text-slate-900 dark:text-slate-100`}>
                          ${action.item.spend.toFixed(2)}
                        </td>
                      )}

                      {/* Orders */}
                      {colVis.orders && (
                        <td className={`${cellPadding} text-slate-700 dark:text-slate-300`}>
                          {action.item.orders} 单
                        </td>
                      )}

                      {/* Sales */}
                      {colVis.sales && (
                        <td className={`${cellPadding} font-semibold text-slate-900 dark:text-slate-100`}>
                          ${action.item.sales.toFixed(2)}
                        </td>
                      )}

                      {/* ACOS */}
                      {colVis.acos && (
                        <td className={cellPadding}>
                          {action.item.orders === 0 && action.item.spend > 0 ? (
                            <span className="text-rose-600 font-bold">999% (0单)</span>
                          ) : (
                            <span className={`font-bold ${action.item.acos > 50 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                              {action.item.acos}%
                            </span>
                          )}
                        </td>
                      )}

                      {/* ROAS */}
                      {colVis.roas && (
                        <td className={`${cellPadding} text-slate-700 dark:text-slate-300 font-medium`}>
                          {action.item.roas.toFixed(2)}
                        </td>
                      )}

                      {/* Reason */}
                      {colVis.reason && (
                        <td className={`${cellPadding} font-sans text-slate-500 text-[11px] max-w-[280px] truncate`} title={action.reason}>
                          {action.type === 'zero_impression_boost' ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">💤 {action.reason}</span>
                          ) : action.type === 'decrease_bid' ? (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">📉 {action.reason}</span>
                          ) : action.type === 'increase_bid' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">📈 {action.reason}</span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400">👀 {action.reason}</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Requirement 2: Horizontal Scroll Navigation Bar (底部明显左右滑动控制与提示) */}
          <div className="flex flex-wrap items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleScrollTable(bidTableRef, 'left')}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-amber-600 hover:border-amber-400 transition flex items-center gap-1 font-semibold shadow-sm active:scale-95"
                title="向左平移查看左侧指标"
              >
                <span>⬅️ 向左滑动</span>
              </button>
              <button
                type="button"
                onClick={() => handleScrollTable(bidTableRef, 'right')}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-amber-600 hover:border-amber-400 transition flex items-center gap-1 font-semibold shadow-sm active:scale-95"
                title="向右平移查看右侧指标"
              >
                <span>向右滑动 ➡️</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] min-w-0 truncate">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <span className="truncate">💡 拖动上方金色滚动条，或按键盘 <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono text-[10px]">Shift</kbd> + 滚轮横移查看全部数据</span>
            </div>
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

          <div className="max-h-[600px] 2xl:max-h-[720px] overflow-y-auto overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm visible-table-scrollbar relative">
            <table className={`w-full text-left ${fontSizeClass} text-slate-600 dark:text-slate-300 whitespace-nowrap`}>
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase text-[11px] font-bold border-b border-slate-300 dark:border-slate-700 shadow-sm">
                <tr>
                  <th className={`${cellPadding} w-10 text-center`}>状态</th>
                  <th className={cellPadding}>搜索词 / 投放 ASIN</th>
                  <th className={cellPadding}>匹配类型</th>
                  <th className={cellPadding}>展示曝光</th>
                  <th className={cellPadding}>点击量</th>
                  <th className={`${cellPadding} text-rose-600 dark:text-rose-400`}>浪费总成本</th>
                  <th className={cellPadding}>购买量</th>
                  <th className={cellPadding}>建议操作</th>
                  <th className={cellPadding}>诊断依据</th>
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
                    <td className={`${cellPadding} text-center`} onClick={e => e.stopPropagation()}>
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
                    <td className={`${cellPadding} font-sans font-semibold text-slate-900 dark:text-white max-w-[220px] truncate`}>
                      {action.keywordText}
                    </td>
                    <td className={`${cellPadding} font-sans`}>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {action.item.matchTypeDisplay}
                      </span>
                    </td>
                    <td className={`${cellPadding} text-slate-600`}>
                      {action.item.impressions.toLocaleString()}
                    </td>
                    <td className={`${cellPadding} font-semibold text-slate-800 dark:text-slate-200`}>
                      {action.clicks} 次
                    </td>
                    <td className={`${cellPadding} font-bold text-rose-600 dark:text-rose-400`}>
                      ${action.wastedSpend.toFixed(2)}
                    </td>
                    <td className={`${cellPadding} text-slate-500`}>
                      0 单 (0%)
                    </td>
                    <td className={`${cellPadding} font-sans`}>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                        {action.type === 'negative_product' ? '否定商品投放' : '精准否定'}
                      </span>
                    </td>
                    <td className={`${cellPadding} font-sans text-slate-500 text-[11px] max-w-[300px]`}>
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

          <div className="max-h-[600px] 2xl:max-h-[720px] overflow-y-auto overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm visible-table-scrollbar relative">
            <table className={`w-full text-left ${fontSizeClass} text-slate-600 dark:text-slate-300 whitespace-nowrap`}>
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase text-[11px] font-bold border-b border-slate-300 dark:border-slate-700 shadow-sm">
                <tr>
                  <th className={cellPadding}>优质搜索词</th>
                  <th className={cellPadding}>原匹配类型</th>
                  <th className={`${cellPadding} text-emerald-600 dark:text-emerald-400`}>购买量 (订单)</th>
                  <th className={cellPadding}>总销售额 (USD)</th>
                  <th className={`${cellPadding} text-emerald-600 dark:text-emerald-400`}>优秀 ACOS</th>
                  <th className={cellPadding}>ROAS</th>
                  <th className={cellPadding}>建议精准出价</th>
                  <th className={cellPadding}>运营建议</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {harvestActions.map(action => (
                  <tr key={action.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className={`${cellPadding} font-sans font-bold text-slate-900 dark:text-white max-w-[220px] truncate`}>
                      {action.keywordText}
                    </td>
                    <td className={`${cellPadding} font-sans`}>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {action.item.matchTypeDisplay}
                      </span>
                    </td>
                    <td className={`${cellPadding} font-bold text-emerald-600 dark:text-emerald-400`}>
                      {action.orders} 笔订单
                    </td>
                    <td className={`${cellPadding} text-slate-700 dark:text-slate-200 font-bold`}>
                      ${action.sales.toFixed(2)}
                    </td>
                    <td className={`${cellPadding} font-bold text-emerald-600 dark:text-emerald-400`}>
                      {action.acos}%
                    </td>
                    <td className={`${cellPadding} font-bold text-slate-800`}>
                      {action.item.roas}
                    </td>
                    <td className={`${cellPadding} font-semibold text-amber-600 dark:text-amber-400`}>
                      ${action.suggestedBid}
                    </td>
                    <td className={`${cellPadding} font-sans text-slate-600 dark:text-slate-300 text-[11px] max-w-[280px]`}>
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
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索关键词、匹配类型、广告活动..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={filterOnlyActive}
                  onChange={e => setFilterOnlyActive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800"
                />
                <span>仅看有流量/有花费词 ({allItems.filter(i => i.clicks > 0 || i.spend > 0).length})</span>
              </label>

              <span className="text-slate-400">
                点击表头字即可直接升降序排列 · 共显示 {sortedAndFilteredAllItems.length} 条数据
              </span>
            </div>
          </div>

          <div 
            ref={allTableRef}
            className="max-h-[600px] 2xl:max-h-[720px] overflow-y-auto overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm visible-table-scrollbar relative"
          >
            <table className={`w-full text-left ${fontSizeClass} text-slate-600 dark:text-slate-300 whitespace-nowrap`}>
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 uppercase text-[11px] font-bold border-b border-slate-300 dark:border-slate-700 shadow-sm">
                <tr>
                  <th className={cellPadding}>关键词 / 投放</th>
                  <th className={cellPadding}>投放匹配类型</th>
                  <th className={cellPadding}>状态</th>
                  {renderSortHeader('竞价 (USD)', 'currentBid')}
                  {renderSortHeader('展示量 (曝光)', 'impressions')}
                  {renderSortHeader('点击量', 'clicks')}
                  {renderSortHeader('点击率 (CTR)', 'ctr')}
                  {renderSortHeader('CPC (USD)', 'cpc')}
                  {renderSortHeader('总成本 (USD)', 'spend')}
                  {renderSortHeader('购买量 (订单)', 'orders')}
                  {renderSortHeader('销售额 (USD)', 'sales')}
                  {renderSortHeader('ACOS', 'acos')}
                  {renderSortHeader('ROAS', 'roas')}
                  <th className={cellPadding}>建议竞价区间</th>
                  <th className={cellPadding}>首页展示份额</th>
                  <th className={cellPadding}>智能诊断结论</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {sortedAndFilteredAllItems.map(item => {
                  const isBleeding = item.clicks >= 10 && item.orders === 0;
                  const isHighAcos = item.orders > 0 && item.acos > 28;
                  const isHealthy = item.orders > 0 && item.acos <= 28;

                  return (
                    <tr key={`${item.id}_${item.originalRowIndex}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className={`${cellPadding} font-sans font-bold text-slate-900 dark:text-white max-w-[200px] truncate`}>
                        <div 
                          onClick={() => handleCopyKeyword(item.keywordText)}
                          className="flex items-center gap-1.5 group cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                          title={`点击一键复制关键词: ${item.keywordText}`}
                        >
                          <span className="truncate">{item.keywordText}</span>
                          {copiedKeyword === item.keywordText ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-1 py-0.2 rounded border border-emerald-200">
                              <Check className="w-3 h-3" /> 已复制
                            </span>
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className={`${cellPadding} font-sans`}>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.matchTypeDisplay}
                        </span>
                      </td>
                      <td className={`${cellPadding} font-sans text-xs`}>
                        <span className={item.campaignStatusDetail?.includes('超出预算') ? 'text-amber-600 font-medium' : 'text-slate-500'}>
                          {item.campaignStatusDetail || item.state}
                        </span>
                      </td>
                      <td className={`${cellPadding} font-bold text-slate-900 dark:text-slate-100`}>
                        ${item.currentBid.toFixed(2)}
                      </td>
                      <td className={`${cellPadding} text-slate-600 dark:text-slate-400`}>
                        {item.impressions.toLocaleString()}
                      </td>
                      <td className={`${cellPadding} font-semibold text-slate-700 dark:text-slate-300`}>
                        {item.clicks}
                      </td>
                      <td className={`${cellPadding} text-slate-600 dark:text-slate-400`}>
                        {item.ctr}%
                      </td>
                      <td className={`${cellPadding} text-slate-600 dark:text-slate-400`}>
                        ${item.cpc.toFixed(2)}
                      </td>
                      <td className={`${cellPadding} font-semibold text-rose-600 dark:text-rose-400`}>
                        ${item.spend.toFixed(2)}
                      </td>
                      <td className={`${cellPadding} text-slate-700 dark:text-slate-300`}>
                        {item.orders}
                      </td>
                      <td className={`${cellPadding} font-bold text-slate-900 dark:text-slate-100`}>
                        ${item.sales.toFixed(2)}
                      </td>
                      <td className={cellPadding}>
                        {item.orders === 0 && item.spend > 0 ? (
                          <span className="text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
                            999% (0单纯亏)
                          </span>
                        ) : (
                          <span className={`font-bold ${item.acos > 50 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
                            {item.acos}%
                          </span>
                        )}
                      </td>
                      <td className={`${cellPadding} text-slate-700 dark:text-slate-300`}>
                        {item.roas.toFixed(2)}
                      </td>
                      <td className={`${cellPadding} text-slate-500 text-xs`}>
                        {item.suggestedBidMed ? (
                          <span>${item.suggestedBidLow} - ${item.suggestedBidMed} - ${item.suggestedBidHigh}</span>
                        ) : '-'}
                      </td>
                      <td className={`${cellPadding} text-slate-500 text-xs`}>
                        {item.topOfSearchShare || '-'}
                      </td>
                      <td className={`${cellPadding} font-sans text-xs`}>
                        {isBleeding && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                            🛑 吸血亏损，建议否定
                          </span>
                        )}
                        {isHighAcos && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            📉 ACOS过高，建议降价
                          </span>
                        )}
                        {isHealthy && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            ⭐ 表现优异，可拓词放量
                          </span>
                        )}
                        {!isBleeding && !isHighAcos && !isHealthy && (
                          <span className="text-slate-400">观察中</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Requirement 2: Horizontal Scroll Navigation Bar for Tab 4 (全量列表底部明显左右滑动控制与提示) */}
          <div className="flex flex-wrap items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleScrollTable(allTableRef, 'left')}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-amber-600 hover:border-amber-400 transition flex items-center gap-1 font-semibold shadow-sm active:scale-95"
                title="向左平移查看左侧指标"
              >
                <span>⬅️ 向左滑动</span>
              </button>
              <button
                type="button"
                onClick={() => handleScrollTable(allTableRef, 'right')}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-amber-600 hover:border-amber-400 transition flex items-center gap-1 font-semibold shadow-sm active:scale-95"
                title="向右平移查看右侧指标"
              >
                <span>向右滑动 ➡️</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] min-w-0 truncate">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <span className="truncate">💡 拖动上方金色滚动条，或按键盘 <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono text-[10px]">Shift</kbd> + 滚轮横移查看全部数据</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
