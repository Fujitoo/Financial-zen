
import { db } from './store';
import { parseTransactionWithAI, scanReceiptWithAI, askFinancialCoach } from './ai';
import { Transaction, Budget, User, AnalyticsSummary } from './types';

// Standardized API Response
type ApiResponse<T> = {
  data?: T;
  error?: string;
  status: number;
};

// --- AUTH CONTROLLER ---
export const AuthService = {
  currentUserId: 'guest_user', // Mock session for Phase 2 frontend compatibility

  async getSession(): Promise<User> {
    const user = await db.getUser(this.currentUserId);
    if (!user) throw new Error('Session invalid');
    return user;
  }
};

// --- TRANSACTION CONTROLLER ---
export const TransactionService = {
  async getAll(): Promise<ApiResponse<Transaction[]>> {
    try {
      const data = await db.getTransactions(AuthService.currentUserId);
      return { data, status: 200 };
    } catch (e) {
      return { error: 'Failed to fetch transactions', status: 500 };
    }
  },

  async create(payload: Partial<Transaction>): Promise<ApiResponse<Transaction>> {
    try {
      const user = await AuthService.getSession();
      
      const newTx: Transaction = {
        id: Math.random().toString(36).substring(2, 11),
        userId: user.id,
        amount: payload.amount || 0,
        currency: payload.currency || user.preferences.currency,
        date: payload.date || new Date().toISOString(),
        category: payload.category || 'Uncategorized',
        merchant: payload.merchant || 'Unknown',
        description: payload.description || '',
        tags: payload.tags || [],
        isRecurring: payload.isRecurring || false,
        aiMetadata: payload.aiMetadata
      };

      const saved = await db.createTransaction(newTx);
      return { data: saved, status: 201 };
    } catch (e) {
      return { error: 'Creation failed', status: 500 };
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    await db.deleteTransaction(id, AuthService.currentUserId);
    return { status: 200 };
  },

  // AI-Powered Endpoints
  async parseNaturalLanguage(input: string): Promise<ApiResponse<Partial<Transaction>>> {
    const result = await parseTransactionWithAI(input);
    return { data: result.transaction, status: 200 };
  },

  async uploadReceipt(fileBase64: string, mimeType: string): Promise<ApiResponse<Partial<Transaction>>> {
    const result = await scanReceiptWithAI(fileBase64, mimeType);
    return { data: result, status: 200 };
  }
};

// --- ANALYTICS CONTROLLER ---
export const AnalyticsService = {
  async getDashboardSummary(): Promise<ApiResponse<AnalyticsSummary>> {
    const txs = await db.getTransactions(AuthService.currentUserId);
    
    const totalSpent = txs.reduce((sum, t) => sum + t.amount, 0);
    
    // Category Breakdown
    const catMap: Record<string, number> = {};
    txs.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    
    const topCategories = Object.entries(catMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Daily Trend
    const trendMap: Record<string, number> = {};
    txs.forEach(t => {
      const d = t.date.split('T')[0];
      trendMap[d] = (trendMap[d] || 0) + t.amount;
    });
    
    const trend = Object.entries(trendMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      data: {
        totalSpent,
        burnRate: 0, // Need previous month data for full impl
        topCategories,
        trend
      },
      status: 200
    };
  }
};

// --- BUDGET CONTROLLER ---
export const BudgetService = {
  async getAll(): Promise<ApiResponse<Budget[]>> {
    const budgets = await db.getBudgets(AuthService.currentUserId);
    // If no budgets exist, return defaults for demo
    if (budgets.length === 0) {
      return { 
        data: [
          { id: 'b1', userId: AuthService.currentUserId, category: 'Food', limitAmount: 500, period: 'monthly', spent: 0 },
          { id: 'b2', userId: AuthService.currentUserId, category: 'Transport', limitAmount: 200, period: 'monthly', spent: 0 },
          { id: 'b3', userId: AuthService.currentUserId, category: 'Entertainment', limitAmount: 300, period: 'monthly', spent: 0 },
        ], 
        status: 200 
      };
    }
    return { data: budgets, status: 200 };
  }
};
