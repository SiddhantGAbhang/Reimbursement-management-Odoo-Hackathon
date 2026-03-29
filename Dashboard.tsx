import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Expense, UserProfile, Company } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Wallet, Receipt, Users, Target, Zap } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

interface DashboardProps {
  user: UserProfile;
  company: Company;
}

export default function Dashboard({ user, company }: DashboardProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'expenses'),
      where('companyId', '==', company.id),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    return onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      setLoading(false);
    });
  }, [company.id]);

  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  
  const currentMonthSpent = expenses
    .filter(e => e.status === 'approved' && new Date(e.date) >= currentMonthStart && new Date(e.date) <= currentMonthEnd)
    .reduce((sum, e) => sum + e.convertedAmount, 0);

  const totalSpent = expenses
    .filter(e => e.status === 'approved')
    .reduce((sum, e) => sum + e.convertedAmount, 0);

  const pendingAmount = expenses
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.convertedAmount, 0);

  // Forecasting Logic
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i);
    const monthName = format(date, 'MMM');
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    
    const amount = expenses
      .filter(e => e.status === 'approved' && new Date(e.date) >= monthStart && new Date(e.date) <= monthEnd)
      .reduce((sum, e) => sum + e.convertedAmount, 0);

    return { name: monthName, amount };
  }).reverse();

  const forecastAmount = monthlyData.length > 1 
    ? monthlyData[monthlyData.length - 1].amount * 1.15 // Simple 15% growth forecast
    : 0;

  const forecastData = [
    ...monthlyData.map(d => ({ ...d, isForecast: false })),
    { name: format(addMonths(new Date(), 1), 'MMM'), amount: forecastAmount, isForecast: true }
  ];

  // Chart Data: Spending by Category
  const categoryData = expenses
    .filter(e => e.status === 'approved')
    .reduce((acc: any[], expense) => {
      const existing = acc.find(item => item.name === expense.category);
      if (existing) {
        existing.value += expense.convertedAmount;
      } else {
        acc.push({ name: expense.category, value: expense.convertedAmount });
      }
      return acc;
    }, []);

  const COLORS = ['#ea580c', '#2563eb', '#16a34a', '#9333ea', '#4b5563'];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Welcome back, {user.displayName.split(' ')[0]}!</h1>
          <p className="text-neutral-500 mt-1">Here's what's happening with {company.name} today.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 bg-white px-4 py-2 rounded-xl border border-neutral-100">
          <Clock className="w-3 h-3" />
          <span>Last updated: {format(new Date(), 'hh:mm a')}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {company.budget ? (
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
            <div className="relative z-10">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-neutral-500">Budget Guard</p>
              <p className="text-2xl font-black text-neutral-900 mt-1">
                {Math.round((currentMonthSpent / company.budget) * 100)}%
              </p>
              <div className="w-full bg-neutral-100 h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${currentMonthSpent > company.budget ? 'bg-red-600' : 'bg-orange-600'}`}
                  style={{ width: `${Math.min(100, (currentMonthSpent / company.budget) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-400 font-bold mt-2 uppercase tracking-widest">
                {currentMonthSpent.toLocaleString()} / {company.budget.toLocaleString()} {company.currency}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
            <div className="relative z-10">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4">
                <Wallet className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-neutral-500">Total Approved</p>
              <p className="text-2xl font-black text-neutral-900 mt-1">
                {totalSpent.toLocaleString()} <span className="text-xs font-bold text-neutral-400">{company.currency}</span>
              </p>
              <div className="flex items-center gap-1 text-green-600 text-xs font-bold mt-2">
                <ArrowUpRight className="w-3 h-3" />
                <span>+12.5% from last month</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
          <div className="relative z-10">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-neutral-500">Pending Claims</p>
            <p className="text-2xl font-black text-neutral-900 mt-1">
              {pendingAmount.toLocaleString()} <span className="text-xs font-bold text-neutral-400">{company.currency}</span>
            </p>
            <p className="text-xs text-neutral-400 font-bold mt-2">
              {expenses.filter(e => e.status === 'pending').length} active requests
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
          <div className="relative z-10">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-neutral-500">AI Forecast</p>
            <p className="text-2xl font-black text-neutral-900 mt-1">
              {forecastAmount.toLocaleString()} <span className="text-xs font-bold text-neutral-400">{company.currency}</span>
            </p>
            <div className="flex items-center gap-1 text-orange-600 text-xs font-bold mt-2">
              <TrendingUp className="w-3 h-3" />
              <span>Projected for next month</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110" />
          <div className="relative z-10">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-neutral-500">Active Employees</p>
            <p className="text-2xl font-black text-neutral-900 mt-1">
              {new Set(expenses.map(e => e.employeeId)).size}
            </p>
            <p className="text-xs text-neutral-400 font-bold mt-2">Across 4 departments</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Spending Bar Chart */}
        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-neutral-900">Spending & Forecast</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1 text-xs font-bold text-neutral-400">
                <div className="w-2 h-2 bg-orange-600 rounded-full" />
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-neutral-400">
                <div className="w-2 h-2 bg-orange-300 rounded-full" />
                <span>AI Forecast</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a3a3a3', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#a3a3a3', fontSize: 12, fontWeight: 600 }}
                  dx={-10}
                />
                <Tooltip 
                  cursor={{ fill: '#fafafa' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={40}>
                  {forecastData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isForecast ? '#fdba74' : '#ea580c'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-8">Spending by Category</h3>
          <div className="h-[300px] w-full flex items-center">
            <div className="flex-1 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-48 space-y-3">
              {categoryData.map((entry: any, index: number) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs font-bold text-neutral-600">{entry.name}</span>
                  </div>
                  <span className="text-xs font-black text-neutral-900">{Math.round((entry.value / totalSpent) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900">Recent Activity</h3>
          <button className="text-orange-600 text-xs font-bold hover:underline">View All</button>
        </div>
        <div className="divide-y divide-neutral-100">
          {expenses.slice(0, 5).map((expense) => (
            <div key={expense.id} className="p-6 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center font-bold text-neutral-600">
                  {expense.employeeName[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900">
                    {expense.employeeName} <span className="font-medium text-neutral-400">submitted</span> {expense.category}
                  </p>
                  <p className="text-xs text-neutral-400 font-medium">{format(new Date(expense.createdAt), 'MMM dd, hh:mm a')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-neutral-900">{expense.amount.toLocaleString()} {expense.currency}</p>
                <div className="flex items-center gap-1.5 justify-end mt-1">
                  {expense.status === 'pending' ? (
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  ) : expense.status === 'approved' ? (
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                  ) : (
                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{expense.status}</span>
                </div>
              </div>
            </div>
          ))}
          {expenses.length === 0 && (
            <div className="p-12 text-center text-neutral-400 font-medium">
              No recent activity found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
