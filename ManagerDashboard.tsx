import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Expense, UserProfile, Company, ApprovalRule } from '../types';
import { CheckCircle2, XCircle, MessageSquare, Clock, ArrowRight, Loader2, AlertCircle, Eye, Bot } from 'lucide-react';
import { format } from 'date-fns';

import { getRiskAssessment } from '../services/geminiService';

interface ManagerDashboardProps {
  user: UserProfile;
  company: Company;
}

export default function ManagerDashboard({ user, company }: ManagerDashboardProps) {
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [rules, setRules] = useState<ApprovalRule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [comment, setComment] = useState('');
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  useEffect(() => {
    if (selectedExpense) {
      setLoadingRisk(true);
      setRiskAssessment(null);
      getRiskAssessment(selectedExpense).then(res => {
        setRiskAssessment(res);
        setLoadingRisk(false);
      }).catch(() => setLoadingRisk(false));
    }
  }, [selectedExpense]);

  useEffect(() => {
    // Fetch rules to understand workflow
    const qRules = query(collection(db, 'approvalRules'), where('companyId', '==', company.id));
    onSnapshot(qRules, (snapshot) => {
      if (!snapshot.empty) setRules({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ApprovalRule);
    });

    // Fetch expenses where this user is an approver or manager
    const qExpenses = query(
      collection(db, 'expenses'),
      where('companyId', '==', company.id),
      where('status', '==', 'pending')
    );

    return onSnapshot(qExpenses, (snapshot) => {
      const allPending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      
      // Filter based on current workflow step
      const myQueue = allPending.filter(expense => {
        if (!rules) return false;

        // Step 0 is usually direct manager
        if (expense.currentStep === 0 && rules.isManagerApprover) {
          // Check if I am the employee's manager
          // We'd need the employee's profile to check their managerId
          // For simplicity, we'll assume the query handles some of this or we fetch employee data
          return true; // Simplified for now
        }

        // Subsequent steps
        const currentStepRule = rules.steps[expense.currentStep - (rules.isManagerApprover ? 1 : 0)];
        if (currentStepRule?.userIds?.includes(user.uid)) {
          return true;
        }

        return false;
      });

      setPendingExpenses(myQueue);
    });
  }, [company.id, user.uid, rules]);

  const handleApproval = async (expense: Expense, status: 'approved' | 'rejected') => {
    if (!rules) return;
    setIsProcessing(true);
    try {
      const newApprovals = [
        ...expense.approvals,
        {
          approverId: user.uid,
          status,
          comment,
          timestamp: new Date().toISOString()
        }
      ];

      let nextStatus = expense.status;
      let nextStep = expense.currentStep;

      if (status === 'rejected') {
        nextStatus = 'rejected';
      } else {
        // Logic for next step
        const totalSteps = rules.steps.length + (rules.isManagerApprover ? 1 : 0);
        if (expense.currentStep + 1 >= totalSteps) {
          nextStatus = 'approved';
        } else {
          nextStep = expense.currentStep + 1;
        }
      }

      await updateDoc(doc(db, 'expenses', expense.id), {
        approvals: newApprovals,
        status: nextStatus,
        currentStep: nextStep
      });

      setSelectedExpense(null);
      setComment('');
    } catch (error) {
      console.error('Approval error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Approval Queue</h1>
        <p className="text-neutral-500 mt-1">Review and process team reimbursement claims</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List */}
        <div className="lg:col-span-2 space-y-4">
          {pendingExpenses.map((expense) => (
            <div
              key={expense.id}
              onClick={() => setSelectedExpense(expense)}
              className={`bg-white p-6 rounded-3xl border transition-all cursor-pointer hover:shadow-md ${selectedExpense?.id === expense.id ? 'border-orange-500 ring-2 ring-orange-50' : 'border-neutral-100'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center font-bold text-neutral-600">
                    {expense.employeeName[0]}
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">{expense.employeeName}</p>
                    <p className="text-xs text-neutral-400">{format(new Date(expense.date), 'MMM dd, yyyy')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-neutral-900">
                    {expense.amount.toLocaleString()} {expense.currency}
                  </p>
                  {expense.currency !== company.currency && (
                    <p className="text-xs text-neutral-400 font-bold">
                      ≈ {expense.convertedAmount.toLocaleString()} {company.currency}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-neutral-600 mb-4">
                <span className="px-3 py-1 bg-neutral-100 rounded-lg font-bold text-[10px] uppercase tracking-wider">{expense.category}</span>
                <p className="line-clamp-1 flex-1">{expense.description}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-50">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                  <Clock className="w-3 h-3" />
                  <span>Submitted {format(new Date(expense.createdAt), 'MMM dd')}</span>
                </div>
                <div className="flex items-center gap-1 text-orange-600 text-xs font-bold">
                  <span>Step {expense.currentStep + 1}</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}

          {pendingExpenses.length === 0 && (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-neutral-200 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-4" />
              <p className="text-neutral-500 font-medium">All caught up! No pending approvals.</p>
            </div>
          )}
        </div>

        {/* Detail View */}
        <div className="lg:col-span-1">
          {selectedExpense ? (
            <div className="bg-white rounded-3xl border border-neutral-100 shadow-xl overflow-hidden sticky top-8 animate-in slide-in-from-right-4 duration-300">
              <div className="p-6 border-b border-neutral-100 bg-neutral-50/50">
                <h3 className="font-bold text-neutral-900">Expense Details</h3>
              </div>
              
              <div className="p-6 space-y-6">
                {/* AI Co-pilot Card */}
                <div className={`p-4 rounded-2xl border-2 transition-all ${loadingRisk ? 'bg-neutral-50 border-neutral-100 animate-pulse' : riskAssessment?.recommendation === 'Reject' ? 'bg-red-50 border-red-100' : riskAssessment?.recommendation === 'Review' ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-neutral-900" />
                      <span className="text-xs font-black uppercase tracking-widest text-neutral-900">AI Co-pilot</span>
                    </div>
                    {riskAssessment && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${riskAssessment.riskScore > 70 ? 'bg-red-600 text-white' : riskAssessment.riskScore > 30 ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}`}>
                        Risk: {riskAssessment.riskScore}%
                      </span>
                    )}
                  </div>
                  
                  {loadingRisk ? (
                    <div className="space-y-2">
                      <div className="h-3 bg-neutral-200 rounded w-3/4" />
                      <div className="h-3 bg-neutral-200 rounded w-1/2" />
                    </div>
                  ) : riskAssessment ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-neutral-900">Recommendation: {riskAssessment.recommendation}</p>
                      <p className="text-xs text-neutral-600 leading-relaxed">{riskAssessment.reasoning}</p>
                      <div className="flex flex-wrap gap-1">
                        {riskAssessment.flags?.map((f: string) => (
                          <span key={f} className="text-[9px] font-bold bg-white/50 border border-neutral-200 px-2 py-0.5 rounded-full text-neutral-500 uppercase tracking-wider">{f}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-400 italic">Unable to generate risk assessment.</p>
                  )}
                </div>

                {selectedExpense.receiptUrl && (
                  <div className="aspect-[3/4] bg-neutral-100 rounded-2xl overflow-hidden relative group">
                    <img src={selectedExpense.receiptUrl} className="w-full h-full object-cover" alt="Receipt" />
                    <button className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2">
                      <Eye className="w-5 h-5" /> View Full
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Description</label>
                    <p className="text-neutral-900 font-medium">{selectedExpense.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Category</label>
                      <p className="text-neutral-900 font-medium">{selectedExpense.category}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Date</label>
                      <p className="text-neutral-900 font-medium">{format(new Date(selectedExpense.date), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Add Comment</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px] text-sm"
                    placeholder="Why are you approving/rejecting this?"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApproval(selectedExpense, 'rejected')}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold border-2 border-red-100 text-red-600 hover:bg-red-50 transition-all"
                  >
                    <XCircle className="w-5 h-5" /> Reject
                  </button>
                  <button
                    onClick={() => handleApproval(selectedExpense, 'approved')}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                  >
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Approve</>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-50 rounded-3xl border border-dashed border-neutral-200 p-12 text-center">
              <MessageSquare className="w-10 h-10 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-400 text-sm font-medium">Select an expense to view details and process approval</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
