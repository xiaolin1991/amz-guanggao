import {
  NormalizedAdItem,
  OptimizerConfig,
  DiagnosisSummary,
  BidAdjustmentAction,
  NegativeTargetAction,
  HarvestAction
} from '../types/amazon';

export function runOptimizationDiagnosis(
  items: NormalizedAdItem[],
  config: OptimizerConfig
): {
  summary: DiagnosisSummary;
  bidActions: BidAdjustmentAction[];
  negativeActions: NegativeTargetAction[];
  harvestActions: HarvestAction[];
} {
  let totalSpend = 0;
  let totalSales = 0;
  let totalOrders = 0;
  let totalClicks = 0;
  let wastedSpend = 0;

  const bidActions: BidAdjustmentAction[] = [];
  const negativeActions: NegativeTargetAction[] = [];
  const harvestActions: HarvestAction[] = [];

  items.forEach(item => {
    totalSpend += item.spend;
    totalSales += item.sales;
    totalOrders += item.orders;
    totalClicks += item.clicks;

    if (item.orders === 0 && item.spend > 0) {
      wastedSpend += item.spend;
    }

    // 1. Check for Bleeding / Zero-Order High-Click items -> Negative Action
    if (item.orders === 0 && item.clicks >= config.zeroOrderClickThreshold) {
      const isAsin = /^b0[a-z0-9]{8}$/i.test(item.keywordText.trim()) || 
                     item.keywordText.toLowerCase().includes('asin=') ||
                     item.entity === 'Product Targeting';

      negativeActions.push({
        id: `neg_${item.id}_${item.originalRowIndex}`,
        item,
        type: isAsin ? 'negative_product' : 'negative_exact',
        keywordText: item.keywordText,
        campaignId: item.campaignId,
        campaignName: item.campaignName,
        adGroupId: item.adGroupId,
        adGroupName: item.adGroupName,
        wastedSpend: Number(item.spend.toFixed(2)),
        clicks: item.clicks,
        reason: `点击 ${item.clicks} 次，白白烧掉 $${item.spend.toFixed(2)}，至今 0 转化，属于典型吸血流量`,
        selected: true // Negative default selected for urgent bleeding
      });
    }

    // Determine Bid Action for this item (EVERY item gets an action so none are missing!)
    const baseBid = item.currentBid > 0 ? item.currentBid : (item.cpc > 0 ? item.cpc : 0.75);

    if (item.orders > 0 && item.acos > config.targetAcos) {
      // 1. High ACOS -> Bid Decrease
      const idealBid = (item.cpc > 0 ? item.cpc : baseBid) * (config.targetAcos / item.acos);
      const maxDecreaseAllowed = baseBid * (config.maxBidDecreasePercent / 100);
      const floorBid = Math.max(baseBid - maxDecreaseAllowed, config.minBidFloor);
      const calculatedBid = Math.max(idealBid, floorBid, config.minBidFloor);
      const roundedBid = Number(calculatedBid.toFixed(2));
      const diffPercent = Number((((roundedBid - baseBid) / baseBid) * 100).toFixed(1));

      bidActions.push({
        id: `bid_dec_${item.id}_${item.originalRowIndex}`,
        item,
        type: 'decrease_bid',
        currentBid: baseBid,
        suggestedBid: roundedBid,
        bidChangePercent: diffPercent,
        reason: `当前 ACOS ${item.acos}% 超出目标 (${config.targetAcos}%)，建议降价控本`,
        selected: false
      });
    } else if (item.orders >= 2 && item.acos > 0 && item.acos <= config.targetAcos * 0.7) {
      // 2. High conversion winners -> Bid Boost
      const suggestedBid = Number(Math.min(baseBid * 1.15, baseBid + 0.35).toFixed(2));
      const diffPercent = Number((((suggestedBid - baseBid) / baseBid) * 100).toFixed(1));

      bidActions.push({
        id: `bid_boost_${item.id}_${item.originalRowIndex}`,
        item,
        type: 'increase_bid',
        currentBid: baseBid,
        suggestedBid: suggestedBid,
        bidChangePercent: diffPercent,
        reason: `高转化优质词 (ACOS 仅 ${item.acos}%)，建议提价 15% 抢占首页顶部首位`,
        selected: false
      });
    } else if (item.orders === 0 && item.clicks >= config.zeroOrderClickThreshold) {
      // 3. Bleeding high click 0 conversion items -> Urgent Bid Decrease (or negative)
      const suggestedBid = Math.max(Number((baseBid * 0.7).toFixed(2)), config.minBidFloor);
      const diffPercent = Number((((suggestedBid - baseBid) / baseBid) * 100).toFixed(1));

      bidActions.push({
        id: `bid_bleed_${item.id}_${item.originalRowIndex}`,
        item,
        type: 'decrease_bid',
        currentBid: baseBid,
        suggestedBid: suggestedBid,
        bidChangePercent: diffPercent,
        reason: `点击 ${item.clicks} 次 0 转化，白白烧掉 $${item.spend.toFixed(2)}，建议降价控本或直接否定止血`,
        selected: false
      });
    } else if (item.clicks === 0 && item.spend === 0) {
      // 4. 0 Click & 0 Spend items (Zero or low impression)
      let suggestedBid = baseBid;
      if (item.suggestedBidMed && item.suggestedBidMed > baseBid) {
        suggestedBid = item.suggestedBidMed;
      } else {
        suggestedBid = Number((baseBid + 0.10).toFixed(2));
      }
      const diffPercent = Number((((suggestedBid - baseBid) / baseBid) * 100).toFixed(1));

      bidActions.push({
        id: `bid_zero_${item.id}_${item.originalRowIndex}`,
        item,
        type: 'zero_impression_boost',
        currentBid: baseBid,
        suggestedBid: suggestedBid,
        bidChangePercent: diffPercent,
        reason: item.impressions === 0 
          ? '0曝光未激活：出价可能过低未获展示机会，建议微提竞价或参考建议价激活测试'
          : `曝光偏低 (${item.impressions}次展示 0点击)：建议小幅加价测试放量`,
        selected: false
      });
    } else {
      // 5. Moderate clicks with 0 orders, or normal healthy terms -> Observation & manual control
      let reason = '数据观察期：当前出价维持，可根据出单转化情况手动微调';
      let type: 'observation' | 'decrease_bid' = 'observation';
      let suggestedBid = baseBid;

      if (item.clicks > 0 && item.orders === 0) {
        reason = `已产生 ${item.clicks} 次点击花费 $${item.spend.toFixed(2)} 尚未出单，建议观察或小幅降价控本`;
        suggestedBid = Number(Math.max(baseBid * 0.85, config.minBidFloor).toFixed(2));
        type = 'decrease_bid';
      } else if (item.orders > 0 && item.acos <= config.targetAcos) {
        reason = `ACOS ${item.acos}% 达标，投放健康，保持当前出价`;
      }

      const diffPercent = Number((((suggestedBid - baseBid) / baseBid) * 100).toFixed(1));

      bidActions.push({
        id: `bid_obs_${item.id}_${item.originalRowIndex}`,
        item,
        type: type,
        currentBid: baseBid,
        suggestedBid: suggestedBid,
        bidChangePercent: diffPercent,
        reason: reason,
        selected: false
      });
    }

    // 5. Check for Search Term Harvesting (拓词提炼)
    if (config.autoHarvestExact && item.orders >= config.harvestMinOrders && item.acos <= config.targetAcos) {
      const matchLower = item.matchType.toLowerCase();
      const isBroadOrPhrase = matchLower.includes('broad') || matchLower.includes('phrase') || matchLower.includes('广泛') || matchLower.includes('词组') || matchLower.includes('auto');
      
      if (isBroadOrPhrase || item.entity === 'Product Targeting') {
        harvestActions.push({
          id: `harvest_${item.id}_${item.originalRowIndex}`,
          item,
          keywordText: item.keywordText,
          sourceCampaignName: item.campaignName,
          sourceMatchType: item.matchType,
          orders: item.orders,
          sales: Number(item.sales.toFixed(2)),
          spend: Number(item.spend.toFixed(2)),
          acos: item.acos,
          suggestedBid: Number((item.cpc * 1.05).toFixed(2)) || 0.85,
          reason: `在非精准投放中表现亮眼 (已出 ${item.orders} 单，ACOS ${item.acos}%)，建议提取到独立精准广告组`,
          selected: true
        });
      }
    }
  });

  const overallAcos = totalSales > 0 ? Number(((totalSpend / totalSales) * 100).toFixed(2)) : (totalSpend > 0 ? 100 : 0);
  const wastedSpendPercent = totalSpend > 0 ? Number(((wastedSpend / totalSpend) * 100).toFixed(1)) : 0;
  const averageCpc = totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0;

  // Potential Monthly Savings
  const potentialMonthlySavings = Number((
    negativeActions.reduce((acc, curr) => acc + curr.wastedSpend, 0) * 0.85 +
    bidActions.filter(b => b.type === 'decrease_bid').reduce((acc, curr) => acc + (curr.item.spend * 0.25), 0)
  ).toFixed(2));

  const summary: DiagnosisSummary = {
    totalSpend: Number(totalSpend.toFixed(2)),
    totalSales: Number(totalSales.toFixed(2)),
    overallAcos,
    totalOrders,
    totalClicks,
    averageCpc,
    wastedSpend: Number(wastedSpend.toFixed(2)),
    wastedSpendPercent,
    bleedingKeywordsCount: negativeActions.length,
    highAcosItemsCount: bidActions.filter(b => b.type === 'decrease_bid').length,
    zeroImpressionItemsCount: bidActions.filter(b => b.type === 'zero_impression_boost').length,
    harvestItemsCount: harvestActions.length,
    potentialMonthlySavings
  };

  return {
    summary,
    bidActions,
    negativeActions,
    harvestActions
  };
}
