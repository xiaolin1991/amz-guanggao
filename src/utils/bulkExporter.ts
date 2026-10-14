import * as XLSX from 'xlsx';
import { RawBulkRow, BidAdjustmentAction, NegativeTargetAction, HarvestAction } from '../types/amazon';
import { ParseResult } from './amazonBulkParser';

export function exportUpdatedBulkFile(
  parseResult: ParseResult | null,
  bidActions: BidAdjustmentAction[],
  negativeActions: NegativeTargetAction[],
  harvestActions: HarvestAction[]
): void {
  const selectedBids = bidActions.filter(b => b.selected);
  const selectedNegatives = negativeActions.filter(n => n.selected);

  let exportWorkbook: XLSX.WorkBook;
  let targetSheetName = 'Sponsored Products Campaigns';

  if (parseResult && parseResult.workbook && parseResult.rawRows.length > 0) {
    // Clone original workbook to preserve multi-sheet structure and untouched columns
    exportWorkbook = XLSX.utils.book_new();
    const originalRows: RawBulkRow[] = JSON.parse(JSON.stringify(parseResult.rawRows));
    targetSheetName = parseResult.sheetName;

    // Build a map of row updates
    const bidUpdatesMap = new Map<number, number>();
    selectedBids.forEach(action => {
      const finalBid = action.userCustomBid !== undefined ? action.userCustomBid : action.suggestedBid;
      bidUpdatesMap.set(action.item.originalRowIndex, finalBid);
    });

    // Update existing rows
    originalRows.forEach((row, index) => {
      if (bidUpdatesMap.has(index)) {
        const newBid = bidUpdatesMap.get(index);
        
        // Find the bid key
        const bidKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'bid' || k.trim().toLowerCase() === '出价') || 'Bid';
        row[bidKey] = newBid;

        // Set Operation to Update
        const opKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'operation' || k.trim().toLowerCase() === '操作') || 'Operation';
        row[opKey] = 'Update';
      }
    });

    // Append new negative keyword rows to the sheet
    const sampleRow = originalRows[0] || {};
    const keys = Object.keys(sampleRow);
    const getColName = (cands: string[], fallback: string) => 
      keys.find(k => cands.includes(k.trim().toLowerCase())) || fallback;

    const entityCol = getColName(['entity', '实体'], 'Entity');
    const opCol = getColName(['operation', '操作'], 'Operation');
    const campIdCol = getColName(['campaign id', '广告活动编号'], 'Campaign Id');
    const adGroupIdCol = getColName(['ad group id', '广告组编号'], 'Ad Group Id');
    const stateCol = getColName(['state', '状态'], 'State');
    const kwTextCol = getColName(['keyword text', '关键词文本', '关键词'], 'Keyword Text');
    const matchCol = getColName(['match type', '匹配类型'], 'Match Type');

    selectedNegatives.forEach(neg => {
      const newNegRow: RawBulkRow = {};
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

    // Copy any other sheets from original workbook if present
    parseResult.workbook.SheetNames.forEach(sheet => {
      if (sheet !== targetSheetName && parseResult.workbook.Sheets[sheet]) {
        XLSX.utils.book_append_sheet(exportWorkbook, parseResult.workbook.Sheets[sheet], sheet);
      }
    });
  } else {
    // Generate clean standalone Bulk format
    exportWorkbook = XLSX.utils.book_new();
    const rows: RawBulkRow[] = [];

    // Rows for bid updates
    selectedBids.forEach(action => {
      const finalBid = action.userCustomBid !== undefined ? action.userCustomBid : action.suggestedBid;
      rows.push({
        'Entity': action.item.entity || 'Keyword',
        'Operation': 'Update',
        'Campaign Id': action.item.campaignId,
        'Ad Group Id': action.item.adGroupId,
        'Keyword Id': action.item.id,
        'Keyword Text': action.item.keywordText,
        'Match Type': action.item.matchType,
        'Bid': finalBid,
        'State': 'enabled'
      });
    });

    // Rows for negative keywords
    selectedNegatives.forEach(neg => {
      rows.push({
        'Entity': neg.type === 'negative_product' ? 'Negative Product Targeting' : 'Negative Keyword',
        'Operation': 'Create',
        'Campaign Id': neg.campaignId,
        'Ad Group Id': neg.adGroupId,
        'Keyword Text': neg.keywordText,
        'Match Type': neg.type === 'negative_phrase' ? 'negativePhrase' : 'negativeExact',
        'State': 'enabled'
      });
    });

    const newWorksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(exportWorkbook, newWorksheet, 'Sponsored Products Campaigns');
  }

  // Also create a "优化建议明细汇总" sheet for easy reading
  const auditReportRows = [
    ...selectedBids.map(b => ({
      '类别': '出价调整',
      '关键词/投放': b.item.keywordText,
      '广告活动': b.item.campaignName,
      '原出价 ($)': b.currentBid,
      '调整后出价 ($)': b.userCustomBid !== undefined ? b.userCustomBid : b.suggestedBid,
      '调整幅度': `${b.bidChangePercent}%`,
      '花费 ($)': b.item.spend,
      '订单量': b.item.orders,
      '当前ACOS': `${b.item.acos}%`,
      '调整原因': b.reason
    })),
    ...selectedNegatives.map(n => ({
      '类别': '止血否定',
      '关键词/投放': n.keywordText,
      '广告活动': n.campaignName,
      '原出价 ($)': '-',
      '调整后出价 ($)': '加入否定投放',
      '调整幅度': '精准否定',
      '花费 ($)': n.wastedSpend,
      '订单量': 0,
      '当前ACOS': '999% (0单)',
      '调整原因': n.reason
    })),
    ...harvestActions.filter(h => h.selected).map(h => ({
      '类别': '优质收割',
      '关键词/投放': h.keywordText,
      '广告活动': h.sourceCampaignName,
      '原出价 ($)': '-',
      '调整后出价 ($)': `$${h.suggestedBid} (建精准)`,
      '调整幅度': '建议新建精准组',
      '花费 ($)': h.spend,
      '订单量': h.orders,
      '当前ACOS': `${h.acos}%`,
      '调整原因': h.reason
    }))
  ];

  const auditSheet = XLSX.utils.json_to_sheet(auditReportRows);
  XLSX.utils.book_append_sheet(exportWorkbook, auditSheet, '本次调整诊断明细');

  // Format date filename
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `Amazon_Bulk_Adjusted_${dateStr}.xlsx`;

  XLSX.writeFile(exportWorkbook, fileName);
}
