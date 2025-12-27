
import { Transaction, Budget, User } from './types';

const STORAGE_KEYS = {
  USERS: 'zen_users',
  TRANSACTIONS: 'zen_transactions',
  BUDGETS: 'zen_budgets',
  SESSION: 'zen_session'
};

class MockDatabase {
  private users: User[] = [];
  private transactions: Transaction[] = [];
  private budgets: Budget[] = [];

  constructor() {
    this.hydrate();
    // Initialize default guest user if DB is empty
    if (this.users.length === 0) {
      this.createUser({
        id: 'guest_user',
        email: 'guest@zen.finance',
        name: 'Zen Traveler',
        preferences: { currency: 'USD', theme: 'dark' },
        createdAt: new Date().toISOString()
      });
    }
  }

  private hydrate() {
    try {
      this.users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      this.transactions = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
      this.budgets = JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS) || '[]');
    } catch (e) {
      console.error('Database corruption detected. Resetting void layer.', e);
    }
  }

  private commit() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(this.budgets));
  }

  // --- User Queries ---
  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async createUser(user: User): Promise<User> {
    this.users.push(user);
    this.commit();
    return user;
  }

  // --- Transaction Queries ---
  async getTransactions(userId: string, filters?: { category?: string, startDate?: string }): Promise<Transaction[]> {
    let data = this.transactions.filter(t => t.userId === userId);
    
    if (filters?.category) {
      data = data.filter(t => t.category === filters.category);
    }
    if (filters?.startDate) {
      data = data.filter(t => new Date(t.date) >= new Date(filters.startDate));
    }
    
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createTransaction(tx: Transaction): Promise<Transaction> {
    this.transactions.push(tx);
    this.commit();
    return tx;
  }

  async deleteTransaction(id: string, userId: string): Promise<void> {
    this.transactions = this.transactions.filter(t => !(t.id === id && t.userId === userId));
    this.commit();
  }

  // --- Budget Queries ---
  async getBudgets(userId: string): Promise<Budget[]> {
    const userBudgets = this.budgets.filter(b => b.userId === userId);
    const txs = await this.getTransactions(userId);
    
    // Calculate spent amount dynamically
    return userBudgets.map(b => {
      const spent = txs
        .filter(t => t.category === b.category) // Simple category match
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...b, spent };
    });
  }

  async upsertBudget(budget: Budget): Promise<Budget> {
    const idx = this.budgets.findIndex(b => b.id === budget.id);
    if (idx >= 0) {
      this.budgets[idx] = budget;
    } else {
      this.budgets.push(budget);
    }
    this.commit();
    return budget;
  }
}

export const db = new MockDatabase();
