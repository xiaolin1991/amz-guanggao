import * as XLSX from 'xlsx';
import { NormalizedAdItem, RawBulkRow } from '../types/amazon';

function findMatchingKey(rowKeys: string[], candidates: string[]): string | undefined {
  // 1. Exact match (case-insensitive, trimmed)
  for (const c of candidates) {
    const found = rowKeys.find(k => k.trim().toLowerCase() === c.trim().toLowerCase());
    if (found) return found;
  }
  // 2. Normalized match (remove units like (USD), ($), (低), (中), (高), (#), spaces, underscores)
  const clean = (s: string) => s.replace(/[\(\)（）usd$#\s_]/gi, '').toLowerCase();
  for (const c of candidates) {
    const cleanedC = clean(c);
    const found = rowKeys.find(k => clean(k) === cleanedC);
    if (found) return found;
  }
  // 3. Substring match
  for (const c of candidates) {
    const lowerC = c.toLowerCase();
    const found = rowKeys.find(k => k.toLowerCase().includes(lowerC));
    if (found) return found;
  }
  return undefined;
}

function getRowValue(row: RawBulkRow, candidates: string[]): any {
  const rowKeys = Object.keys(row);
  const matchedKey = findMatchingKey(rowKeys, candidates);
  if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
    return row[matchedKey];
  }
  return undefined;
}

function parseNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/[$,¥%]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? fallback : parsed;
}

function formatMatchTypeDisplay(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower.includes('精准') || lower === 'exact') return '精准 (Exact)';
  if (lower.includes('短语') || lower === 'phrase') return '短语 (Phrase)';
  if (lower.includes('广泛') || lower === 'broad') return '广泛 (Broad)';
  if (lower.includes('asin') || lower.includes('商品') || lower.includes('targeting')) return '商品投放 (ASIN)';
  return raw || '广泛 (Broad)';
}

export interface ParseResult {
  sheetName: string;
  workbook: XLSX.WorkBook;
  items: NormalizedAdItem[];
  rawRows: RawBulkRow[];
  totalRowCount: number;
}

