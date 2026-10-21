export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  date: string;
}
