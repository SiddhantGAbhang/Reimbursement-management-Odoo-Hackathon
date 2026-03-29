import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { extractExpenseFromImage } from '../services/geminiService';
import { getExchangeRate } from '../services/currencyService';
import { Expense, UserProfile, Company } from '../types';
import { Camera, Upload, Plus, History, Loader2, AlertCircle, CheckCircle2, XCircle, DollarSign, Calendar, Tag, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeDashboardProps {
  user: UserProfile;
  company: Company;
}

export default function EmployeeDashboard({ user, company }: EmployeeDashboardProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(company.currency);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'expenses'),
      where('employeeId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    });
  }, [user.uid]);

  const [isFraudChecking, setIsFraudChecking] = useState(false);
  const [fraudAlert, setFraudAlert] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setFraudAlert(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setReceiptBase64(base64);
      try {
        const extracted = await extractExpenseFromImage(base64);
        if (extracted.amount) setAmount(extracted.amount.toString());
        if (extracted.currency) setCurrency(extracted.currency);
        if (extracted.date) setDate(extracted.date);
        if (extracted.category) setCategory(extracted.category);
        if (extracted.description) setDescription(extracted.description);

        // Hackathon Feature: Fraud Detection Simulation
        setIsFraudChecking(true);
        setTimeout(() => {
          if (parseFloat(extracted.amount) > 500 && extracted.category === 'Food') {
            setFraudAlert('Suspiciously high amount for Food category. Please provide extra justification.');
          } else if (expenses.some(e => e.amount === parseFloat(extracted.amount) && e.date === extracted.date)) {
            setFraudAlert('Potential duplicate receipt detected in your history.');
          }
          setIsFraudChecking(false);
        }, 1500);

      } catch (error) {
        console.error('OCR Error:', error);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const rate = await getExchangeRate(currency, company.currency);
      const convertedAmount = parseFloat(amount) * rate;

      await addDoc(collection(db, 'expenses'), {
        employeeId: user.uid,
        employeeName: user.displayName,
        companyId: user.companyId,
        amount: parseFloat(amount),
        currency,
        convertedAmount,
        category,
        description,
        date,
        receiptUrl: receiptBase64, // In a real app, upload to storage
        status: 'pending',
        currentStep: 0,
        approvals: [],
        createdAt: new Date().toISOString(),
      });

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setCurrency(company.currency);
    setCategory('');
    setDescription('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setReceiptBase64(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">My Expenses</h1>
          <p className="text-neutral-500 mt-1">Track and submit your reimbursement claims</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
        >
          <Plus className="w-5 h-5" />
          <span>New Expense</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Total Claims</p>
              <p className="text-2xl font-bold text-neutral-900">{expenses.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <Loader2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Pending</p>
              <p className="text-2xl font-bold text-neutral-900">
                {expenses.filter(e => e.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500">Approved</p>
              <p className="text-2xl font-bold text-neutral-900">
                {expenses.filter(e => e.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-neutral-900">Submit New Expense</h2>
              <button onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* OCR Upload Area */}
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${isScanning ? 'bg-orange-50 border-orange-200' : 'bg-neutral-50 border-neutral-200 group-hover:bg-neutral-100'}`}>
                  {isScanning ? (
                    <>
                      <Loader2 className="w-10 h-10 text-orange-600 animate-spin mb-3" />
                      <p className="text-orange-600 font-bold">AI Scanning Receipt...</p>
                    </>
                  ) : receiptBase64 ? (
                    <img src={receiptBase64} className="h-32 rounded-lg shadow-sm" alt="Receipt" />
                  ) : (
                    <>
                      <Camera className="w-10 h-10 text-neutral-400 mb-3" />
                      <p className="text-neutral-600 font-medium">Scan or Upload Receipt</p>
                      <p className="text-neutral-400 text-sm mt-1">We'll auto-fill the details for you</p>
                    </>
                  )}
                </div>
              </div>

              {isFraudChecking && (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">AI Fraud Shield Scanning...</p>
                </div>
              )}

              {fraudAlert && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-sm font-bold text-red-600">{fraudAlert}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Amount
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 outline-none"
                      placeholder="0.00"
                    />
                    <input
                      type="text"
                      required
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      className="w-20 px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 outline-none text-center font-bold"
                      placeholder="USD"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Category
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                  >
                    <option value="">Select Category</option>
                    <option value="Food">Food & Dining</option>
                    <option value="Travel">Travel & Transport</option>
                    <option value="Supplies">Office Supplies</option>
                    <option value="Software">Software & Tools</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Description
                  </label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="What was this for?"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-4 rounded-xl font-bold border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-orange-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900">Expense History</h3>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-neutral-100 text-neutral-500 text-xs font-bold rounded-full">All</span>
            <span className="px-3 py-1 text-neutral-400 text-xs font-bold rounded-full">Pending</span>
            <span className="px-3 py-1 text-neutral-400 text-xs font-bold rounded-full">Approved</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50 text-neutral-400 text-[10px] uppercase font-black tracking-widest">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Approvals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-neutral-900">{format(new Date(expense.date), 'MMM dd, yyyy')}</p>
                    <p className="text-xs text-neutral-400">{format(new Date(expense.createdAt), 'hh:mm a')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-neutral-100 text-neutral-600 text-xs font-bold rounded-lg">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-neutral-600 line-clamp-1">{expense.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-neutral-900">
                      {expense.amount.toLocaleString()} {expense.currency}
                    </p>
                    {expense.currency !== company.currency && (
                      <p className="text-[10px] text-neutral-400 font-bold">
                        ≈ {expense.convertedAmount.toLocaleString()} {company.currency}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {expense.status === 'pending' && (
                        <span className="flex items-center gap-1.5 text-orange-600 text-xs font-bold bg-orange-50 px-3 py-1 rounded-full">
                          <Loader2 className="w-3 h-3 animate-spin" /> Pending
                        </span>
                      )}
                      {expense.status === 'approved' && (
                        <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold bg-green-50 px-3 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                      )}
                      {expense.status === 'rejected' && (
                        <span className="flex items-center gap-1.5 text-red-600 text-xs font-bold bg-red-50 px-3 py-1 rounded-full">
                          <AlertCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex -space-x-2">
                      {expense.approvals.map((app, i) => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center text-[8px] font-bold">
                          {app.status === 'approved' ? '✓' : '✗'}
                        </div>
                      ))}
                      {expense.status === 'pending' && (
                        <div className="w-6 h-6 rounded-full border-2 border-white bg-neutral-100 flex items-center justify-center text-[8px] font-bold text-neutral-400">
                          ?
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400 font-medium">
                    No expenses submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
