/**
 * 晓林广告助手 - 亚马逊实时搜索下拉词挖掘模块
 * 技术支持：曹晓林 13575948278
 */

const XiaolinAutosuggest = {
  /**
   * 向后台发送请求获取单个词的官方下拉建议
   */
  async fetchSuggestions(keyword) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'fetchAmazonSuggestions', keyword },
        (response) => {
          if (response && response.success) {
            resolve(response.suggestions || []);
          } else {
            resolve([]);
          }
        }
      );
    });
  },

  /**
   * 深度拓词：根词 + A-Z 深度扩展
   * @param {string} seedKeyword - 产品核心根词 (例如 "wireless earbuds")
   * @param {function} onProgress - 进度回调
   */
  async expandDeepKeywords(seedKeyword, onProgress) {
    if (!seedKeyword || !seedKeyword.trim()) return [];

    const root = seedKeyword.trim();
    const resultsSet = new Set();

    // 1. 先抓取根词自身的基础下拉
    if (onProgress) onProgress('正在抓取核心基础热搜词...');
    const baseList = await this.fetchSuggestions(root);
    baseList.forEach(w => resultsSet.add(w));

    // 2. 抓取常见高转化意向修饰词
    const highIntentModifiers = ['for', 'with', 'best', 'small', 'waterproof', 'pro'];
    for (let i = 0; i < highIntentModifiers.length; i++) {
      const mod = highIntentModifiers[i];
      if (onProgress) onProgress(`正在拓展长尾场景词 (${i + 1}/${highIntentModifiers.length}): "${root} ${mod}"`);
      const subList = await this.fetchSuggestions(`${root} ${mod}`);
      subList.forEach(w => resultsSet.add(w));
    }

    // 3. 整理结果格式化输出
    const finalKeywords = Array.from(resultsSet).map(kw => {
      const wordCount = kw.split(/\s+/).length;
      let intentType = '长尾精准词';
      if (wordCount <= 2) intentType = '高频大词';
      else if (kw.includes('for ') || kw.includes('with ')) intentType = '场景修饰词';

      return {
        keyword: kw,
        wordCount,
        intentType
      };
    });

    return finalKeywords;
  }
};

if (typeof window !== 'undefined') {
  window.XiaolinAutosuggest = XiaolinAutosuggest;
}
