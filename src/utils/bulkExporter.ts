import * as XLSX from 'xlsx';
import { RawBulkRow, BidAdjustmentAction, NegativeTargetAction, HarvestAction } from '../types/amazon';
import { ParseResult } from './amazonBulkParser';

/**
 * Standardize match type to Amazon Ads Bulksheet valid values:
 * exact, phrase, broad, negativeExact, negativePhrase
 */
function toAmazonMatchType(type: string): string {
  const t = String(type || '').toLowerCase().trim();
  if (t.includes('negativeexact') || t.includes('否定精准')) return 'negativeExact';
  if (t.includes('negativephrase') || t.includes('否定短语') || t.includes('否定词组')) return 'negativePhrase';
  if (t.includes('exact') || t.includes('精准')) return 'exact';
  if (t.includes('phrase') || t.includes('短语') || t.includes('词组')) return 'phrase';
  if (t.includes('broad') || t.includes('广泛')) return 'broad';
  return 'exact';
}

/**
 * Export 100% Amazon Bulksheet compliant Excel file.
 * NOTE: MUST NOT include any non-Amazon sheets like "本次调整诊断明细",
 * and the first three columns MUST strictly be: Product, Entity, Operation.
 */
export function exportUpdatedBulkFile(
  parseResult: ParseResult | null,
  bidActions: BidAdjustmentAction[],
  negativeActions: NegativeTargetAction[],
  _harvestActions: HarvestAction[]
): void {
  const selectedBids = bidActions.filter(b => b.selected);
  const selectedNegatives = negativeActions.filter(n => n.selected);

  let exportWorkbook: XLSX.WorkBook = XLSX.utils.book_new();

  if (parseResult && parseResult.workbook && parseResult.rawRows.length > 0) {
    const originalRows: RawBulkRow[] = JSON.parse(JSON.stringify(parseResult.rawRows));
    let targetSheetName = parseResult.sheetName;

    // Check if the original sheet is an actual Amazon Bulk sheet
    const firstRow = originalRows[0] || {};
    const firstRowKeys = Object.keys(firstRow).map(k => k.trim().toLowerCase());
    const hasProductCol = firstRowKeys.some(k => k === 'product' || k === '产品');
    const hasEntityCol = firstRowKeys.some(k => k === 'entity' || k === '实体' || k === '实体层级');
    const hasOperationCol = firstRowKeys.some(k => k === 'operation' || k === '操作');

    const isRealBulkFormat = hasProductCol && hasEntityCol && hasOperationCol;

    if (isRealBulkFormat) {
      // Build a map of row updates
      const bidUpdatesMap = new Map<number, number>();
      selectedBids.forEach(action => {
        const finalBid = action.userCustomBid !== undefined ? action.userCustomBid : action.currentBid;
        bidUpdatesMap.set(action.item.originalRowIndex, finalBid);
      });

      // Update existing rows
      originalRows.forEach((row, index) => {
        if (bidUpdatesMap.has(index)) {
          const newBid = bidUpdatesMap.get(index);
          const bidKey = Object.keys(row).find(k => ['bid', '出价', '竞价'].includes(k.trim().toLowerCase())) || '竞价';
          row[bidKey] = newBid;

          const opKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'operation' || k.trim().toLowerCase() === '操作') || 'Operation';
          row[opKey] = 'Update';
        }
      });

      // Append new negative keyword rows to the sheet using original column names
      const sampleRow = originalRows[0] || {};
      const keys = Object.keys(sampleRow);
      const getColName = (cands: string[], fallback: string) => 
        keys.find(k => cands.includes(k.trim().toLowerCase())) || fallback;

      const productCol = getColName(['product', '产品'], 'Product');
      const entityCol = getColName(['entity', '实体', '实体层级'], 'Entity');
      const opCol = getColName(['operation', '操作'], 'Operation');
      const campIdCol = getColName(['campaign id', '广告活动编号', '广告活动 id'], 'Campaign Id');
      const adGroupIdCol = getColName(['ad group id', '广告组编号', '广告组 id'], 'Ad Group Id');
      const stateCol = getColName(['state', '状态'], 'State');
      const kwTextCol = getColName(['keyword text', '关键词文本', '关键词'], 'Keyword Text');
      const matchCol = getColName(['match type', '匹配类型'], 'Match Type');

      selectedNegatives.forEach(neg => {
        const newNegRow: RawBulkRow = {};
        newNegRow[productCol] = 'Sponsored Products';
        newNegRow[entityCol] = neg.type === 'negative_product' ? 'Negative Product Targeting' : 'Negative Keyword';
        newNegRow[opCol] = 'Create';
        newNegRow[campIdCol] = neg.campaignId;
        newNegRow[adGroupIdCol] = neg.adGroupId;
        newNegRow[stateCol] = 'enabled';
        newNegRow[kwTextCol] = neg.keywordText;
        newNegRow[matchCol] = neg.type === 'negative_phrase' ? 'negativePhrase' : 'negativeExact';
        
        originalRows.push(newNegRow);
      });

      const newWorksheet = XLSX.utils.json_to_sheet(originalRows);
      XLSX.utils.book_append_sheet(exportWorkbook, newWorksheet, targetSheetName);

      // Copy other original sheets if present (e.g., Portfolios)
      parseResult.workbook.SheetNames.forEach(sheet => {
        if (sheet !== targetSheetName && parseResult.workbook.Sheets[sheet]) {
          XLSX.utils.book_append_sheet(exportWorkbook, parseResult.workbook.Sheets[sheet], sheet);
        }
      });
    } else {
      // Original was a Targeting CSV or report without Product/Entity/Operation headers.
      // We generate the STRICT Amazon Bulksheet 2.0/3.0 format:
      // First 3 columns MUST be: Product, Entity, Operation!
      generateStandardAmazonBulksheet(exportWorkbook, selectedBids, selectedNegatives);
    }
  } else {
    // Generate clean standalone Bulk format
    generateStandardAmazonBulksheet(exportWorkbook, selectedBids, selectedNegatives);
  }

  // NOTE: We intentionally DO NOT append "本次调整诊断明细" to avoid Amazon upload error:
  // "工作表'本次调整诊断明细'中的列标题无效。如果您不打算上传该工作表，请将其删除并尝试重新上传文件。"

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `Amazon_Bulk_Update_Ready_${dateStr}.xlsx`;

  XLSX.writeFile(exportWorkbook, fileName);
}

