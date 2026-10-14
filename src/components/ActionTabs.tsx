import React, { useState } from 'react';
import { 
  AlertOctagon, 
  TrendingDown, 
  Sparkles, 
  Table, 
  CheckSquare, 
  Square, 
  Search, 
  ArrowDownRight,
  ArrowUpRight
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
  onToggleBidAction: (id: string) => void;
  onToggleNegativeAction: (id: string) => void;
  onToggleHarvestAction: (id: string) => void;
  onToggleAllNegatives: (selected: boolean) => void;
  onToggleAllBids: (selected: boolean) => void;
  onCustomBidChange: (id: string, newBid: number) => void;
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
  onCustomBidChange
}) => {
  const [activeTab, setActiveTab] = useState<'negative' | 'bid' | 'harvest' | 'all'>('negative');
  const [searchTerm, setSearchTerm] = useState('');

  const selectedNegativesCount = negativeActions.filter(n => n.selected).length;
  const selectedBidsCount = bidActions.filter(b => b.selected).length;
  const selectedHarvestCount = harvestActions.filter(h => h.selected).length;

  const totalNegativeSavings = negativeActions
    .filter(n => n.selected)
    .reduce((sum, item) => sum + item.wastedSpend, 0);

  // Filter for 'all' tab
  const filteredAllItems = allItems.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.keywordText.toLowerCase().includes(term) ||
      item.campaignName.toLowerCase().includes(term) ||
      item.adGroupName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col transition-colors">
      
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 pt-3 gap-2 overflow-x-auto">
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
          onClick={() => setActiveTab('bid')}
          className={`px-4 py-3 font-semibold text-xs rounded-t-xl flex items-center gap-2 transition whitespace-nowrap border-b-2 ${
            activeTab === 'bid'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-amber-500 shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent hover:bg-slate-100 dark:hover:bg-slate-900/40'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>📉 动态降价控本</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
            {selectedBidsCount} / {bidActions.length}
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
          <span>📊 原始广告投放明细</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {allItems.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Negative Keywords Table */}
      {activeTab === 'negative' && (
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
              <AlertOctagon className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0" />
              <span>
                已选中 <strong>{selectedNegativesCount}</strong> 个吸血词，确认导出后将生成精准否定，可直接堵住 <strong>${totalNegativeSavings.toFixed(2)}</strong> 的无转化亏损漏洞。
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-10 text-center">状态</th>
                  <th className="p-3">搜索词 / 投放 ASIN</th>
                  <th className="p-3">广告活动 / 广告组</th>
                  <th className="p-3">点击量</th>
                  <th className="p-3 text-rose-600 dark:text-rose-400">浪费花费</th>
                  <th className="p-3">订单 / 转化</th>
                  <th className="p-3">建议操作</th>
                  <th className="p-3">诊断依据</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {negativeActions.map(action => (
                  <tr 
                    key={action.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer ${
                      action.selected ? 'bg-rose-50/40 dark:bg-rose-950/10' : 'opacity-60'
                    }`}
                    onClick={() => onToggleNegativeAction(action.id)}
                  >
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => onToggleNegativeAction(action.id)}
                        className="text-slate-400 hover:text-rose-500 dark:hover:text-amber-400"
                      >
                        {action.selected ? (
                          <CheckSquare className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-[220px] truncate">
                      <div className="flex items-center gap-1.5">
                        <span>{action.keywordText}</span>
                        {action.type === 'negative_product' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                            ASIN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                      <div className="font-medium text-slate-700 dark:text-slate-300">{action.campaignName}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{action.adGroupName}</div>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {action.clicks} 次
                    </td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                      ${action.wastedSpend.toFixed(2)}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">
                      0 单 (0%)
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
                        {action.type === 'negative_product' ? '否定商品投放' : '精准否定'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-[260px]">
                      {action.reason}
                    </td>
                  </tr>
                ))}
                {negativeActions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      🎉 太棒了！在当前阈值下未发现明显吸血无转化词。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Bid Adjustment Table */}
      {activeTab === 'bid' && (
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <TrendingDown className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              <span>
                根据<strong>目标保本 ACOS</strong> 算法自动核算出价。支持在输入框内微调自定义价格。
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleAllBids(true)}
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition"
              >
                全选
              </button>
              <button
                onClick={() => onToggleAllBids(false)}
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition"
              >
                取消全选
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 w-10 text-center">状态</th>
                  <th className="p-3">关键词 / 投放</th>
                  <th className="p-3">广告活动</th>
                  <th className="p-3">原出价</th>
                  <th className="p-3 text-amber-600 dark:text-amber-400">建议调价 (可改)</th>
                  <th className="p-3">幅度</th>
                  <th className="p-3">当前 ACOS</th>
                  <th className="p-3">花费 / 订单</th>
                  <th className="p-3">调价依据</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {bidActions.map(action => (
                  <tr 
                    key={action.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                      action.selected ? 'bg-amber-50/40 dark:bg-amber-950/10' : 'opacity-60'
                    }`}
                  >
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => onToggleBidAction(action.id)}
                        className="text-slate-400 hover:text-amber-500 dark:hover:text-amber-400"
                      >
                        {action.selected ? (
                          <CheckSquare className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-[200px] truncate">
                      {action.item.keywordText}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 max-w-[160px] truncate">
                      {action.item.campaignName}
                    </td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                      ${action.currentBid.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 font-mono font-bold text-amber-600 dark:text-amber-400">
                        <span>$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.05"
                          value={action.userCustomBid !== undefined ? action.userCustomBid : action.suggestedBid}
                          onChange={e => onCustomBidChange(action.id, parseFloat(e.target.value) || 0)}
                          className="w-16 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-amber-600 dark:text-amber-400 font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-0.5 font-bold ${
                        action.bidChangePercent < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {action.bidChangePercent < 0 ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                        {action.bidChangePercent}%
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-rose-600 dark:text-rose-400">
                      {action.item.acos}%
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      ${action.item.spend.toFixed(2)} / {action.item.orders}单
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-[240px]">
                      {action.reason}
                    </td>
                  </tr>
                ))}
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">优质搜索词</th>
                  <th className="p-3">来源广告活动</th>
                  <th className="p-3">原匹配类型</th>
                  <th className="p-3 text-emerald-600 dark:text-emerald-400">转化订单</th>
                  <th className="p-3">总销售额</th>
                  <th className="p-3 text-emerald-600 dark:text-emerald-400">优秀 ACOS</th>
                  <th className="p-3">建议精准出价</th>
                  <th className="p-3">运营建议</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {harvestActions.map(action => (
                  <tr key={action.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-white max-w-[220px] truncate">
                      {action.keywordText}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                      {action.sourceCampaignName}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {action.sourceMatchType}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {action.orders} 笔订单
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-200">
                      ${action.sales.toFixed(2)}
                    </td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {action.acos}%
                    </td>
                    <td className="p-3 font-mono font-semibold text-amber-600 dark:text-amber-400">
                      ${action.suggestedBid}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-[240px]">
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
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索关键词、广告活动或广告组..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              共显示 <strong className="text-slate-900 dark:text-white">{filteredAllItems.length}</strong> 条投放数据
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 sticky top-0 text-slate-500 dark:text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">关键词 / 投放</th>
                  <th className="p-3">类型</th>
                  <th className="p-3">广告活动</th>
                  <th className="p-3">出价</th>
                  <th className="p-3">曝光</th>
                  <th className="p-3">点击</th>
                  <th className="p-3">CPC</th>
                  <th className="p-3">花费</th>
                  <th className="p-3">订单</th>
                  <th className="p-3">销售额</th>
                  <th className="p-3">ACOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {filteredAllItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-[11px]">
                    <td className="p-3 font-sans font-medium text-slate-900 dark:text-white max-w-[180px] truncate">
                      {item.keywordText}
                    </td>
                    <td className="p-3 font-sans text-slate-500 dark:text-slate-400">
                      {item.matchType}
                    </td>
                    <td className="p-3 font-sans text-slate-500 dark:text-slate-400 max-w-[160px] truncate">
                      {item.campaignName}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      ${item.currentBid.toFixed(2)}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">
                      {item.impressions.toLocaleString()}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {item.clicks}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">
                      ${item.cpc}
                    </td>
                    <td className="p-3 text-slate-800 dark:text-slate-200">
                      ${item.spend.toFixed(2)}
                    </td>
                    <td className="p-3 text-slate-800 dark:text-slate-200">
                      {item.orders}
                    </td>
                    <td className="p-3 text-slate-800 dark:text-slate-200">
                      ${item.sales.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className={`font-semibold ${
                        item.acos > 50 ? 'text-rose-600 dark:text-rose-400' : (item.acos <= 25 && item.sales > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300')
                      }`}>
                        {item.acos === 999.9 ? '999% (0单)' : `${item.acos}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
