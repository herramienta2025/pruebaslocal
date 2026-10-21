export type NotificationType = 'budget_exceeded' | 'budget_warning' | 'info';
export type NotificationSeverity = 'critical' | 'warning' | 'info';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  category: string;
  transactionId?: string;
  amount: number;
  spent: number;
  limit: number;
  percentage: number;
  read: boolean;
  createdAt: string;
}

export interface TransactionEventInput {
  userId?: string;
  transactionId?: string;
  amount: number;
  category: string;
  type?: 'expense' | 'income';
  date?: string;
  description?: string;
  budgetLimit?: number;
  currentSpent?: number;
  warningThreshold?: number;
}

export interface ProcessTransactionResult {
  alertGenerated: boolean;
  reason?: string;
  notification?: Notification;
  budgetEvaluation?: {
    category: string;
    limit: number;
    previousSpent: number;
    transactionAmount: number;
    newTotalSpent: number;
    percentage: number;
    isOverBudget: boolean;
    isNearLimit: boolean;
  };
}