/**
 * Generate standard Amazon Bulksheet 2.0/3.0 structure
 * Required front columns: Product, Entity, Operation
 */
function generateStandardAmazonBulksheet(
  workbook: XLSX.WorkBook,
  selectedBids: BidAdjustmentAction[],
  selectedNegatives: NegativeTargetAction[]
) {
  const rows: RawBulkRow[] = [];

  // Rows for bid updates
  selectedBids.forEach(action => {
    const finalBid = action.userCustomBid !== undefined ? action.userCustomBid : action.currentBid;
    rows.push({
      'Product': 'Sponsored Products',
      'Entity': action.item.entity === 'Product Targeting' ? 'Product Targeting' : 'Keyword',
      'Operation': 'Update',
      'Campaign Id': action.item.campaignId,
      'Ad Group Id': action.item.adGroupId,
      'Keyword Id': action.item.id,
      'Campaign Name': action.item.campaignName,
      'Ad Group Name': action.item.adGroupName,
      'Keyword Text': action.item.keywordText,
      'Match Type': toAmazonMatchType(action.item.matchType),
      'Bid': finalBid,
      'State': 'enabled'
    });
  });

  // Rows for negative keywords
  selectedNegatives.forEach(neg => {
    rows.push({
      'Product': 'Sponsored Products',
      'Entity': neg.type === 'negative_product' ? 'Negative Product Targeting' : 'Negative Keyword',
      'Operation': 'Create',
      'Campaign Id': neg.campaignId,
      'Ad Group Id': neg.adGroupId,
      'Campaign Name': neg.campaignName,
      'Keyword Text': neg.keywordText,
      'Match Type': neg.type === 'negative_phrase' ? 'negativePhrase' : 'negativeExact',
      'State': 'enabled'
    });
  });

  const newWorksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, newWorksheet, 'Sponsored Products Campaigns');
}

/**
 * Separate function to export detailed diagnostic report for seller manual review
 */
export function exportAuditReviewFile(
  bidActions: BidAdjustmentAction[],
  negativeActions: NegativeTargetAction[],
  harvestActions: HarvestAction[]
): void {
  const selectedBids = bidActions.filter(b => b.selected);
  const selectedNegatives = negativeActions.filter(n => n.selected);

  const exportWorkbook = XLSX.utils.book_new();

  const auditReportRows = [
    ...selectedBids.map(b => ({
      '调整类别': '出价调整',
      '关键词/投放': b.item.keywordText,
      '匹配类型': b.item.matchTypeDisplay,
      '原出价 ($)': b.currentBid,
      '最终调价 ($)': b.userCustomBid !== undefined ? b.userCustomBid : b.currentBid,
      '调整幅度': `${b.bidChangePercent}%`,
      '亚马逊建议中位价': b.item.suggestedBidMed ? `$${b.item.suggestedBidMed}` : '-',
      '花费 ($)': b.item.spend,
      '订单量': b.item.orders,
      '当前ACOS': `${b.item.acos}%`,
      '调价依据': b.reason
    })),
    ...selectedNegatives.map(n => ({
      '调整类别': '止血否定',
      '关键词/投放': n.keywordText,
      '匹配类型': n.item.matchTypeDisplay,
      '原出价 ($)': '-',
      '最终调价 ($)': '加入精准否定',
      '调整幅度': '止血否定',
      '亚马逊建议中位价': '-',
      '花费 ($)': n.wastedSpend,
      '订单量': 0,
      '当前ACOS': '999% (0单亏损)',
      '调价依据': n.reason
    })),
    ...harvestActions.filter(h => h.selected).map(h => ({
      '调整类别': '优质收割',
      '关键词/投放': h.keywordText,
      '匹配类型': h.sourceMatchType,
      '原出价 ($)': '-',
      '最终调价 ($)': `$${h.suggestedBid} (新建精准)`,
      '调整幅度': '新建精准组',
      '亚马逊建议中位价': '-',
      '花费 ($)': h.spend,
      '订单量': h.orders,
      '当前ACOS': `${h.acos}%`,
      '调价依据': h.reason
    }))
  ];

  const auditSheet = XLSX.utils.json_to_sheet(auditReportRows);
  XLSX.utils.book_append_sheet(exportWorkbook, auditSheet, '调价复盘诊断明细');

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `晓林Amz_调价复盘明细_${dateStr}.xlsx`;

  XLSX.writeFile(exportWorkbook, fileName);
}
