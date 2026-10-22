/**
 * 晓林广告助手 - 广告核心诊断与算法分析引擎 (v1.2.0 平滑阶梯版)
 * 技术支持：曹晓林 13575948278
 */

const XiaolinAnalyzer = {
  /**
   * 诊断单个关键词/搜索词数据行
   * @param {Object} row - { keyword, matchType, spend, sales, orders, clicks, impressions, acos, roas, cpc, bid }
   * @param {Object} settings - 阈值设置
   * @returns {Object} 诊断结果
   */
  diagnoseKeyword(row, settings) {
    const maxSpendZero = parseFloat(settings.maxSpendZeroOrder) || 15;
    const metricMode = settings.metricMode || 'acos'; // 'acos' | 'roas'
    const targetAcos = parseFloat(settings.targetAcos) || 30;
    const highAcos = parseFloat(settings.highAcosThreshold) || 55;
    const targetRoas = parseFloat(settings.targetRoas) || (targetAcos > 0 ? (100 / targetAcos) : 3.33);
    const lowRoas = parseFloat(settings.lowRoasThreshold) || (highAcos > 0 ? (100 / highAcos) : 1.82);

    // 调价策略：'smooth' (平滑阶梯调价) | 'breakeven' (一步到位保本倒推)
    const bidStrategy = settings.bidStrategy || 'smooth';
    const stepDownMode = settings.stepDownMode || 'percent'; // 'percent' (比例) | 'amount' (固定金额)
    const stepDownDir = settings.stepDownDir || 'down';       // 'down' (降低) | 'up' (升高)
    const stepDownPercent = parseFloat(settings.stepDownPercent) !== undefined ? parseFloat(settings.stepDownPercent) : 10; // 默认降 10%
    const stepDownAmount = parseFloat(settings.stepDownAmount) !== undefined ? parseFloat(settings.stepDownAmount) : 0.02;   // 默认 $0.02
    const stepUpPercent = parseFloat(settings.stepUpPercent) || 10;     // 默认升 10%

    const harvestOrders = parseInt(settings.harvestMinOrders, 10) || 2;
    const productPrice = parseFloat(settings.productPrice) || 29.99;
    const cvr = (parseFloat(settings.cvrEstimate) || 10) / 100;

    const spend = parseFloat(row.spend) || 0;
    const sales = parseFloat(row.sales) || 0;
    const orders = parseInt(row.orders, 10) || 0;
    const clicks = parseInt(row.clicks, 10) || 0;
    const impressions = parseInt(row.impressions, 10) || 0;
    const currentBid = parseFloat(row.bid) || 0;

    // 计算实际 ACoS 与 ROAS
    let currentAcos = null;
    let currentRoas = null;

    if (row.acos !== null && row.acos !== undefined && !isNaN(row.acos)) {
      currentAcos = parseFloat(row.acos);
    } else if (sales > 0 && spend > 0) {
      currentAcos = (spend / sales) * 100;
    }

    if (row.roas !== null && row.roas !== undefined && !isNaN(row.roas)) {
      currentRoas = parseFloat(row.roas);
    } else if (currentAcos !== null && currentAcos > 0) {
      currentRoas = 100 / currentAcos;
    } else if (spend > 0 && sales > 0) {
      currentRoas = sales / spend;
    }

    const currentCpc = parseFloat(row.cpc) || (clicks > 0 ? spend / clicks : (currentBid > 0 ? currentBid : 1.0));
    const basePrice = currentBid > 0 ? currentBid : currentCpc;

    // 1. 紧急：高花费0转化 (严重吃预算)
    if (spend >= maxSpendZero && orders === 0) {
      return {
        type: 'CRITICAL_BLEED',
        level: 'danger',
        badge: '🛑 高花费0转化',
        title: '严重吃预算词！立即止血',
        description: `已花费 US$${spend.toFixed(2)} (${clicks}次点击)，0次成交！正在白白流失广告费。`,
        actionText: '一键添加精准否定',
        actionType: 'NEGATE_EXACT',
        suggestedBid: 0,
        keyword: row.keyword
      };
    }

    // 2. 紧急：出单但 ACoS 极高超标 (严重亏损)
    const isAcosSevere = currentAcos !== null && currentAcos >= 100;
    const isAcosHigh = currentAcos !== null && currentAcos >= highAcos;
    const isRoasSevere = currentRoas !== null && currentRoas <= 1.0;
    const isRoasLow = currentRoas !== null && currentRoas <= lowRoas;

    const isBleedingByMetric = metricMode === 'roas' 
      ? (isRoasSevere || isRoasLow) 
      : (isAcosSevere || isAcosHigh);

    if (orders > 0 && isBleedingByMetric) {
      let suggestedBid = 0;
      let actionLabel = '';

      if (bidStrategy === 'smooth') {
        const isUp = stepDownDir === 'up';
        if (stepDownMode === 'amount') {
          // 固定金额微调 (如 $0.02)
          const diff = Math.abs(stepDownAmount);
          suggestedBid = isUp ? (basePrice + diff) : Math.max(0.05, basePrice - diff);
          actionLabel = isUp 
            ? `建议微调提价 +$${diff.toFixed(2)} 至 US$${suggestedBid.toFixed(2)}`
            : `建议微调降价 -$${diff.toFixed(2)} 至 US$${suggestedBid.toFixed(2)}`;
        } else {
          // 核心优化：平滑阶梯百分比调价 (默认 10%)
          suggestedBid = isUp 
            ? (basePrice * (1 + (stepDownPercent / 100)))
            : Math.max(0.05, basePrice * (1 - (stepDownPercent / 100)));
          actionLabel = isUp
            ? `建议微调提价 +${stepDownPercent}% 至 US$${suggestedBid.toFixed(2)}`
            : `建议平滑降价 -${stepDownPercent}% 至 US$${suggestedBid.toFixed(2)} (保住曝光)`;
        }
      } else {
        // 保本倒推法：一步到位
        let ratio = 0.5;
        if (currentAcos && currentAcos > 0) {
          ratio = targetAcos / currentAcos;
        } else if (currentRoas && currentRoas > 0) {
          ratio = currentRoas / targetRoas;
        }
        suggestedBid = Math.max(0.05, basePrice * ratio);
        actionLabel = `建议保本降价至 US$${suggestedBid.toFixed(2)}`;
      }

      const metricDisplay = currentAcos !== null 
        ? `ACoS ${currentAcos.toFixed(1)}%` 
        : `ROAS ${currentRoas.toFixed(2)}`;

      const isExtreme = isAcosSevere || isRoasSevere;

      return {
        type: 'HIGH_ACOS',
        level: isExtreme ? 'danger' : 'warning',
        badge: isExtreme ? `🛑 ${metricDisplay} 爆表` : `⚠️ ${metricDisplay} 超标`,
        title: isExtreme ? '巨额亏损！广告费超过销售额' : '转化成本过高，侵蚀利润',
        description: `已产生 ${orders} 单，但 ${metricDisplay}（保本线：ACoS ${targetAcos}% / ROAS ${targetRoas.toFixed(2)}）。`,
        actionText: actionLabel,
        actionType: 'REDUCE_BID',
        suggestedBid: parseFloat(suggestedBid.toFixed(2)),
        keyword: row.keyword
      };
    }

    // 3. 机会：高转化黄金词 (出单好，小幅提价 10% 冲排名)
    const isHealthyAcos = currentAcos !== null && currentAcos <= targetAcos * 1.15;
    const isHealthyRoas = currentRoas !== null && currentRoas >= targetRoas * 0.9;
    const isHealthy = metricMode === 'roas' ? isHealthyRoas : isHealthyAcos;

    if (orders >= harvestOrders && (sales > 0 && isHealthy)) {
      // 优质词适度提价冲首页
      const suggestedExactBid = Math.max(basePrice * (1 + (stepUpPercent / 100)), productPrice * (targetAcos / 100) * cvr);
      const metricDisplay = currentAcos !== null ? `ACoS ${currentAcos.toFixed(1)}%` : `ROAS ${currentRoas.toFixed(2)}`;

      return {
        type: 'GOLDEN_WINNER',
        level: 'success',
        badge: '🚀 高转化黄金词',
        title: '优质盈利词！建议重点倾斜',
        description: `稳定成交 ${orders} 单，${metricDisplay}，表现非常优秀！`,
        actionText: `建议微调提价 ${stepUpPercent}% 抢首位曝光：US$${suggestedExactBid.toFixed(2)}`,
        actionType: 'HARVEST_EXACT',
        suggestedBid: parseFloat(suggestedExactBid.toFixed(2)),
        keyword: row.keyword
      };
    }

    // 4. 优化：曝光极度受限 (严格依据用户自定义曝光门槛，默认 ≤ 5 次，绝不误判高曝光词)
    const lowImpThreshold = parseInt(settings.boostMaxImpressions, 10) || 5;
    if (impressions > 0 && impressions <= lowImpThreshold && spend < 2 && clicks < 2 && orders === 0) {
      return {
        type: 'LOW_IMPRESSION',
        level: 'info',
        badge: '💤 曝光不足',
        title: '展示量极低，出价受限',
        description: `展示仅 ${impressions} 次，出价可能低于当前市场竞价门槛。`,
        actionText: '微调提价 +$0.05',
        actionType: 'INCREASE_BID_SMALL',
        suggestedBid: parseFloat((currentCpc + 0.05).toFixed(2)),
        keyword: row.keyword
      };
    }

    // 5. 表现正常
    return {
      type: 'HEALTHY',
      level: 'normal',
      badge: '✅ 表现正常',
      title: '指标健康稳定',
      description: `花费 US$${spend.toFixed(2)}, 出单 ${orders} 单, ACoS: ${currentAcos !== null ? currentAcos.toFixed(1) + '%' : '-'}`,
      actionText: '维持观察',
      actionType: 'NONE',
      suggestedBid: currentCpc,
      keyword: row.keyword
    };
  },

  /**
   * 测算保本上限竞价与广告位加价比例
   */
  calculateTargetBid(price, targetAcos, cvr) {
    const p = parseFloat(price) || 29.99;
    const a = (parseFloat(targetAcos) || 30) / 100;
    const c = (parseFloat(cvr) || 10) / 100;

    const maxCpc = p * a * c;
    const baseBid = maxCpc * 0.7;
    const topPlacementPercent = 45;

    return {
      maxCpc: parseFloat(maxCpc.toFixed(2)),
      suggestedBaseBid: parseFloat(baseBid.toFixed(2)),
      suggestedTopPlacementPercent: topPlacementPercent,
      targetRoas: a > 0 ? parseFloat((1 / a).toFixed(2)) : 3.33,
      formula: `US$${p} × ${a * 100}% × ${c * 100}%`
    };
  }
};

if (typeof window !== 'undefined') {
  window.XiaolinAnalyzer = XiaolinAnalyzer;
}
