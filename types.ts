export type Role = 'admin' | 'manager' | 'employee';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  companyId: string;
  managerId?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  country: string;
  currency: string;
  adminId: string;
  budget?: number;
  createdAt: string;
}

export interface ExpenseApproval {
  approverId: string;
  status: 'approved' | 'rejected';
  comment: string;
  timestamp: string;
}

export interface Expense {
  id: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  amount: number;
  currency: string;
  convertedAmount: number; // in company base currency
  category: string;
  description: string;
  date: string;
  receiptUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  currentStep: number;
  approvals: ExpenseApproval[];
  createdAt: string;
}

export interface ApprovalStep {
  type: 'specific_user' | 'percentage' | 'manager';
  userIds?: string[];
  percentage?: number;
  label: string;
}

export interface ApprovalRule {
  id: string;
  companyId: string;
  isManagerApprover: boolean;
  steps: ApprovalStep[];
}
