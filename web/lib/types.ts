export type PatternAccount = {
  name: string;
  type: string;
  ending_number: string;
  billing_date?: string;
  patterns?: Array<{
    label?: string;
    regex: string[];
    map: Record<string, string>;
  }>;
  regex?: string[];
  map?: Record<string, string>;
};

export type Transaction = {
  accountId: string;
  bank: string;
  type: string;
  amount?: string;
  merchant?: string;
  account?: string;
  date?: string;
  card?: string;
  dateEpoch?: string;
  dateParsed?: string;
};

export type Report = {
  reportDate: string;
  summary: {
    totalEmailsProcessed: number;
    successfullyParsed: number;
  };
  transactions: Transaction[];
};
