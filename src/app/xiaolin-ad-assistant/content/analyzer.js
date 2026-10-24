/**
 * 晓林广告助手 - 广告核心诊断与算法分析引擎 (v1.3.0 精准对齐增强版)
 * 技术支持：曹晓林 13575948278
 */

const XiaolinAnalyzer = {
  /**
   * 诊断单个关键词/搜索词/广告活动数据行
   * @param {Object} row - { keyword, matchType, spend, sales, orders, clicks, impressions, acos, roas, cpc, bid, suggestedBidVal, tableType }
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

    // 降价止损策略：'smooth' (平滑阶梯调价) | 'breakeven' (一步到位保本倒推)
    const bidStrategy = settings.bidStrategy || 'smooth';
    const stepDownMode = settings.stepDownMode || 'percent'; // 'percent' (比例) | 'amount' (固定金额)
    const stepDownDir = settings.stepDownDir || 'down';       // 'down' (降低) | 'up' (升高)
    const stepDownPercent = !isNaN(parseFloat(settings.stepDownPercent)) ? parseFloat(settings.stepDownPercent) : 10;
    const stepDownAmount = !isNaN(parseFloat(settings.stepDownAmount)) ? parseFloat(settings.stepDownAmount) : 0.02;
    const stepUpPercent = !isNaN(parseFloat(settings.stepUpPercent)) ? parseFloat(settings.stepUpPercent) : 10;

    // 曝光激活策略参数
    const lowImpThreshold = !isNaN(parseInt(settings.boostMaxImpressions, 10)) ? parseInt(settings.boostMaxImpressions, 10) : 5;
    const boostMode = settings.boostMode || 'percent';
    const boostDir = settings.boostDir || 'up';
    const boostPercent = !isNaN(parseFloat(settings.boostPercent)) ? parseFloat(settings.boostPercent) : 10;
    const boostAmount = !isNaN(parseFloat(settings.boostAmount)) ? parseFloat(settings.boostAmount) : 0.02;

    const harvestOrders = parseInt(settings.harvestMinOrders, 10) || 2;
    const productPrice = parseFloat(settings.productPrice) || 29.99;
    const cvr = (parseFloat(settings.cvrEstimate) || 10) / 100;

    const spend = parseFloat(row.spend) || 0;
    const sales = parseFloat(row.sales) || 0;
    const orders = parseInt(row.orders, 10) || 0;
    const clicks = parseInt(row.clicks, 10) || 0;
    const impressions = !isNaN(parseInt(row.impressions, 10)) ? parseInt(row.impressions, 10) : 0;
    const currentBid = parseFloat(row.bid) || 0;
    const suggestedBidVal = parseFloat(row.suggestedBidVal) || 0;

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

    const currentCpc = parseFloat(row.cpc) || (clicks > 0 ? spend / clicks : 0);
    // 优先使用真实抓取到的竞价 (currentBid)，其次 CPC，再其次建议竞价，最后保底 1.0
    const basePrice = currentBid > 0
      ? currentBid
      : (currentCpc > 0 ? currentCpc : (suggestedBidVal > 0 ? suggestedBidVal : 1.0));

    // 计算通用降价建议值（供高花费0转化与高ACoS共同使用，确保降价止损面板所有卡片均支持原竞价->建议竞价自定义修改）
    const calcReducedBid = () => {
      if (bidStrategy === 'smooth') {
        const isUp = stepDownDir === 'up';
        if (stepDownMode === 'amount') {
          const diff = Math.abs(stepDownAmount);
          const target = isUp ? (basePrice + diff) : Math.max(0.05, basePrice - diff);
          const label = isUp
            ? `建议微调提价 +$${diff.toFixed(2)} 至 US$${target.toFixed(2)}`
            : `建议微调降价 -$${diff.toFixed(2)} 至 US$${target.toFixed(2)}`;
          return { suggestedBid: parseFloat(target.toFixed(2)), actionLabel: label };
        } else {
          const target = isUp
            ? (basePrice * (1 + (stepDownPercent / 100)))
            : Math.max(0.05, basePrice * (1 - (stepDownPercent / 100)));
          const label = isUp
            ? `建议微调提价 +${stepDownPercent}% 至 US$${target.toFixed(2)}`
            : `建议平滑降价 -${stepDownPercent}% 至 US$${target.toFixed(2)}`;
          return { suggestedBid: parseFloat(target.toFixed(2)), actionLabel: label };
        }
      } else {
        let ratio = 0.5;
        if (currentAcos && currentAcos > 0) {
          ratio = targetAcos / currentAcos;
        } else if (currentRoas && currentRoas > 0) {
          ratio = currentRoas / targetRoas;
        }
        const target = Math.max(0.05, basePrice * Math.min(0.85, Math.max(0.2, ratio)));
        return {
          suggestedBid: parseFloat(target.toFixed(2)),
          actionLabel: `建议保本降价至 US$${target.toFixed(2)}`
        };
      }
    };

    // 1. 紧急：高花费0转化 (严重吃预算，同时提供降价建议值与一键否定)
    if (spend >= maxSpendZero && orders === 0) {
      const reduced = calcReducedBid();
      return {
        type: 'CRITICAL_BLEED',
        level: 'danger',
        badge: '🛑 高花费0转化',
        title: '严重吃预算词！立即止血',
        description: `已花费 US$${spend.toFixed(2)} (${clicks}次点击)，0次成交！建议大幅降价或精准否定。`,
        actionText: `精准否定 或 ${reduced.actionLabel}`,
        actionType: 'NEGATE_EXACT',
        originalBid: basePrice,
        suggestedBid: reduced.suggestedBid,
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
      const reduced = calcReducedBid();
      const metricDisplay = currentAcos !== null
        ? `ACoS ${currentAcos.toFixed(1)}%`
        : `ROAS ${currentRoas.toFixed(2)}`;
      const isExtreme = isAcosSevere || isRoasSevere;

      return {
        type: 'HIGH_ACOS',
        level: isExtreme ? 'danger' : 'warning',
        badge: isExtreme ? `🛑 ${metricDisplay} 爆表` : `⚠️ ${metricDisplay} 超标`,
        title: isExtreme ? '巨额亏损！广告费超过销售额' : '转化成本过高，侵蚀利润',
        description: `已产生 ${orders} 单，但 ${metricDisplay}（目标线：ACoS ${targetAcos}% / ROAS ${targetRoas.toFixed(2)}）。`,
        actionText: reduced.actionLabel,
        actionType: 'REDUCE_BID',
        originalBid: basePrice,
        suggestedBid: reduced.suggestedBid,
        keyword: row.keyword
      };
    }

    // 3. 机会：高转化黄金词 (出单好，小幅提价冲排名)
    const isHealthyAcos = currentAcos !== null && currentAcos <= targetAcos * 1.15;
    const isHealthyRoas = currentRoas !== null && currentRoas >= targetRoas * 0.9;
    const isHealthy = metricMode === 'roas' ? isHealthyRoas : isHealthyAcos;

    if (orders >= harvestOrders && (sales > 0 && isHealthy)) {
      const suggestedExactBid = Math.max(basePrice * (1 + (stepUpPercent / 100)), productPrice * (targetAcos / 100) * cvr);
      const metricDisplay = currentAcos !== null ? `ACoS ${currentAcos.toFixed(1)}%` : `ROAS ${currentRoas.toFixed(2)}`;

      return {
        type: 'GOLDEN_WINNER',
        level: 'success',
        badge: '🚀 高转化黄金词',
        title: '优质盈利词！建议重点倾斜',
        description: `稳定成交 ${orders} 单，${metricDisplay}，表现非常优秀！`,
        actionText: `建议微调提价 +${stepUpPercent}% 抢首位曝光：US$${suggestedExactBid.toFixed(2)}`,
        actionType: 'HARVEST_EXACT',
        originalBid: basePrice,
        suggestedBid: parseFloat(suggestedExactBid.toFixed(2)),
        keyword: row.keyword
      };
    }

    // 4. 优化：曝光极度受限 (包含 0 曝光 "—" 以及展示量 <= 门槛的关键词，绝不误判 570、77 等高曝光词)
    const isCampaignRow = row.tableType === 'campaign' || row.tableType === 'adgroup';
    if (!isCampaignRow && impressions >= 0 && impressions <= lowImpThreshold && spend < 5 && clicks <= 2 && orders === 0) {
      const isBoostUp = boostDir !== 'down';
      let boostedBid = basePrice;
      let boostActionLabel = '';
      if (boostMode === 'amount') {
        const diff = Math.abs(boostAmount);
        boostedBid = isBoostUp ? (basePrice + diff) : Math.max(0.05, basePrice - diff);
        boostActionLabel = `建议微调${isBoostUp ? '提价 +' : '降价 -'}$${diff.toFixed(2)} 至 US$${boostedBid.toFixed(2)}`;
      } else {
        boostedBid = isBoostUp ? (basePrice * (1 + boostPercent / 100)) : Math.max(0.05, basePrice * (1 - boostPercent / 100));
        boostActionLabel = `建议微调${isBoostUp ? '提价 +' : '降价 -'}${boostPercent}% 至 US$${boostedBid.toFixed(2)}`;
      }

      return {
        type: 'LOW_IMPRESSION',
        level: 'info',
        badge: '💤 曝光不足',
        title: '展示量极低，出价受限',
        description: `当前展示量仅 ${impressions} 次，出价可能低于当前市场竞价门槛。`,
        actionText: boostActionLabel,
        actionType: 'INCREASE_BID_SMALL',
        originalBid: basePrice,
        suggestedBid: parseFloat(Math.max(0.05, boostedBid).toFixed(2)),
        keyword: row.keyword
      };
    }

    // 5. 表现正常
    return {
      type: 'HEALTHY',
      level: 'normal',
      badge: '✅ 表现正常',
      title: '指标健康稳定',
      description: `展示 ${impressions} 次, 花费 US$${spend.toFixed(2)}, 出单 ${orders} 单, ACoS: ${currentAcos !== null ? currentAcos.toFixed(1) + '%' : '-'}`,
      actionText: '维持观察',
      actionType: 'NONE',
      originalBid: basePrice,
      suggestedBid: basePrice,
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