export function parseAmazonExcel(fileBuffer: ArrayBuffer, fileNameFallback?: string): ParseResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  
  // Find the primary sheet with data
  let targetSheetName = workbook.SheetNames[0];
  const preferredNames = [
    'sponsored products campaigns',
    'sponsored products',
    '商品推广活动',
    '商品推广',
    'sp campaigns',
    'search term report',
    '搜索词报告',
    'target',
    'targets',
    '投放'
  ];

  for (const name of workbook.SheetNames) {
    if (preferredNames.some(p => name.toLowerCase().includes(p))) {
      targetSheetName = name;
      break;
    }
  }

  const worksheet = workbook.Sheets[targetSheetName];
  if (!worksheet) {
    throw new Error('无法读取表格内容，工作表为空');
  }

  const rawRows = XLSX.utils.sheet_to_json<RawBulkRow>(worksheet, { defval: '' });
  const items: NormalizedAdItem[] = [];

  // Candidate field names covering both Amazon Bulk Sheet and Seller Central Target/Search Term exports
  const CANDIDATES = {
    entity: ['entity', '实体', '记录类型', 'record type'],
    campaignId: ['campaign id', '广告活动编号', '广告活动 id', 'campaignid'],
    campaignName: ['campaign name', '广告活动名称', '广告活动', 'campaign name (informational only)'],
    adGroupId: ['ad group id', '广告组编号', '广告组 id', 'adgroupid'],
    adGroupName: ['ad group name', '广告组名称', '广告组', 'ad group name (informational only)'],
    keywordId: ['keyword id', '关键词编号', '关键词 id', 'keywordid', 'target id', '投放编号'],
    
    keywordText: [
      '关键词',
      'keyword text',
      'keyword',
      'customer search term',
      '客户搜索词',
      'keyword or product targeting',
      '关键词或商品投放',
      'product targeting expression',
      '商品投放表达式',
      'targeting expression'
    ],
    matchType: ['投放匹配类型', '匹配类型', 'match type', 'matchtype'],
    state: ['状态', 'state', 'status'],
    
    // Bid & Suggested Bids
    bid: ['竞价 (usd)', '竞价', '出价 (usd)', '出价', 'bid', 'keyword bid', 'bid (informational only)', 'max cpc'],
    suggestedBidLow: ['建议竞价 (低)(usd)', '建议竞价 (低)', 'suggested bid (low)'],
    suggestedBidMed: ['建议竞价 (中)(usd)', '建议竞价 (中)', 'suggested bid (median)'],
    suggestedBidHigh: ['建议竞价 (高)(usd)', '建议竞价 (高)', 'suggested bid (high)'],
    
    // Impression & Share
    impressions: ['展示量', '曝光量', '展现量', 'impressions', '展示'],
    topOfSearchShare: ['搜索结果首页首位展示量份额', 'top-of-search impression share', '首页展示份额'],
    campaignStatusDetail: ['状态_1', '广告活动状态', 'campaign status detail'],

    // Clicks & CTR
    clicks: ['点击量', '点击数', 'clicks', '点击'],
    ctr: ['点击率', 'ctr'],

    // Spend & CPC
    spend: ['总成本 (usd)', '总成本', '花费 (usd)', '花费', '支出 (usd)', '支出', 'spend', 'cost'],
    cpc: ['cpc (usd)', 'cpc', '平均每次点击费用', 'cost per click'],

    // Orders & Sales
    orders: [
      '购买量',
      '7天总订单量(#)',
      '14天总订单量(#)',
      '7天总订单量',
      '14天总订单量',
      'orders',
      '订单量',
      '订单',
      '购买次数',
      '7-day total orders (#)'
    ],
    sales: [
      '销售额 (usd)',
      '销售额',
      '7天总销售额($)',
      '14天总销售额($)',
      '7天总销售额',
      '14天总销售额',
      'sales',
      '7-day total sales ($)'
    ],

    // Ratios
    acos: ['acos', 'acos (informational only)', '广告成本销售比'],
    roas: ['roas', 'roas (informational only)', '投入产出比', '广告支出回报率']
  };

  const defaultCampaignName = fileNameFallback 
    ? fileNameFallback.replace(/\.[^/.]+$/, '').replace(/[_\-\.]+/g, ' ') 
    : '商品推广 (SP投放)';

  rawRows.forEach((row, index) => {
    const keywordTextRaw = getRowValue(row, CANDIDATES.keywordText);
    const entityRaw = String(getRowValue(row, CANDIDATES.entity) || '').trim();

    // Determine Entity
    let entity: any = 'Other';
    const lowerEntity = entityRaw.toLowerCase();
    if (lowerEntity.includes('campaign negative keyword')) entity = 'Campaign Negative Keyword';
    else if (lowerEntity.includes('negative keyword') || lowerEntity.includes('否定关键词')) entity = 'Negative Keyword';
    else if (lowerEntity.includes('keyword') || lowerEntity.includes('关键词')) entity = 'Keyword';
    else if (lowerEntity.includes('product targeting') || lowerEntity.includes('商品投放')) entity = 'Product Targeting';
    else if (lowerEntity.includes('campaign') || lowerEntity.includes('广告活动')) entity = 'Campaign';
    else if (lowerEntity.includes('ad group') || lowerEntity.includes('广告组')) entity = 'Ad Group';
    else if (keywordTextRaw) {
      entity = 'Keyword';
    }

    const isTargeting = entity === 'Keyword' || entity === 'Product Targeting';
    const hasSearchTerm = Boolean(keywordTextRaw);

    if (!isTargeting && !hasSearchTerm) {
      return;
    }

    const campaignId = String(getRowValue(row, CANDIDATES.campaignId) || `camp_${index}`);
    const campaignName = String(getRowValue(row, CANDIDATES.campaignName) || defaultCampaignName);
    const adGroupId = String(getRowValue(row, CANDIDATES.adGroupId) || `ag_${index}`);
    const adGroupName = String(getRowValue(row, CANDIDATES.adGroupName) || '默认广告组');
    const keywordId = String(getRowValue(row, CANDIDATES.keywordId) || `row_${index}`);
    const rawMatchType = String(getRowValue(row, CANDIDATES.matchType) || 'broad').trim();
    const matchTypeDisplay = formatMatchTypeDisplay(rawMatchType);
    const state = String(getRowValue(row, CANDIDATES.state) || 'enabled').trim().toLowerCase();

    const bid = parseNumber(getRowValue(row, CANDIDATES.bid), 0);
    const suggestedBidLow = parseNumber(getRowValue(row, CANDIDATES.suggestedBidLow), 0);
    const suggestedBidMed = parseNumber(getRowValue(row, CANDIDATES.suggestedBidMed), 0);
    const suggestedBidHigh = parseNumber(getRowValue(row, CANDIDATES.suggestedBidHigh), 0);
    const topOfSearchShare = String(getRowValue(row, CANDIDATES.topOfSearchShare) || '-');
    const campaignStatusDetail = String(getRowValue(row, CANDIDATES.campaignStatusDetail) || '');

    const impressions = parseNumber(getRowValue(row, CANDIDATES.impressions), 0);
    const clicks = parseNumber(getRowValue(row, CANDIDATES.clicks), 0);
    const spend = parseNumber(getRowValue(row, CANDIDATES.spend), 0);
    const orders = parseNumber(getRowValue(row, CANDIDATES.orders), 0);
    const sales = parseNumber(getRowValue(row, CANDIDATES.sales), 0);

    // Calculate or parse CPC
    let cpc = parseNumber(getRowValue(row, CANDIDATES.cpc), 0);
    if (cpc === 0 && clicks > 0 && spend > 0) {
      cpc = Number((spend / clicks).toFixed(2));
    }

    // Calculate CTR (%)
    let ctr = parseNumber(getRowValue(row, CANDIDATES.ctr), 0);
    if (ctr > 0 && ctr < 1) {
      ctr = Number((ctr * 100).toFixed(2)); // convert 0.0037 to 0.37%
    } else if (ctr === 0 && impressions > 0) {
      ctr = Number(((clicks / impressions) * 100).toFixed(2));
    }

    // Calculate CVR (%)
    const cvr = clicks > 0 ? Number(((orders / clicks) * 100).toFixed(2)) : 0;

    // Calculate ACOS (%)
    let acos = 0;
    const rawAcos = parseNumber(getRowValue(row, CANDIDATES.acos), 0);
    if (sales > 0 && spend > 0) {
      acos = Number(((spend / sales) * 100).toFixed(2));
    } else if (rawAcos > 0) {
      acos = rawAcos < 10 ? Number((rawAcos * 100).toFixed(2)) : Number(rawAcos.toFixed(2));
    } else if (spend > 0 && orders === 0) {
      acos = 999.9; // Severe loss, spent money with 0 orders
    }

    // Calculate ROAS
    let roas = 0;
    const rawRoas = parseNumber(getRowValue(row, CANDIDATES.roas), 0);
    if (spend > 0 && sales > 0) {
      roas = Number((sales / spend).toFixed(2));
    } else if (rawRoas > 0) {
      roas = Number(rawRoas.toFixed(2));
    }

    items.push({
      id: keywordId,
      originalRowIndex: index,
      entity,
      campaignId,
      campaignName,
      adGroupId,
      adGroupName,
      keywordText: String(keywordTextRaw || '').trim(),
      matchType: rawMatchType,
      matchTypeDisplay,
      state: state || 'enabled',
      currentBid: bid,
      suggestedBidLow,
      suggestedBidMed,
      suggestedBidHigh,
      topOfSearchShare,
      campaignStatusDetail,
      impressions,
      clicks,
      spend,
      orders,
      sales,
      cpc,
      ctr,
      cvr,
      acos,
      roas,
      raw: row
    });
  });

  return {
    sheetName: targetSheetName,
    workbook,
    items,
    rawRows,
    totalRowCount: rawRows.length
  };
}
