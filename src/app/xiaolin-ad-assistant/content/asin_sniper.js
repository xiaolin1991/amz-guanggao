/**
 * 晓林广告助手 - 弱势竞品 ASIN 狙击截流模块 (v1.2.0 升级版)
 * 技术支持：曹晓林 13575948278
 */

const XiaolinAsinSniper = {
  /**
   * 扫描当前搜索结果页面中的竞品商品卡片 (自动去重)
   */
  scanCompetitors(settings) {
    const benchmarkPrice = settings.productPrice || 29.99;
    const items = document.querySelectorAll('[data-asin]:not([data-asin=""])');
    const weakList = [];
    const seenAsins = new Set(); // 防止重复抓取同一 ASIN

    items.forEach(el => {
      const asin = el.getAttribute('data-asin');
      if (!asin || asin.length !== 10) return;
      if (seenAsins.has(asin)) return; // 去重

      // 提取评分 (例如 "3.6 out of 5 stars" 或 "3.6 颗星")
      const ratingEl = el.querySelector('.a-icon-alt, [aria-label*="stars"], [aria-label*="星"]');
      let rating = null;
      if (ratingEl) {
        const text = ratingEl.textContent || ratingEl.getAttribute('aria-label') || '';
        const match = text.match(/([0-9.]+)\s*(out of|颗星|\/)/i);
        if (match) rating = parseFloat(match[1]);
      }

      // 提取价格
      const priceWhole = el.querySelector('.a-price-whole');
      const priceFraction = el.querySelector('.a-price-fraction');
      let price = null;
      if (priceWhole) {
        const whole = priceWhole.textContent.replace(/[^0-9]/g, '');
        const frac = priceFraction ? priceFraction.textContent.replace(/[^0-9]/g, '') : '00';
        price = parseFloat(`${whole}.${frac}`);
      }

      // 提取标题
      const titleEl = el.querySelector('h2 a span, h2 span, .a-size-medium');
      const title = titleEl ? titleEl.textContent.trim() : 'Amazon 商品';

      // 判定弱势竞品逻辑：
      // 条件 A: 评分低于 3.9 星 (差评多，买家容易动摇)
      // 条件 B: 售价高于自己的基准价 15% 以上 (你的价格优势明显)
      const isLowRating = rating !== null && rating <= 3.8;
      const isHighPrice = price !== null && price >= benchmarkPrice * 1.15;

      if (isLowRating || isHighPrice) {
        seenAsins.add(asin);

        const reason = isLowRating && isHighPrice 
          ? `评分仅 ${rating}星 且 售价 $${price} 偏高`
          : (isLowRating ? `差评多 (评分仅 ${rating}星)` : `售价 $${price} 显著高于您的标价`);

        weakList.push({
          asin,
          title,
          rating: rating !== null ? rating : '未知',
          price: price !== null ? `$${price}` : '未知',
          reason,
          detailUrl: `https://www.amazon.com/dp/${asin}`
        });

        // 在前台商品卡片上打上视觉标记
        this.markProductElement(el, asin, reason);
      }
    });

    return weakList;
  },

  /**
   * 在前台商品卡片上打上“晓林弱势竞品”标记
   */
  markProductElement(el, asin, reason) {
    if (el.querySelector('.xl-weak-asin-badge')) return;

    const badge = document.createElement('div');
    badge.className = 'xl-weak-asin-badge';
    badge.innerHTML = `
      <span class="xl-badge-icon">🎯</span>
      <span class="xl-badge-text">晓林弱势竞品: ${reason}</span>
      <a href="https://www.amazon.com/dp/${asin}" target="_blank" class="xl-badge-link" title="在新标签打开该商品详情页">🔗 详情</a>
    `;

    badge.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') return;
      e.stopPropagation();
      e.preventDefault();
      navigator.clipboard.writeText(asin).then(() => {
        const textSpan = badge.querySelector('.xl-badge-text');
        textSpan.textContent = `✅ 已复制 ASIN: ${asin}`;
        setTimeout(() => {
          textSpan.textContent = `晓林弱势竞品: ${reason}`;
        }, 2000);
      });
    });

    const targetPos = el.querySelector('h2') || el.firstChild;
    if (targetPos) {
      targetPos.parentNode.insertBefore(badge, targetPos);
    }
  }
};

if (typeof window !== 'undefined') {
  window.XiaolinAsinSniper = XiaolinAsinSniper;
}
