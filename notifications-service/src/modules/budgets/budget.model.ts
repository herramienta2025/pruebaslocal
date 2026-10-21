export interface Budget {
  id: string;
  userId: string;
  category: string;
  limit: number;
  spent: number;
  period?: 'monthly' | 'weekly' | 'annual';
  warningThreshold?: number; // default: 0.8 (80%)
  createdAt: string;
  updatedAt: string;
}

export interface BudgetEvaluationInput {
  userId: string;
  category: string;
  amount: number;
  budgetLimit?: number;
  currentSpent?: number;
  warningThreshold?: number;
}

export interface BudgetEvaluationResult {
  hasBudget: boolean;
  budgetLimit: number;
  previousSpent: number;
  transactionAmount: number;
  newTotalSpent: number;
  percentage: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
  warningThreshold: number;
}
