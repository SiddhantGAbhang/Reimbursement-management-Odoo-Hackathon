import React from 'react';
import { LogOut, User, Building2, Receipt, CheckSquare, LayoutDashboard } from 'lucide-react';
import { logout } from '../firebase';
import { UserProfile } from '../types';

interface LayoutProps {
  user: UserProfile;
  activeView: string;
  setActiveView: (view: any) => void;
  children: React.ReactNode;
}

export default function Layout({ user, activeView, setActiveView, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col">
        <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
            <Receipt className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-neutral-900">Odoo Exp</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-3 mb-2">Main</div>
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeView === 'dashboard' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          {user.role === 'admin' && (
            <>
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-3 mt-6 mb-2">Admin</div>
              <button
                onClick={() => setActiveView('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeView === 'admin' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                <User className="w-5 h-5" />
                <span>Users & Rules</span>
              </button>
            </>
          )}

          {(user.role === 'manager' || user.role === 'admin') && (
            <>
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-3 mt-6 mb-2">Approvals</div>
              <button
                onClick={() => setActiveView('manager')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeView === 'manager' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-neutral-600 hover:bg-neutral-100'}`}
              >
                <CheckSquare className="w-5 h-5" />
                <span>Pending Tasks</span>
              </button>
            </>
          )}

          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider px-3 mt-6 mb-2">Expenses</div>
          <button
            onClick={() => setActiveView('employee')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeView === 'employee' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-neutral-600 hover:bg-neutral-100'}`}
          >
            <Receipt className="w-5 h-5" />
            <span>My Expenses</span>
          </button>
        </nav>

        <div className="p-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-4">
            <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-600 font-bold">
              {user.displayName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">{user.displayName}</p>
              <p className="text-xs text-neutral-500 truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
