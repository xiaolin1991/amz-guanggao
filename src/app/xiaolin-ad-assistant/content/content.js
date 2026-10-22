/**
 * 晓林广告助手 - 主注入内容脚本 (v1.3.0 自动抓取 & 极简居中版)
 * 技术支持：曹晓林 13575948278
 */

(function () {
  if (window.__XIAOLIN_AD_ASSISTANT_INJECTED__) return;
  window.__XIAOLIN_AD_ASSISTANT_INJECTED__ = true;

  // 全局配置缓存 (默认亮色主题，默认开启自动监控，默认平滑降价 15%，默认1.5s气泡提示)
  let currentSettings = {
    isEnabled: true,         // 助手总开关 (true: 开启监控提醒, false: 暂停提醒)
    theme: 'light',          // 主题外观 ('light' 默认亮色 | 'dark' 暗黑极客)
    metricMode: 'acos',      // 'acos' | 'roas'
    bidStrategy: 'smooth',   // 'smooth' 平滑阶梯调价 | 'breakeven' 保本倒推
    silentMode: false,       // false: 1.5s 浮动 Toast 气泡 | true: 静默填入
    stepDownMode: 'percent', // 'percent' (比例) | 'amount' (固定金额)
    stepDownDir: 'down',     // 'down' (降低) | 'up' (升高)
    stepDownPercent: 10,     // 默认降 10%
    stepDownAmount: 0.02,    // 默认微调 $0.02
    stepUpPercent: 10,       // 默认升 10%
    boostMaxImpressions: 5,  // 低曝光门槛，默认展示量低于 5 次
    boostMode: 'percent',    // 'percent' (比例) | 'amount' (固定金额)
    boostDir: 'up',          // 'up' (升高) | 'down' (降低)
    boostPercent: 10,        // 低曝光词加价幅度，默认提价 10%
    boostAmount: 0.02,       // 默认加价 $0.02
    targetAcos: 30,
    highAcosThreshold: 55,
    targetRoas: 3.33,
    lowRoasThreshold: 1.82,
    maxSpendZeroOrder: 15,
    harvestMinOrders: 2,
    productPrice: 29.99,
    profitMargin: 40,
    cvrEstimate: 10,
    aiApiKey: '',
    aiApiUrl: 'https://api.deepseek.com/v1/chat/completions',
    aiModel: 'deepseek-chat'
  };

  // 读取持久化配置
  chrome.storage.local.get(['adSettings'], (result) => {
    if (result.adSettings) {
      currentSettings = { ...currentSettings, ...result.adSettings };
      if (!result.adSettings.theme) currentSettings.theme = 'light';
      if (result.adSettings.isEnabled === undefined) currentSettings.isEnabled = true;
      if (result.adSettings.bidStrategy === undefined) currentSettings.bidStrategy = 'smooth';
      if (result.adSettings.silentMode === undefined) currentSettings.silentMode = false;
      if (result.adSettings.boostMaxImpressions === undefined) currentSettings.boostMaxImpressions = 5;
      if (result.adSettings.boostMode === undefined) currentSettings.boostMode = 'percent';
      if (result.adSettings.boostDir === undefined) currentSettings.boostDir = 'up';
      if (result.adSettings.boostPercent === undefined) currentSettings.boostPercent = 10;
      if (result.adSettings.boostAmount === undefined) currentSettings.boostAmount = 0.02;
      if (result.adSettings.stepDownMode === undefined) currentSettings.stepDownMode = 'percent';
      if (result.adSettings.stepDownDir === undefined) currentSettings.stepDownDir = 'down';
      if (result.adSettings.stepDownPercent === undefined) currentSettings.stepDownPercent = 10;
      if (result.adSettings.stepDownAmount === undefined) currentSettings.stepDownAmount = 0.02;
    }
    initXiaolinAssistant();
  });

  // 监听配置更新消息
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'settingsUpdated' && request.settings) {
      currentSettings = { ...currentSettings, ...request.settings };
      applyThemeAndStatus();
      if (currentSettings.isEnabled) {
        scanAndAnnotateTables();
      } else {
        removeAllInlineBadges();
      }
      refreshBidCalculation();
    }
  });

  // ==========================================
  // 1. 初始化入口与全自动触发
  // ==========================================
  function initXiaolinAssistant() {
    createFloatingLauncher();
    createFloatingPanel();
    applyThemeAndStatus();

    // 核心改进：全自动多频次检测触发 (无需手动点击“重新扫描”)
    const autoScanDelays = [400, 1000, 2000, 3500];
    autoScanDelays.forEach(delay => {
      setTimeout(() => {
        if (currentSettings.isEnabled) {
          scanAndAnnotateTables();
        }
      }, delay);
    });

    // 页面加载 2.2 秒后自动执行一次全表静默快扫 (捕获虚拟滚动全部 50~100 个词)
    setTimeout(() => {
      if (currentSettings.isEnabled) {
        fastScanFullTable();
      }
    }, 2200);

    // 自动扫描前台弱势竞品 (如果在前台搜索页)
    if (window.location.hostname.includes('amazon.') && window.location.pathname.includes('/s')) {
      setTimeout(() => {
        XiaolinAsinSniper.scanCompetitors(currentSettings);
      }, 1500);
    }

    // 监听 DOM 变化以适配动态异步加载的表格数据 (自动实时抓取)
    const observer = new MutationObserver(debounce(() => {
      if (currentSettings.isEnabled) {
        scanAndAnnotateTables();
      }
    }, 600));

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ==========================================
  // 2. 悬浮窗启动球 (支持自由拖拽移动 + 位置记忆 + 点击展开)
  // ==========================================
  function createFloatingLauncher() {
    if (document.getElementById('xl-floating-launcher')) return;

    const launcher = document.createElement('div');
    launcher.id = 'xl-floating-launcher';
    launcher.className = `xl-launcher-pill xl-theme-${currentSettings.theme}`;
    launcher.title = '晓林广告助手 (可拖拽移动，点击展开监控面板)';
    
    const logoUrl = chrome.runtime.getURL('assets/logo.png');
    launcher.innerHTML = `
      <img src="${logoUrl}" alt="晓林广告助手" class="xl-launcher-logo" draggable="false" />
      <span class="xl-launcher-badge" id="xl-launcher-alert-count">0</span>
    `;

    // 恢复历史拖拽保存的位置 (防止遮挡表格)
    try {
      const savedPos = JSON.parse(localStorage.getItem('xl_launcher_pos') || 'null');
      if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
        const maxLeft = Math.max(10, window.innerWidth - 58);
        const maxTop = Math.max(10, window.innerHeight - 58);
        const validLeft = Math.min(Math.max(10, savedPos.left), maxLeft);
        const validTop = Math.min(Math.max(10, savedPos.top), maxTop);
        launcher.style.setProperty('left', validLeft + 'px', 'important');
        launcher.style.setProperty('top', validTop + 'px', 'important');
        launcher.style.setProperty('right', 'auto', 'important');
        launcher.style.setProperty('bottom', 'auto', 'important');
      }
    } catch (e) {}

    // 实现自由流畅拖拽交互 (精准区分拖动与点击)
    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    launcher.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // 仅左键拖拽
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;

      const rect = launcher.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      launcher.style.setProperty('transition', 'none', 'important');
      launcher.classList.add('xl-launcher-dragging');

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
          hasMoved = true;
        }

        if (hasMoved) {
          const maxLeft = window.innerWidth - launcher.offsetWidth - 10;
          const maxTop = window.innerHeight - launcher.offsetHeight - 10;
          const newLeft = Math.min(Math.max(10, initialLeft + dx), maxLeft);
          const newTop = Math.min(Math.max(10, initialTop + dy), maxTop);

          launcher.style.setProperty('left', newLeft + 'px', 'important');
          launcher.style.setProperty('top', newTop + 'px', 'important');
          launcher.style.setProperty('right', 'auto', 'important');
          launcher.style.setProperty('bottom', 'auto', 'important');
        }
      };

      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        launcher.classList.remove('xl-launcher-dragging');
        launcher.style.removeProperty('transition');

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (hasMoved) {
          // 持久化保存拖动后的位置
          const finalRect = launcher.getBoundingClientRect();
          try {
            localStorage.setItem('xl_launcher_pos', JSON.stringify({
              left: Math.round(finalRect.left),
              top: Math.round(finalRect.top)
            }));
          } catch (e) {}

          // 在当前点击事件周期结束后重置 hasMoved，确保后续点击能正常展开面板
          setTimeout(() => {
            hasMoved = false;
          }, 80);
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // 点击事件：若发生了拖拽移动则阻止面板展开
    launcher.addEventListener('click', (e) => {
      if (hasMoved) {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      openFloatingPanel();
    });

    document.body.appendChild(launcher);
  }

  // ==========================================
  // 3. 悬浮主面板 (靠右侧居中显示)
  // ==========================================
  function createFloatingPanel() {
    if (document.getElementById('xl-floating-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'xl-floating-panel';
    panel.className = `xl-panel-container xl-theme-${currentSettings.theme} xl-panel-hidden`;

    const logoUrl = chrome.runtime.getURL('assets/logo.png');
    const wechatQrUrl = chrome.runtime.getURL('assets/wechat_qr.jpg');
    const qqQrUrl = chrome.runtime.getURL('assets/qq_qr.jpg');

    panel.innerHTML = `
      <!-- 面板头部 -->
      <div class="xl-panel-header" id="xl-panel-header-drag">
        <div class="xl-brand">
          <img src="${logoUrl}" class="xl-brand-icon" />
          <div>
            <div class="xl-brand-title">晓林广告助手</div>
            <div class="xl-brand-sub">智能止血 · 实时诊断 · 竞价优化</div>
          </div>
        </div>

        <div class="xl-header-actions">
          <!-- 一键极速全表快扫按钮 (捕获未下拉数据) -->
          <button class="xl-btn-header-scan" id="xl-btn-fast-scan" title="极速扫描全表50~100个关键词数据 (包含未下拉的全部词)">
            ⚡ 快扫全表
          </button>

          <!-- 运行状态开关按钮 -->
          <button class="xl-btn-header-toggle ${currentSettings.isEnabled ? 'active' : 'paused'}" id="xl-btn-toggle-enable" title="点击可开启/暂停全页面诊断提醒">
            ${currentSettings.isEnabled ? '🟢 监控中' : '⏸️ 已暂停'}
          </button>
          
          <!-- 主题切换按钮 (亮色/暗黑) -->
          <button class="xl-btn-theme-switch" id="xl-btn-toggle-theme" title="切换浅色/暗黑主题">
            ${currentSettings.theme === 'light' ? '☀️ 亮色' : '🌙 暗黑'}
          </button>

          <button class="xl-btn-icon" id="xl-btn-minimize" title="最小化面板 (恢复右侧小悬浮球)">一</button>
          <button class="xl-btn-icon" id="xl-btn-close" title="关闭面板 (恢复右侧小悬浮球)">✕</button>
        </div>
      </div>

      <!-- 快捷标签栏 -->
      <div class="xl-tabs">
        <button class="xl-tab-item active" data-tab="tab-diag">🛑 降价止损</button>
        <button class="xl-tab-item" data-tab="tab-boost">💤 曝光激活</button>
        <button class="xl-tab-item" data-tab="tab-kw">🔍 下拉拓词</button>
        <button class="xl-tab-item" data-tab="tab-asin">🎯 竞品截流</button>
        <button class="xl-tab-item" data-tab="tab-bid">💰 竞价测算</button>
        <button class="xl-tab-item xl-tab-support" data-tab="tab-contact">👨‍💻 技术支持</button>
      </div>

      <!-- 面板主体内容 -->
      <div class="xl-panel-body">
        
        <!-- Tab 1: 实时诊断与止血 (支持批量降价与单条自定义) -->
        <div class="xl-tab-content active" id="pane-diag">
          <!-- 诊断指标切换条 (ACoS / ROAS) -->
          <div class="xl-metric-toggle-bar">
            <span class="xl-metric-toggle-title">核心监控指标偏好：</span>
            <div class="xl-toggle-group">
              <button class="xl-toggle-btn ${currentSettings.metricMode === 'acos' ? 'active' : ''}" id="xl-btn-mode-acos">ACoS 模式</button>
              <button class="xl-toggle-btn ${currentSettings.metricMode === 'roas' ? 'active' : ''}" id="xl-btn-mode-roas">ROAS 模式</button>
            </div>
          </div>

          <!-- 调价策略与提示方式切换条 -->
          <div class="xl-metric-toggle-bar" style="margin-top:-4px;">
            <span class="xl-metric-toggle-title">调价算法：</span>
            <div class="xl-toggle-group">
              <button class="xl-toggle-btn ${currentSettings.bidStrategy === 'smooth' ? 'active' : ''}" id="xl-btn-strat-smooth">平滑降价</button>
              <button class="xl-toggle-btn ${currentSettings.bidStrategy === 'breakeven' ? 'active' : ''}" id="xl-btn-strat-breakeven">保本倒推</button>
            </div>
            <span class="xl-metric-toggle-title" style="margin-left:6px;">提示：</span>
            <div class="xl-toggle-group">
              <button class="xl-toggle-btn ${!currentSettings.silentMode ? 'active' : ''}" id="xl-btn-prompt-toast">气泡</button>
              <button class="xl-toggle-btn ${currentSettings.silentMode ? 'active' : ''}" id="xl-btn-prompt-silent">🔕静默</button>
            </div>
          </div>

          <!-- 批量调幅控制器 (清晰双行结构，告别拥挤折行) -->
          <div class="xl-quick-adjust-bar" id="xl-diag-adjust-bar">
            <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:6px;">
              <span class="xl-adjust-label">批量调幅:</span>
              <div class="xl-toggle-group xl-toggle-sm">
                <button class="xl-toggle-btn ${currentSettings.stepDownMode !== 'amount' ? 'active' : ''}" id="xl-btn-diag-mode-pct" title="按百分比比例调价">% 比例</button>
                <button class="xl-toggle-btn ${currentSettings.stepDownMode === 'amount' ? 'active' : ''}" id="xl-btn-diag-mode-amt" title="按固定金额调价">$ 金额</button>
              </div>
              <div class="xl-toggle-group xl-toggle-sm">
                <button class="xl-toggle-btn ${currentSettings.stepDownDir !== 'up' ? 'active' : ''}" id="xl-btn-diag-dir-down" title="降低竞价">降低 ⬇</button>
                <button class="xl-toggle-btn ${currentSettings.stepDownDir === 'up' ? 'active' : ''}" id="xl-btn-diag-dir-up" title="升高竞价">升高 ⬆</button>
              </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
              <div class="xl-adjust-input-wrap">
                <span style="font-size:11px;color:#475569;font-weight:600;">调价数值:</span>
                <span id="xl-diag-adjust-prefix" style="font-weight:bold;color:#ef4444;">${currentSettings.stepDownMode === 'amount' ? '$' : ''}</span>
                <input type="number" id="xl-diag-adjust-val" value="${currentSettings.stepDownMode === 'amount' ? (currentSettings.stepDownAmount || 0.02) : (currentSettings.stepDownPercent || 10)}" step="${currentSettings.stepDownMode === 'amount' ? '0.01' : '1'}" min="0.01" style="width:72px;height:24px;" />
                <span id="xl-diag-adjust-unit" style="font-weight:bold;color:#ef4444;">${currentSettings.stepDownMode === 'amount' ? '' : '%'}</span>
              </div>
              <button class="xl-btn xl-btn-small xl-btn-primary" id="xl-btn-recalc-diag" style="padding:3px 14px;font-size:11px;font-weight:bold;" title="根据自定义设置重新计算所有建议竞价">⚡ 重新计算</button>
            </div>
          </div>

          <div class="xl-summary-banner">
            <div class="xl-summary-item danger">
              <div class="xl-sum-num" id="xl-sum-bleed-count">0</div>
              <div class="xl-sum-label">吃预算词 (建议否定)</div>
            </div>
            <div class="xl-summary-item warning">
              <div class="xl-sum-num" id="xl-sum-high-acos-count">0</div>
              <div class="xl-sum-label" id="xl-lbl-high-metric">ACoS 爆表词</div>
            </div>
            <div class="xl-summary-item success">
              <div class="xl-sum-num" id="xl-sum-golden-count">0</div>
              <div class="xl-sum-label">优质黄金词</div>
            </div>
          </div>

          <div class="xl-bulk-actions-bar">
            <button class="xl-btn xl-btn-bulk-bid" id="xl-btn-bulk-apply-bids">
              ⚡ 一键批量修改全部建议降价 (<span id="xl-bulk-bid-count">0</span> 个)
            </button>
            <button class="xl-btn xl-btn-danger" id="xl-btn-copy-bleeds">
              🛑 一键复制全部吃预算词（直接粘贴到否定投放）
            </button>
          </div>

          <div class="xl-diag-list" id="xl-diag-list-container">
            <div class="xl-empty-state">
              正在自动抓取后台广告表格...
            </div>
          </div>
        </div>

        <!-- Tab 2: 曝光激活 (低曝光提价与自动广告优化) -->
        <div class="xl-tab-content" id="pane-boost">
          <div class="xl-boost-settings-card">
            <div class="xl-boost-title">🚀 低曝光词与自动广告提价激活</div>
            <div class="xl-boost-desc">自动扫描展示量极低或自动广告受限的投放，按设定比例或金额批量调价，激活展现权重！</div>
            
            <div class="xl-quick-adjust-bar" id="xl-boost-adjust-bar" style="margin-bottom:0;padding:8px 10px;">
              <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:6px;font-size:11px;font-weight:600;">
                <div style="display:flex;align-items:center;gap:4px;">
                  <span>曝光门槛: 展示量 ≤</span>
                  <input type="number" id="xl-boost-max-impressions" value="${currentSettings.boostMaxImpressions || 5}" min="1" max="1000" style="width:48px;height:22px;border:1px solid #cbd5e1;border-radius:4px;text-align:center;font-weight:bold;" />
                  <span>次</span>
                </div>
                <div class="xl-toggle-group xl-toggle-sm">
                  <button class="xl-toggle-btn ${currentSettings.boostMode !== 'amount' ? 'active' : ''}" id="xl-btn-boost-mode-pct" title="按百分比调价">% 比例</button>
                  <button class="xl-toggle-btn ${currentSettings.boostMode === 'amount' ? 'active' : ''}" id="xl-btn-boost-mode-amt" title="按固定金额调价">$ 金额</button>
                </div>
                <div class="xl-toggle-group xl-toggle-sm">
                  <button class="xl-toggle-btn ${currentSettings.boostDir !== 'down' ? 'active' : ''}" id="xl-btn-boost-dir-up" title="升高竞价">升高 ⬆</button>
                  <button class="xl-toggle-btn ${currentSettings.boostDir === 'down' ? 'active' : ''}" id="xl-btn-boost-dir-down" title="降低竞价">降低 ⬇</button>
                </div>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
                <div class="xl-adjust-input-wrap">
                  <span style="font-size:11px;color:#475569;font-weight:600;">提价数值:</span>
                  <span id="xl-prefix-boost-val" style="font-weight:bold;color:#0284c7;">${currentSettings.boostMode === 'amount' ? '$' : ''}</span>
                  <input type="number" id="xl-boost-val" value="${currentSettings.boostMode === 'amount' ? (currentSettings.boostAmount || 0.02) : (currentSettings.boostPercent || 10)}" step="${currentSettings.boostMode === 'amount' ? '0.01' : '1'}" min="0.01" style="width:72px;height:24px;" />
                  <span id="xl-unit-boost-val" style="font-weight:bold;color:#0284c7;">${currentSettings.boostMode === 'amount' ? '' : '%'}</span>
                </div>
                <button class="xl-btn xl-btn-small xl-btn-primary" id="xl-btn-recalc-boost" style="padding:3px 14px;font-size:11px;font-weight:bold;">⚡ 重新计算</button>
              </div>
            </div>
          </div>

          <div class="xl-bulk-actions-bar">
            <button class="xl-btn xl-btn-bulk-boost" id="xl-btn-bulk-apply-boost">
              ⚡ 一键批量提高全部竞价 (<span id="xl-boost-count">0</span> 个)
            </button>
          </div>

          <div class="xl-diag-list" id="xl-boost-list-container">
            <div class="xl-empty-state">正在扫描低曝光词与自动广告投放...</div>
          </div>
        </div>

        <!-- Tab 2: 亚马逊下拉词挖掘 -->
        <div class="xl-tab-content" id="pane-kw">
          <div class="xl-input-row">
            <input type="text" id="xl-kw-input" class="xl-input" placeholder="输入核心词 (如: jade roller)" />
            <button class="xl-btn xl-btn-primary" id="xl-btn-fetch-kw">挖掘下拉词</button>
          </div>
          <div class="xl-progress-tip" id="xl-kw-progress" style="display:none;">正在查询亚马逊实时搜索补全接口...</div>

          <div class="xl-kw-results-header">
            <span>找到的高意向词 (<b id="xl-kw-count">0</b>)</span>
            <button class="xl-btn-small" id="xl-btn-copy-all-kws">复制全部词</button>
          </div>
          <div class="xl-kw-list" id="xl-kw-list-container">
            <div class="xl-empty-state">输入产品根词，即可自动批量抓取亚马逊买家真实搜索词。</div>
          </div>
        </div>

        <!-- Tab 3: 弱势竞品 ASIN 狙击 (带直接跳转详情页功能) -->
        <div class="xl-tab-content" id="pane-asin">
          <div class="xl-asin-guide-card">
            <div class="xl-asin-guide-title">🎯 弱势竞品截流说明</div>
            <div class="xl-asin-guide-desc">
              自动筛选评分低于 3.8 星或售价偏高的“软柿子”竞品。点击卡片右侧 <b>🔗 详情 ↗</b> 可直接打开该商品的亚马逊详情页！
            </div>
            <div class="xl-asin-search-box">
              <input type="text" id="xl-front-asin-search-input" class="xl-input" placeholder="输入产品词 (如: jade roller)" value="jade roller" />
              <button class="xl-btn xl-btn-primary" id="xl-btn-open-front-search" style="white-space:nowrap;">
                🚀 直达前台一键筛选
              </button>
            </div>
          </div>

          <div class="xl-actions-bar">
            <button class="xl-btn xl-btn-secondary" id="xl-btn-scan-asins">
              🔍 扫描当前页面商品卡片 (如果在前台搜索页系统会自动标记)
            </button>
          </div>

          <div class="xl-asin-results-header">
            <span>已筛选弱势竞品 (<b id="xl-asin-count">0</b>)</span>
            <button class="xl-btn-small" id="xl-btn-copy-asins">一键导出全部 ASIN</button>
          </div>
          <div class="xl-asin-list" id="xl-asin-list-container">
            <div class="xl-empty-state">如在广告后台，请在上方输入产品词并点击【直达前台一键筛选】。</div>
          </div>
        </div>

        <!-- Tab 4: 科学保本竞价与溢价测算 -->
        <div class="xl-tab-content" id="pane-bid">
          <div class="xl-bid-calc-box">
            <div class="xl-calc-row">
              <label>产品客单价 ($):</label>
              <input type="number" id="xl-calc-price" class="xl-calc-input" value="${currentSettings.productPrice}" step="0.1" />
            </div>
            <div class="xl-calc-row">
              <label>目标 ACoS (%):</label>
              <input type="number" id="xl-calc-acos" class="xl-calc-input" value="${currentSettings.targetAcos}" step="1" />
            </div>
            <div class="xl-calc-row">
              <label>预估转化率 CVR (%):</label>
              <input type="number" id="xl-calc-cvr" class="xl-calc-input" value="${currentSettings.cvrEstimate}" step="0.5" />
            </div>

            <div class="xl-calc-card">
              <div class="xl-calc-result-title">科学保本上限出价 (Max CPC)</div>
              <div class="xl-calc-big-num" id="xl-calc-max-cpc">$0.90</div>
              <div class="xl-calc-strategy">
                <b>💡 推荐投放策略：</b>
                <div style="margin-top:4px;">• 基础竞价设为: <span id="xl-calc-base-bid" style="color:#d97706;font-weight:bold;">$0.63</span></div>
                <div>• 对应保本 ROAS: <span id="xl-calc-target-roas" style="color:#0284c7;font-weight:bold;">3.33</span></div>
                <div>• 搜索结果顶部(首位)加价比例: <span style="color:#16a34a;font-weight:bold;">+45% ~ 60%</span></div>
                <div style="font-size:11px;color:#64748b;margin-top:4px;">(把预算锁定在首页顶部高转化位置，不浪费一分钱)</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 5: 技术支持 (定制专属页面) -->
        <div class="xl-tab-content" id="pane-contact">
          <div class="xl-support-panel">
            <div class="xl-support-tag">官方技术支持</div>
            <h3 class="xl-support-name">曹晓林</h3>
            
            <div class="xl-support-phone-bar">
              <span>📞 电话 / 微信同步：</span>
              <span class="xl-support-phone-val">13575948278</span>
              <button class="xl-btn-copy-small" id="xl-btn-copy-support-phone">复制</button>
            </div>

            <p class="xl-support-intro">
              如果您在广告调价、关键词设置、亚马逊改版适配上有任何疑问，或需要更多个性化功能，欢迎随时联系我！
            </p>

            <div class="xl-support-qr-row">
              <div class="xl-qr-box">
                <div class="xl-qr-img-frame">
                  <img src="${wechatQrUrl}" class="xl-qr-img" />
                </div>
                <div class="xl-qr-text">微信扫码直连</div>
              </div>

              <div class="xl-qr-box">
                <div class="xl-qr-img-frame">
                  <img src="${qqQrUrl}" class="xl-qr-img" />
                </div>
                <div class="xl-qr-text">QQ 扫码交流</div>
              </div>
            </div>

            <div class="xl-copyright">
              晓林广告助手 · 亚马逊大卖精细化运营武器
            </div>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(panel);
    initPanelEvents(panel);
  }

  // ==========================================
  // 4. 应用主题与开关状态
  // ==========================================
  function applyThemeAndStatus() {
    const panel = document.getElementById('xl-floating-panel');
    const launcher = document.getElementById('xl-floating-launcher');
    const btnToggleEnable = document.getElementById('xl-btn-toggle-enable');
    const btnToggleTheme = document.getElementById('xl-btn-toggle-theme');

    const theme = currentSettings.theme || 'light';
    const isEnabled = currentSettings.isEnabled !== false;

    // 更新面板类名
    if (panel) {
      panel.classList.remove('xl-theme-light', 'xl-theme-dark');
      panel.classList.add(`xl-theme-${theme}`);
    }

    // 更新启动球类名
    if (launcher) {
      launcher.classList.remove('xl-theme-light', 'xl-theme-dark');
      launcher.classList.add(`xl-theme-${theme}`);
      if (!isEnabled) {
        launcher.classList.add('xl-status-paused');
      } else {
        launcher.classList.remove('xl-status-paused');
      }
    }

    // 更新按钮状态文字
    if (btnToggleEnable) {
      if (isEnabled) {
        btnToggleEnable.className = 'xl-btn-header-toggle active';
        btnToggleEnable.textContent = '🟢 监控中';
      } else {
        btnToggleEnable.className = 'xl-btn-header-toggle paused';
        btnToggleEnable.textContent = '⏸️ 已暂停';
      }
    }

    if (btnToggleTheme) {
      btnToggleTheme.textContent = theme === 'light' ? '☀️ 亮色' : '🌙 暗黑';
    }

    // 更新指标模式按钮状态
    const btnAcosMode = document.getElementById('xl-btn-mode-acos');
    const btnRoasMode = document.getElementById('xl-btn-mode-roas');
    const lblHighMetric = document.getElementById('xl-lbl-high-metric');
    if (btnAcosMode && btnRoasMode) {
      if (currentSettings.metricMode === 'roas') {
        btnRoasMode.classList.add('active');
        btnAcosMode.classList.remove('active');
        if (lblHighMetric) lblHighMetric.textContent = 'ROAS 极低亏损词';
      } else {
        btnAcosMode.classList.add('active');
        btnRoasMode.classList.remove('active');
        if (lblHighMetric) lblHighMetric.textContent = 'ACoS 爆表词';
      }
    }

    // 更新调价算法按钮状态
    const btnStratSmooth = document.getElementById('xl-btn-strat-smooth');
    const btnStratBreakeven = document.getElementById('xl-btn-strat-breakeven');
    if (btnStratSmooth && btnStratBreakeven) {
      if (currentSettings.bidStrategy === 'breakeven') {
        btnStratBreakeven.classList.add('active');
        btnStratSmooth.classList.remove('active');
      } else {
        btnStratSmooth.classList.add('active');
        btnStratBreakeven.classList.remove('active');
      }
    }

    // 更新提示方式按钮状态
    const btnPromptToast = document.getElementById('xl-btn-prompt-toast');
    const btnPromptSilent = document.getElementById('xl-btn-prompt-silent');
    if (btnPromptToast && btnPromptSilent) {
      if (currentSettings.silentMode) {
        btnPromptSilent.classList.add('active');
        btnPromptToast.classList.remove('active');
      } else {
        btnPromptToast.classList.add('active');
        btnPromptSilent.classList.remove('active');
      }
    }
  }

  // ==========================================
  // 5. 大面板与悬浮球智能互斥联动
  // ==========================================
  function openFloatingPanel() {
    const panel = document.getElementById('xl-floating-panel');
    const launcher = document.getElementById('xl-floating-launcher');
    if (panel) {
      panel.classList.remove('xl-panel-hidden');
    }
    // 打开大面板时，右下角小悬浮球自动隐藏！
    if (launcher) {
      launcher.style.setProperty('display', 'none', 'important');
    }
  }

  function closeFloatingPanel() {
    const panel = document.getElementById('xl-floating-panel');
    const launcher = document.getElementById('xl-floating-launcher');
    if (panel) {
      panel.classList.add('xl-panel-hidden');
    }
    // 关闭大面板时，右下角小悬浮球自动恢复出现！
    if (launcher) {
      launcher.style.removeProperty('display');
    }
  }

  // ==========================================
  // 6. 面板事件交互绑定
  // ==========================================
  function initPanelEvents(panel) {
    // 最小化与关闭 -> 自动恢复右侧悬浮球
    panel.querySelector('#xl-btn-close').addEventListener('click', closeFloatingPanel);
    panel.querySelector('#xl-btn-minimize').addEventListener('click', closeFloatingPanel);

    // 运行开关切换 (开启/暂停提醒)
    const btnToggleEnable = panel.querySelector('#xl-btn-toggle-enable');

    function toggleEnableState() {
      currentSettings.isEnabled = !currentSettings.isEnabled;
      chrome.storage.local.set({ adSettings: currentSettings });
      applyThemeAndStatus();

      if (currentSettings.isEnabled) {
        scanAndAnnotateTables();
      } else {
        removeAllInlineBadges();
      }
    }

    if (btnToggleEnable) {
      btnToggleEnable.addEventListener('click', toggleEnableState);
    }

    // 一键极速全表快扫 (捕获未下拉虚拟列表数据)
    const btnFastScan = panel.querySelector('#xl-btn-fast-scan');
    if (btnFastScan) {
      btnFastScan.addEventListener('click', () => {
        fastScanFullTable(btnFastScan);
      });
    }

    // 主题切换 (亮色 / 暗黑)
    const btnToggleTheme = panel.querySelector('#xl-btn-toggle-theme');
    btnToggleTheme.addEventListener('click', () => {
      currentSettings.theme = currentSettings.theme === 'light' ? 'dark' : 'light';
      chrome.storage.local.set({ adSettings: currentSettings });
      applyThemeAndStatus();
    });

    // 选项卡切换
    const tabs = panel.querySelectorAll('.xl-tab-item');
    const panes = panel.querySelectorAll('.xl-tab-content');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetPane = panel.querySelector(`#pane-${tab.getAttribute('data-tab').replace('tab-', '')}`);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // 拖拽面板支持
    makeDraggable(panel, panel.querySelector('#xl-panel-header-drag'));

    // ACoS / ROAS 模式切换
    const btnAcosMode = panel.querySelector('#xl-btn-mode-acos');
    const btnRoasMode = panel.querySelector('#xl-btn-mode-roas');
    const lblHighMetric = panel.querySelector('#xl-lbl-high-metric');

    btnAcosMode.addEventListener('click', () => {
      currentSettings.metricMode = 'acos';
      btnAcosMode.classList.add('active');
      btnRoasMode.classList.remove('active');
      lblHighMetric.textContent = 'ACoS 爆表词';
      chrome.storage.local.set({ adSettings: currentSettings });
      if (currentSettings.isEnabled) scanAndAnnotateTables();
    });

    btnRoasMode.addEventListener('click', () => {
      currentSettings.metricMode = 'roas';
      btnRoasMode.classList.add('active');
      btnAcosMode.classList.remove('active');
      lblHighMetric.textContent = 'ROAS 极低亏损词';
      chrome.storage.local.set({ adSettings: currentSettings });
      if (currentSettings.isEnabled) scanAndAnnotateTables();
    });

    // 调价策略切换 (平滑 vs 保本)
    const btnStratSmooth = panel.querySelector('#xl-btn-strat-smooth');
    const btnStratBreakeven = panel.querySelector('#xl-btn-strat-breakeven');
    if (btnStratSmooth && btnStratBreakeven) {
      btnStratSmooth.addEventListener('click', () => {
        currentSettings.bidStrategy = 'smooth';
        applyThemeAndStatus();
        chrome.storage.local.set({ adSettings: currentSettings });
        showToast('已切换为平滑降价策略 (每次下调15%保住曝光)', 'info');
        if (currentSettings.isEnabled) scanAndAnnotateTables();
      });
      btnStratBreakeven.addEventListener('click', () => {
        currentSettings.bidStrategy = 'breakeven';
        applyThemeAndStatus();
        chrome.storage.local.set({ adSettings: currentSettings });
        showToast('已切换为保本倒推策略 (直接降至极限保本竞价)', 'info');
        if (currentSettings.isEnabled) scanAndAnnotateTables();
      });
    }

    // 批量调幅模式与方向切换 (比例 % vs 金额 $，降低 ⬇ vs 升高 ⬆)
    const btnDiagModePct = panel.querySelector('#xl-btn-diag-mode-pct');
    const btnDiagModeAmt = panel.querySelector('#xl-btn-diag-mode-amt');
    const btnDiagDirDown = panel.querySelector('#xl-btn-diag-dir-down');
    const btnDiagDirUp = panel.querySelector('#xl-btn-diag-dir-up');
    const diagAdjustPrefix = panel.querySelector('#xl-diag-adjust-prefix');
    const diagAdjustUnit = panel.querySelector('#xl-diag-adjust-unit');
    const diagAdjustVal = panel.querySelector('#xl-diag-adjust-val');
    const btnRecalcDiag = panel.querySelector('#xl-btn-recalc-diag');

    if (btnDiagModePct && btnDiagModeAmt) {
      btnDiagModePct.addEventListener('click', () => {
        currentSettings.stepDownMode = 'percent';
        btnDiagModePct.classList.add('active');
        btnDiagModeAmt.classList.remove('active');
        if (diagAdjustPrefix) diagAdjustPrefix.textContent = '';
        if (diagAdjustUnit) diagAdjustUnit.textContent = '%';
        if (diagAdjustVal) {
          diagAdjustVal.step = '1';
          diagAdjustVal.value = currentSettings.stepDownPercent || 10;
        }
        chrome.storage.local.set({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('已切换为按百分比调价！', 'info');
      });

      btnDiagModeAmt.addEventListener('click', () => {
        currentSettings.stepDownMode = 'amount';
        btnDiagModeAmt.classList.add('active');
        btnDiagModePct.classList.remove('active');
        if (diagAdjustPrefix) diagAdjustPrefix.textContent = '$';
        if (diagAdjustUnit) diagAdjustUnit.textContent = '';
        if (diagAdjustVal) {
          diagAdjustVal.step = '0.01';
          diagAdjustVal.value = currentSettings.stepDownAmount || 0.02;
        }
        chrome.storage.local.set({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('已切换为按固定金额调价！', 'info');
      });
    }

    if (btnDiagDirDown && btnDiagDirUp) {
      btnDiagDirDown.addEventListener('click', () => {
        currentSettings.stepDownDir = 'down';
        btnDiagDirDown.classList.add('active');
        btnDiagDirUp.classList.remove('active');
        chrome.storage.local.set({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('已设定为【降低 ⬇】竞价模式！', 'info');
      });

      btnDiagDirUp.addEventListener('click', () => {
        currentSettings.stepDownDir = 'up';
        btnDiagDirUp.classList.add('active');
        btnDiagDirDown.classList.remove('active');
        chrome.storage.local.set({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('已设定为【升高 ⬆】竞价模式！', 'info');
      });
    }

    if (btnRecalcDiag) {
      btnRecalcDiag.addEventListener('click', () => {
        const val = parseFloat(diagAdjustVal.value) || 0;
        if (currentSettings.stepDownMode === 'amount') {
          currentSettings.stepDownAmount = val;
        } else {
          currentSettings.stepDownPercent = val;
        }
        chrome.storage.local.set({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        const dirTxt = currentSettings.stepDownDir === 'up' ? '升高' : '降低';
        const unitTxt = currentSettings.stepDownMode === 'amount' ? `$${val.toFixed(2)}` : `${val}%`;
        showToast(`已按【${dirTxt} ${unitTxt}】重新测算建议竞价！`, 'info');
      });
    }

    // 曝光激活调价模式与方向切换
    const btnBoostModePct = panel.querySelector('#xl-btn-boost-mode-pct');
    const btnBoostModeAmt = panel.querySelector('#xl-btn-boost-mode-amt');
    const btnBoostDirUp = panel.querySelector('#xl-btn-boost-dir-up');
    const btnBoostDirDown = panel.querySelector('#xl-btn-boost-dir-down');
    const boostValInp = panel.querySelector('#xl-boost-val');
    const boostPrefixEl = panel.querySelector('#xl-prefix-boost-val');
    const boostUnitEl = panel.querySelector('#xl-unit-boost-val');
    const boostImpInp = panel.querySelector('#xl-boost-max-impressions');
    const btnRecalcBoost = panel.querySelector('#xl-btn-recalc-boost');

    if (btnBoostModePct && btnBoostModeAmt) {
      btnBoostModePct.addEventListener('click', () => {
        currentSettings.boostMode = 'percent';
        btnBoostModePct.classList.add('active');
        btnBoostModeAmt.classList.remove('active');
        if (boostPrefixEl) boostPrefixEl.textContent = '';
        if (boostUnitEl) boostUnitEl.textContent = '%';
        if (boostValInp) {
          boostValInp.step = '1';
          boostValInp.value = currentSettings.boostPercent || 10;
        }
        chrome.storage.local.set({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('已切换为按百分比调价曝光！', 'info');
      });

      btnBoostModeAmt.addEventListener('click', () => {
        currentSettings.boostMode = 'amount';
        btnBoostModeAmt.classList.add('active');
        btnBoostModePct.classList.remove('active');
        if (boostPrefixEl) boostPrefixEl.textContent = '$';
        if (boostUnitEl) boostUnitEl.textContent = '';
        if (boostValInp) {
          boostValInp.step = '0.01';
          boostValInp.value = currentSettings.boostAmount || 0.02;
        }
        chrome.storage.local.set({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('已切换为按固定金额调价曝光！', 'info');
      });
    }

    if (btnBoostDirUp && btnBoostDirDown) {
      btnBoostDirUp.addEventListener('click', () => {
        currentSettings.boostDir = 'up';
        btnBoostDirUp.classList.add('active');
        btnBoostDirDown.classList.remove('active');
        chrome.storage.local.set({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('曝光激活：已设定为【升高 ⬆】模式！', 'info');
      });

      btnBoostDirDown.addEventListener('click', () => {
        currentSettings.boostDir = 'down';
        btnBoostDirDown.classList.add('active');
        btnBoostDirUp.classList.remove('active');
        chrome.storage.local.set({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('曝光激活：已设定为【降低 ⬇】模式！', 'info');
      });
    }

    if (btnRecalcBoost) {
      btnRecalcBoost.addEventListener('click', () => {
        if (boostImpInp) currentSettings.boostMaxImpressions = parseInt(boostImpInp.value, 10) || 5;
        const val = parseFloat(boostValInp.value) || 0;
        if (currentSettings.boostMode === 'amount') {
          currentSettings.boostAmount = val;
        } else {
          currentSettings.boostPercent = val;
        }
        chrome.storage.local.set({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        const dirTxt = currentSettings.boostDir === 'down' ? '降低' : '升高';
        const unitTxt = currentSettings.boostMode === 'amount' ? `$${val.toFixed(2)}` : `${val}%`;
        showToast(`曝光激活：已按【${dirTxt} ${unitTxt}】重新测算！`, 'info');
      });
    }

    // 执行提示方式切换 (气泡 vs 静默)
    const btnPromptToast = panel.querySelector('#xl-btn-prompt-toast');
    const btnPromptSilent = panel.querySelector('#xl-btn-prompt-silent');
    if (btnPromptToast && btnPromptSilent) {
      btnPromptToast.addEventListener('click', () => {
        currentSettings.silentMode = false;
        applyThemeAndStatus();
        chrome.storage.local.set({ adSettings: currentSettings });
        showToast('已开启执行提示：填入出价后将弹出1.5秒轻量气泡', 'info');
      });
      btnPromptSilent.addEventListener('click', () => {
        currentSettings.silentMode = true;
        applyThemeAndStatus();
        chrome.storage.local.set({ adSettings: currentSettings });
        showToast('已开启静默执行：点击建议直接填入，不再弹出气泡', 'info');
      });
    }

    // 重新扫描按钮 (若页面中存在)
    const btnRescan = panel.querySelector('#xl-btn-rescan');
    if (btnRescan) {
      btnRescan.addEventListener('click', () => {
        if (!currentSettings.isEnabled) {
          currentSettings.isEnabled = true;
          chrome.storage.local.set({ adSettings: currentSettings });
          applyThemeAndStatus();
        }
        scanAndAnnotateTables();
      });
    }

    // 一键复制全部吃预算词
    panel.querySelector('#xl-btn-copy-bleeds').addEventListener('click', () => {
      const bleedBadges = document.querySelectorAll('.xl-inline-badge.xl-badge-danger');
      const words = [];
      bleedBadges.forEach(b => {
        const kw = b.getAttribute('data-keyword');
        if (kw && !words.includes(kw)) words.push(kw);
      });

      if (words.length === 0) {
        showToast('当前页面未检测到严重吃预算词！', 'info');
        return;
      }

      navigator.clipboard.writeText(words.join('\n')).then(() => {
        showToast(`📋 已成功复制 ${words.length} 个吃预算词到剪贴板！`, 'success');
      });
    });

    // 下拉词挖掘事件
    const kwInput = panel.querySelector('#xl-kw-input');
    const btnFetchKw = panel.querySelector('#xl-btn-fetch-kw');
    const kwProgress = panel.querySelector('#xl-kw-progress');
    const kwListContainer = panel.querySelector('#xl-kw-list-container');
    const kwCountEl = panel.querySelector('#xl-kw-count');
    const btnCopyAllKws = panel.querySelector('#xl-btn-copy-all-kws');

    btnFetchKw.addEventListener('click', async () => {
      const seed = kwInput.value.trim();
      if (!seed) {
        showToast('请输入核心根词！', 'info');
        return;
      }

      kwProgress.style.display = 'block';
      kwListContainer.innerHTML = '<div class="xl-empty-state">正在拉取亚马逊实时官方下拉词库...</div>';

      const results = await XiaolinAutosuggest.expandDeepKeywords(seed, (msg) => {
        kwProgress.textContent = msg;
      });

      kwProgress.style.display = 'none';
      kwCountEl.textContent = results.length;

      if (results.length === 0) {
        kwListContainer.innerHTML = '<div class="xl-empty-state">未查询到相关下拉词，请尝试更换关键词。</div>';
        return;
      }

      kwListContainer.innerHTML = results.map(item => `
        <div class="xl-kw-item">
          <div class="xl-kw-text">${item.keyword}</div>
          <span class="xl-kw-tag">${item.intentType}</span>
          <button class="xl-btn-copy-one" data-kw="${item.keyword}">复制</button>
        </div>
      `).join('');

      kwListContainer.querySelectorAll('.xl-btn-copy-one').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const kw = e.target.getAttribute('data-kw');
          navigator.clipboard.writeText(kw).then(() => {
            e.target.textContent = '已复制';
            setTimeout(() => e.target.textContent = '复制', 1500);
          });
        });
      });
    });

    btnCopyAllKws.addEventListener('click', () => {
      const kwItems = kwListContainer.querySelectorAll('.xl-kw-text');
      const allKws = Array.from(kwItems).map(el => el.textContent.trim());
      if (allKws.length === 0) return;

      navigator.clipboard.writeText(allKws.join('\n')).then(() => {
        showToast(`📋 已复制 ${allKws.length} 个关键词到剪贴板！`, 'success');
      });
    });

    // 弱势 ASIN 狙击
    const frontSearchInput = panel.querySelector('#xl-front-asin-search-input');
    const btnOpenFrontSearch = panel.querySelector('#xl-btn-open-front-search');
    const btnScanAsins = panel.querySelector('#xl-btn-scan-asins');
    const asinListContainer = panel.querySelector('#xl-asin-list-container');
    const asinCountEl = panel.querySelector('#xl-asin-count');
    const btnCopyAsins = panel.querySelector('#xl-btn-copy-asins');

    btnOpenFrontSearch.addEventListener('click', () => {
      const kw = frontSearchInput.value.trim() || 'jade roller';
      const url = `https://www.amazon.com/s?k=${encodeURIComponent(kw)}`;
      window.open(url, '_blank');
    });

    btnScanAsins.addEventListener('click', () => {
      const weakList = XiaolinAsinSniper.scanCompetitors(currentSettings);
      asinCountEl.textContent = weakList.length;

      if (weakList.length === 0) {
        asinListContainer.innerHTML = `
          <div class="xl-empty-state">
            当前页面未检测到弱势竞品卡片。<br>
            提示：该功能需要在【亚马逊前台买家搜索页】使用，请点击上方【直达前台一键筛选】按钮！
          </div>
        `;
        return;
      }

      asinListContainer.innerHTML = weakList.map(item => `
        <div class="xl-asin-item">
          <div class="xl-asin-header">
            <div class="xl-asin-left">
              <span class="xl-asin-code" title="点击复制 ASIN">${item.asin}</span>
              <a href="${item.detailUrl}" target="_blank" class="xl-btn-asin-link" title="点击直接直达该商品的亚马逊详情页">
                🔗 详情 ↗
              </a>
            </div>
            <div class="xl-asin-right">
              <span class="xl-asin-rating">⭐ ${item.rating}</span>
              <span class="xl-asin-price">${item.price}</span>
            </div>
          </div>
          <div class="xl-asin-reason">${item.reason}</div>
          <div class="xl-asin-title" title="${item.title}">${item.title}</div>
        </div>
      `).join('');

      asinListContainer.querySelectorAll('.xl-asin-code').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', (e) => {
          const asin = e.target.textContent.trim();
          navigator.clipboard.writeText(asin).then(() => {
            const originText = e.target.textContent;
            e.target.textContent = '已复制!';
            setTimeout(() => e.target.textContent = originText, 1500);
          });
        });
      });
    });

    btnCopyAsins.addEventListener('click', () => {
      const asins = Array.from(asinListContainer.querySelectorAll('.xl-asin-code')).map(el => el.textContent.trim());
      if (asins.length === 0) {
        showToast('暂无可导出的弱势 ASIN！', 'info');
        return;
      }
      navigator.clipboard.writeText(asins.join('\n')).then(() => {
        showToast(`🎯 已成功复制 ${asins.length} 个弱势竞品 ASIN！`, 'success');
      });
    });

    // 动态竞价计算器联动
    const calcPrice = panel.querySelector('#xl-calc-price');
    const calcAcos = panel.querySelector('#xl-calc-acos');
    const calcCvr = panel.querySelector('#xl-calc-cvr');
    const calcMaxCpc = panel.querySelector('#xl-calc-max-cpc');
    const calcBaseBid = panel.querySelector('#xl-calc-base-bid');
    const calcTargetRoas = panel.querySelector('#xl-calc-target-roas');

    function refreshBidCalculation() {
      const p = parseFloat(calcPrice.value) || 29.99;
      const a = parseFloat(calcAcos.value) || 30;
      const c = parseFloat(calcCvr.value) || 10;

      const res = XiaolinAnalyzer.calculateTargetBid(p, a, c);
      calcMaxCpc.textContent = `$${res.maxCpc.toFixed(2)}`;
      calcBaseBid.textContent = `$${res.suggestedBaseBid.toFixed(2)}`;
      if (calcTargetRoas) calcTargetRoas.textContent = res.targetRoas.toFixed(2);
    }

    [calcPrice, calcAcos, calcCvr].forEach(inp => {
      inp.addEventListener('input', refreshBidCalculation);
    });
    refreshBidCalculation();

    // 复制支持电话
    panel.querySelector('#xl-btn-copy-support-phone').addEventListener('click', () => {
      navigator.clipboard.writeText('13575948278').then(() => {
        const btn = panel.querySelector('#xl-btn-copy-support-phone');
        btn.textContent = '已复制';
        setTimeout(() => btn.textContent = '复制', 1500);
      });
    });
  }

  function removeAllInlineBadges() {
    document.querySelectorAll('.xl-inline-badge').forEach(b => b.remove());
    const alertCountEl = document.getElementById('xl-launcher-alert-count');
    if (alertCountEl) alertCountEl.style.display = 'none';
  }

  // ==========================================
  // 7. 核心：全局持久化数据缓存池与跨容器表头对齐引擎
  // ==========================================

  // 全局行数据持久化缓存池 (彻底解决虚拟滚动 DOM 节点销毁导致关键词丢失的问题)
  const XiaolinRowStore = new Map();

  /**
   * 全局/局部动态表头探测与列映射解析引擎
   * 跨越不同容器，严格区分“关键词/广告活动/广告组”、“投放匹配类型”、“建议竞价”、“竞价”、“展示量”等列
   */
  function findTableColumnMapping(specificTable) {
    const colMap = {};
    let headerCells = [];

    // 0. 优先在当前行所在的父级表格内精准探测表头
    if (specificTable) {
      const thead = specificTable.querySelector('thead');
      if (thead) {
        const ths = Array.from(thead.querySelectorAll('th, [role="columnheader"]'));
        if (ths.length >= 3) headerCells = ths;
      }
      if (headerCells.length === 0) {
        const firstRow = specificTable.querySelector('tr, [role="row"]');
        if (firstRow) {
          const ths = Array.from(firstRow.querySelectorAll('th, [role="columnheader"]'));
          if (ths.length >= 3) headerCells = ths;
        }
      }
    }

    // 1. 全局寻找包含广告核心指标的表头行 (兼容广告活动/广告组/关键词/投放多层级页面)
    if (headerCells.length === 0) {
      const possibleHeaderRows = document.querySelectorAll('thead tr, [role="row"], .data-table-header-row, [data-testid*="header"]');
      for (const hRow of possibleHeaderRows) {
        const ths = Array.from(hRow.querySelectorAll('th, [role="columnheader"]'));
        if (ths.length >= 4) {
          const rowTxt = ths.map(t => t.textContent.trim().toLowerCase()).join(' ');
          if ((rowTxt.includes('关键词') || rowTxt.includes('keyword') || rowTxt.includes('targeting') || rowTxt.includes('投放') || rowTxt.includes('广告活动') || rowTxt.includes('campaign') || rowTxt.includes('广告组') || rowTxt.includes('ad group')) &&
              (rowTxt.includes('竞价') || rowTxt.includes('bid') || rowTxt.includes('展示') || rowTxt.includes('impression') || rowTxt.includes('预算') || rowTxt.includes('budget') || rowTxt.includes('花费') || rowTxt.includes('cost') || rowTxt.includes('spend'))) {
            headerCells = ths;
            break;
          }
        }
      }
    }

    // 兜底：获取页面所有可见的列头
    if (headerCells.length === 0) {
      const allThs = Array.from(document.querySelectorAll('th, [role="columnheader"]'));
      headerCells = allThs.filter(th => {
        const rect = th.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && !th.closest('[role="dialog"], [class*="calendar"], [class*="date-picker"]');
      });
    }

    if (headerCells.length > 0) {
      headerCells.forEach((th, idx) => {
        const rawTxt = th.textContent.replace(/\s+/g, ' ').trim().toLowerCase();

        // 实体名称: 包含关键词、广告活动名称、广告组名称、搜索词、商品投放等，严禁匹配到预算、竞价、建议、调整
        const isEntityName = (
          rawTxt.includes('广告活动') || rawTxt.includes('campaign') ||
          rawTxt.includes('广告组') || rawTxt.includes('ad group') ||
          rawTxt.includes('关键词') || rawTxt.includes('keyword') ||
          rawTxt.includes('搜索词') || rawTxt.includes('search term') ||
          rawTxt.includes('商品投放') || rawTxt.includes('商品') ||
          (rawTxt.includes('targeting') && !rawTxt.includes('match')) ||
          (rawTxt.includes('投放') && !rawTxt.includes('匹配') && !rawTxt.includes('类型'))
        ) && !rawTxt.includes('匹配') && !rawTxt.includes('建议') && !rawTxt.includes('预算') && !rawTxt.includes('竞价') && !rawTxt.includes('调整') && !rawTxt.includes('状态');

        if (isEntityName && colMap.keyword === undefined) {
          colMap.keyword = idx;
        }

        // 投放匹配类型
        if ((rawTxt.includes('匹配') || rawTxt.includes('match')) && colMap.matchType === undefined) {
          colMap.matchType = idx;
        }

        // 建议竞价 (必须包含建议)
        if ((rawTxt.includes('建议竞价') || rawTxt.includes('suggested bid') || (rawTxt.includes('建议') && rawTxt.includes('竞价'))) && colMap.suggestedBid === undefined) {
          colMap.suggestedBid = idx;
        }

        // 竞价 (严禁包含 '建议')
        if ((rawTxt.includes('竞价') || rawTxt.includes('bid')) && !rawTxt.includes('建议') && !rawTxt.includes('suggested') && colMap.bid === undefined) {
          colMap.bid = idx;
        }

        // 展示量 (包含 '展示量', 'impressions', '曝光', '展现')
        if ((rawTxt.includes('展示量') || rawTxt.includes('impression') || rawTxt.includes('曝光') || rawTxt.includes('展现')) && colMap.impressions === undefined) {
          colMap.impressions = idx;
        }

        // 点击量
        if ((rawTxt.includes('点击量') || rawTxt.includes('clicks') || (rawTxt.includes('点击') && !rawTxt.includes('每次点击'))) && colMap.clicks === undefined) {
          colMap.clicks = idx;
        }

        // 总成本
        if ((rawTxt.includes('总成本') || rawTxt.includes('花费') || rawTxt.includes('spend') || (rawTxt.includes('cost') && !rawTxt.includes('cpc'))) && colMap.spend === undefined) {
          colMap.spend = idx;
        }

        // CPC
        if ((rawTxt.includes('cpc') || rawTxt.includes('每次点击费用') || rawTxt.includes('每次点击')) && colMap.cpc === undefined) {
          colMap.cpc = idx;
        }

        // 购买量 / 订单量
        if ((rawTxt.includes('购买量') || rawTxt.includes('订单') || rawTxt.includes('orders') || rawTxt.includes('units')) && colMap.orders === undefined) {
          colMap.orders = idx;
        }

        // 销售额
        if ((rawTxt.includes('销售额') || rawTxt.includes('sales') || rawTxt.includes('收益')) && colMap.sales === undefined) {
          colMap.sales = idx;
        }

        // ACoS
        if ((rawTxt.includes('acos') || rawTxt.includes('产出比')) && colMap.acos === undefined) {
          colMap.acos = idx;
        }

        // ROAS
        if ((rawTxt.includes('roas') || rawTxt.includes('回报率')) && colMap.roas === undefined) {
          colMap.roas = idx;
        }
      });
    }

    return { colMap, headerCells };
  }

  /**
   * 严苛校验是否为真实合法的关键词/广告活动/广告组文本
   * 彻底杜绝把“建议竞价 US$1.17(...)”或“进行中 ⓘ”等状态枚举误当作实体名称
   */
  function isValidKeywordText(txt) {
    if (!txt || typeof txt !== 'string') return false;
    let trimmed = txt.replace(/[\u24d8\u2139ⓘ]/g, '').trim();
    if (trimmed.length < 2) return false;
    // 严禁包含货币符号或价格区间括号
    if (trimmed.includes('US$') || trimmed.includes('$') || trimmed.includes('€') || trimmed.includes('£') || trimmed.includes('￥')) return false;
    if (trimmed.includes('应用') || trimmed.includes('已应用')) return false;
    // 排除状态与匹配类型枚举词
    const invalidTokens = ['短语', '广泛', '精准', 'Phrase', 'Broad', 'Exact', '进行中', '已暂停', '超出预算', 'Auto', '自动', '启用', '已存档', '交付中', '正在投放'];
    if (invalidTokens.some(token => trimmed === token || trimmed.startsWith(token))) return false;
    return true;
  }

  /**
   * 自动寻找页面广告表格所在的滚动父容器
   */
  function findTableScrollContainer() {
    const table = document.querySelector('[role="grid"], [role="table"], table, .amz-ads-table');
    if (!table) return null;
    let p = table.parentElement;
    while (p && p !== document.body) {
      const style = window.getComputedStyle(p);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 40) {
        return p;
      }
      p = p.parentElement;
    }
    return document.documentElement || document.body;
  }

  /**
   * 一键极速全表快扫 (0.3秒分段滑行动画，彻底触发虚拟滚动渲染整页 50~100 个词)
   */
  function fastScanFullTable(btn) {
    if (btn) btn.innerHTML = '🔄 极速扫描中...';

    const container = findTableScrollContainer();
    if (!container || (container.scrollHeight <= container.clientHeight + 40)) {
      scanAndAnnotateTables();
      if (btn) {
        btn.innerHTML = `✅ 已扫描 ${XiaolinRowStore.size} 词`;
        setTimeout(() => { btn.innerHTML = '⚡ 快扫全表'; }, 2000);
      }
      return;
    }

    const originalScrollTop = container.scrollTop;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const steps = [0.25, 0.5, 0.75, 1.0];
    let curStep = 0;

    function doScrollSlice() {
      if (curStep < steps.length) {
        container.scrollTop = Math.floor(maxScroll * steps[curStep]);
        scanAndAnnotateTables();
        curStep++;
        setTimeout(doScrollSlice, 75);
      } else {
        container.scrollTop = originalScrollTop;
        scanAndAnnotateTables();
        if (btn) {
          btn.innerHTML = `✅ 已抓全 ${XiaolinRowStore.size} 词`;
          setTimeout(() => { btn.innerHTML = '⚡ 快扫全表'; }, 2000);
        }
        showToast(`🎉 极速全表扫描完成！共捕获 ${XiaolinRowStore.size} 个关键词数据。`, 'success');
      }
    }

    doScrollSlice();
  }

  /**
   * 挂载虚拟滚动容器滚动监听器 (滚动时自动增量捕获)
   */
  function setupTableScrollListener() {
    const container = findTableScrollContainer();
    if (container && !container.__xl_scroll_bound) {
      container.__xl_scroll_bound = true;
      container.addEventListener('scroll', debounce(() => {
        scanAndAnnotateTables();
      }, 120), { passive: true });
    }
  }

  /**
   * 点击 [🎯 定位] 按钮：平滑滚动定位到亚马逊后台对应行并对焦关键词施加醒目金色框框
   */
  function scrollToAndHighlightKeyword(keyword, rowId) {
    if (!keyword && !rowId) return;

    // 清洗关键词规范化比对文本 (去除空格、符号与特殊说明字符)
    const cleanTargetKw = (keyword || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');

    function findRowInDoc() {
      // 1. 优先按全局唯一分配的 rowId 绝对精准匹配
      if (rowId) {
        const byId = document.querySelector(`[data-xl-row-id="${rowId}"]`);
        if (byId) return byId;
      }
      // 2. 遍历所有行进行属性与文本对比
      const allRows = Array.from(document.querySelectorAll('tr, [role="row"], .data-table-row'));
      
      // 2.1 优先查找行上的 data-xl-kw 属性
      for (const r of allRows) {
        const rKw = r.getAttribute('data-xl-kw');
        if (rKw) {
          const cleanRKw = rKw.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
          if (cleanRKw && cleanTargetKw && (cleanRKw === cleanTargetKw || cleanRKw.includes(cleanTargetKw) || cleanTargetKw.includes(cleanRKw))) {
            return r;
          }
        }
      }
      
      // 2.2 遍历单元格文本模糊比对
      for (const r of allRows) {
        const rText = r.textContent.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
        if (cleanTargetKw && rText.includes(cleanTargetKw)) {
          return r;
        }
      }
      return null;
    }

    let targetRow = findRowInDoc();
    if (targetRow) {
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flashHighlightRow(targetRow, keyword);
      return;
    }

    // 2. 如果当前虚拟列表中未渲染该行，寻找表格滚动容器快速滑行定位
    const container = findTableScrollContainer();
    if (!container) {
      showToast(`未在当前页面视图中找到关键词【${keyword}】`, 'info');
      return;
    }

    const originalTop = container.scrollTop;
    const maxScroll = container.scrollHeight - container.clientHeight;
    let curr = 0;
    const step = 350;

    function searchInContainer() {
      let row = findRowInDoc();
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashHighlightRow(row, keyword);
      } else if (curr < maxScroll) {
        curr += step;
        container.scrollTop = curr;
        setTimeout(searchInContainer, 75);
      } else {
        container.scrollTop = originalTop;
        showToast(`未在当前页面视图中找到关键词【${keyword}】`, 'info');
      }
    }

    searchInContainer();
  }

  /**
   * 触发后台行整行高亮与关键词单元格醒目对焦框 (Focus Box)
   */
  function flashHighlightRow(row, kwText) {
    if (!row) return;

    // 清理全局之前存在的焦点高亮
    document.querySelectorAll('.xl-kw-cell-focused').forEach(el => el.classList.remove('xl-kw-cell-focused'));
    document.querySelectorAll('.xl-kw-focus-flag').forEach(el => el.remove());
    document.querySelectorAll('.xl-row-highlight-pulse').forEach(el => el.classList.remove('xl-row-highlight-pulse'));

    // 1. 给这一行所有的 td/th 添加整行柔和背景高亮 (彻底突破 table 无法直接给 tr 加 outline 的浏览器限制)
    const cells = Array.from(row.querySelectorAll('td, th, [role="cell"], [role="gridcell"], [role="rowheader"]'));
    cells.forEach(c => {
      c.classList.remove('xl-row-highlight-pulse');
      void c.offsetWidth; // 触发重绘
      c.classList.add('xl-row-highlight-pulse');
    });

    // 2. 锁定这一行真正的关键词单元格并添加超级醒目的对焦框 (Focus Box)
    let kwCell = row.querySelector('[data-xl-kw-cell="true"]');
    if (!kwCell) {
      // 兜底找包含名称链接或关键词文本的单元格
      const cleanKw = (kwText || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
      kwCell = cells.find(c => {
        const cText = c.textContent.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
        return c.querySelector('.kw-name, a, [title]') || (cleanKw && cText.includes(cleanKw.slice(0, 6)));
      }) || cells[1] || cells[0];
    }

    if (kwCell) {
      kwCell.classList.add('xl-kw-cell-focused');
      // 注入高亮光标指示标签
      if (!kwCell.querySelector('.xl-kw-focus-flag')) {
        const flag = document.createElement('span');
        flag.className = 'xl-kw-focus-flag';
        flag.innerHTML = '🎯 目标词';
        kwCell.appendChild(flag);
      }
    }

    // 3. 5.5 秒醒目提示后柔和淡出恢复
    clearTimeout(row.__xl_highlight_timer);
    row.__xl_highlight_timer = setTimeout(() => {
      cells.forEach(c => c.classList.remove('xl-row-highlight-pulse'));
      if (kwCell) {
        kwCell.classList.remove('xl-kw-cell-focused');
        const flag = kwCell.querySelector('.xl-kw-focus-flag');
        if (flag) flag.remove();
      }
    }, 5500);
  }

  /**
   * 核心表格扫描与行内注解主函数
   */
  function scanAndAnnotateTables() {
    if (!currentSettings.isEnabled) {
      removeAllInlineBadges();
      return;
    }

    // 动态探测全局表头
    const { colMap: defaultColMap, headerCells: defaultHeaders } = findTableColumnMapping();

    // 自动挂载虚拟滚动容器侦听器 (只要用户滑动即自动增量捕获)
    setupTableScrollListener();

    // 获取页面当前所有行
    const allRows = document.querySelectorAll('tr, [role="row"], .data-table-row, [data-testid*="table-row"]');

    allRows.forEach((row, rowIndex) => {
      // 严格排除日历、弹窗内部的行
      const modalParent = row.closest('[role="dialog"], [aria-modal="true"], [class*="calendar"], [class*="date-picker"], [class*="popover"], [class*="picker"]');
      if (modalParent) return;

      // 严格排除表头行 (仅当整行包含 columnheader 或处于 thead 时视为表头，绝不把含单一 rowheader 的内容行误判为表头)
      if (row.querySelector('[role="columnheader"]') || row.closest('thead')) return;
      if (row.querySelectorAll('th').length > 2 && row.querySelectorAll('td').length === 0) return;

      // 严格排除表尾汇总行、总计行 (彻底杜绝汇总行被误判爆表)
      const rawRowText = row.textContent.replace(/\s+/g, ' ').trim();
      if (rawRowText.startsWith('总计') || rawRowText.includes('总计：') || 
          rawRowText.toLowerCase().startsWith('total') || 
          row.closest('tfoot') || 
          row.getAttribute('data-testid')?.includes('summary') || 
          row.classList.contains('summary-row')) {
        return;
      }

      // 获取当前行所在表格的列映射 (解决页面多个表格时的错位)
      const parentTable = row.closest('table, [role="grid"], [role="table"]');
      let { colMap, headerCells } = parentTable ? findTableColumnMapping(parentTable) : { colMap: defaultColMap, headerCells: defaultHeaders };
      if (!colMap || Object.keys(colMap).length === 0) {
        colMap = defaultColMap;
        headerCells = defaultHeaders;
      }

      // 提取行内所有单元格 (全面涵盖 td, th, gridcell, rowheader)
      const cells = Array.from(row.querySelectorAll('td, th, [role="cell"], [role="gridcell"], [role="rowheader"], .data-table-cell'));
      if (cells.length < 3) return;

      const cellTexts = cells.map(c => c.textContent.trim());
      const rowFullText = cellTexts.join(' ');

      // 快速前置过滤 (包含货币符号、百分比、预算或匹配类型)
      const hasCurrency = rowFullText.includes('US$') || rowFullText.includes('$') || rowFullText.includes('￥') || rowFullText.includes('¥') || rowFullText.includes('€') || rowFullText.includes('£');
      const hasMatchType = cellTexts.some(t => ['短语', '广泛', '精准', 'Phrase', 'Broad', 'Exact', 'Auto', '自动'].some(m => t.includes(m)));
      const hasBudget = rowFullText.includes('每天') || rowFullText.includes('预算') || rowFullText.includes('budget');
      if (!hasCurrency && !hasMatchType && !hasBudget) return;

      // 1. 定位真实关键词单元格
      let kwCell = null;
      let keywordText = '';

      if (colMap.keyword !== undefined && cells[colMap.keyword]) {
        const candidate = extractPureKeywordText(cells[colMap.keyword]);
        if (isValidKeywordText(candidate)) {
          kwCell = cells[colMap.keyword];
          keywordText = candidate;
        }
      }

      // 坐标对齐辅助定位
      if (!keywordText && headerCells.length > 0 && colMap.keyword !== undefined) {
        const targetHeader = headerCells[colMap.keyword];
        if (targetHeader) {
          const hLeft = targetHeader.getBoundingClientRect().left;
          for (const cell of cells) {
            if (Math.abs(cell.getBoundingClientRect().left - hLeft) < 30) {
              const candidate = extractPureKeywordText(cell);
              if (isValidKeywordText(candidate)) {
                kwCell = cell;
                keywordText = candidate;
                break;
              }
            }
          }
        }
      }

      // 兜底：在前 5 列中通过特征扫描有效关键词
      if (!keywordText) {
        for (let i = 0; i < Math.min(cells.length, 5); i++) {
          const candidate = extractPureKeywordText(cells[i]);
          if (isValidKeywordText(candidate)) {
            kwCell = cells[i];
            keywordText = candidate;
            break;
          }
        }
      }

      if (!keywordText) return;

      // 2. 定位投放匹配类型
      let matchType = '';
      if (colMap.matchType !== undefined && cells[colMap.matchType]) {
        matchType = cells[colMap.matchType].textContent.trim();
      } else {
        cells.forEach(c => {
          const t = c.textContent.trim();
          if (['短语', '广泛', '精准', 'Phrase', 'Broad', 'Exact', 'Auto', '自动'].includes(t)) {
            matchType = t;
          }
        });
      }

      // 3. 定位真实竞价单元格 (Bid) —— 绝不误认到“点击量”列
      let bidCell = null;
      let bid = 0;
      if (colMap.bid !== undefined && cells[colMap.bid]) {
        bidCell = cells[colMap.bid];
        bid = parseNumber(bidCell.textContent) || 0;
      }

      // 坐标对齐辅助
      if ((!bidCell || bid === 0) && headerCells.length > 0 && colMap.bid !== undefined) {
        const targetHeader = headerCells[colMap.bid];
        if (targetHeader) {
          const hLeft = targetHeader.getBoundingClientRect().left;
          for (const cell of cells) {
            if (Math.abs(cell.getBoundingClientRect().left - hLeft) < 30) {
              const val = parseNumber(cell.textContent);
              if (val !== null && val > 0) {
                bidCell = cell;
                bid = val;
                break;
              }
            }
          }
        }
      }

      // 兜底寻找包含货币且排除建议竞价的单元格
      if (!bidCell || bid === 0) {
        for (let i = 3; i < Math.min(cells.length, 9); i++) {
          const txt = cells[i].textContent;
          if (txt.includes('建议') || txt.includes('(') || txt.includes('（')) continue;
          if (txt.includes('$') || txt.includes('US$') || txt.includes('€') || txt.includes('£')) {
            const val = parseNumber(txt);
            if (val !== null && val > 0) {
              bidCell = cells[i];
              bid = val;
              break;
            }
          }
        }
      }

      if (bidCell) {
        bidCell.setAttribute('data-xl-bid-cell', 'true');
      }

      // 4. 定位展示量 (Impressions) —— 关键防御：纯数字，绝对不可含货币符号！
      let impressions = 0;
      if (colMap.impressions !== undefined && cells[colMap.impressions]) {
        const impText = cells[colMap.impressions].textContent.trim();
        if (!impText.includes('$') && !impText.includes('US$') && !impText.includes('€') && !impText.includes('%')) {
          impressions = parseNumber(impText) || 0;
        }
      }

      // 坐标对齐辅助
      if (impressions === 0 && headerCells.length > 0 && colMap.impressions !== undefined) {
        const targetHeader = headerCells[colMap.impressions];
        if (targetHeader) {
          const hLeft = targetHeader.getBoundingClientRect().left;
          for (const cell of cells) {
            if (Math.abs(cell.getBoundingClientRect().left - hLeft) < 30) {
              const impText = cell.textContent.trim();
              if (!impText.includes('$') && !impText.includes('US$') && !impText.includes('%')) {
                impressions = parseNumber(impText) || 0;
                break;
              }
            }
          }
        }
      }

      // 5. 定位点击量 (Clicks)
      let clicks = 0;
      if (colMap.clicks !== undefined && cells[colMap.clicks]) {
        const clkText = cells[colMap.clicks].textContent.trim();
        if (!clkText.includes('$') && !clkText.includes('US$') && !clkText.includes('%')) {
          clicks = parseNumber(clkText) || 0;
        }
      }

      // 6. 定位总花费、CPC、订单量、销售额、ACoS、ROAS
      let spend = null;
      let cpc = null;
      let orders = 0;
      let sales = null;
      let acos = null;
      let roas = null;

      if (colMap.spend !== undefined && cells[colMap.spend]) spend = parseNumber(cells[colMap.spend].textContent);
      if (colMap.cpc !== undefined && cells[colMap.cpc]) cpc = parseNumber(cells[colMap.cpc].textContent);
      if (colMap.orders !== undefined && cells[colMap.orders]) orders = parseNumber(cells[colMap.orders].textContent) || 0;
      if (colMap.sales !== undefined && cells[colMap.sales]) sales = parseNumber(cells[colMap.sales].textContent);
      if (colMap.acos !== undefined && cells[colMap.acos]) acos = parseNumber(cells[colMap.acos].textContent);
      if (colMap.roas !== undefined && cells[colMap.roas]) roas = parseNumber(cells[colMap.roas].textContent);

      // 特征遍历兜底 ACoS 与 Spend
      if (acos === null || spend === null) {
        cells.forEach((cell, idx) => {
          const txt = cell.textContent.trim();
          if (txt.includes('%') && !txt.includes('<') && !txt.includes('>')) {
            const num = parseNumber(txt);
            if (num !== null && num > 0) {
              if (acos === null) acos = num;
              if (cells[idx + 1] && roas === null) {
                const nextNum = parseNumber(cells[idx + 1].textContent);
                if (nextNum !== null && nextNum > 0) roas = nextNum;
              }
            }
          }
          if ((txt.includes('US$') || txt.includes('$') || txt.includes('€') || txt.includes('£')) && !txt.includes('%')) {
            const val = parseNumber(txt);
            if (val !== null && val > 0) {
              if (spend === null && idx > 5) spend = val;
              else if (sales === null && idx > 8) sales = val;
            }
          }
        });
      }

      // 绑定唯一的行标识符与关键词属性 (供 [🎯 定位] 快速锚定)
      const rowId = 'xl-row-' + rowIndex;
      row.setAttribute('data-xl-row-id', rowId);
      row.setAttribute('data-xl-kw', keywordText);

      // 组装行数据
      const rowData = {
        rowId: rowId,
        keyword: keywordText,
        matchType: matchType,
        bid: bid,
        impressions: impressions,
        clicks: clicks,
        spend: spend !== null ? spend : 0,
        cpc: cpc,
        orders: orders,
        sales: sales !== null ? sales : 0,
        acos: acos,
        roas: roas,
        lastSeen: Date.now()
      };

      // 存入全局行缓存池 (哪怕滑出视图也永不丢失)
      XiaolinRowStore.set(keywordText, rowData);

      // 单行诊断
      const diag = XiaolinAnalyzer.diagnoseKeyword(rowData, currentSettings);

      // 注入行内醒目标签
      if (kwCell) {
        kwCell.setAttribute('data-xl-kw-cell', 'true');
        kwCell.setAttribute('data-xl-kw-name', keywordText);
        injectInlineBadge(kwCell, keywordText, diag, row);
      }
    });

    // 从全局持久缓存池全量汇总诊断结果 (实现全表汇总，不受虚拟滚动 DOM 节点数量限制)
    let bleedCount = 0;
    let highAcosCount = 0;
    let goldenCount = 0;
    const diagList = [];
    const boostList = [];

    const maxImpThreshold = parseInt(currentSettings.boostMaxImpressions, 10) || 5;
    const boostMode = currentSettings.boostMode || 'percent';
    const isUp = currentSettings.boostDir !== 'down';
    const boostPct = parseFloat(currentSettings.boostPercent) !== undefined ? parseFloat(currentSettings.boostPercent) : 10;
    const boostAmt = parseFloat(currentSettings.boostAmount) !== undefined ? parseFloat(currentSettings.boostAmount) : 0.02;

    XiaolinRowStore.forEach((storedRow) => {
      // 1. 降价止损诊断
      const diag = XiaolinAnalyzer.diagnoseKeyword(storedRow, currentSettings);

      if (diag.type === 'CRITICAL_BLEED') {
        bleedCount++;
        diagList.push({
          ...diag,
          rowId: storedRow.rowId,
          keyword: storedRow.keyword,
          originalBid: storedRow.bid,
          suggestedBid: diag.suggestedBid,
          spend: storedRow.spend,
          orders: storedRow.orders,
          acos: storedRow.acos,
          roas: storedRow.roas
        });
      } else if (diag.type === 'HIGH_ACOS') {
        highAcosCount++;
        diagList.push({
          ...diag,
          rowId: storedRow.rowId,
          keyword: storedRow.keyword,
          originalBid: storedRow.bid,
          suggestedBid: diag.suggestedBid,
          spend: storedRow.spend,
          orders: storedRow.orders,
          acos: storedRow.acos,
          roas: storedRow.roas
        });
      } else if (diag.type === 'GOLDEN_WINNER') {
        goldenCount++;
        diagList.push({
          ...diag,
          rowId: storedRow.rowId,
          keyword: storedRow.keyword,
          originalBid: storedRow.bid,
          suggestedBid: diag.suggestedBid,
          spend: storedRow.spend,
          orders: storedRow.orders,
          acos: storedRow.acos,
          roas: storedRow.roas
        });
      }
      // 关键原则：LOW_IMPRESSION 不归入 diagList，避免降价面板出现混乱报警

      // 2. 曝光激活扫描 (展示量 <= 门槛 或 自动广告投放)
      const kwLower = storedRow.keyword.toLowerCase();
      const isAuto = ['紧密', '宽泛', '同类', '关联', 'close-match', 'loose-match', 'substitutes', 'complements', 'auto'].some(term => kwLower.includes(term));
      const isLowImp = storedRow.impressions <= maxImpThreshold;

      if ((isLowImp || isAuto) && storedRow.bid > 0) {
        let boostedBid = 0;
        let boostDesc = '';
        if (boostMode === 'amount') {
          boostedBid = isUp ? (storedRow.bid + boostAmt) : Math.max(0.05, storedRow.bid - boostAmt);
          boostDesc = `${isUp ? '+' : '-'}$${boostAmt.toFixed(2)}`;
        } else {
          boostedBid = isUp ? (storedRow.bid * (1 + boostPct / 100)) : Math.max(0.05, storedRow.bid * (1 - boostPct / 100));
          boostDesc = `${isUp ? '+' : '-'}${boostPct}%`;
        }
        boostList.push({
          rowId: storedRow.rowId,
          keyword: storedRow.keyword,
          originalBid: storedRow.bid,
          impressions: storedRow.impressions,
          suggestedBid: Math.max(0.05, parseFloat(boostedBid.toFixed(2))),
          boostDesc: boostDesc,
          isAuto: isAuto
        });
      }
    });

    // 更新角标报警数字
    const totalAlerts = bleedCount + highAcosCount;
    const alertCountEl = document.getElementById('xl-launcher-alert-count');
    if (alertCountEl) {
      alertCountEl.textContent = totalAlerts;
      alertCountEl.style.display = totalAlerts > 0 ? 'inline-block' : 'none';
    }

    // 更新面板摘要统计
    const sumBleed = document.getElementById('xl-sum-bleed-count');
    const sumHighAcos = document.getElementById('xl-sum-high-acos-count');
    const sumGolden = document.getElementById('xl-sum-golden-count');
    if (sumBleed) sumBleed.textContent = bleedCount;
    if (sumHighAcos) sumHighAcos.textContent = highAcosCount;
    if (sumGolden) sumGolden.textContent = goldenCount;

    // 渲染面板列表
    renderPanelDiagList(diagList);
    renderPanelBoostList(boostList);
  }

  function injectInlineBadge(cell, keyword, diag, row) {
    let existingBadge = cell.querySelector('.xl-inline-badge');
    if (existingBadge) {
      if (existingBadge.getAttribute('data-diag-type') === diag.type) {
        return;
      }
      existingBadge.remove();
    }

    if (diag.type === 'HEALTHY') return;

    const badge = document.createElement('span');
    badge.className = `xl-inline-badge xl-badge-${diag.level}`;
    badge.setAttribute('data-keyword', keyword);
    badge.setAttribute('data-diag-type', diag.type);
    badge.innerHTML = `
      <span class="xl-badge-content">${diag.badge}</span>
      <div class="xl-inline-tooltip">
        <div class="xl-tip-title">${diag.title}</div>
        <div class="xl-tip-desc">${diag.description}</div>
        <div class="xl-tip-action">
          <b>建议操作：</b>${diag.actionText}
        </div>
        <button class="xl-tip-btn" data-action="${diag.actionType}" data-kw="${keyword}" data-bid="${diag.suggestedBid || ''}">
          执行该建议
        </button>
      </div>
    `;

    // 点击标签本身可固定/取消固定浮窗显示，彻底防止鼠标移出闪退
    badge.addEventListener('click', (e) => {
      if (e.target.closest('.xl-tip-btn')) return;
      badge.classList.toggle('xl-pinned');
    });

    badge.querySelector('.xl-tip-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleActionExecution(diag, keyword, row || badge.closest('tr'));
    });

    cell.appendChild(badge);
  }

  /**
   * 自动精准定位到亚马逊真实竞价列，触发原生编辑并安全填入修改竞价
   * 严禁触碰“点击量”或其他无关列
   */
  function autoFillSuggestedBid(row, suggestedBid) {
    if (!row) return false;
    const cells = Array.from(row.querySelectorAll('td, [role="cell"], [role="gridcell"], .data-table-cell'));
    if (cells.length < 4) return false;

    // 1. 优先通过 data-xl-bid-cell 快速精准定位
    let bidCell = row.querySelector('[data-xl-bid-cell="true"]');

    // 2. 如果未找到，根据全局表头 colMap.bid 定位
    if (!bidCell) {
      const { colMap } = findTableColumnMapping();
      if (colMap.bid !== undefined && cells[colMap.bid]) {
        bidCell = cells[colMap.bid];
      }
    }

    // 3. 兜底定位：遍历单元格，寻找包含货币符号且排除建议竞价的单元格
    if (!bidCell) {
      for (let i = 3; i < Math.min(cells.length, 9); i++) {
        const txt = cells[i].textContent;
        if (txt.includes('建议') || txt.includes('(') || txt.includes('（')) continue;
        if (txt.includes('$') || txt.includes('US$') || txt.includes('€') || txt.includes('£')) {
          bidCell = cells[i];
          break;
        }
      }
    }

    if (!bidCell) return false;

    const valStr = typeof suggestedBid === 'number' ? suggestedBid.toFixed(2) : parseFloat(suggestedBid).toFixed(2);

    // 检查是否有现成 input
    let input = bidCell.querySelector('input[type="text"], input[type="number"], input:not([type="checkbox"])');
    if (input) {
      fillAndTriggerInput(input, valStr);
      return true;
    }

    // 模拟点击进入原生编辑模式 (触发编辑铅笔图标或可点击区域)
    const clickTarget = bidCell.querySelector('button, [role="button"], a, span, .a-button, svg') || bidCell;
    clickTarget.click();

    setTimeout(() => {
      let dynInput = bidCell.querySelector('input[type="text"], input[type="number"], input:not([type="checkbox"])');
      if (!dynInput) {
        const popover = document.querySelector('[role="dialog"], [role="tooltip"], [class*="popover"], [class*="overlay"]');
        if (popover) {
          dynInput = popover.querySelector('input[type="text"], input[type="number"]');
          if (dynInput) {
            fillAndTriggerInput(dynInput, valStr);
            let saveBtn = popover.querySelector('button[type="submit"], .a-button-primary, button:not([class*="close"]), [data-action*="save"], [data-action*="submit"]');
            if (!saveBtn) {
              const allBtns = Array.from(popover.querySelectorAll('button, [role="button"], a'));
              saveBtn = allBtns.find(b => {
                const t = b.textContent.trim().toLowerCase();
                return t.includes('保存') || t.includes('save') || t.includes('apply') || t.includes('确定') || t.includes('✓');
              });
            }
            if (saveBtn) setTimeout(() => saveBtn.click(), 80);
            return;
          }
        }
      }

      if (dynInput) {
        fillAndTriggerInput(dynInput, valStr);
      } else {
        // 如果没有原生 input（如测试沙盒静态表格），安全替换文字节点，严禁使用 innerHTML 覆盖破坏 DOM
        const textTarget = bidCell.querySelector('span, a') || bidCell;
        textTarget.textContent = `US$${valStr}`;
        bidCell.style.transition = 'outline 0.2s ease, background-color 0.2s ease';
        bidCell.style.outline = '2px solid #10b981';
        bidCell.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        bidCell.style.borderRadius = '4px';
        setTimeout(() => {
          bidCell.style.outline = 'none';
          bidCell.style.backgroundColor = 'transparent';
        }, 2200);
      }
    }, 80);

    return true;
  }

  function fillAndTriggerInput(input, val) {
    if (!input) return;
    input.focus();
    // React 16+ 受控组件原生属性拦截兼容 (确保亚马逊后台 React 内部状态更新)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, val);
    } else {
      input.value = val;
    }
    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    input.style.border = '2px solid #10b981';
    input.style.backgroundColor = '#ecfdf5';
    input.style.color = '#065f46';
    input.style.fontWeight = 'bold';
  }

  /**
   * 轻量浮动 Toast 气泡 (1.5秒自动淡出，不阻断操作，支持一键切换静默模式)
   */
  function showToast(message, type = 'success', allowSilentOption = false) {
    if (currentSettings.silentMode) return;

    let container = document.getElementById('xl-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'xl-toast-container';
      container.className = 'xl-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `xl-toast xl-toast-${type}`;

    let silentHtml = '';
    if (allowSilentOption) {
      silentHtml = `<a href="javascript:void(0)" class="xl-toast-silent-btn" title="点击后将切换为静默模式，下次直接填入出价，不再弹出提示气泡">不再提示</a>`;
    }

    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <span>${message}</span>
        ${silentHtml}
      </div>
      <button class="xl-toast-close" title="关闭">✕</button>
    `;

    toast.querySelector('.xl-toast-close').addEventListener('click', () => {
      toast.classList.remove('xl-toast-show');
      setTimeout(() => toast.remove(), 250);
    });

    const btnSilent = toast.querySelector('.xl-toast-silent-btn');
    if (btnSilent) {
      btnSilent.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentSettings.silentMode = true;
        chrome.storage.local.set({ adSettings: currentSettings });
        applyThemeAndStatus();
        toast.classList.remove('xl-toast-show');
        setTimeout(() => {
          toast.remove();
          showToast('已切换为静默模式：后续将直接自动填入竞价，不再弹出提示气泡！', 'info');
        }, 200);
      });
    }

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('xl-toast-show');
    });

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.remove('xl-toast-show');
        setTimeout(() => toast.remove(), 250);
      }
    }, 1500);
  }

  function findRowByKeyword(kw) {
    if (!kw) return null;
    const allRows = document.querySelectorAll('tr');
    for (const row of allRows) {
      if (row.textContent.includes(kw)) {
        return row;
      }
    }
    return null;
  }

  function handleActionExecution(diag, keyword, row) {
    if (!row) row = findRowByKeyword(keyword);

    if (diag.actionType === 'NEGATE_EXACT') {
      navigator.clipboard.writeText(keyword).then(() => {
        showToast(`🛑 已复制精准否定词: "${keyword}" (直接粘贴至否定投放)`, 'info');
      });
    } else if (diag.actionType === 'REDUCE_BID' || diag.actionType === 'INCREASE_BID_SMALL') {
      const filled = autoFillSuggestedBid(row, diag.suggestedBid);
      navigator.clipboard.writeText(diag.suggestedBid.toString()).catch(() => {});
      if (filled) {
        showToast(`✅ 已自动填入建议竞价 US$${diag.suggestedBid}！(点击亚马逊对勾即可生效)`, 'success', true);
      } else {
        showToast(`📋 已复制建议竞价 US$${diag.suggestedBid} 到剪贴板`, 'info', true);
      }
    } else if (diag.actionType === 'HARVEST_EXACT') {
      navigator.clipboard.writeText(keyword).then(() => {
        showToast(`🚀 已复制黄金盈利词: "${keyword}" (建议前往手动精准组投放)`, 'success');
      });
    }
  }

  /**
   * 渲染面板实时诊断列表 (支持批量修改、单条自定义编辑与 [🎯 定位])
   */
  function renderPanelDiagList(list) {
    const container = document.getElementById('xl-diag-list-container');
    const bulkCountEl = document.getElementById('xl-bulk-bid-count');
    if (!container) return;

    const reducibleItems = list.filter(item => item.suggestedBid > 0);
    if (bulkCountEl) bulkCountEl.textContent = reducibleItems.length;

    if (list.length === 0) {
      container.innerHTML = '<div class="xl-empty-state">✅ 自动扫描完成：当前页面所有词指标均在安全阈值内，未发现吃预算或爆表词。</div>';
      return;
    }

    container.innerHTML = list.map(item => {
      const safeKw = (item.keyword || '').replace(/"/g, '&quot;');
      if (item.actionType === 'NEGATE_EXACT') {
        return `
          <div class="xl-diag-card xl-diag-card-${item.level}">
            <div class="xl-card-header">
              <div class="xl-card-kw-wrap">
                <span class="xl-card-kw" title="${safeKw}">${safeKw}</span>
                <button class="xl-btn-locate" data-kw="${safeKw}" data-row-id="${item.rowId || ''}" title="在亚马逊后台中平滑定位并闪烁高亮这一行">🎯 定位</button>
              </div>
              <span class="xl-card-badge">${item.badge}</span>
            </div>
            <div class="xl-card-body">${item.description}</div>
            <div class="xl-card-footer">
              <span class="xl-card-advice" style="color:#ef4444;">建议：严重吃预算，一键添加精准否定</span>
              <button class="xl-btn-card-action xl-btn-danger" data-row-id="${item.rowId}" data-kw="${safeKw}" data-type="NEGATE_EXACT">
                一键否定
              </button>
            </div>
          </div>
        `;
      } else {
        // 统一所有带调价建议的卡片格式 (原竞价 ➔ 建议调至 [输入框] [应用修改])
        return `
          <div class="xl-diag-card xl-diag-card-${item.level}">
            <div class="xl-card-header">
              <div class="xl-card-kw-wrap">
                <span class="xl-card-kw" title="${safeKw}">${safeKw}</span>
                <button class="xl-btn-locate" data-kw="${safeKw}" data-row-id="${item.rowId || ''}" title="在亚马逊后台中平滑定位并闪烁高亮这一行">🎯 定位</button>
              </div>
              <span class="xl-card-badge">${item.badge}</span>
            </div>
            <div class="xl-card-body">${item.description}</div>
            <div class="xl-card-bid-row">
              <div class="xl-bid-compare">
                <span class="xl-bid-old">原竞价: <b>US$${(item.originalBid || 0).toFixed(2)}</b></span>
                <span class="xl-bid-arrow">➔</span>
                <span class="xl-bid-label">建议调至:</span>
                <div class="xl-bid-input-wrap">
                  <span class="xl-bid-cur">$</span>
                  <input type="number" step="0.01" min="0.05" class="xl-bid-input xl-diag-bid-input" data-row-id="${item.rowId}" data-kw="${safeKw}" value="${(item.suggestedBid || 0).toFixed(2)}" />
                </div>
              </div>
              <button class="xl-btn-apply-one xl-btn-diag-apply" data-row-id="${item.rowId}" data-kw="${safeKw}">
                应用修改
              </button>
            </div>
          </div>
        `;
      }
    }).join('');

    // 绑定 [🎯 定位] 按钮事件
    container.querySelectorAll('.xl-btn-locate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kw = btn.getAttribute('data-kw');
        const rowId = btn.getAttribute('data-row-id');
        scrollToAndHighlightKeyword(kw, rowId);
      });
    });

    // 单个应用修改降价
    container.querySelectorAll('.xl-btn-diag-apply').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rowId = e.target.getAttribute('data-row-id');
        const kw = e.target.getAttribute('data-kw');
        const card = e.target.closest('.xl-diag-card');
        const input = card.querySelector('.xl-diag-bid-input');
        const newBid = parseFloat(input.value) || 0;
        
        let targetRow = document.querySelector(`[data-xl-row-id="${rowId}"]`) || document.querySelector(`[data-xl-kw="${kw}"]`);
        if (targetRow && newBid > 0) {
          autoFillSuggestedBid(targetRow, newBid);
          e.target.textContent = '✅ 已修改';
          e.target.classList.add('xl-applied');
          setTimeout(() => {
            e.target.textContent = '应用修改';
            e.target.classList.remove('xl-applied');
          }, 1800);
          showToast(`✅ 已修改【${kw}】竞价至 US$${newBid.toFixed(2)}！`, 'success', true);
        } else if (newBid > 0) {
          // 如果因虚拟滚动未在 DOM 中，先滑动定位渲染再填入
          scrollToAndHighlightKeyword(kw, rowId);
          setTimeout(() => {
            const freshRow = document.querySelector(`[data-xl-row-id="${rowId}"]`) || document.querySelector(`[data-xl-kw="${kw}"]`);
            if (freshRow) {
              autoFillSuggestedBid(freshRow, newBid);
              e.target.textContent = '✅ 已修改';
              e.target.classList.add('xl-applied');
              setTimeout(() => {
                e.target.textContent = '应用修改';
                e.target.classList.remove('xl-applied');
              }, 1800);
              showToast(`✅ 已定位并修改【${kw}】竞价至 US$${newBid.toFixed(2)}！`, 'success', true);
            }
          }, 280);
        }
      });
    });

    // 复制否定词
    container.querySelectorAll('.xl-btn-card-action[data-type="NEGATE_EXACT"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const kw = e.target.getAttribute('data-kw');
        navigator.clipboard.writeText(kw).then(() => {
          showToast(`🛑 已复制精准否定词: "${kw}" (直接粘贴至否定投放)`, 'info');
        });
      });
    });

    // 批量一键应用全部建议降价
    const btnBulkApplyBids = document.getElementById('xl-btn-bulk-apply-bids');
    if (btnBulkApplyBids) {
      btnBulkApplyBids.onclick = () => {
        const inputs = container.querySelectorAll('.xl-diag-bid-input');
        let count = 0;
        inputs.forEach(input => {
          const rowId = input.getAttribute('data-row-id');
          const kw = input.getAttribute('data-kw');
          const newBid = parseFloat(input.value) || 0;
          let targetRow = document.querySelector(`[data-xl-kw="${kw}"]`) || document.querySelector(`[data-xl-row-id="${rowId}"]`);
          if (targetRow && newBid > 0) {
            autoFillSuggestedBid(targetRow, newBid);
            count++;
            const cardBtn = input.closest('.xl-diag-card').querySelector('.xl-btn-diag-apply');
            if (cardBtn) {
              cardBtn.textContent = '✅ 已修改';
              cardBtn.classList.add('xl-applied');
            }
          }
        });
        if (count > 0) {
          showToast(`🎉 已成功批量修改 ${count} 个关键词的竞价！`, 'success');
        } else {
          showToast('当前未发现需要降价的关键词。', 'info');
        }
      };
    }
  }

  /**
   * 渲染曝光激活列表 (展示量低于设定门槛或自动广告投放)
   */
  function renderPanelBoostList(list) {
    const container = document.getElementById('xl-boost-list-container');
    const countEl = document.getElementById('xl-boost-count');
    if (countEl) countEl.textContent = list.length;
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = '<div class="xl-empty-state">✅ 当前未发现展示量低于门槛的关键词或自动广告投放。</div>';
      return;
    }

    container.innerHTML = list.map(item => {
      const safeKw = (item.keyword || '').replace(/"/g, '&quot;');
      return `
      <div class="xl-diag-card xl-diag-card-info" style="border-left: 4px solid #0284c7 !important;">
        <div class="xl-card-header">
          <div class="xl-card-kw-wrap">
            <span class="xl-card-kw" title="${safeKw}">${safeKw}</span>
            <button class="xl-btn-locate" data-kw="${safeKw}" data-row-id="${item.rowId || ''}" title="在亚马逊后台中平滑定位并闪烁高亮这一行">🎯 定位</button>
          </div>
          <span class="xl-card-badge" style="background:#e0f2fe;color:#0369a1;font-weight:bold;">
            ${item.isAuto ? '🤖 自动投放' : '💤 展示量'}: ${item.impressions}次
          </span>
        </div>
        <div class="xl-card-body" style="font-size:11px;color:#64748b;margin-bottom:6px;">
          展示量极低受限，建议微调提价 ${item.boostDesc || '+' + item.boostPercent + '%'} 激活算法抓取与曝光权重。
        </div>
        <div class="xl-card-bid-row">
          <div class="xl-bid-compare">
            <span class="xl-bid-old">原竞价: <b>US$${(item.originalBid || 0).toFixed(2)}</b></span>
            <span class="xl-bid-arrow">➔</span>
            <span class="xl-bid-label">建议加价:</span>
            <div class="xl-bid-input-wrap">
              <span class="xl-bid-cur">$</span>
              <input type="number" step="0.01" min="0.05" class="xl-bid-input xl-boost-bid-input" data-row-id="${item.rowId}" data-kw="${safeKw}" value="${(item.suggestedBid || 0).toFixed(2)}" />
            </div>
          </div>
          <button class="xl-btn-apply-one xl-btn-boost-apply" data-row-id="${item.rowId}" data-kw="${safeKw}">
            应用提价
          </button>
        </div>
      </div>
    `;
    }).join('');

    // 绑定 [🎯 定位] 按钮事件
    container.querySelectorAll('.xl-btn-locate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kw = btn.getAttribute('data-kw');
        const rowId = btn.getAttribute('data-row-id');
        scrollToAndHighlightKeyword(kw, rowId);
      });
    });

    // 单个应用提价
    container.querySelectorAll('.xl-btn-boost-apply').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rowId = e.target.getAttribute('data-row-id');
        const kw = e.target.getAttribute('data-kw');
        const card = e.target.closest('.xl-diag-card');
        const input = card.querySelector('.xl-boost-bid-input');
        const newBid = parseFloat(input.value) || 0;
        
        let targetRow = document.querySelector(`[data-xl-row-id="${rowId}"]`) || document.querySelector(`[data-xl-kw="${kw}"]`);
        if (targetRow && newBid > 0) {
          autoFillSuggestedBid(targetRow, newBid);
          e.target.textContent = '✅ 已修改';
          e.target.classList.add('xl-applied');
          setTimeout(() => {
            e.target.textContent = '应用提价';
            e.target.classList.remove('xl-applied');
          }, 1800);
          showToast(`✅ 已提高【${kw}】竞价至 US$${newBid.toFixed(2)}！`, 'success', true);
        } else if (newBid > 0) {
          // 如果因虚拟滚动未在 DOM 中，先滑动定位渲染再填入
          scrollToAndHighlightKeyword(kw, rowId);
          setTimeout(() => {
            const freshRow = document.querySelector(`[data-xl-row-id="${rowId}"]`) || document.querySelector(`[data-xl-kw="${kw}"]`);
            if (freshRow) {
              autoFillSuggestedBid(freshRow, newBid);
              e.target.textContent = '✅ 已修改';
              e.target.classList.add('xl-applied');
              setTimeout(() => {
                e.target.textContent = '应用提价';
                e.target.classList.remove('xl-applied');
              }, 1800);
              showToast(`✅ 已定位并提高【${kw}】竞价至 US$${newBid.toFixed(2)}！`, 'success', true);
            }
          }, 280);
        }
      });
    });

    // 批量一键应用提价
    const btnBulkBoost = document.getElementById('xl-btn-bulk-apply-boost');
    if (btnBulkBoost) {
      btnBulkBoost.onclick = () => {
        const inputs = container.querySelectorAll('.xl-boost-bid-input');
        let count = 0;
        inputs.forEach(input => {
          const rowId = input.getAttribute('data-row-id');
          const kw = input.getAttribute('data-kw');
          const newBid = parseFloat(input.value) || 0;
          let targetRow = document.querySelector(`[data-xl-kw="${kw}"]`) || document.querySelector(`[data-xl-row-id="${rowId}"]`);
          if (targetRow && newBid > 0) {
            autoFillSuggestedBid(targetRow, newBid);
            count++;
            const cardBtn = input.closest('.xl-diag-card').querySelector('.xl-btn-boost-apply');
            if (cardBtn) {
              cardBtn.textContent = '✅ 已修改';
              cardBtn.classList.add('xl-applied');
            }
          }
        });
        if (count > 0) {
          showToast(`🎉 已成功批量提高 ${count} 个低曝光词的竞价！`, 'success');
        } else {
          showToast('未检测到需要提价的关键词。', 'info');
        }
      };
    }
  }

  function extractPureKeywordText(cell) {
    if (!cell) return '';
    const clone = cell.cloneNode(true);
    clone.querySelectorAll('.xl-inline-badge, script, style, input, button, .kw-sub, [aria-label*="提示"]').forEach(el => el.remove());
    const link = clone.querySelector('a, .kw-name, [title]');
    const txt = link ? (link.getAttribute('title') || link.textContent) : clone.textContent;
    return txt.replace(/[\u24d8\u2139ⓘ]/g, '').replace(/\s+/g, ' ').trim();
  }

  function parseNumber(text) {
    if (!text) return null;
    let trimmed = text.trim();
    if (trimmed === '-' || trimmed === '--' || trimmed === '') return null;

    // 1. 标准千分位逗号处理 (例如 4,181 或 12,345 逗号后紧跟 3 位数字)，必须直接去掉逗号，绝不能变成小数点！
    if (/,\d{3}(?:\D|$)/.test(trimmed)) {
      trimmed = trimmed.replace(/,/g, '');
    }
    // 2. 欧洲格式：如 12,50 € (逗号后只有 1~2 位小数)
    else if (trimmed.includes(',') && !trimmed.includes('.')) {
      const parts = trimmed.split(',');
      if (parts[1] && parts[1].replace(/\D/g, '').length <= 2) {
        trimmed = trimmed.replace(',', '.');
      } else {
        trimmed = trimmed.replace(/,/g, '');
      }
    } else if (trimmed.includes('.') && trimmed.includes(',')) {
      if (trimmed.lastIndexOf(',') > trimmed.lastIndexOf('.')) {
        trimmed = trimmed.replace(/\./g, '').replace(',', '.');
      } else {
        trimmed = trimmed.replace(/,/g, '');
      }
    } else {
      trimmed = trimmed.replace(/,/g, '');
    }

    const cleaned = trimmed.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A') return;
      e.preventDefault();
      
      // 首次拖拽时，移除 translateY(-50%) 避免计算偏差
      element.style.transform = 'none';

      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

})();
