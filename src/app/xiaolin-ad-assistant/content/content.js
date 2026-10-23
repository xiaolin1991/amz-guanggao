/**
 * 晓林广告助手 - 主注入内容脚本 (v1.3.0 深度修复版：精准列对齐 + 虚拟列表全量穿透 + 原生竞价回填)
 * 技术支持：曹晓林 13575948278
 */

(function () {
  if (window.__XIAOLIN_AD_ASSISTANT_INJECTED__) return;
  window.__XIAOLIN_AD_ASSISTANT_INJECTED__ = true;

  // 全局配置缓存 (默认亮色主题，默认开启自动监控，默认平滑调价 10%，默认1.5s气泡提示)
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
    boostMaxImpressions: 5,  // 低曝光门槛，默认展示量 <= 5 次
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

  // 全局行数据持久化缓存池 (解决虚拟滚动 DOM 销毁导致关键词丢失问题)
  const XiaolinRowStore = new Map();
  let lastPageContextSignature = '';
  let globalRefreshBidCalc = function () {};

  // 安全兼容封装：支持 Chrome 扩展环境与本地沙盒直接双击运行
  const safeGetURL = (path) => (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') ? chrome.runtime.getURL(path) : path;
  const safeStorageSet = (obj) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set(obj);
      }
    } catch (e) {}
  };

  // 读取持久化配置
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['adSettings'], (result) => {
      if (result && result.adSettings) {
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
  } else {
    initXiaolinAssistant();
  }

  // 监听配置更新消息
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'settingsUpdated' && request.settings) {
      currentSettings = { ...currentSettings, ...request.settings };
      applyThemeAndStatus();
      if (currentSettings.isEnabled) {
        scanAndAnnotateTables();
      } else {
        removeAllInlineBadges();
      }
      if (typeof globalRefreshBidCalc === 'function') {
        globalRefreshBidCalc();
      }
    }
    });
  }

  // ==========================================
  // 1. 初始化入口与全自动触发 + SPA 路由切换感知
  // ==========================================
  function initXiaolinAssistant() {
    createFloatingLauncher();
    createFloatingPanel();
    applyThemeAndStatus();

    // 全自动多频次检测触发
    const autoScanDelays = [350, 900, 1800, 3200];
    autoScanDelays.forEach(delay => {
      setTimeout(() => {
        if (currentSettings.isEnabled) {
          scanAndAnnotateTables();
        }
      }, delay);
    });

    // 页面加载 2.2 秒后自动执行一次全表静默快扫 (捕获虚拟滚动全部词)
    setTimeout(() => {
      if (currentSettings.isEnabled) {
        fastScanFullTable(null, true);
      }
    }, 2200);

    // 自动扫描前台弱势竞品 (如果在前台搜索页)
    if (window.location.hostname.includes('amazon.') && window.location.pathname.includes('/s')) {
      setTimeout(() => {
        XiaolinAsinSniper.scanCompetitors(currentSettings);
      }, 1500);
    }

    // 监听 SPA 路由跳转与左侧菜单切换（从广告活动 -> 广告组 -> 定向策略/关键词时自动清空旧缓存并重扫）
    window.addEventListener('popstate', handleSpaNavigationChange);
    window.addEventListener('hashchange', handleSpaNavigationChange);
    document.addEventListener('click', (e) => {
      const navTarget = e.target.closest('a, [role="tab"], [role="menuitem"], [role="link"], [class*="nav"], [class*="breadcrumb"]');
      if (navTarget && !navTarget.closest('#xl-floating-panel, #xl-floating-launcher')) {
        setTimeout(handleSpaNavigationChange, 450);
        setTimeout(handleSpaNavigationChange, 1200);
      }
    }, true);

    // 监听外部表格 DOM 变化（严格忽略插件自身面板与徽章的 DOM 变动，防止无限重绘循环）
    const debouncedScan = debounce(() => {
      if (currentSettings.isEnabled) {
        scanAndAnnotateTables();
      }
    }, 500);

    const observer = new MutationObserver((mutations) => {
      if (!currentSettings.isEnabled) return;
      const hasExternalTableChange = mutations.some(m => {
        const t = m.target;
        if (!t || t.nodeType !== 1) return false;
        if (t.closest("#xl-floating-panel, #xl-floating-launcher, #xl-toast-container, .xl-inline-badge, .xl-kw-focus-flag")) {
          return false;
        }
        return true;
      });
      if (hasExternalTableChange) {
        debouncedScan();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function handleSpaNavigationChange() {
    if (!currentSettings.isEnabled) return;
    scanAndAnnotateTables();
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

    const logoUrl = safeGetURL('assets/logo.png');
    launcher.innerHTML = `
      <img src="${logoUrl}" alt="晓林广告助手" class="xl-launcher-logo" draggable="false" />
      <span class="xl-launcher-badge" id="xl-launcher-alert-count">0</span>
    `;

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

    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    launcher.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
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
          const finalRect = launcher.getBoundingClientRect();
          try {
            localStorage.setItem('xl_launcher_pos', JSON.stringify({
              left: Math.round(finalRect.left),
              top: Math.round(finalRect.top)
            }));
          } catch (e) {}

          setTimeout(() => {
            hasMoved = false;
          }, 80);
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

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
  // 3. 悬浮主面板 (靠右侧居中显示，顶部按钮单行水平排列)
  // ==========================================
  function createFloatingPanel() {
    if (document.getElementById('xl-floating-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'xl-floating-panel';
    panel.className = `xl-panel-container xl-theme-${currentSettings.theme} xl-panel-hidden`;

    const logoUrl = safeGetURL('assets/logo.png');
    const wechatQrUrl = safeGetURL('assets/wechat_qr.jpg');
    const qqQrUrl = safeGetURL('assets/qq_qr.jpg');

    panel.innerHTML = `
      <!-- 面板头部 (修复 1.2：单行紧凑排列，绝不折行) -->
      <div class="xl-panel-header" id="xl-panel-header-drag">
        <div class="xl-brand">
          <img src="${logoUrl}" class="xl-brand-icon" />
          <div style="min-width:0;overflow:hidden;">
            <div class="xl-brand-title">晓林广告助手</div>
            <div class="xl-brand-sub">智能止血 · 实时诊断 · 竞价优化</div>
          </div>
        </div>

        <div class="xl-header-actions">
          <button class="xl-btn-header-scan" id="xl-btn-fast-scan" title="穿透虚拟滚动列表，极速扫描当前页面全部关键词数据">
            ⚡ 快扫全表
          </button>

          <button class="xl-btn-header-toggle ${currentSettings.isEnabled ? 'active' : 'paused'}" id="xl-btn-toggle-enable" title="点击可开启/暂停全页面诊断提醒">
            ${currentSettings.isEnabled ? '🟢 监控中' : '⏸️ 已暂停'}
          </button>

          <button class="xl-btn-theme-switch" id="xl-btn-toggle-theme" title="切换浅色/暗黑主题">
            ${currentSettings.theme === 'light' ? '☀️ 亮色' : '🌙 暗黑'}
          </button>

          <button class="xl-btn-icon" id="xl-btn-minimize" title="最小化面板">一</button>
          <button class="xl-btn-icon" id="xl-btn-close" title="关闭面板">✕</button>
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

        <!-- Tab 1: 实时诊断与止血 (统一支持原竞价->建议竞价自定义修改与批量应用) -->
        <div class="xl-tab-content active" id="pane-diag">
          <div class="xl-metric-toggle-bar">
            <span class="xl-metric-toggle-title">核心监控指标偏好：</span>
            <div class="xl-toggle-group">
              <button class="xl-toggle-btn ${currentSettings.metricMode === 'acos' ? 'active' : ''}" id="xl-btn-mode-acos">ACoS 模式</button>
              <button class="xl-toggle-btn ${currentSettings.metricMode === 'roas' ? 'active' : ''}" id="xl-btn-mode-roas">ROAS 模式</button>
            </div>
          </div>

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
              <div class="xl-sum-label">吃预算词 (建议止损)</div>
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
              ⚡ 一键批量修改全部建议竞价 (<span id="xl-bulk-bid-count">0</span> 个)
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
            <div class="xl-boost-desc">自动扫描展示量极低（含0曝光）或自动广告受限的投放，按设定比例或金额批量调价，激活展现权重！</div>

            <div class="xl-quick-adjust-bar" id="xl-boost-adjust-bar" style="margin-bottom:0;padding:8px 10px;">
              <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:6px;font-size:11px;font-weight:600;">
                <div style="display:flex;align-items:center;gap:4px;">
                  <span>曝光门槛: 展示量 ≤</span>
                  <input type="number" id="xl-boost-max-impressions" value="${currentSettings.boostMaxImpressions !== undefined ? currentSettings.boostMaxImpressions : 5}" min="0" max="1000" style="width:48px;height:22px;border:1px solid #cbd5e1;border-radius:4px;text-align:center;font-weight:bold;" />
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

        <!-- Tab 3: 亚马逊下拉词挖掘 -->
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

        <!-- Tab 4: 弱势竞品 ASIN 狙击 -->
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

        <!-- Tab 5: 科学保本竞价与溢价测算 -->
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

        <!-- Tab 6: 技术支持 -->
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

    if (panel) {
      panel.classList.remove('xl-theme-light', 'xl-theme-dark');
      panel.classList.add(`xl-theme-${theme}`);
    }

    if (launcher) {
      launcher.classList.remove('xl-theme-light', 'xl-theme-dark');
      launcher.classList.add(`xl-theme-${theme}`);
      if (!isEnabled) {
        launcher.classList.add('xl-status-paused');
      } else {
        launcher.classList.remove('xl-status-paused');
      }
    }

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
    if (launcher) {
      launcher.style.removeProperty('display');
    }
  }

  // ==========================================
  // 6. 面板事件交互绑定
  // ==========================================
  function initPanelEvents(panel) {
    panel.querySelector('#xl-btn-close').addEventListener('click', closeFloatingPanel);
    panel.querySelector('#xl-btn-minimize').addEventListener('click', closeFloatingPanel);

    const btnToggleEnable = panel.querySelector('#xl-btn-toggle-enable');
    if (btnToggleEnable) {
      btnToggleEnable.addEventListener('click', () => {
        currentSettings.isEnabled = !currentSettings.isEnabled;
        safeStorageSet({ adSettings: currentSettings });
        applyThemeAndStatus();

        if (currentSettings.isEnabled) {
          scanAndAnnotateTables();
        } else {
          removeAllInlineBadges();
        }
      });
    }

    // 一键极速全表快扫 (清空旧缓存并重新穿透扫描整个虚拟滚动表)
    const btnFastScan = panel.querySelector('#xl-btn-fast-scan');
    if (btnFastScan) {
      btnFastScan.addEventListener('click', () => {
        XiaolinRowStore.clear();
        fastScanFullTable(btnFastScan, false);
      });
    }

    const btnToggleTheme = panel.querySelector('#xl-btn-toggle-theme');
    btnToggleTheme.addEventListener('click', () => {
      currentSettings.theme = currentSettings.theme === 'light' ? 'dark' : 'light';
      safeStorageSet({ adSettings: currentSettings });
      applyThemeAndStatus();
    });

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

    makeDraggable(panel, panel.querySelector('#xl-panel-header-drag'));

    const btnAcosMode = panel.querySelector('#xl-btn-mode-acos');
    const btnRoasMode = panel.querySelector('#xl-btn-mode-roas');
    const lblHighMetric = panel.querySelector('#xl-lbl-high-metric');

    btnAcosMode.addEventListener('click', () => {
      currentSettings.metricMode = 'acos';
      btnAcosMode.classList.add('active');
      btnRoasMode.classList.remove('active');
      lblHighMetric.textContent = 'ACoS 爆表词';
      safeStorageSet({ adSettings: currentSettings });
      if (currentSettings.isEnabled) scanAndAnnotateTables();
    });

    btnRoasMode.addEventListener('click', () => {
      currentSettings.metricMode = 'roas';
      btnRoasMode.classList.add('active');
      btnAcosMode.classList.remove('active');
      lblHighMetric.textContent = 'ROAS 极低亏损词';
      safeStorageSet({ adSettings: currentSettings });
      if (currentSettings.isEnabled) scanAndAnnotateTables();
    });

    const btnStratSmooth = panel.querySelector('#xl-btn-strat-smooth');
    const btnStratBreakeven = panel.querySelector('#xl-btn-strat-breakeven');
    if (btnStratSmooth && btnStratBreakeven) {
      btnStratSmooth.addEventListener('click', () => {
        currentSettings.bidStrategy = 'smooth';
        applyThemeAndStatus();
        safeStorageSet({ adSettings: currentSettings });
        showToast('已切换为平滑调价策略', 'info');
        if (currentSettings.isEnabled) scanAndAnnotateTables();
      });
      btnStratBreakeven.addEventListener('click', () => {
        currentSettings.bidStrategy = 'breakeven';
        applyThemeAndStatus();
        safeStorageSet({ adSettings: currentSettings });
        showToast('已切换为保本倒推策略', 'info');
        if (currentSettings.isEnabled) scanAndAnnotateTables();
      });
    }

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
        safeStorageSet({ adSettings: currentSettings });
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
        safeStorageSet({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('已切换为按固定金额调价！', 'info');
      });
    }

    if (btnDiagDirDown && btnDiagDirUp) {
      btnDiagDirDown.addEventListener('click', () => {
        currentSettings.stepDownDir = 'down';
        btnDiagDirDown.classList.add('active');
        btnDiagDirUp.classList.remove('active');
        safeStorageSet({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('已设定为【降低 ⬇】竞价模式！', 'info');
      });

      btnDiagDirUp.addEventListener('click', () => {
        currentSettings.stepDownDir = 'up';
        btnDiagDirUp.classList.add('active');
        btnDiagDirDown.classList.remove('active');
        safeStorageSet({ adSettings: currentSettings });
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
        safeStorageSet({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        const dirTxt = currentSettings.stepDownDir === 'up' ? '升高' : '降低';
        const unitTxt = currentSettings.stepDownMode === 'amount' ? `$${val.toFixed(2)}` : `${val}%`;
        showToast(`已按【${dirTxt} ${unitTxt}】重新测算建议竞价！`, 'info');
      });
    }

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
        safeStorageSet({ adSettings: currentSettings });
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
        safeStorageSet({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('已切换为按固定金额调价曝光！', 'info');
      });
    }

    if (btnBoostDirUp && btnBoostDirDown) {
      btnBoostDirUp.addEventListener('click', () => {
        currentSettings.boostDir = 'up';
        btnBoostDirUp.classList.add('active');
        btnBoostDirDown.classList.remove('active');
        safeStorageSet({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('曝光激活：已设定为【升高 ⬆】模式！', 'info');
      });

      btnBoostDirDown.addEventListener('click', () => {
        currentSettings.boostDir = 'down';
        btnBoostDirDown.classList.add('active');
        btnBoostDirUp.classList.remove('active');
        safeStorageSet({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        showToast('曝光激活：已设定为【降低 ⬇】模式！', 'info');
      });
    }

    if (btnRecalcBoost) {
      btnRecalcBoost.addEventListener('click', () => {
        if (boostImpInp) {
          const parsedImp = parseInt(boostImpInp.value, 10);
          currentSettings.boostMaxImpressions = !isNaN(parsedImp) ? parsedImp : 5;
        }
        const val = parseFloat(boostValInp.value) || 0;
        if (currentSettings.boostMode === 'amount') {
          currentSettings.boostAmount = val;
        } else {
          currentSettings.boostPercent = val;
        }
        safeStorageSet({ adSettings: currentSettings });
        if (currentSettings.isEnabled) scanAndAnnotateTables();
        const dirTxt = currentSettings.boostDir === 'down' ? '降低' : '升高';
        const unitTxt = currentSettings.boostMode === 'amount' ? `$${val.toFixed(2)}` : `${val}%`;
        showToast(`曝光激活：已按【${dirTxt} ${unitTxt}】重新测算！`, 'info');
      });
    }

    const btnPromptToast = panel.querySelector('#xl-btn-prompt-toast');
    const btnPromptSilent = panel.querySelector('#xl-btn-prompt-silent');
    if (btnPromptToast && btnPromptSilent) {
      btnPromptToast.addEventListener('click', () => {
        currentSettings.silentMode = false;
        applyThemeAndStatus();
        safeStorageSet({ adSettings: currentSettings });
        showToast('已开启执行提示：填入出价后将弹出1.5秒轻量气泡', 'info');
      });
      btnPromptSilent.addEventListener('click', () => {
        currentSettings.silentMode = true;
        applyThemeAndStatus();
        safeStorageSet({ adSettings: currentSettings });
        showToast('已开启静默执行：点击建议直接填入，不再弹出气泡', 'info');
      });
    }

    // 一键复制全部吃预算词 (复制纯净英文/原词供否定投放使用)
    panel.querySelector('#xl-btn-copy-bleeds').addEventListener('click', () => {
      const words = [];
      XiaolinRowStore.forEach(item => {
        const diag = XiaolinAnalyzer.diagnoseKeyword(item, currentSettings);
        if (diag.type === 'CRITICAL_BLEED') {
          const pureKw = item.rawKeyword || item.keyword;
          if (pureKw && !words.includes(pureKw)) words.push(pureKw);
        }
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

    globalRefreshBidCalc = refreshBidCalculation;

    [calcPrice, calcAcos, calcCvr].forEach(inp => {
      inp.addEventListener('input', refreshBidCalculation);
    });
    refreshBidCalculation();

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
  // 7. 核心：顶层单元格去重、跨容器表头视觉坐标对齐与虚拟列表引擎
  // ==========================================

  /**
   * 提取最外层单元格列表，彻底剔除被嵌套包裹的内部子节点（防止 [role="gridcell"] 内部包含 .data-table-cell 导致列索引偏移 +3）
   */
  function getTopLevelCells(row) {
    if (!row) return [];
    const raw = Array.from(row.querySelectorAll('td, th, [role="gridcell"], [role="cell"], [role="rowheader"], .data-table-cell'));
    const top = raw.filter(el => !raw.some(other => other !== el && other.contains(el)));
    return top;
  }

  /**
   * 提取最外层表头单元格列表，剔除嵌套子节点
   */
  function getTopLevelHeaderCells(root) {
    if (!root) return [];
    const raw = Array.from(root.querySelectorAll('th, [role="columnheader"]'));
    return raw.filter(el => !raw.some(other => other !== el && other.contains(el)));
  }

  /**
   * 全局/局部动态表头探测与列映射解析引擎
   * 同时记录列索引 (colMap)、表头视觉坐标 (colRectMap)、ARIA 列号 (colAriaMap) 与表格层级类型 (tableType)
   */
  function findTableColumnMapping(specificTable) {
    const colMap = {};
    const colRectMap = {};
    const colAriaMap = {};
    let headerCells = [];
    let tableType = 'keyword'; // 'keyword' | 'campaign' | 'adgroup'

    if (specificTable) {
      const thead = specificTable.querySelector('thead');
      if (thead) {
        const ths = getTopLevelHeaderCells(thead);
        if (ths.length >= 3) headerCells = ths;
      }
      if (headerCells.length === 0) {
        const ths = getTopLevelHeaderCells(specificTable).filter(th => !th.closest('tbody, tfoot'));
        if (ths.length >= 3) headerCells = ths;
      }
      // 兼容 React Virtualized 表头与数据网分离在兄弟节点的布局
      if (headerCells.length === 0 && specificTable.parentElement) {
        const wrapper = specificTable.closest('[class*="table"], [class*="Table"], [class*="grid"], [class*="Grid"]') || specificTable.parentElement;
        if (wrapper) {
          const ths = getTopLevelHeaderCells(wrapper).filter(th => !th.closest('tbody, tfoot'));
          if (ths.length >= 3) headerCells = ths;
        }
      }
    }

    if (headerCells.length === 0) {
      const possibleHeaderRows = document.querySelectorAll('thead tr, [role="row"], .data-table-header-row, [data-testid*="header"]');
      for (const hRow of possibleHeaderRows) {
        const ths = getTopLevelHeaderCells(hRow);
        if (ths.length >= 4) {
          const rowTxt = ths.map(t => t.textContent.trim().toLowerCase()).join(' ');
          if ((rowTxt.includes('关键词') || rowTxt.includes('keyword') || rowTxt.includes('targeting') || rowTxt.includes('投放') || rowTxt.includes('广告活动') || rowTxt.includes('campaign') || rowTxt.includes('广告组') || rowTxt.includes('ad group') || rowTxt.includes('搜索词') || rowTxt.includes('search term')) &&
              (rowTxt.includes('竞价') || rowTxt.includes('bid') || rowTxt.includes('展示') || rowTxt.includes('impression') || rowTxt.includes('预算') || rowTxt.includes('budget') || rowTxt.includes('花费') || rowTxt.includes('cost') || rowTxt.includes('spend'))) {
            headerCells = ths;
            break;
          }
        }
      }
    }

    if (headerCells.length === 0) {
      const allThs = getTopLevelHeaderCells(document);
      headerCells = allThs.filter(th => {
        const rect = th.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && !th.closest('[role="dialog"], [class*="calendar"], [class*="date-picker"]');
      });
    }

    // 如果表头有可见坐标且处于同一表头区，按从左到右视觉顺序排列
    if (headerCells.length > 1) {
      const hasRects = headerCells.every(th => th.getBoundingClientRect().width > 0);
      if (hasRects) {
        headerCells.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      }
    }

    if (headerCells.length > 0) {
      const fullHeaderStr = headerCells.map(th => th.textContent.replace(/\s+/g, ' ').trim().toLowerCase()).join(' | ');
      if (fullHeaderStr.includes('广告活动名称') || fullHeaderStr.includes('campaign name') || fullHeaderStr.includes('广告活动预算')) {
        tableType = 'campaign';
      } else if (fullHeaderStr.includes('广告组名称') || fullHeaderStr.includes('ad group name')) {
        tableType = 'adgroup';
      } else {
        tableType = 'keyword';
      }

      const registerCol = (key, idx, th) => {
        if (colMap[key] === undefined) {
          colMap[key] = idx;
          colRectMap[key] = th.getBoundingClientRect();
          const ariaIdx = th.getAttribute('aria-colindex') || th.getAttribute('data-col-index');
          if (ariaIdx) colAriaMap[key] = ariaIdx;
        }
      };

      headerCells.forEach((th, idx) => {
        const rawTxt = th.textContent.replace(/[\u24d8\u2139ⓘ↑↓]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

        // 1. 第一列实体名称 (关键词 / 广告活动名称 / 广告组名称 / 商品投放 / 搜索词)
        // 严禁匹配到预算、竞价、建议、匹配类型、状态、调整、策略、份额
        const isEntityName = (
          rawTxt.includes('关键词') || rawTxt.includes('keyword') ||
          rawTxt.includes('搜索词') || rawTxt.includes('search term') ||
          rawTxt.includes('商品投放') || rawTxt.includes('product target') ||
          rawTxt.includes('广告活动名称') || rawTxt.includes('campaign') ||
          rawTxt.includes('广告组名称') || rawTxt.includes('ad group') ||
          rawTxt === '广告活动' || rawTxt === '广告组' || rawTxt === '投放' || rawTxt === '定向' || rawTxt === '商品' || rawTxt === '广告' ||
          (rawTxt.includes('targeting') && !rawTxt.includes('match')) ||
          (rawTxt.includes('投放') && !rawTxt.includes('匹配') && !rawTxt.includes('类型'))
        ) && !rawTxt.includes('匹配') && !rawTxt.includes('建议') && !rawTxt.includes('预算') && !rawTxt.includes('竞价') && !rawTxt.includes('调整') && !rawTxt.includes('状态') && !rawTxt.includes('策略') && !rawTxt.includes('类型') && !rawTxt.includes('份额');

        if (isEntityName) {
          registerCol('keyword', idx, th);
        }

        // 2. 投放匹配类型
        if (rawTxt.includes('匹配') || rawTxt.includes('match')) {
          registerCol('matchType', idx, th);
        }

        // 3. 状态 (进行中 / 不完整 / 超出预算)
        if ((rawTxt === '状态' || rawTxt.startsWith('状态') || rawTxt === 'status' || rawTxt === 'state') && !rawTxt.includes('进行中')) {
          registerCol('status', idx, th);
        }

        // 4. 建议竞价 (必须含建议)
        if (rawTxt.includes('建议竞价') || rawTxt.includes('suggested bid') || (rawTxt.includes('建议') && rawTxt.includes('竞价'))) {
          registerCol('suggestedBid', idx, th);
        }

        // 5. 真实竞价 (Bid) —— 严禁匹配到“建议竞价”、“广告活动竞价策略”、“竞价调整”、“首页首位”
        if ((rawTxt.includes('竞价') || rawTxt.includes('bid')) &&
            !rawTxt.includes('建议') && !rawTxt.includes('suggested') &&
            !rawTxt.includes('策略') && !rawTxt.includes('strategy') &&
            !rawTxt.includes('调整') && !rawTxt.includes('adjustment') &&
            !rawTxt.includes('广告活动竞价') && !rawTxt.includes('campaign bid') &&
            !rawTxt.includes('首页') && !rawTxt.includes('首位') && !rawTxt.includes('placement')) {
          registerCol('bid', idx, th);
        }

        // 6. 展示量 (Impressions) —— 严禁匹配到“搜索结果首页首位展示量份额”
        if ((rawTxt.includes('展示量') || rawTxt.includes('展现量') || rawTxt.includes('impression') || rawTxt.includes('曝光')) &&
            !rawTxt.includes('份额') && !rawTxt.includes('share') && !rawTxt.includes('首页') && !rawTxt.includes('首位') && !rawTxt.includes('top')) {
          registerCol('impressions', idx, th);
        }

        // 7. 点击量 (Clicks) —— 严禁匹配到“每次点击费用(CPC)”或“点击率(CTR)”
        if ((rawTxt.includes('点击量') || rawTxt === 'clicks' || (rawTxt.includes('点击') && !rawTxt.includes('每次') && !rawTxt.includes('费用') && !rawTxt.includes('率'))) &&
            !rawTxt.includes('cpc') && !rawTxt.includes('ctr')) {
          registerCol('clicks', idx, th);
        }

        // 8. 总成本 / 花费 (Spend)
        if ((rawTxt.includes('总成本') || rawTxt.includes('花费') || rawTxt.includes('spend') || (rawTxt.includes('cost') && !rawTxt.includes('cpc') && !rawTxt.includes('acos') && !rawTxt.includes('per click'))) &&
            !rawTxt.includes('销售')) {
          registerCol('spend', idx, th);
        }

        // 9. CPC (每次点击费用)
        if (rawTxt.includes('cpc') || rawTxt.includes('每次点击费用') || rawTxt.includes('cost per click')) {
          registerCol('cpc', idx, th);
        }

        // 10. 购买量 / 订单 (Orders)
        if (rawTxt.includes('购买量') || rawTxt.includes('订单') || rawTxt.includes('orders') || rawTxt.includes('purchases')) {
          registerCol('orders', idx, th);
        }

        // 11. 销售额 (Sales)
        if ((rawTxt.includes('销售额') || rawTxt.includes('sales')) && !rawTxt.includes('acos')) {
          registerCol('sales', idx, th);
        }

        // 12. ACoS
        if (rawTxt.includes('acos') || rawTxt.includes('产出比')) {
          registerCol('acos', idx, th);
        }

        // 13. ROAS
        if (rawTxt.includes('roas') || rawTxt.includes('回报率')) {
          registerCol('roas', idx, th);
        }
      });
    }

    return { colMap, colRectMap, colAriaMap, headerCells, tableType };
  }

  /**
   * 依据表头元数据（ARIA列号 -> 相等列数直接索引 -> 视觉X坐标重叠度 -> 偏移修正索引）精准获取单元格
   * 彻底杜绝表头与数据行因复选框/嵌套节点导致的列错位
   */
  function getCellByColumn(cells, colKey, mapping, claimedCells = new Set()) {
    const { colMap, colRectMap, colAriaMap, headerCells } = mapping;
    const colIdx = colMap[colKey];
    if (colIdx === undefined || !cells || cells.length === 0) return null;

    // 1. ARIA colindex 精确匹配
    const targetAria = colAriaMap[colKey];
    if (targetAria) {
      const ariaMatch = cells.find(c => (c.getAttribute('aria-colindex') || c.getAttribute('data-col-index')) === targetAria);
      if (ariaMatch && !claimedCells.has(ariaMatch)) return ariaMatch;
    }

    // 2. 如果顶层单元格数量与顶层表头数量完全一致，索引 100% 一一对应
    if (headerCells && cells.length === headerCells.length && cells[colIdx] && !claimedCells.has(cells[colIdx])) {
      return cells[colIdx];
    }

    // 3. 视觉 X 坐标水平对齐匹配 (应对表头少了复选框/开关列，或虚拟滚动分栏容器)
    const hRect = colRectMap[colKey];
    if (hRect && hRect.width > 0) {
      const hCenter = hRect.left + hRect.width / 2;
      let bestCell = null;
      let bestDist = Infinity;

      for (const cell of cells) {
        if (claimedCells.has(cell)) continue;
        const cRect = cell.getBoundingClientRect();
        if (cRect.width <= 0) continue;
        const cCenter = cRect.left + cRect.width / 2;
        const leftDiff = Math.abs(cRect.left - hRect.left);
        const centerDiff = Math.abs(cCenter - hCenter);
        const dist = Math.min(leftDiff, centerDiff);

        // 判断水平区间重叠或中心接近
        const overlap = Math.min(cRect.right, hRect.right) - Math.max(cRect.left, hRect.left);
        if ((overlap > 8 || dist < 38) && dist < bestDist) {
          bestDist = dist;
          bestCell = cell;
        }
      }
      if (bestCell) return bestCell;
    }

    // 4. 列数差值偏移回退 (例如行首多了复选框 + 状态开关 2 列)
    if (headerCells && headerCells.length > 0) {
      const offset = cells.length - headerCells.length;
      const shiftedIdx = colIdx + (offset > 0 && offset <= 3 ? offset : 0);
      if (cells[shiftedIdx] && !claimedCells.has(cells[shiftedIdx])) {
        return cells[shiftedIdx];
      }
    }

    if (cells[colIdx] && !claimedCells.has(cells[colIdx])) {
      return cells[colIdx];
    }
    return null;
  }

  /**
   * 严苛校验是否为真实合法的关键词/广告活动/广告组文本
   * 彻底拦截“不完整”、“进行中”、“建议竞价 US$1.14(...)”、“29,157”等非关键词内容
   */
  function isValidKeywordText(txt) {
    if (!txt || typeof txt !== 'string') return false;
    const trimmed = txt.replace(/[\u24d8\u2139ⓘ]/g, '').trim();
    if (trimmed.length < 2) return false;

    // 严禁包含货币符号或建议竞价区间括号
    if (/(?:US\$|CA\$|A\$|MX\$|\$|€|£|￥|¥)/.test(trimmed)) return false;
    if (/\(\s*(?:US\$|\$|€|£|￥)/.test(trimmed)) return false;

    // 严禁纯数字、千分位数字、百分比、破折号或符号（彻底拦截 "29,157"、"9,461"、"<5%"、"570"）
    if (/^[\d,.\s%<>—\-+/():]+$/.test(trimmed)) return false;

    // 严禁亚马逊状态词、匹配类型枚举、按钮文字、规则说明与表尾汇总词
    // 仅当整词完全等于匹配类型时才排除（保留 "auto - close match 紧密匹配" 等自动投放目标）
    const exactOnlyInvalid = ['短语', '广泛', '精准', '自动', 'phrase', 'broad', 'exact', 'auto'];
    const lower = trimmed.toLowerCase();
    if (exactOnlyInvalid.includes(lower)) return false;

    const invalidExactOrPrefix = [
      '不完整', '进行中', '已暂停', '已归档', '已存档', '超出预算', '预算不足', '正在投放',
      '交付中', '已启用', '未启用', '启用', '暂停', '归档',
      '应用', '已应用', '总计', '合计', '平均', '所有状态', '活动未开始', '已结束', '付款失败',
      '商品推广', '品牌推广', '展示型推广', '动态竞价', '固定竞价', '每天',
      'delivering', 'enabled', 'paused', 'archived',
      'incomplete', 'ineligible', 'out of budget', 'total', 'apply', 'applied'
    ];
    for (const token of invalidExactOrPrefix) {
      const tLower = token.toLowerCase();
      if (lower === tLower || lower.startsWith(tLower + ' ') || lower.startsWith(tLower + ':') || lower.startsWith(tLower + '：') || lower.startsWith(tLower + '.')) {
        return false;
      }
    }
    if (trimmed.includes('条规则') || trimmed.includes('规则已生效') || trimmed.includes('每天')) return false;

    return true;
  }

  /**
   * 从关键词/广告活动单元格提取纯净原词 (rawKeyword，用于否定词复制) 与展示名称 (displayKeyword，含中文释义便于卖家识别)
   * 修复核心：绝不使用 querySelector('[title]') 误抓 ⓘ 提示图标！
   */
  function extractKeywordInfo(cell) {
    if (!cell) return { rawKeyword: '', displayKeyword: '' };
    const clone = cell.cloneNode(true);
    // 移除插件注入节点、表单按钮及信息图标
    clone.querySelectorAll('.xl-inline-badge, .xl-kw-focus-flag, [class*="xl-"], script, style, input, button, svg, [aria-label*="提示"], [aria-label*="info"]').forEach(el => el.remove());

    // 1. 如果存在明确的 .kw-name (测试沙盒)
    const kwNameEl = clone.querySelector('.kw-name');
    const kwSubEl = clone.querySelector('.kw-sub');
    if (kwNameEl) {
      const raw = kwNameEl.textContent.replace(/[\u24d8\u2139ⓘ]/g, '').replace(/\s+/g, ' ').trim();
      let sub = kwSubEl ? kwSubEl.textContent.replace(/[\u24d8\u2139ⓘ]/g, '').replace(/\s+/g, ' ').trim() : '';
      if (/^A[0-9A-Z]{12,30}$/i.test(sub)) sub = '';
      const display = sub && !raw.includes(sub) ? `${raw} (${sub})` : raw;
      return { rawKeyword: raw, displayKeyword: display };
    }

    // 2. 如果单元格内有超链接 <a> (广告活动/广告组名称或带链接的关键词)
    const linkEl = clone.querySelector('a');
    if (linkEl) {
      const linkTxt = linkEl.textContent.replace(/[\u24d8\u2139ⓘ]/g, '').replace(/\s+/g, ' ').trim();
      if (isValidKeywordText(linkTxt)) {
        return { rawKeyword: linkTxt, displayKeyword: linkTxt };
      }
    }

    // 3. 真实亚马逊后台关键词列：通常第一行是英文关键词 (如 jade roller)，第二行是中文释义 (如 玉石脸部按摩滚轮 ⓘ)
    const lines = [];
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      const t = node.nodeValue.replace(/[\u24d8\u2139ⓘ]/g, '').replace(/\s+/g, ' ').trim();
      if (!t || t === 'i' || t === 'ⓘ') continue;
      if (/^A[0-9A-Z]{12,30}$/i.test(t)) continue;
      if (t === '应用' || t === '已应用') continue;
      if (!lines.includes(t)) lines.push(t);
    }

    if (lines.length === 0) return { rawKeyword: '', displayKeyword: '' };

    const primary = lines[0];
    if (!isValidKeywordText(primary)) return { rawKeyword: '', displayKeyword: '' };

    let secondary = '';
    if (lines.length > 1 && isValidKeywordText(lines[1]) && lines[1] !== primary) {
      secondary = lines[1];
    }

    const display = secondary && !primary.includes(secondary) ? `${primary} (${secondary})` : primary;
    return { rawKeyword: primary, displayKeyword: display };
  }

  /**
   * 从单元格中提取第一个合法数值（彻底解决多数字拼接问题，并正确处理千分位与破折号）
   */
  function parseNumber(text) {
    if (text === null || text === undefined) return null;
    const str = String(text).replace(/[\u24d8\u2139ⓘ]/g, '').trim();
    if (!str || str === '-' || str === '--' || str === '—' || str === '–' || str === 'N/A') return null;

    const match = str.match(/-?\d+(?:,\d{3})*(?:\.\d+)?|-?\d+(?:[.,]\d+)?/);
    if (!match) return null;

    let token = match[0];
    if (/,\d{3}(?:\D|$)/.test(token)) {
      token = token.replace(/,/g, '');
    } else if (token.includes(',') && !token.includes('.')) {
      const parts = token.split(',');
      if (parts[1] && parts[1].length <= 2) {
        token = token.replace(',', '.');
      } else {
        token = token.replace(/,/g, '');
      }
    } else {
      token = token.replace(/,/g, '');
    }

    const num = parseFloat(token);
    return isNaN(num) ? null : num;
  }

  /**
   * 专门提取真实竞价 (Bid) 单元格的数值
   * 修复 2.1：优先读取单元格内 <input> 的 value / placeholder，绝不因 input.textContent 为空而漏读 1.06 变成 1.0！
   */
  function extractBidFromCell(bidCell) {
    if (!bidCell) return 0;

    // 1. 优先读取原生 input 输入框的值 (亚马逊后台竞价列常驻或激活态 input)
    const input = bidCell.querySelector('input[type="text"], input[type="number"], input:not([type="checkbox"]):not([type="hidden"])');
    if (input) {
      const rawVal = input.value || input.getAttribute('value') || input.getAttribute('placeholder') || '';
      const parsed = parseNumber(rawVal);
      if (parsed !== null && parsed > 0) return parsed;
    }

    // 2. 检查 data-value / aria-valuenow 属性
    const dataValEl = bidCell.querySelector('[data-value], [aria-valuenow]');
    if (dataValEl) {
      const dv = parseNumber(dataValEl.getAttribute('data-value') || dataValEl.getAttribute('aria-valuenow'));
      if (dv !== null && dv > 0) return dv;
    }

    // 3. 克隆节点，剔除“0 条规则已生效”等干扰数字后提取价格
    const clone = bidCell.cloneNode(true);
    clone.querySelectorAll('.xl-inline-badge, [class*="xl-"], script, style').forEach(el => el.remove());
    let txt = clone.textContent.replace(/\d+\s*条规则[^\d]*/g, '').replace(/\d+\s*rules?[^\d]*/gi, '').trim();

    const curMatch = txt.match(/(?:US\$|CA\$|A\$|MX\$|\$|€|£|￥|¥)\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (curMatch) {
      const val = parseNumber(curMatch[1]);
      if (val !== null && val > 0) return val;
    }

    const fallbackVal = parseNumber(txt);
    return (fallbackVal !== null && fallbackVal > 0) ? fallbackVal : 0;
  }

  /**
   * 专门提取展示量 (Impressions) 单元格的整数值
   * 修复 2.1 & 3.2 & 3.3：严格校验不含货币符号与百分号，且将 "—" / "-" 准确识别为 0 次展示量！
   */
  function extractImpressionsFromCell(impCell) {
    if (!impCell) return null;
    const clone = impCell.cloneNode(true);
    clone.querySelectorAll('.xl-inline-badge, [class*="xl-"], script, style').forEach(el => el.remove());
    const raw = clone.textContent.replace(/[\u24d8\u2139ⓘ]/g, '').trim();

    if (raw === '—' || raw === '-' || raw === '--' || raw === '–' || raw === '0') {
      return 0;
    }

    if (/(?:US\$|\$|€|£|￥|¥|%)/.test(raw)) {
      return null;
    }

    const val = parseNumber(raw);
    return (val !== null && val >= 0) ? Math.round(val) : null;
  }

  /**
   * 双向探测页面广告表格所在的虚拟滚动容器（同时支持向上查找父容器与向下查找内部 viewport）
   */
  function findTableScrollContainers() {
    const containers = [];
    const addUnique = (el) => {
      if (el && !containers.includes(el)) containers.push(el);
    };

    const candidateSelectors = [
      '[role="grid"]',
      '[role="table"]',
      'table',
      '.amz-ads-table',
      '[class*="Virtualized"]',
      '[class*="virtual"]',
      '[class*="viewport"]',
      '[class*="scroll"]',
      '[class*="table-body"]',
      '[class*="TableBody"]'
    ];

    const candidates = document.querySelectorAll(candidateSelectors.join(', '));
    candidates.forEach(el => {
      if (el.closest('#xl-floating-panel, [role="dialog"]')) return;
      const style = window.getComputedStyle(el);
      if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 20) {
        addUnique(el);
      }
      let p = el.parentElement;
      let depth = 0;
      while (p && p !== document.body && depth < 8) {
        const pStyle = window.getComputedStyle(p);
        if ((pStyle.overflowY === 'auto' || pStyle.overflowY === 'scroll') && p.scrollHeight > p.clientHeight + 20) {
          addUnique(p);
        }
        p = p.parentElement;
        depth++;
      }
    });

    const docScroll = document.scrollingElement || document.documentElement || document.body;
    if (docScroll && docScroll.scrollHeight > docScroll.clientHeight + 40) {
      addUnique(docScroll);
    }

    return containers;
  }

  /**
   * 一键极速全表快扫 (修复 3.3：按视口高度 70% 步进平滑穿透虚拟列表，确保未下拉的词也能 100% 完整捕获)
   */
  function fastScanFullTable(btn, isSilentAuto = false) {
    if (btn) btn.innerHTML = '🔄 扫描中...';

    const containers = findTableScrollContainers();
    let targetContainer = containers.find(c => c !== document.documentElement && c !== document.body) || containers[0];

    if (!targetContainer || targetContainer.scrollHeight <= targetContainer.clientHeight + 30) {
      scanAndAnnotateTables();
      if (btn) {
        btn.innerHTML = `✅ 已扫 ${XiaolinRowStore.size} 词`;
        setTimeout(() => { btn.innerHTML = '⚡ 快扫全表'; }, 2000);
      }
      if (!isSilentAuto) {
        showToast(`✅ 扫描完成！当前共识别 ${XiaolinRowStore.size} 条投放数据。`, 'success');
      }
      return;
    }

    const originalScrollTop = targetContainer.scrollTop;
    const maxScroll = targetContainer.scrollHeight - targetContainer.clientHeight;
    const stepSize = Math.max(180, Math.floor(targetContainer.clientHeight * 0.7));
    const positions = [];
    for (let pos = 0; pos < maxScroll; pos += stepSize) {
      positions.push(pos);
    }
    positions.push(maxScroll);

    let idx = 0;
    function stepScroll() {
      if (idx < positions.length) {
        targetContainer.scrollTop = positions[idx];
        targetContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
        idx++;
        setTimeout(() => {
          scanAndAnnotateTables();
          stepScroll();
        }, 95);
      } else {
        targetContainer.scrollTop = originalScrollTop;
        targetContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
        setTimeout(() => {
          scanAndAnnotateTables();
          if (btn) {
            btn.innerHTML = `✅ 已抓 ${XiaolinRowStore.size} 词`;
            setTimeout(() => { btn.innerHTML = '⚡ 快扫全表'; }, 2200);
          }
          if (!isSilentAuto) {
            showToast(`🎉 全表穿透扫描完成！共抓取 ${XiaolinRowStore.size} 个关键词/投放数据。`, 'success');
          }
        }, 100);
      }
    }

    stepScroll();
  }

  /**
   * 挂载所有虚拟滚动容器监听器 (用户手动下拉滚动时实时增量捕获并缓存)
   */
  function setupTableScrollListeners() {
    const containers = findTableScrollContainers();
    containers.forEach(container => {
      if (container && !container.__xl_scroll_bound) {
        container.__xl_scroll_bound = true;
        container.addEventListener('scroll', debounce(() => {
          if (currentSettings.isEnabled) {
            scanAndAnnotateTables();
          }
        }, 100), { passive: true });
      }
    });
  }

  /**
   * 点击 [🎯 定位] 按钮：平滑滚动定位到亚马逊后台对应行，并对关键词单元格施加醒目红金框
   */
  function scrollToAndHighlightKeyword(keyword, rowId, storeKey) {
    if (!keyword && !rowId && !storeKey) return;

    const cleanTargetKw = (keyword || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');

    function findRowInDoc() {
      if (storeKey) {
        const byKey = document.querySelector(`[data-xl-store-key="${CSS.escape(storeKey)}"]`);
        if (byKey) return byKey;
      }
      if (rowId) {
        const byId = document.querySelector(`[data-xl-row-id="${CSS.escape(rowId)}"]`);
        if (byId) return byId;
      }
      const allRows = Array.from(document.querySelectorAll('tr, [role="row"], .data-table-row'));
      for (const r of allRows) {
        const rKw = r.getAttribute('data-xl-kw') || '';
        const cleanRKw = rKw.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
        if (cleanRKw && cleanTargetKw && (cleanRKw === cleanTargetKw || cleanRKw.includes(cleanTargetKw) || cleanTargetKw.includes(cleanRKw))) {
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

    const containers = findTableScrollContainers();
    const container = containers.find(c => c !== document.documentElement && c !== document.body) || containers[0];
    if (!container) {
      showToast(`未在当前视图中找到【${keyword}】，请先点击右上角“⚡ 快扫全表”`, 'info');
      return;
    }

    const originalTop = container.scrollTop;
    const maxScroll = container.scrollHeight - container.clientHeight;
    let curr = 0;
    const step = Math.max(220, Math.floor(container.clientHeight * 0.7));

    function searchInContainer() {
      const row = findRowInDoc();
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashHighlightRow(row, keyword);
      } else if (curr < maxScroll) {
        curr = Math.min(maxScroll, curr + step);
        container.scrollTop = curr;
        container.dispatchEvent(new Event('scroll', { bubbles: true }));
        setTimeout(() => {
          scanAndAnnotateTables();
          searchInContainer();
        }, 90);
      } else {
        container.scrollTop = originalTop;
        showToast(`未在当前页面视图中找到【${keyword}】`, 'info');
      }
    }

    searchInContainer();
  }

  /**
   * 修复 1.4：触发后台行整行高亮与关键词所属单元格超级醒目红金框 (Focus Box)
   */
  function flashHighlightRow(row, kwText) {
    if (!row) return;

    document.querySelectorAll('.xl-kw-cell-focused').forEach(el => el.classList.remove('xl-kw-cell-focused'));
    document.querySelectorAll('.xl-kw-focus-flag').forEach(el => el.remove());
    document.querySelectorAll('.xl-row-highlight-pulse').forEach(el => el.classList.remove('xl-row-highlight-pulse'));

    const cells = getTopLevelCells(row);
    cells.forEach(c => {
      c.classList.remove('xl-row-highlight-pulse');
      void c.offsetWidth;
      c.classList.add('xl-row-highlight-pulse');
    });

    let kwCell = row.querySelector('[data-xl-kw-cell="true"]');
    if (!kwCell && cells.length > 0) {
      kwCell = cells.find(c => c.getAttribute('data-xl-kw-cell') === 'true') || cells[2] || cells[1] || cells[0];
    }

    if (kwCell) {
      kwCell.classList.add('xl-kw-cell-focused');
      if (!kwCell.querySelector('.xl-kw-focus-flag')) {
        const flag = document.createElement('span');
        flag.className = 'xl-kw-focus-flag';
        flag.innerHTML = '🎯 当前定位';
        kwCell.appendChild(flag);
      }
    }

    clearTimeout(row.__xl_highlight_timer);
    row.__xl_highlight_timer = setTimeout(() => {
      cells.forEach(c => c.classList.remove('xl-row-highlight-pulse'));
      if (kwCell) {
        kwCell.classList.remove('xl-kw-cell-focused');
        const flag = kwCell.querySelector('.xl-kw-focus-flag');
        if (flag) flag.remove();
      }
    }, 6000);
  }

  /**
   * 检测当前页面上下文签名（当从广告活动切换到广告组/关键词，或更改搜索过滤词时，自动清空旧页面遗留缓存）
   */
  function checkAndResetStoreOnContextChange(defaultHeaders, defaultTableType) {
    const urlPart = window.location.pathname + window.location.search + window.location.hash;
    const headerPart = (defaultHeaders || []).map(h => h.textContent.replace(/\s+/g, '').trim()).join('|');
    const searchInputs = Array.from(document.querySelectorAll('input[type="search"], input[placeholder*="找到"], input[placeholder*="搜索"], input[placeholder*="Search"], input[placeholder*="Find"]'))
      .filter(inp => !inp.closest('#xl-floating-panel'))
      .map(inp => inp.value.trim())
      .join('|');

    const signature = `${urlPart}__${defaultTableType}__${headerPart}__${searchInputs}`;
    if (lastPageContextSignature && lastPageContextSignature !== signature) {
      XiaolinRowStore.clear();
    }
    lastPageContextSignature = signature;
  }

  /**
   * 核心表格扫描与行内注解主函数
   */
  function scanAndAnnotateTables() {
    if (!currentSettings.isEnabled) {
      removeAllInlineBadges();
      return;
    }

    const defaultMapping = findTableColumnMapping();
    checkAndResetStoreOnContextChange(defaultMapping.headerCells, defaultMapping.tableType);
    setupTableScrollListeners();

    const allRows = document.querySelectorAll('tr, [role="row"], .data-table-row, [data-testid*="table-row"]');
    const passKeyCount = new Map();

    allRows.forEach((row, rowIndex) => {
      // 1. 严格排除插件自身、日历、弹窗内部的行
      if (row.closest('#xl-floating-panel, #xl-floating-launcher')) return;
      const modalParent = row.closest('[role="dialog"], [aria-modal="true"], [class*="calendar"], [class*="date-picker"], [class*="popover"], [class*="picker"]');
      if (modalParent) return;

      // 2. 严格排除表头行
      if (row.querySelector('[role="columnheader"]') || row.closest('thead')) return;
      if (row.querySelectorAll('th').length > 2 && row.querySelectorAll('td').length === 0) return;

      // 3. 严格排除表尾汇总行、总计行 (修复 1.3：绝不在“总计: 6”等汇总行贴标签)
      const rawRowText = row.textContent.replace(/\s+/g, ' ').trim();
      if (rawRowText.startsWith('总计') || rawRowText.includes('总计：') || rawRowText.includes('总计:') ||
          rawRowText.toLowerCase().startsWith('total') ||
          row.closest('tfoot') ||
          row.getAttribute('data-testid')?.includes('summary') ||
          row.getAttribute('data-testid')?.includes('total') ||
          row.classList.contains('summary-row')) {
        row.querySelectorAll('.xl-inline-badge').forEach(b => b.remove());
        return;
      }

      // 4. 获取当前行所属表格的列映射
      const parentTable = row.closest('table, [role="grid"], [role="table"]');
      let mapping = parentTable ? findTableColumnMapping(parentTable) : defaultMapping;
      if (!mapping.colMap || Object.keys(mapping.colMap).length === 0) {
        mapping = defaultMapping;
      }
      const { colMap, tableType } = mapping;

      // 5. 提取去重后的最外层单元格列表
      const cells = getTopLevelCells(row);
      if (cells.length < 4) return;

      // 检查前 3 个单元格是否为“总计”
      const firstTexts = cells.slice(0, 3).map(c => c.textContent.trim());
      if (firstTexts.some(t => t.startsWith('总计') || t.toLowerCase().startsWith('total'))) {
        row.querySelectorAll('.xl-inline-badge').forEach(b => b.remove());
        return;
      }

      const cellTexts = cells.map(c => c.textContent.trim());
      const rowFullText = cellTexts.join(' ');

      const hasCurrency = /(?:US\$|CA\$|A\$|MX\$|\$|€|£|￥|¥)/.test(rowFullText);
      const hasMatchType = cellTexts.some(t => ['短语', '广泛', '精准', 'Phrase', 'Broad', 'Exact', 'Auto', '自动'].some(m => t === m || t.includes(m)));
      const hasBudget = rowFullText.includes('每天') || rowFullText.includes('预算') || rowFullText.includes('budget');
      const hasBidInput = !!row.querySelector('input[type="text"], input[type="number"]');
      if (!hasCurrency && !hasMatchType && !hasBudget && !hasBidInput) return;

      const claimedCells = new Set();

      // ==================================================
      // 步骤 A：精准锁定第 1 列实体名称单元格 (关键词 / 广告活动名称 / 广告组名称)
      // ==================================================
      let kwCell = getCellByColumn(cells, 'keyword', mapping, claimedCells);
      let kwInfo = extractKeywordInfo(kwCell);

      // 兜底：若表头未映射成功，仅在前 3 个非复选框/非开关单元格（索引 1~3）内寻找合法关键词，绝不跨入第 4/5 列（状态/建议竞价）！
      if (!kwInfo.rawKeyword) {
        for (let i = 0; i < Math.min(cells.length, 4); i++) {
          const c = cells[i];
          if (c.querySelector('input[type="checkbox"], [role="switch"]') && c.textContent.trim().length < 3) continue;
          const info = extractKeywordInfo(c);
          if (info.rawKeyword && isValidKeywordText(info.rawKeyword)) {
            kwCell = c;
            kwInfo = info;
            break;
          }
        }
      }

      if (!kwCell || !kwInfo.rawKeyword || !isValidKeywordText(kwInfo.rawKeyword)) return;
      claimedCells.add(kwCell);

      // 清理同一行其他列可能残留的旧版错误徽章（确保徽章 100% 只出现在第 1 列名称处）
      row.querySelectorAll('.xl-inline-badge').forEach(b => {
        if (!kwCell.contains(b)) b.remove();
      });

      // ==================================================
      // 步骤 B：定位投放匹配类型 (广泛 / 短语 / 精准)
      // ==================================================
      let matchType = '';
      const matchCell = getCellByColumn(cells, 'matchType', mapping, claimedCells);
      if (matchCell) {
        const mt = matchCell.textContent.replace(/[\u24d8\u2139ⓘ]/g, '').trim();
        if (['短语', '广泛', '精准', 'Phrase', 'Broad', 'Exact', 'Auto', '自动'].some(k => mt.includes(k))) {
          matchType = mt;
          claimedCells.add(matchCell);
        }
      }
      if (!matchType) {
        for (const c of cells) {
          if (claimedCells.has(c)) continue;
          const t = c.textContent.replace(/[\u24d8\u2139ⓘ]/g, '').trim();
          if (['短语', '广泛', '精准', 'Phrase', 'Broad', 'Exact', 'Auto', '自动'].includes(t)) {
            matchType = t;
            claimedCells.add(c);
            break;
          }
        }
      }

      // 标记状态列与建议竞价列为已占用，防止后续列误匹配
      const statusCell = getCellByColumn(cells, 'status', mapping, claimedCells);
      if (statusCell) claimedCells.add(statusCell);

      let suggestedBidVal = 0;
      const suggestedBidCell = getCellByColumn(cells, 'suggestedBid', mapping, claimedCells);
      if (suggestedBidCell) {
        claimedCells.add(suggestedBidCell);
        suggestedBidVal = parseNumber(suggestedBidCell.textContent) || 0;
      }

      // ==================================================
      // 步骤 C：精准定位真实竞价列 (Bid) —— 修复 2.1 & 2.2
      // ==================================================
      row.querySelectorAll('[data-xl-bid-cell]').forEach(el => el.removeAttribute('data-xl-bid-cell'));

      let bidCell = null;
      let bid = 0;

      if (tableType !== 'campaign') {
        bidCell = getCellByColumn(cells, 'bid', mapping, claimedCells);
        if (bidCell) {
          const bTxt = bidCell.textContent || '';
          if (bTxt.includes('应用') || /\(\s*(?:US\$|\$)/.test(bTxt)) {
            bidCell = null;
          } else {
            bid = extractBidFromCell(bidCell);
          }
        }

        if (!bidCell || bid === 0) {
          const startIdx = suggestedBidCell ? (cells.indexOf(suggestedBidCell) + 1) : 4;
          for (let i = Math.max(3, startIdx); i < Math.min(cells.length, startIdx + 3); i++) {
            const c = cells[i];
            if (!c || claimedCells.has(c)) continue;
            const txt = c.textContent || '';
            if (txt.includes('应用') || txt.includes('(') || txt.includes('（') || txt.includes('%') || txt.includes('每天')) continue;
            const hasInp = !!c.querySelector('input:not([type="checkbox"])');
            const hasCur = /(?:US\$|CA\$|A\$|MX\$|\$|€|£|￥|¥)/.test(txt);
            if (hasInp || hasCur) {
              const val = extractBidFromCell(c);
              if (val > 0) {
                bidCell = c;
                bid = val;
                break;
              }
            }
          }
        }

        if (bidCell) {
          claimedCells.add(bidCell);
          bidCell.setAttribute('data-xl-bid-cell', 'true');
          if (bid > 0 && !bidCell.hasAttribute('data-xl-orig-bid')) {
            bidCell.setAttribute('data-xl-orig-bid', String(bid));
          }
          const savedOrig = parseFloat(bidCell.getAttribute('data-xl-orig-bid'));
          if (savedOrig > 0) {
            bid = savedOrig;
          }
        }
      }

      // ==================================================
      // 步骤 D：精准定位展示量列 (Impressions) —— 修复 2.1 & 3.2 & 3.3
      // ==================================================
      let impressions = 0;
      const impCell = getCellByColumn(cells, 'impressions', mapping, claimedCells);
      if (impCell) {
        const parsedImp = extractImpressionsFromCell(impCell);
        if (parsedImp !== null) {
          impressions = parsedImp;
          claimedCells.add(impCell);
        }
      }

      // ==================================================
      // 步骤 E：定位点击量、总成本、CPC、购买量、销售额、ACoS、ROAS
      // ==================================================
      let clicks = 0;
      const clkCell = getCellByColumn(cells, 'clicks', mapping, claimedCells);
      if (clkCell) {
        const clkTxt = clkCell.textContent.trim();
        if (!/(?:US\$|\$|€|£|￥|¥|%)/.test(clkTxt)) {
          clicks = parseNumber(clkTxt) || 0;
          claimedCells.add(clkCell);
        }
      }

      let spend = null;
      const spendCell = getCellByColumn(cells, 'spend', mapping, claimedCells);
      if (spendCell) {
        spend = parseNumber(spendCell.textContent);
        claimedCells.add(spendCell);
      }

      let cpc = null;
      const cpcCell = getCellByColumn(cells, 'cpc', mapping, claimedCells);
      if (cpcCell) {
        cpc = parseNumber(cpcCell.textContent);
        claimedCells.add(cpcCell);
      }

      let orders = 0;
      const ordersCell = getCellByColumn(cells, 'orders', mapping, claimedCells);
      if (ordersCell) {
        const ordTxt = ordersCell.textContent.trim();
        if (!/(?:US\$|\$|€|£|￥|¥|%)/.test(ordTxt)) {
          orders = parseNumber(ordTxt) || 0;
          claimedCells.add(ordersCell);
        }
      }

      let sales = null;
      const salesCell = getCellByColumn(cells, 'sales', mapping, claimedCells);
      if (salesCell) {
        sales = parseNumber(salesCell.textContent);
        claimedCells.add(salesCell);
      }

      let acos = null;
      const acosCell = getCellByColumn(cells, 'acos', mapping, claimedCells);
      if (acosCell) {
        const acosTxt = acosCell.textContent.trim();
        if (acosTxt.includes('%') && !acosTxt.includes('<') && !acosTxt.includes('>')) {
          acos = parseNumber(acosTxt);
        }
        claimedCells.add(acosCell);
      }

      let roas = null;
      const roasCell = getCellByColumn(cells, 'roas', mapping, claimedCells);
      if (roasCell) {
        roas = parseNumber(roasCell.textContent);
        claimedCells.add(roasCell);
      }

      // 构建唯一存储键（同一关键词不同匹配方式如 广泛/短语/精准 独立保存，绝不互相覆盖！）
      const baseStoreKey = `${tableType}__${kwInfo.rawKeyword}__${matchType || ""}`;
      const occ = (passKeyCount.get(baseStoreKey) || 0) + 1;
      passKeyCount.set(baseStoreKey, occ);
      const storeKey = occ === 1 ? baseStoreKey : `${baseStoreKey}__#${occ}`;
      const rowId = `xl-row-${rowIndex}`;
      row.setAttribute('data-xl-row-id', rowId);
      row.setAttribute('data-xl-store-key', storeKey);
      row.setAttribute('data-xl-kw', kwInfo.rawKeyword);

      const effectiveBid = bid > 0 ? bid : (cpc > 0 ? cpc : (suggestedBidVal > 0 ? suggestedBidVal : 0));

      const rowData = {
        storeKey,
        rowId,
        tableType,
        rawKeyword: kwInfo.rawKeyword,
        keyword: kwInfo.displayKeyword || kwInfo.rawKeyword,
        matchType: matchType,
        bid: effectiveBid,
        suggestedBidVal: suggestedBidVal,
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

      XiaolinRowStore.set(storeKey, rowData);

      // 单行诊断并在第 1 列注入小巧徽章
      const diag = XiaolinAnalyzer.diagnoseKeyword(rowData, currentSettings);
      if (kwCell) {
        kwCell.setAttribute('data-xl-kw-cell', 'true');
        kwCell.setAttribute('data-xl-kw-name', kwInfo.rawKeyword);
        injectInlineBadge(kwCell, kwInfo.rawKeyword, diag, row);
      }
    });

    // 汇总全局缓存池中的诊断结果
    let bleedCount = 0;
    let highAcosCount = 0;
    let goldenCount = 0;
    const diagList = [];
    const boostList = [];

    const maxImpThreshold = !isNaN(parseInt(currentSettings.boostMaxImpressions, 10)) ? parseInt(currentSettings.boostMaxImpressions, 10) : 5;
    const boostMode = currentSettings.boostMode || 'percent';
    const isUp = currentSettings.boostDir !== 'down';
    const boostPct = !isNaN(parseFloat(currentSettings.boostPercent)) ? parseFloat(currentSettings.boostPercent) : 10;
    const boostAmt = !isNaN(parseFloat(currentSettings.boostAmount)) ? parseFloat(currentSettings.boostAmount) : 0.02;

    const hasKeywordRows = Array.from(XiaolinRowStore.values()).some(r => r.tableType === "keyword");
    XiaolinRowStore.forEach((storedRow) => {
      if (hasKeywordRows && storedRow.tableType !== "keyword") return;
      const diag = XiaolinAnalyzer.diagnoseKeyword(storedRow, currentSettings);
      const baseBid = storedRow.bid > 0 ? storedRow.bid : (diag.originalBid || 1.0);

      if (diag.type === 'CRITICAL_BLEED') {
        bleedCount++;
        diagList.push({
          ...diag,
          storeKey: storedRow.storeKey,
          rowId: storedRow.rowId,
          rawKeyword: storedRow.rawKeyword,
          keyword: storedRow.keyword,
          matchType: storedRow.matchType,
          originalBid: baseBid,
          suggestedBid: diag.suggestedBid,
          impressions: storedRow.impressions,
          spend: storedRow.spend,
          orders: storedRow.orders,
          acos: storedRow.acos,
          roas: storedRow.roas
        });
      } else if (diag.type === 'HIGH_ACOS') {
        highAcosCount++;
        diagList.push({
          ...diag,
          storeKey: storedRow.storeKey,
          rowId: storedRow.rowId,
          rawKeyword: storedRow.rawKeyword,
          keyword: storedRow.keyword,
          matchType: storedRow.matchType,
          originalBid: baseBid,
          suggestedBid: diag.suggestedBid,
          impressions: storedRow.impressions,
          spend: storedRow.spend,
          orders: storedRow.orders,
          acos: storedRow.acos,
          roas: storedRow.roas
        });
      } else if (diag.type === 'GOLDEN_WINNER') {
        goldenCount++;
        diagList.push({
          ...diag,
          storeKey: storedRow.storeKey,
          rowId: storedRow.rowId,
          rawKeyword: storedRow.rawKeyword,
          keyword: storedRow.keyword,
          matchType: storedRow.matchType,
          originalBid: baseBid,
          suggestedBid: diag.suggestedBid,
          impressions: storedRow.impressions,
          spend: storedRow.spend,
          orders: storedRow.orders,
          acos: storedRow.acos,
          roas: storedRow.roas
        });
      }

      // 曝光激活列表 (仅针对关键词/商品投放层级，包含展示量 0 次 "—" 及 <= 门槛的词或自动投放词)
      if (storedRow.tableType !== 'campaign' && storedRow.tableType !== 'adgroup') {
        const kwLower = (storedRow.rawKeyword || storedRow.keyword).toLowerCase();
        const isAuto = ['紧密', '宽泛', '同类', '关联', 'close-match', 'loose-match', 'substitutes', 'complements', 'auto -'].some(term => kwLower.includes(term));
        const isLowImp = storedRow.impressions >= 0 && storedRow.impressions <= maxImpThreshold && storedRow.orders === 0 && storedRow.spend < 5;

        if ((isLowImp || isAuto) && baseBid > 0) {
          let boostedBid = 0;
          let boostDesc = '';
          if (boostMode === 'amount') {
            boostedBid = isUp ? (baseBid + boostAmt) : Math.max(0.05, baseBid - boostAmt);
            boostDesc = `${isUp ? '+' : '-'}$${boostAmt.toFixed(2)}`;
          } else {
            boostedBid = isUp ? (baseBid * (1 + boostPct / 100)) : Math.max(0.05, baseBid * (1 - boostPct / 100));
            boostDesc = `${isUp ? '+' : '-'}${boostPct}%`;
          }
          boostList.push({
            storeKey: storedRow.storeKey,
            rowId: storedRow.rowId,
            rawKeyword: storedRow.rawKeyword,
            keyword: storedRow.keyword,
            matchType: storedRow.matchType,
            originalBid: baseBid,
            impressions: storedRow.impressions,
            suggestedBid: Math.max(0.05, parseFloat(boostedBid.toFixed(2))),
            boostDesc: boostDesc,
            isAuto: isAuto
          });
        }
      }
    });

    const totalAlerts = bleedCount + highAcosCount;
    const alertCountEl = document.getElementById('xl-launcher-alert-count');
    if (alertCountEl) {
      alertCountEl.textContent = totalAlerts;
      alertCountEl.style.display = totalAlerts > 0 ? 'inline-block' : 'none';
    }

    const sumBleed = document.getElementById('xl-sum-bleed-count');
    const sumHighAcos = document.getElementById('xl-sum-high-acos-count');
    const sumGolden = document.getElementById('xl-sum-golden-count');
    if (sumBleed) sumBleed.textContent = bleedCount;
    if (sumHighAcos) sumHighAcos.textContent = highAcosCount;
    if (sumGolden) sumGolden.textContent = goldenCount;

    renderPanelDiagList(diagList);
    renderPanelBoostList(boostList);
  }

  /**
   * 修复 3.1：动态计算行内徽章 Tooltip 的 fixed 视口坐标
   * 若徽章位于表格前几行或距离视口顶部/表头底部较近，自动向下展开 (xl-tooltip-down)，彻底杜绝被表头顶住截断！
   */
  function updateInlineTooltipPosition(badge) {
    const tooltip = badge.querySelector('.xl-inline-tooltip');
    if (!tooltip) return;

    const rect = badge.getBoundingClientRect();
    let headerBottom = 80;
    const parentTable = badge.closest('table, [role="grid"], [role="table"]');
    if (parentTable) {
      const th = parentTable.querySelector('th, [role="columnheader"]');
      if (th) {
        headerBottom = Math.max(headerBottom, th.getBoundingClientRect().bottom);
      }
    }

    // 提升当前单元格与行的层级并允许溢出显示，防止相邻行遮挡
    const parentCell = badge.closest('td, th, [role="gridcell"], [role="cell"], [role="rowheader"]');
    const parentRow = badge.closest('tr, [role="row"]');
    if (parentCell) {
      parentCell.style.overflow = 'visible';
      parentCell.style.zIndex = '999';
    }
    if (parentRow) {
      parentRow.style.zIndex = '999';
    }

    // 如果徽章在表格前几行（距离表头下沿 < 180px）或距离视口顶部 < 240px，或下方空间充足，优先向下展开！
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldShowDown = (rect.top < 240) || (rect.top - headerBottom < 180) || (spaceBelow > 190);

    if (shouldShowDown) {
      tooltip.classList.remove('xl-tooltip-up');
      tooltip.classList.add('xl-tooltip-down');
    } else {
      tooltip.classList.remove('xl-tooltip-down');
      tooltip.classList.add('xl-tooltip-up');
    }
  }

  /**
   * 修复 1.3 & 3.1：在第一列（关键词/广告活动/广告组名称列）注入小巧警告徽章与自适应方向 Tooltip
   */
  function injectInlineBadge(cell, keyword, diag, row) {
    let existingBadge = cell.querySelector('.xl-inline-badge');
    if (existingBadge) {
      if (existingBadge.getAttribute('data-diag-type') === diag.type &&
          existingBadge.getAttribute('data-diag-bid') === String(diag.suggestedBid || '')) {
        return;
      }
      existingBadge.remove();
    }

    if (diag.type === 'HEALTHY') return;

    const badge = document.createElement('span');
    badge.className = `xl-inline-badge xl-badge-${diag.level}`;
    badge.setAttribute('data-keyword', keyword);
    badge.setAttribute('data-diag-type', diag.type);
    badge.setAttribute('data-diag-bid', String(diag.suggestedBid || ''));
    badge.innerHTML = `
      <span class="xl-badge-content">${diag.badge}</span>
      <div class="xl-inline-tooltip xl-tooltip-down">
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

    badge.addEventListener('mouseenter', () => {
      updateInlineTooltipPosition(badge);
    });

    badge.addEventListener('click', (e) => {
      if (e.target.closest('.xl-tip-btn')) return;
      e.stopPropagation();
      updateInlineTooltipPosition(badge);
      badge.classList.toggle('xl-pinned');
    });

    badge.querySelector('.xl-tip-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleActionExecution(diag, keyword, row || badge.closest('tr, [role="row"]'));
    });

    cell.appendChild(badge);
  }

  /**
   * 修复 2.2：自动精准定位到亚马逊真实“竞价 (Bid)”列，触发 React 原生输入与保存
   * 严禁触碰“点击量”、“展示量”、“建议竞价”等其他列，也绝不在非竞价列新建输入框！
   */
  function autoFillSuggestedBid(row, suggestedBid) {
    if (!row) return false;
    const parentTable = row.closest('table, [role="grid"], [role="table"]');
    const mapping = findTableColumnMapping(parentTable);
    const cells = getTopLevelCells(row);
    if (cells.length < 4) return false;

    let bidCell = row.querySelector('[data-xl-bid-cell="true"]');

    if (!bidCell) {
      bidCell = getCellByColumn(cells, 'bid', mapping);
    }

    // 终极安全校验：检查 bidCell 对应的表头文字，严禁误操作“点击量”、“展示量”、“建议竞价”、“总成本”列！
    if (bidCell && mapping.headerCells && mapping.headerCells.length > 0) {
      const bRect = bidCell.getBoundingClientRect();
      if (bRect.width > 0) {
        const bCenter = bRect.left + bRect.width / 2;
        const matchedHeader = mapping.headerCells.find(th => {
          const hRect = th.getBoundingClientRect();
          return hRect.width > 0 && bCenter >= hRect.left - 10 && bCenter <= hRect.right + 10;
        });
        if (matchedHeader) {
          const hTxt = matchedHeader.textContent.replace(/\s+/g, '').toLowerCase();
          if (hTxt.includes('点击') || hTxt.includes('click') ||
              hTxt.includes('展示') || hTxt.includes('impression') ||
              hTxt.includes('建议') || hTxt.includes('suggested') ||
              hTxt.includes('成本') || hTxt.includes('花费') || hTxt.includes('spend') ||
              hTxt.includes('状态') || hTxt.includes('status')) {
            bidCell = null;
          }
        }
      }
    }

    if (!bidCell) return false;

    const valStr = typeof suggestedBid === 'number' ? suggestedBid.toFixed(2) : parseFloat(suggestedBid).toFixed(2);

    const commitToNativeInput = (inputEl, containerScope) => {
      fillAndTriggerInput(inputEl, valStr);
      setTimeout(() => {
        const scope = containerScope || bidCell.parentElement || document;
        const allBtns = Array.from(scope.querySelectorAll('button, [role="button"], input[type="submit"], a'));
        const saveBtn = allBtns.find(b => {
          if (b.closest('#xl-floating-panel')) return false;
          const t = (b.textContent || b.getAttribute('aria-label') || b.getAttribute('title') || '').trim().toLowerCase();
          return t === '保存' || t === 'save' || t === '确定' || t === 'ok' || t === '✓' || t === '✔' ||
                 b.getAttribute('data-action')?.includes('save') || b.getAttribute('type') === 'submit';
        });
        if (saveBtn) {
          saveBtn.click();
        } else {
          inputEl.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
          inputEl.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        }
      }, 70);
    };

    const existingInput = bidCell.querySelector('input[type="text"], input[type="number"], input:not([type="checkbox"]):not([type="hidden"])');
    if (existingInput) {
      commitToNativeInput(existingInput, bidCell);
      return true;
    }

    const editTriggers = [
      bidCell.querySelector('[role="button"], button, [class*="editable"], [class*="edit"], [tabindex="0"]'),
      bidCell.querySelector('a, span'),
      bidCell
    ].filter(Boolean);

    editTriggers.forEach(trigger => {
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'dblclick'].forEach(evtType => {
        trigger.dispatchEvent(new MouseEvent(evtType, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
      });
    });

    const pollTimes = [50, 130, 250];
    let handled = false;

    pollTimes.forEach((delay, idx) => {
      setTimeout(() => {
        if (handled) return;
        let dynInput = bidCell.querySelector('input[type="text"], input[type="number"], input:not([type="checkbox"]):not([type="hidden"])');
        let scope = bidCell;

        if (!dynInput) {
          const popovers = Array.from(document.querySelectorAll('[role="dialog"], [role="tooltip"], [class*="popover"], [class*="overlay"], [class*="editor"]'))
            .filter(p => !p.closest('#xl-floating-panel'));
          for (const pop of popovers) {
            const inp = pop.querySelector('input[type="text"], input[type="number"], input:not([type="checkbox"]):not([type="hidden"])');
            if (inp && inp.getBoundingClientRect().width > 0) {
              dynInput = inp;
              scope = pop;
              break;
            }
          }
        }

        if (dynInput) {
          handled = true;
          commitToNativeInput(dynInput, scope);
        } else if (idx === pollTimes.length - 1) {
          const isStaticMock = document.title.includes('测试沙盒') || window.location.protocol === 'file:';
          if (isStaticMock) {
            const textTarget = bidCell.querySelector('span, a') || bidCell;
            textTarget.textContent = `US$${valStr}`;
            bidCell.style.transition = 'outline 0.2s ease, background-color 0.2s ease';
            bidCell.style.outline = '2px solid #10b981';
            bidCell.style.backgroundColor = 'rgba(16, 185, 129, 0.12)';
            bidCell.style.borderRadius = '4px';
            setTimeout(() => {
              bidCell.style.outline = 'none';
              bidCell.style.backgroundColor = 'transparent';
            }, 2200);
          }
        }
      }, delay);
    });

    return true;
  }

  /**
   * 兼容 React 16/17/18 受控组件的原生值注入器 (重置 _valueTracker 确保 React 内部 state 同步更新)
   */
  function fillAndTriggerInput(input, val) {
    if (!input) return;
    input.focus();

    const lastValue = input.value;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, val);
    } else {
      input.value = val;
    }

    const tracker = input._valueTracker;
    if (tracker) {
      tracker.setValue(lastValue);
    }

    input.dispatchEvent(new Event('focus', { bubbles: true }));
    input.dispatchEvent(new InputEvent('input', { bubbles: true, data: String(val), inputType: 'insertText' }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    ['keydown', 'keypress', 'keyup'].forEach(evtName => {
      input.dispatchEvent(new KeyboardEvent(evtName, {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      }));
    });

    input.style.border = '2px solid #10b981';
    input.style.backgroundColor = '#ecfdf5';
    input.style.color = '#065f46';
    input.style.fontWeight = 'bold';
  }

  /**
   * 轻量浮动 Toast 气泡
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
      silentHtml = `<a href="javascript:void(0)" class="xl-toast-silent-btn" title="点击后将切换为静默模式">不再提示</a>`;
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
        safeStorageSet({ adSettings: currentSettings });
        applyThemeAndStatus();
        toast.classList.remove('xl-toast-show');
        setTimeout(() => {
          toast.remove();
          showToast('已切换为静默模式：后续将直接自动填入竞价！', 'info');
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
    }, 1800);
  }

  function findRowByKeyword(kw, rowId, storeKey) {
    if (storeKey) {
      const byStore = document.querySelector(`[data-xl-store-key="${CSS.escape(storeKey)}"]`);
      if (byStore) return byStore;
    }
    if (rowId) {
      const byId = document.querySelector(`[data-xl-row-id="${CSS.escape(rowId)}"]`);
      if (byId) return byId;
    }
    if (!kw) return null;
    const allRows = document.querySelectorAll('tr, [role="row"]');
    for (const row of allRows) {
      if (row.getAttribute('data-xl-kw') === kw || row.textContent.includes(kw)) {
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
    } else if (diag.actionType === 'REDUCE_BID' || diag.actionType === 'INCREASE_BID_SMALL' || diag.actionType === 'HARVEST_EXACT') {
      const filled = autoFillSuggestedBid(row, diag.suggestedBid);
      navigator.clipboard.writeText(String(diag.suggestedBid)).catch(() => {});
      if (filled) {
        showToast(`✅ 已在竞价列填入 US$${diag.suggestedBid}！`, 'success', true);
      } else {
        showToast(`📋 已复制建议竞价 US$${diag.suggestedBid} 到剪贴板`, 'info', true);
      }
    }
  }

  /**
   * 修复 2.3：渲染【🛑 降价止损】列表
   * 所有诊断卡片（含吃预算词、高ACoS爆表词、黄金词）统一配备与【曝光激活】一致的：
   * “原竞价: US$X.XX ➔ 建议竞价: [$ 自定义输入框] [应用竞价]” 交互组件！
   */
  let lastDiagRenderSig = '';
  let lastBoostRenderSig = '';

  function renderPanelDiagList(list) {
    const container = document.getElementById('xl-diag-list-container');
    const bulkCountEl = document.getElementById('xl-bulk-bid-count');
    if (!container) return;
    if (container.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    const sig = JSON.stringify(list.map(i => [i.storeKey, i.type, i.originalBid, i.suggestedBid, i.badge]));
    if (sig === lastDiagRenderSig && container.children.length > 0) return;
    lastDiagRenderSig = sig;

    const reducibleItems = list.filter(item => item.suggestedBid > 0);
    if (bulkCountEl) bulkCountEl.textContent = reducibleItems.length;

    if (list.length === 0) {
      container.innerHTML = '<div class="xl-empty-state">✅ 自动扫描完成：当前页面所有词指标均在安全阈值内，未发现吃预算或爆表词。</div>';
      return;
    }

    container.innerHTML = list.map(item => {
      const safeDisplayKw = (item.keyword || '').replace(/"/g, '&quot;');
      const safeRawKw = (item.rawKeyword || item.keyword || '').replace(/"/g, '&quot;');
      const safeStoreKey = (item.storeKey || '').replace(/"/g, '&quot;');
      const matchBadge = item.matchType ? `<span class="xl-card-match-tag">${item.matchType}</span>` : '';
      const negateBtnHtml = item.type === 'CRITICAL_BLEED'
        ? `<button class="xl-btn-negate-inline" data-kw="${safeRawKw}" title="复制该词用于添加精准否定">复制否定</button>`
        : '';

      return `
        <div class="xl-diag-card xl-diag-card-${item.level}">
          <div class="xl-card-header">
            <div class="xl-card-kw-wrap">
              <span class="xl-card-kw" title="${safeDisplayKw}">${safeDisplayKw}</span>
              ${matchBadge}
              <button class="xl-btn-locate" data-kw="${safeRawKw}" data-row-id="${item.rowId || ''}" data-store-key="${safeStoreKey}" title="在亚马逊后台定位并用醒目红框标记该关键词">🎯 定位</button>
            </div>
            <span class="xl-card-badge">${item.badge}</span>
          </div>
          <div class="xl-card-body">${item.description}</div>
          <div class="xl-card-bid-row">
            <div class="xl-bid-compare">
              <span class="xl-bid-old">原竞价: <b>US$${(item.originalBid || 0).toFixed(2)}</b></span>
              <span class="xl-bid-arrow">➔</span>
              <span class="xl-bid-label">建议竞价:</span>
              <div class="xl-bid-input-wrap">
                <span class="xl-bid-cur">$</span>
                <input type="number" step="0.01" min="0.05" class="xl-bid-input xl-diag-bid-input" data-row-id="${item.rowId || ''}" data-store-key="${safeStoreKey}" data-kw="${safeRawKw}" value="${(item.suggestedBid || 0).toFixed(2)}" />
              </div>
            </div>
            <div class="xl-card-btn-group">
              ${negateBtnHtml}
              <button class="xl-btn-apply-one xl-btn-diag-apply" data-row-id="${item.rowId || ''}" data-store-key="${safeStoreKey}" data-kw="${safeRawKw}">
                应用竞价
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.xl-btn-locate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kw = btn.getAttribute('data-kw');
        const rowId = btn.getAttribute('data-row-id');
        const storeKey = btn.getAttribute('data-store-key');
        scrollToAndHighlightKeyword(kw, rowId, storeKey);
      });
    });

    container.querySelectorAll('.xl-btn-negate-inline').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kw = btn.getAttribute('data-kw');
        navigator.clipboard.writeText(kw).then(() => {
          showToast(`🛑 已复制精准否定词: "${kw}"`, 'info');
        });
      });
    });

    container.querySelectorAll('.xl-btn-diag-apply').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        const rowId = targetBtn.getAttribute('data-row-id');
        const storeKey = targetBtn.getAttribute('data-store-key');
        const kw = targetBtn.getAttribute('data-kw');
        const card = targetBtn.closest('.xl-diag-card');
        const input = card.querySelector('.xl-diag-bid-input');
        const newBid = parseFloat(input.value) || 0;
        if (newBid <= 0) return;

        let targetRow = findRowByKeyword(kw, rowId, storeKey);
        if (targetRow) {
          const ok = autoFillSuggestedBid(targetRow, newBid);
          if (ok) {

            targetBtn.textContent = '✅ 已应用';
            targetBtn.classList.add('xl-applied');
            setTimeout(() => {
              targetBtn.textContent = '应用竞价';
              targetBtn.classList.remove('xl-applied');
            }, 1800);
            showToast(`✅ 已将【${kw}】竞价修改为 US$${newBid.toFixed(2)}！`, 'success', true);
          } else {
            showToast(`⚠️ 当前页面未找到可编辑的竞价列（请确认在广告组-定向策略页面）`, 'info');
          }
        } else {
          scrollToAndHighlightKeyword(kw, rowId, storeKey);
          setTimeout(() => {
            const freshRow = findRowByKeyword(kw, rowId, storeKey);
            if (freshRow && autoFillSuggestedBid(freshRow, newBid)) {
              targetBtn.textContent = '✅ 已应用';
              targetBtn.classList.add('xl-applied');
              setTimeout(() => {
                targetBtn.textContent = '应用竞价';
                targetBtn.classList.remove('xl-applied');
              }, 1800);
              showToast(`✅ 已定位并将【${kw}】竞价修改为 US$${newBid.toFixed(2)}！`, 'success', true);
            }
          }, 320);
        }
      });
    });

    const btnBulkApplyBids = document.getElementById('xl-btn-bulk-apply-bids');
    if (btnBulkApplyBids) {
      btnBulkApplyBids.onclick = () => {
        const inputs = container.querySelectorAll('.xl-diag-bid-input');
        let count = 0;
        inputs.forEach(input => {
          const rowId = input.getAttribute('data-row-id');
          const storeKey = input.getAttribute('data-store-key');
          const kw = input.getAttribute('data-kw');
          const newBid = parseFloat(input.value) || 0;
          const targetRow = findRowByKeyword(kw, rowId, storeKey);
          if (targetRow && newBid > 0 && autoFillSuggestedBid(targetRow, newBid)) {
            count++;
            const cardBtn = input.closest('.xl-diag-card')?.querySelector('.xl-btn-diag-apply');
            if (cardBtn) {
              cardBtn.textContent = '✅ 已应用';
              cardBtn.classList.add('xl-applied');
            }
          }
        });
        if (count > 0) {
          showToast(`🎉 已成功批量修改 ${count} 个关键词的竞价！`, 'success');
        } else {
          showToast('当前视图未找到可直接修改竞价的行，请先定位或滚动到对应行。', 'info');
        }
      };
    }
  }

  /**
   * 渲染【💤 曝光激活】列表 (展示量 <= 设定门槛 [含 0 次] 或自动广告投放)
   */
  function renderPanelBoostList(list) {
    const container = document.getElementById('xl-boost-list-container');
    const countEl = document.getElementById('xl-boost-count');
    if (countEl) countEl.textContent = list.length;
    if (!container) return;
    if (container.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    const sig = JSON.stringify(list.map(i => [i.storeKey, i.impressions, i.originalBid, i.suggestedBid, i.boostDesc]));
    if (sig === lastBoostRenderSig && container.children.length > 0) return;
    lastBoostRenderSig = sig;

    if (list.length === 0) {
      container.innerHTML = '<div class="xl-empty-state">✅ 当前未发现展示量低于门槛的关键词或自动广告投放。</div>';
      return;
    }

    container.innerHTML = list.map(item => {
      const safeDisplayKw = (item.keyword || '').replace(/"/g, '&quot;');
      const safeRawKw = (item.rawKeyword || item.keyword || '').replace(/"/g, '&quot;');
      const safeStoreKey = (item.storeKey || '').replace(/"/g, '&quot;');
      const matchBadge = item.matchType ? `<span class="xl-card-match-tag">${item.matchType}</span>` : '';

      return `
        <div class="xl-diag-card xl-diag-card-info">
          <div class="xl-card-header">
            <div class="xl-card-kw-wrap">
              <span class="xl-card-kw" title="${safeDisplayKw}">${safeDisplayKw}</span>
              ${matchBadge}
              <button class="xl-btn-locate" data-kw="${safeRawKw}" data-row-id="${item.rowId || ''}" data-store-key="${safeStoreKey}" title="在亚马逊后台定位并用醒目红框标记该关键词">🎯 定位</button>
            </div>
            <span class="xl-card-badge" style="background:#e0f2fe;color:#0369a1;font-weight:bold;">
              ${item.isAuto ? '🤖 自动投放' : '💤 展示量'}: ${item.impressions}次
            </span>
          </div>
          <div class="xl-card-body" style="font-size:11px;color:#64748b;margin-bottom:6px;">
            当前展示量 ${item.impressions} 次（曝光受限），建议微调竞价 ${item.boostDesc} 激活算法抓取与曝光权重。
          </div>
          <div class="xl-card-bid-row">
            <div class="xl-bid-compare">
              <span class="xl-bid-old">原竞价: <b>US$${(item.originalBid || 0).toFixed(2)}</b></span>
              <span class="xl-bid-arrow">➔</span>
              <span class="xl-bid-label">建议竞价:</span>
              <div class="xl-bid-input-wrap">
                <span class="xl-bid-cur">$</span>
                <input type="number" step="0.01" min="0.05" class="xl-bid-input xl-boost-bid-input" data-row-id="${item.rowId || ''}" data-store-key="${safeStoreKey}" data-kw="${safeRawKw}" value="${(item.suggestedBid || 0).toFixed(2)}" />
              </div>
            </div>
            <button class="xl-btn-apply-one xl-btn-boost-apply" data-row-id="${item.rowId || ''}" data-store-key="${safeStoreKey}" data-kw="${safeRawKw}">
              应用竞价
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.xl-btn-locate').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const kw = btn.getAttribute('data-kw');
        const rowId = btn.getAttribute('data-row-id');
        const storeKey = btn.getAttribute('data-store-key');
        scrollToAndHighlightKeyword(kw, rowId, storeKey);
      });
    });

    container.querySelectorAll('.xl-btn-boost-apply').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        const rowId = targetBtn.getAttribute('data-row-id');
        const storeKey = targetBtn.getAttribute('data-store-key');
        const kw = targetBtn.getAttribute('data-kw');
        const card = targetBtn.closest('.xl-diag-card');
        const input = card.querySelector('.xl-boost-bid-input');
        const newBid = parseFloat(input.value) || 0;
        if (newBid <= 0) return;

        let targetRow = findRowByKeyword(kw, rowId, storeKey);
        if (targetRow) {
          const ok = autoFillSuggestedBid(targetRow, newBid);
          if (ok) {

            targetBtn.textContent = '✅ 已应用';
            targetBtn.classList.add('xl-applied');
            setTimeout(() => {
              targetBtn.textContent = '应用竞价';
              targetBtn.classList.remove('xl-applied');
            }, 1800);
            showToast(`✅ 已将【${kw}】竞价修改为 US$${newBid.toFixed(2)}！`, 'success', true);
          } else {
            showToast(`⚠️ 当前页面未找到可编辑的竞价列`, 'info');
          }
        } else {
          scrollToAndHighlightKeyword(kw, rowId, storeKey);
          setTimeout(() => {
            const freshRow = findRowByKeyword(kw, rowId, storeKey);
            if (freshRow && autoFillSuggestedBid(freshRow, newBid)) {
              targetBtn.textContent = '✅ 已应用';
              targetBtn.classList.add('xl-applied');
              setTimeout(() => {
                targetBtn.textContent = '应用竞价';
                targetBtn.classList.remove('xl-applied');
              }, 1800);
              showToast(`✅ 已定位并将【${kw}】竞价修改为 US$${newBid.toFixed(2)}！`, 'success', true);
            }
          }, 320);
        }
      });
    });

    const btnBulkBoost = document.getElementById('xl-btn-bulk-apply-boost');
    if (btnBulkBoost) {
      btnBulkBoost.onclick = () => {
        const inputs = container.querySelectorAll('.xl-boost-bid-input');
        let count = 0;
        inputs.forEach(input => {
          const rowId = input.getAttribute('data-row-id');
          const storeKey = input.getAttribute('data-store-key');
          const kw = input.getAttribute('data-kw');
          const newBid = parseFloat(input.value) || 0;
          const targetRow = findRowByKeyword(kw, rowId, storeKey);
          if (targetRow && newBid > 0 && autoFillSuggestedBid(targetRow, newBid)) {
            count++;
            const cardBtn = input.closest('.xl-diag-card')?.querySelector('.xl-btn-boost-apply');
            if (cardBtn) {
              cardBtn.textContent = '✅ 已应用';
              cardBtn.classList.add('xl-applied');
            }
          }
        });
        if (count > 0) {
          showToast(`🎉 已成功批量提高 ${count} 个低曝光词的竞价！`, 'success');
        } else {
          showToast('未检测到当前视图中可直接提价的行。', 'info');
        }
      };
    }
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

      const rect = element.getBoundingClientRect();
      element.style.transform = 'none';
      element.style.top = rect.top + 'px';
      element.style.left = rect.left + 'px';
      element.style.right = 'auto';
      element.style.bottom = 'auto';

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
      element.style.top = Math.max(10, Math.min(window.innerHeight - 60, element.offsetTop - pos2)) + 'px';
      element.style.left = Math.max(10, Math.min(window.innerWidth - 100, element.offsetLeft - pos1)) + 'px';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

})();
