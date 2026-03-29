import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, Company, ApprovalRule, ApprovalStep } from '../types';
import { Users, Settings, Shield, Plus, UserPlus, Trash2, Edit2, CheckCircle2, XCircle, ChevronRight, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';

interface AdminDashboardProps {
  user: UserProfile;
  company: Company;
}

export default function AdminDashboard({ user, company }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [rules, setRules] = useState<ApprovalRule | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'rules' | 'settings'>('users');
  const [isSaving, setIsSaving] = useState(false);

  // User Form State
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'employee' | 'manager'>('employee');
  const [newUserManagerId, setNewUserManagerId] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('companyId', '==', company.id));
    return onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as UserProfile)));
    });
  }, [company.id]);

  useEffect(() => {
    const q = query(collection(db, 'approvalRules'), where('companyId', '==', company.id));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setRules({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as unknown as ApprovalRule);
      } else {
        // Create default rule if none exists
        const defaultRule: Partial<ApprovalRule> = {
          companyId: company.id,
          isManagerApprover: true,
          steps: []
        };
        setDoc(doc(collection(db, 'approvalRules')), defaultRule);
      }
    });
  }, [company.id]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const userId = `user_${Date.now()}`;
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        email: newUserEmail,
        displayName: newUserName,
        role: newUserRole,
        companyId: company.id,
        managerId: newUserManagerId || null,
        createdAt: new Date().toISOString(),
      });
      setShowUserForm(false);
      setNewUserEmail('');
      setNewUserName('');
    } catch (error) {
      console.error('Add user error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRules = async (newSteps: ApprovalStep[], isManagerApprover: boolean) => {
    if (!rules) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'approvalRules', rules.id), {
        steps: newSteps,
        isManagerApprover
      });
    } catch (error) {
      console.error('Update rules error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Admin Console</h1>
          <p className="text-neutral-500 mt-1">Manage your organization and workflows</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-neutral-200 shadow-sm">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Users className="w-4 h-4 inline-block mr-2" /> Users
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'rules' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Shield className="w-4 h-4 inline-block mr-2" /> Approval Rules
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-orange-600 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Settings className="w-4 h-4 inline-block mr-2" /> Settings
          </button>
        </div>
      </div>

      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8 max-w-md">
          <h2 className="text-xl font-bold text-neutral-900 mb-6">Company Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-neutral-700 block mb-2">Monthly Budget ({company.currency})</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  defaultValue={company.budget || 0}
                  id="companyBudget"
                  className="flex-1 px-4 py-2 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={async () => {
                    const budget = (document.getElementById('companyBudget') as HTMLInputElement).value;
                    await updateDoc(doc(db, 'companies', company.id), { budget: parseFloat(budget) });
                    alert('Budget updated!');
                  }}
                  className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-700 transition-all"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-2">This budget will be used for real-time tracking on the dashboard.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-neutral-900">Team Members</h2>
            <button
              onClick={() => setShowUserForm(true)}
              className="bg-neutral-900 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-neutral-800 transition-all"
            >
              <UserPlus className="w-4 h-4" /> Add User
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50/50 text-neutral-400 text-[10px] uppercase font-black tracking-widest">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Manager</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-600 font-bold text-xs">
                          {u.displayName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900">{u.displayName}</p>
                          <p className="text-xs text-neutral-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' : u.role === 'manager' ? 'bg-blue-50 text-blue-600' : 'bg-neutral-50 text-neutral-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-neutral-600">
                        {users.find(m => m.uid === u.managerId)?.displayName || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-neutral-400">{format(new Date(u.createdAt), 'MMM dd, yyyy')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button className="p-2 text-neutral-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'rules' && rules && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-8">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">Approval Workflow Configuration</h2>
            
            <div className="space-y-8">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <div>
                  <p className="font-bold text-neutral-900">Direct Manager Approval</p>
                  <p className="text-sm text-neutral-500">Expenses must be first approved by the employee's direct manager.</p>
                </div>
                <button
                  onClick={() => handleUpdateRules(rules.steps, !rules.isManagerApprover)}
                  className={`w-14 h-8 rounded-full transition-all relative ${rules.isManagerApprover ? 'bg-orange-600' : 'bg-neutral-300'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${rules.isManagerApprover ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-neutral-900">Approval Steps</h3>
                  <button
                    onClick={() => {
                      const newStep: ApprovalStep = { type: 'specific_user', userIds: [], label: `Step ${rules.steps.length + 1}` };
                      handleUpdateRules([...rules.steps, newStep], rules.isManagerApprover);
                    }}
                    className="text-orange-600 text-sm font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-4 h-4" /> Add Step
                  </button>
                </div>

                <div className="space-y-4">
                  {rules.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-4 p-6 bg-white border border-neutral-100 rounded-2xl shadow-sm">
                      <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center font-black text-neutral-400">
                        {index + 1}
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Step Label</label>
                          <input
                            type="text"
                            value={step.label}
                            onChange={(e) => {
                              const newSteps = [...rules.steps];
                              newSteps[index].label = e.target.value;
                              handleUpdateRules(newSteps, rules.isManagerApprover);
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Type</label>
                          <select
                            value={step.type}
                            onChange={(e) => {
                              const newSteps = [...rules.steps];
                              newSteps[index].type = e.target.value as any;
                              handleUpdateRules(newSteps, rules.isManagerApprover);
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                          >
                            <option value="specific_user">Specific Approvers</option>
                            <option value="percentage">Percentage Approval</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest block mb-1">Approvers</label>
                          <select
                            multiple
                            value={step.userIds}
                            onChange={(e) => {
                              const values = Array.from(e.target.selectedOptions, option => option.value);
                              const newSteps = [...rules.steps];
                              newSteps[index].userIds = values;
                              handleUpdateRules(newSteps, rules.isManagerApprover);
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                          >
                            {users.filter(u => u.role !== 'employee').map(u => (
                              <option key={u.uid} value={u.uid}>{u.displayName}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newSteps = rules.steps.filter((_, i) => i !== index);
                          handleUpdateRules(newSteps, rules.isManagerApprover);
                        }}
                        className="p-2 text-neutral-300 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-neutral-900">Add Team Member</h2>
              <button onClick={() => setShowUserForm(false)} className="text-neutral-400 hover:text-neutral-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="john@company.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-neutral-700">Direct Manager</label>
                <select
                  value={newUserManagerId}
                  onChange={(e) => setNewUserManagerId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">No Manager</option>
                  {users.filter(u => u.role !== 'employee').map(u => (
                    <option key={u.uid} value={u.uid}>{u.displayName}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
