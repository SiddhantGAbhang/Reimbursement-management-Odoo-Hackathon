import React, { useState, useEffect } from 'react';
import { loginWithGoogle } from '../firebase';
import { fetchCountries } from '../services/currencyService';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Receipt, Globe, Building2, CheckSquare } from 'lucide-react';

interface AuthProps {
  onAuthComplete: (user: any) => void;
}

export default function Auth({ onAuthComplete }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [setupStep, setSetupStep] = useState<'login' | 'company'>('login');
  const [countries, setCountries] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<any>(null);

  useEffect(() => {
    fetchCountries().then(setCountries);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));

      if (userDoc.exists()) {
        onAuthComplete(userDoc.data());
      } else {
        setSetupStep('company');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySetup = async () => {
    if (!companyName || !selectedCountry || !auth.currentUser) return;
    setLoading(true);
    try {
      const companyId = `comp_${Date.now()}`;
      const companyData = {
        id: companyId,
        name: companyName,
        country: selectedCountry.name,
        currency: selectedCountry.currency,
        adminId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
      };

      const userData = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
        role: 'admin',
        companyId: companyId,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'companies', companyId), companyData);
      await setDoc(doc(db, 'users', auth.currentUser.uid), userData);

      onAuthComplete(userData);
    } catch (error) {
      console.error('Setup error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (setupStep === 'company') {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-neutral-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Building2 className="text-white w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">Setup Your Company</h1>
            <p className="text-neutral-500 text-center mt-2">Welcome! Let's get your organization started.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none"
                placeholder="e.g. Acme Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Country (Sets Base Currency)</label>
              <select
                onChange={(e) => setSelectedCountry(countries.find(c => c.code === e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none bg-white"
              >
                <option value="">Select a country</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCompanySetup}
              disabled={loading || !companyName || !selectedCountry}
              className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Start Managing Expenses'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-neutral-100">
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
            <Receipt className="text-white w-12 h-12" />
          </div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Odoo Exp</h1>
          <p className="text-neutral-500 text-center mt-3 text-lg">Smart Reimbursement Management</p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-4 bg-white border-2 border-neutral-200 text-neutral-700 py-4 rounded-xl font-bold hover:bg-neutral-50 transition-all shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" className="w-6 h-6" alt="Google" />
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <div className="mt-12 grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Global</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">OCR</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Approvals</span>
          </div>
        </div>
      </div>
    </div>
  );
}
