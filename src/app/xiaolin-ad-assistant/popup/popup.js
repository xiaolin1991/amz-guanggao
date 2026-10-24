/**
 * 晓林广告助手 - Popup 交互逻辑 (v1.2.0)
 * 技术支持：曹晓林 13575948278
 */

document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  // 助手总开关 DOM
  const btnPopupMasterToggle = document.getElementById('btnPopupMasterToggle');
  const popupStatusDot = document.getElementById('popupStatusDot');
  const popupStatusText = document.getElementById('popupStatusText');

  // 主题切换 DOM
  const btnThemeLight = document.getElementById('btnThemeLight');
  const btnThemeDark = document.getElementById('btnThemeDark');

  // 指标模式 DOM
  const btnModeAcos = document.getElementById('btnModeAcos');
  const btnModeRoas = document.getElementById('btnModeRoas');
  const groupAcosAlert = document.getElementById('groupAcosAlert');
  const groupRoasAlert = document.getElementById('groupRoasAlert');

  // 调价算法与提示方式 DOM
  const btnStrategySmooth = document.getElementById('btnStrategySmooth');
  const btnStrategyBreakeven = document.getElementById('btnStrategyBreakeven');
  const btnPromptToast = document.getElementById('btnPromptToast');
  const btnPromptSilent = document.getElementById('btnPromptSilent');

  // 参数输入 DOM
  const maxSpendZeroOrder = document.getElementById('maxSpendZeroOrder');
  const highAcosThreshold = document.getElementById('highAcosThreshold');
  const lowRoasThreshold = document.getElementById('lowRoasThreshold');
  const harvestMinOrders = document.getElementById('harvestMinOrders');
  const stepDownPercent = document.getElementById('stepDownPercent');
  const stepUpPercent = document.getElementById('stepUpPercent');
  const boostMaxImpressions = document.getElementById('boostMaxImpressions');
  const boostPercent = document.getElementById('boostPercent');
  
  const productPrice = document.getElementById('productPrice');
  const profitMargin = document.getElementById('profitMargin');
  const targetAcos = document.getElementById('targetAcos');
  const cvrEstimate = document.getElementById('cvrEstimate');
  const calcMaxCpcDisplay = document.getElementById('calcMaxCpcDisplay');
  const displayTargetRoas = document.getElementById('displayTargetRoas');

  const aiApiKey = document.getElementById('aiApiKey');
  const aiApiUrl = document.getElementById('aiApiUrl');
  const aiModel = document.getElementById('aiModel');

  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const saveToast = document.getElementById('saveToast');
  const btnCopyPhone = document.getElementById('btnCopyPhone');
  const phoneNum = document.getElementById('phoneNum');

  let currentSettings = {
    isEnabled: true,
    theme: 'light',
    metricMode: 'acos',
    bidStrategy: 'smooth',
    silentMode: false,
    stepDownPercent: 10,
    stepUpPercent: 10
  };

  // 1. 选项卡切换
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(btn.getAttribute('data-tab'));
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // 2. 助手总开关控制 (开启/暂停)
  btnPopupMasterToggle.addEventListener('click', () => {
    currentSettings.isEnabled = !currentSettings.isEnabled;
    updateMasterSwitchUI(currentSettings.isEnabled);
    saveAndBroadcastSettings();
  });

  function updateMasterSwitchUI(enabled) {
    if (enabled) {
      btnPopupMasterToggle.className = 'btn-master-toggle active';
      btnPopupMasterToggle.textContent = '已开启';
      popupStatusDot.className = 'status-dot active';
      popupStatusText.textContent = '助手提醒状态：🟢 运行中';
    } else {
      btnPopupMasterToggle.className = 'btn-master-toggle paused';
      btnPopupMasterToggle.textContent = '已暂停';
      popupStatusDot.className = 'status-dot paused';
      popupStatusText.textContent = '助手提醒状态：⏸️ 已暂停提醒';
    }
  }

  // 3. 主题选择 (浅色明亮 / 深色极客)
  btnThemeLight.addEventListener('click', () => {
    setTheme('light');
    saveAndBroadcastSettings();
  });

  btnThemeDark.addEventListener('click', () => {
    setTheme('dark');
    saveAndBroadcastSettings();
  });

  function setTheme(theme) {
    currentSettings.theme = theme;
    if (theme === 'light') {
      btnThemeLight.classList.add('active');
      btnThemeDark.classList.remove('active');
    } else {
      btnThemeDark.classList.add('active');
      btnThemeLight.classList.remove('active');
    }
  }

  // 4. 指标偏好切换 (ACoS vs ROAS)
  btnModeAcos.addEventListener('click', () => {
    setMetricMode('acos');
  });

  btnModeRoas.addEventListener('click', () => {
    setMetricMode('roas');
  });

  function setMetricMode(mode) {
    currentSettings.metricMode = mode;
    if (mode === 'acos') {
      btnModeAcos.classList.add('active');
      btnModeRoas.classList.remove('active');
      groupAcosAlert.style.display = 'block';
      groupRoasAlert.style.display = 'none';
    } else {
      btnModeRoas.classList.add('active');
      btnModeAcos.classList.remove('active');
      groupAcosAlert.style.display = 'none';
      groupRoasAlert.style.display = 'block';
    }
  }

  // 5. 调价策略与提示方式切换
  btnStrategySmooth.addEventListener('click', () => setBidStrategy('smooth'));
  btnStrategyBreakeven.addEventListener('click', () => setBidStrategy('breakeven'));

  function setBidStrategy(strategy) {
    currentSettings.bidStrategy = strategy;
    if (strategy === 'smooth') {
      btnStrategySmooth.classList.add('active');
      btnStrategyBreakeven.classList.remove('active');
    } else {
      btnStrategyBreakeven.classList.add('active');
      btnStrategySmooth.classList.remove('active');
    }
  }

  btnPromptToast.addEventListener('click', () => setSilentMode(false));
  btnPromptSilent.addEventListener('click', () => setSilentMode(true));

  function setSilentMode(silent) {
    currentSettings.silentMode = silent;
    if (!silent) {
      btnPromptToast.classList.add('active');
      btnPromptSilent.classList.remove('active');
    } else {
      btnPromptSilent.classList.add('active');
      btnPromptToast.classList.remove('active');
    }
  }

  // 6. 动态测算保本出价与目标 ROAS
  function updateCalculatedBid() {
    const price = parseFloat(productPrice.value) || 0;
    const acos = (parseFloat(targetAcos.value) || 0) / 100;
    const cvr = (parseFloat(cvrEstimate.value) || 0) / 100;
    
    const maxCpc = price * acos * cvr;
    calcMaxCpcDisplay.textContent = `$${maxCpc.toFixed(2)}`;

    const troas = acos > 0 ? (1 / acos) : 3.33;
    if (displayTargetRoas) displayTargetRoas.textContent = troas.toFixed(2);
  }

  [productPrice, targetAcos, cvrEstimate].forEach(input => {
    input.addEventListener('input', updateCalculatedBid);
  });

  // 7. 读取持久化配置
  chrome.storage.local.get(['adSettings'], (result) => {
    if (result.adSettings) {
      const s = result.adSettings;
      currentSettings.isEnabled = s.isEnabled !== false;
      currentSettings.theme = s.theme || 'light';
      currentSettings.metricMode = s.metricMode || 'acos';
      currentSettings.bidStrategy = s.bidStrategy || 'smooth';
      currentSettings.silentMode = s.silentMode === true;

      updateMasterSwitchUI(currentSettings.isEnabled);
      setTheme(currentSettings.theme);
      setMetricMode(currentSettings.metricMode);
      setBidStrategy(currentSettings.bidStrategy);
      setSilentMode(currentSettings.silentMode);

      if (s.maxSpendZeroOrder !== undefined) maxSpendZeroOrder.value = s.maxSpendZeroOrder;
      if (s.highAcosThreshold !== undefined) highAcosThreshold.value = s.highAcosThreshold;
      if (s.lowRoasThreshold !== undefined) lowRoasThreshold.value = s.lowRoasThreshold;
      if (s.harvestMinOrders !== undefined) harvestMinOrders.value = s.harvestMinOrders;
      if (s.stepDownPercent !== undefined) stepDownPercent.value = s.stepDownPercent;
      if (s.stepUpPercent !== undefined) stepUpPercent.value = s.stepUpPercent;
      if (s.boostMaxImpressions !== undefined) boostMaxImpressions.value = s.boostMaxImpressions;
      if (s.boostPercent !== undefined) boostPercent.value = s.boostPercent;
      if (s.productPrice !== undefined) productPrice.value = s.productPrice;
      if (s.profitMargin !== undefined) profitMargin.value = s.profitMargin;
      if (s.targetAcos !== undefined) targetAcos.value = s.targetAcos;
      if (s.cvrEstimate !== undefined) cvrEstimate.value = s.cvrEstimate;

      if (s.aiApiKey !== undefined) aiApiKey.value = s.aiApiKey;
      if (s.aiApiUrl !== undefined) aiApiUrl.value = s.aiApiUrl;
      if (s.aiModel !== undefined) aiModel.value = s.aiModel;

      updateCalculatedBid();
    }
  });

  // 8. 保存配置并广播
  function saveAndBroadcastSettings(showToast = false) {
    const newSettings = {
      isEnabled: currentSettings.isEnabled,
      theme: currentSettings.theme,
      metricMode: currentSettings.metricMode,
      bidStrategy: currentSettings.bidStrategy,
      silentMode: currentSettings.silentMode,
      stepDownMode: currentSettings.stepDownMode || 'percent',
      stepDownPercent: parseFloat(stepDownPercent.value) || 15,
      stepDownAmount: currentSettings.stepDownAmount !== undefined ? currentSettings.stepDownAmount : 0.02,
      stepUpPercent: parseFloat(stepUpPercent.value) || 10,
      boostMaxImpressions: parseInt(boostMaxImpressions.value, 10) || 5,
      boostMode: currentSettings.boostMode || 'percent',
      boostPercent: parseFloat(boostPercent.value) || 10,
      boostAmount: currentSettings.boostAmount !== undefined ? currentSettings.boostAmount : 0.02,
      maxSpendZeroOrder: parseFloat(maxSpendZeroOrder.value) || 15,
      highAcosThreshold: parseFloat(highAcosThreshold.value) || 55,
      lowRoasThreshold: parseFloat(lowRoasThreshold.value) || 1.8,
      harvestMinOrders: parseInt(harvestMinOrders.value, 10) || 2,
      productPrice: parseFloat(productPrice.value) || 29.99,
      profitMargin: parseFloat(profitMargin.value) || 40,
      targetAcos: parseFloat(targetAcos.value) || 30,
      targetRoas: (parseFloat(targetAcos.value) || 30) > 0 ? (100 / (parseFloat(targetAcos.value) || 30)) : 3.33,
      cvrEstimate: parseFloat(cvrEstimate.value) || 10,
      aiApiKey: aiApiKey.value.trim(),
      aiApiUrl: aiApiUrl.value.trim() || 'https://api.deepseek.com/v1/chat/completions',
      aiModel: aiModel.value.trim() || 'deepseek-chat'
    };

    chrome.storage.local.set({ adSettings: newSettings }, () => {
      if (showToast) {
        saveToast.style.display = 'block';
        setTimeout(() => {
          saveToast.style.display = 'none';
        }, 2000);
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'settingsUpdated',
            settings: newSettings
          }).catch(() => {});
        }
      });
    });
  }

  btnSaveSettings.addEventListener('click', () => {
    saveAndBroadcastSettings(true);
  });

  // 8. 复制技术支持电话
  btnCopyPhone.addEventListener('click', () => {
    const text = phoneNum.textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
      const originText = btnCopyPhone.textContent;
      btnCopyPhone.textContent = '已复制!';
      btnCopyPhone.style.background = '#10b981';
      setTimeout(() => {
        btnCopyPhone.textContent = originText;
        btnCopyPhone.style.background = '#334155';
      }, 1500);
    });
  });
});
