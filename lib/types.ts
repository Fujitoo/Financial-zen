
export interface User {
  id: string;
  email: string;
  name: string;
  preferences: {
    currency: string;
    theme: 'dark' | 'light';
  };
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string; // Foreign key
  amount: number;
  currency: string;
  date: string; // ISO 8601
  category: string;
  merchant: string;
  description: string;
  tags: string[];
  isRecurring: boolean;
  aiMetadata?: {
    confidence: number;
    originalPrompt: string;
    modelUsed: string;
  };
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  limitAmount: number;
  period: 'monthly' | 'weekly';
  spent: number; // Calculated field
}

export interface AiParseResponse {
  transaction: Partial<Transaction>;
  confidence: number;
  reasoning: string;
}

// Analytics Types
export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrend {
  date: string;
  amount: number;
}

export interface AnalyticsSummary {
  totalSpent: number;
  burnRate: number; // vs previous month
  topCategories: CategorySpending[];
  trend: MonthlyTrend[];
}
