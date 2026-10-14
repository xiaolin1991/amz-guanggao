import * as XLSX from 'xlsx';
import { NormalizedAdItem, RawBulkRow } from '../types/amazon';

// Column mappings across Chinese and English Amazon Bulk files
const FIELD_CANDIDATES = {
  entity: ['entity', '实体', '记录类型', 'record type'],
  campaignId: ['campaign id', '广告活动编号', '广告活动 id', 'campaignid'],
  campaignName: ['campaign name', '广告活动名称', 'campaign name (informational only)'],
  adGroupId: ['ad group id', '广告组编号', '广告组 id', 'adgroupid'],
  adGroupName: ['ad group name', '广告组名称', 'ad group name (informational only)'],
  keywordId: ['keyword id', '关键词编号', '关键词 id', 'keywordid', 'target id', '投放编号'],
  keywordText: ['keyword text', '关键词文本', '关键词', 'keyword or product targeting', 'customer search term', '客户搜索词', 'product targeting expression', '商品投放表达式', 'targeting expression'],
  matchType: ['match type', '匹配类型', 'matchtype'],
  state: ['state', '状态', 'status'],
  bid: ['bid', '出价', 'keyword bid', 'bid (informational only)', 'max cpc'],
  
  impressions: ['impressions', '曝光量', '展现量'],
  clicks: ['clicks', '点击量', '点击数'],
  spend: ['spend', '花费', '支出', 'cost'],
  orders: ['7 day total orders (#)', '14 day total orders (#)', '7天总订单量(#)', '14天总订单量(#)', 'orders', '订单量', '7-day total orders (#)'],
  sales: ['7 day total sales ($)', '14 day total sales ($)', '7天总销售额($)', '14天总销售额($)', 'sales', '销售额', '7-day total sales ($)'],
  cpc: ['cpc', '平均每次点击费用', 'cost per click'],
  acos: ['acos', 'acos (informational only)', '广告成本销售比'],
  roas: ['roas', 'roas (informational only)', '广告支出回报率']
};

function findFieldValue(row: RawBulkRow, candidateKeys: string[]): any {
  const rowKeys = Object.keys(row);
  for (const candidate of candidateKeys) {
    const matchedKey = rowKeys.find(k => k.trim().toLowerCase() === candidate);
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
      return row[matchedKey];
    }
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

export interface ParseResult {
  sheetName: string;
  workbook: XLSX.WorkBook;
  items: NormalizedAdItem[];
  rawRows: RawBulkRow[];
  totalRowCount: number;
}

export function parseAmazonExcel(fileBuffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  
  // Find the primary Sponsored Products sheet or first sheet with data
  let targetSheetName = workbook.SheetNames[0];
  const preferredNames = [
    'sponsored products campaigns',
    'sponsored products',
    '商品推广活动',
    '商品推广',
    'sp campaigns',
    'search term report',
    '搜索词报告'
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

  rawRows.forEach((row, index) => {
    const entityRaw = String(findFieldValue(row, FIELD_CANDIDATES.entity) || '').trim();
    const keywordTextRaw = findFieldValue(row, FIELD_CANDIDATES.keywordText);
    
    // Normalize entity
    let entity: any = 'Other';
    const lowerEntity = entityRaw.toLowerCase();
    if (lowerEntity.includes('campaign negative keyword')) entity = 'Campaign Negative Keyword';
    else if (lowerEntity.includes('negative keyword') || lowerEntity.includes('否定关键词')) entity = 'Negative Keyword';
    else if (lowerEntity.includes('keyword') || lowerEntity.includes('关键词')) entity = 'Keyword';
    else if (lowerEntity.includes('product targeting') || lowerEntity.includes('商品投放')) entity = 'Product Targeting';
    else if (lowerEntity.includes('campaign') || lowerEntity.includes('广告活动')) entity = 'Campaign';
    else if (lowerEntity.includes('ad group') || lowerEntity.includes('广告组')) entity = 'Ad Group';
    else if (keywordTextRaw) {
      // If it's a Search Term report or simplified table without 'Entity' column
      entity = 'Keyword';
    }

    // Only process actionable targeting items (Keywords, Product Targeting, or rows with keyword text and clicks/spend)
    const isTargeting = entity === 'Keyword' || entity === 'Product Targeting';
    const hasSearchTerm = Boolean(keywordTextRaw);

    if (!isTargeting && !hasSearchTerm) {
      return;
    }

    const campaignId = String(findFieldValue(row, FIELD_CANDIDATES.campaignId) || '');
    const campaignName = String(findFieldValue(row, FIELD_CANDIDATES.campaignName) || '未命名广告活动');
    const adGroupId = String(findFieldValue(row, FIELD_CANDIDATES.adGroupId) || '');
    const adGroupName = String(findFieldValue(row, FIELD_CANDIDATES.adGroupName) || '未命名广告组');
    const keywordId = String(findFieldValue(row, FIELD_CANDIDATES.keywordId) || `row_${index}`);
    const matchType = String(findFieldValue(row, FIELD_CANDIDATES.matchType) || 'broad').toLowerCase();
    const state = String(findFieldValue(row, FIELD_CANDIDATES.state) || 'enabled').toLowerCase();
    
    const bid = parseNumber(findFieldValue(row, FIELD_CANDIDATES.bid), 0);
    const impressions = parseNumber(findFieldValue(row, FIELD_CANDIDATES.impressions), 0);
    const clicks = parseNumber(findFieldValue(row, FIELD_CANDIDATES.clicks), 0);
    const spend = parseNumber(findFieldValue(row, FIELD_CANDIDATES.spend), 0);
    const orders = parseNumber(findFieldValue(row, FIELD_CANDIDATES.orders), 0);
    const sales = parseNumber(findFieldValue(row, FIELD_CANDIDATES.sales), 0);
    
    const cpc = clicks > 0 ? Number((spend / clicks).toFixed(2)) : parseNumber(findFieldValue(row, FIELD_CANDIDATES.cpc), 0);
    const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
    const cvr = clicks > 0 ? Number(((orders / clicks) * 100).toFixed(2)) : 0;
    
    let acos = 0;
    if (sales > 0) {
      acos = Number(((spend / sales) * 100).toFixed(2));
    } else if (spend > 0) {
      acos = 999.9; // Infinitely high if spend > 0 and 0 sales
    }
    
    const roas = spend > 0 ? Number((sales / spend).toFixed(2)) : 0;

    items.push({
      id: keywordId,
      originalRowIndex: index,
      entity,
      campaignId,
      campaignName,
      adGroupId,
      adGroupName,
      keywordText: String(keywordTextRaw || '').trim(),
      matchType,
      state: state || 'enabled',
      currentBid: bid,
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
