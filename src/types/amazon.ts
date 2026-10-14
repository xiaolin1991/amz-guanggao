export type EntityType = 
  | 'Campaign'
  | 'Ad Group'
  | 'Keyword'
  | 'Product Targeting'
  | 'Negative Keyword'
  | 'Campaign Negative Keyword'
  | 'Negative Product Targeting'
  | 'Campaign Negative Product Targeting'
  | 'Bidding Adjustment'
  | 'Other';

export interface RawBulkRow {
  [key: string]: any;
}

export interface NormalizedAdItem {
  id: string; // keyword id, target id, or synthetic row id
  originalRowIndex: number;
  entity: EntityType;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  keywordText: string;
  matchType: string; // raw match type
  matchTypeDisplay: string; // e.g., '短语 (Phrase)', '精准 (Exact)', '广泛 (Broad)'
  state: 'enabled' | 'paused' | 'archived' | string;
  currentBid: number;
  
  // Amazon suggested bids if present in CSV
  suggestedBidLow?: number;
  suggestedBidMed?: number;
  suggestedBidHigh?: number;
  topOfSearchShare?: string; // e.g. '<5%'
  campaignStatusDetail?: string; // e.g. '商品推广超出预算'
  
  // Performance metrics
  impressions: number;
  clicks: number;
  spend: number;
  orders: number;
  sales: number;
  cpc: number;
  ctr: number; // in percentage, e.g., 0.37 for 0.37%
  cvr: number; // in percentage
  acos: number; // in percentage, e.g., 191.55 for 191.55%
  roas: number;
  
  // Raw row preserved for untouched columns during re-export
  raw: RawBulkRow;
}

export interface OptimizerConfig {
  targetAcos: number;              // Target ACOS %, e.g., 28%
  zeroOrderClickThreshold: number; // Clicks >= this and 0 orders -> Bleeding negative
  maxBidDecreasePercent: number;   // Max single decrease %, e.g., 30% to prevent traffic free-fall
  minBidFloor: number;             // Minimum bid floor, e.g., $0.15
  autoHarvestExact: boolean;       // Recommend harvesting to exact
  harvestMinOrders: number;        // Orders >= this and ACOS <= target -> Golden keyword
}

export interface BidAdjustmentAction {
  id: string;
  item: NormalizedAdItem;
  type: 'decrease_bid' | 'increase_bid' | 'zero_impression_boost' | 'observation' | 'pause';
  currentBid: number;
  suggestedBid: number;
  bidChangePercent: number;
  reason: string;
  selected: boolean;
  userCustomBid?: number;
}

export interface NegativeTargetAction {
  id: string;
  item: NormalizedAdItem;
  type: 'negative_exact' | 'negative_phrase' | 'negative_product';
  keywordText: string;
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  wastedSpend: number;
  clicks: number;
  reason: string;
  selected: boolean;
}

export interface HarvestAction {
  id: string;
  item: NormalizedAdItem;
  keywordText: string;
  sourceCampaignName: string;
  sourceMatchType: string;
  orders: number;
  sales: number;
  spend: number;
  acos: number;
  suggestedBid: number;
  reason: string;
  selected: boolean;
}

export interface DiagnosisSummary {
  totalSpend: number;
  totalSales: number;
  overallAcos: number;
  totalOrders: number;
  totalClicks: number;
  averageCpc: number;
  
  // Bleeding analysis
  wastedSpend: number;               // Total money burnt on 0-order keywords
  wastedSpendPercent: number;        // % of total spend that went down the drain
  bleedingKeywordsCount: number;
  
  // Actions count
  highAcosItemsCount: number;
  zeroImpressionItemsCount: number;
  harvestItemsCount: number;
  potentialMonthlySavings: number;
}
