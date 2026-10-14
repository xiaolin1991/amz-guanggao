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

    // 2. Check for High ACOS items -> Bid Decrease (DEFAULT UNCHECKED per user requirement)
    if (item.orders > 0 && item.acos > config.targetAcos) {
      const baseBid = item.currentBid > 0 ? item.currentBid : (item.cpc > 0 ? item.cpc : 0.75);
      
      // Amazon target bid formula: Target Bid = CPC * (Target ACOS / Current ACOS)
      const idealBid = (item.cpc > 0 ? item.cpc : baseBid) * (config.targetAcos / item.acos);
      
      // Protection against drastic drop
      const maxDecreaseAllowed = baseBid * (config.maxBidDecreasePercent / 100);
      const floorBid = Math.max(baseBid - maxDecreaseAllowed, config.minBidFloor);
      const calculatedBid = Math.max(idealBid, floorBid, config.minBidFloor);
      const roundedBid = Number(calculatedBid.toFixed(2));

      if (roundedBid < baseBid) {
        const diffPercent = Number((((roundedBid - baseBid) / baseBid) * 100).toFixed(1));
        bidActions.push({
          id: `bid_dec_${item.id}_${item.originalRowIndex}`,
          item,
          type: 'decrease_bid',
          currentBid: baseBid,
          suggestedBid: roundedBid,
          bidChangePercent: diffPercent,
          reason: `当前 ACOS ${item.acos}% 超出目标 (${config.targetAcos}%)，系统保本参考价为 $${roundedBid}`,
          selected: false // Default unchecked! Avoid accidental adjustments
        });
      }
    }

    // 3. Check for Low ACOS Winners with room to expand (DEFAULT UNCHECKED)
    if (item.orders >= 2 && item.acos > 0 && item.acos <= config.targetAcos * 0.7) {
      const baseBid = item.currentBid > 0 ? item.currentBid : (item.cpc > 0 ? item.cpc : 0.75);
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
        selected: false // Default unchecked!
      });
    }

    // 4. Check for 0/Low Impression Keywords -> Boost Recommendation (DEFAULT UNCHECKED)
    if (item.clicks === 0 && item.spend === 0 && item.impressions <= 25) {
      const baseBid = item.currentBid > 0 ? item.currentBid : 0.50;
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
          ? '0曝光未激活：出价可能过低未获得展示机会，建议微提竞价或参考亚马逊建议中位价放量测试'
          : `曝光极低 (${item.impressions}次展示)：出价偏低未能拿足展示量，建议小幅提价测试放量`,
        selected: false // Default unchecked!
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
