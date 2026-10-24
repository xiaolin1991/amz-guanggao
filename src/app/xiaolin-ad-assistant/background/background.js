/**
 * 晓林广告助手 - 后台服务工作线程 (Background Service Worker)
 * 技术支持：曹晓林 13575948278
 */

// 初始化默认配置
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['adSettings'], (result) => {
    if (!result.adSettings) {
      chrome.storage.local.set({
        adSettings: {
          targetAcos: 30,          // 目标 ACoS (%)
          maxSpendZeroOrder: 15,   // 吃预算阈值：花费超过此金额且0单即预警 ($)
          highAcosThreshold: 55,   // 高 ACoS 警戒线 (%)
          harvestMinOrders: 2,     // 黄金词收割单量门槛
          productPrice: 29.99,     // 默认客单价 ($)
          profitMargin: 40,        // 默认毛利率 (%)
          cvrEstimate: 10,         // 默认转化率 (%)
          aiApiKey: '',            // DeepSeek/OpenAI API Key
          aiApiUrl: 'https://api.deepseek.com/v1/chat/completions',
          aiModel: 'deepseek-chat'
        }
      });
    }
  });
});

// 处理跨域请求转发与 API 调用
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. 抓取亚马逊官方搜索下拉补全词
  if (request.action === 'fetchAmazonSuggestions') {
    const keyword = encodeURIComponent(request.keyword || '');
    const market = request.market || 'ATVPDKIKX0DER'; // 默认美站
    const url = `https://completion.amazon.com/api/2017/suggestions?mid=${market}&alias=aps&prefix=${keyword}&suggestion-type=KEYWORD`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const suggestions = (data.suggestions || []).map(s => s.value);
        sendResponse({ success: true, suggestions });
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // 异步响应
  }

  // 2. 调用 AI 进行关键词分类与卖点拆解
  if (request.action === 'callAiKeywordGenerator') {
    const { apiKey, apiUrl, model, prompt } = request;
    if (!apiKey) {
      sendResponse({ success: false, error: '未配置 AI API Key，请在插件设置中填入' });
      return true;
    }

    fetch(apiUrl || 'https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一名顶级亚马逊广告运营操盘手。擅长通过产品卖点提炼精准转化词、长尾属性词、以及必须排除的预置否定词。请以标准 JSON 格式输出结果。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.choices && data.choices[0]) {
          sendResponse({ success: true, content: data.choices[0].message.content });
        } else if (data.error) {
          sendResponse({ success: false, error: data.error.message });
        } else {
          sendResponse({ success: false, error: 'AI 接口返回格式异常' });
        }
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});
