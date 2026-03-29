import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile, Company } from './types';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import AIChatAssistant from './components/AIChatAssistant';
import { Loader2, Receipt } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Expense } from './types';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'admin' | 'employee' | 'manager'>('dashboard');
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (user && company) {
      const q = query(collection(db, 'expenses'), where('companyId', '==', company.id));
      return onSnapshot(q, (snapshot) => {
        setAllExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      });
    }
  }, [user, company]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUser(userData);
          
          const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
          if (companyDoc.exists()) {
            setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
          }
        } else {
          setUser(null);
          setCompany(null);
        }
      } else {
        setUser(null);
        setCompany(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAuthComplete = async (userData: any) => {
    setUser(userData as UserProfile);
    const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
    if (companyDoc.exists()) {
      setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center animate-bounce shadow-xl shadow-orange-100">
          <Receipt className="text-white w-8 h-8" />
        </div>
        <div className="flex items-center gap-2 text-neutral-400 font-bold text-sm tracking-widest uppercase">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Initializing Odoo Exp</span>
        </div>
      </div>
    );
  }

  if (!user || !company) {
    return <Auth onAuthComplete={handleAuthComplete} />;
  }

  return (
    <Layout user={user} activeView={activeView} setActiveView={setActiveView}>
      {activeView === 'dashboard' && <Dashboard user={user} company={company} />}
      {activeView === 'admin' && user.role === 'admin' && <AdminDashboard user={user} company={company} />}
      {activeView === 'manager' && (user.role === 'manager' || user.role === 'admin') && <ManagerDashboard user={user} company={company} />}
      {activeView === 'employee' && <EmployeeDashboard user={user} company={company} />}
      <AIChatAssistant expenses={allExpenses} />
    </Layout>
  );
}
