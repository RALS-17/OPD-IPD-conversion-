import { useState, FormEvent } from 'react';
import { LogIn, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<{ ok: boolean }>;
  error: string | null;
  onClearError: () => void;
}

export default function Login({ onLogin, error, onClearError }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    onClearError();
    setSubmitting(true);
    try {
      await onLogin(email, password);
    } finally {
      setSubmitting(false);
    }
  };

  const field =
    'w-full px-3 py-2 text-[13px] border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#1348f3]/30 focus:border-[#1348f3]';

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-5">
          <img src="/logo.svg" alt="Global Care" className="w-14 h-14 mx-auto mb-2" />
          <h1 className="text-[18px] font-bold text-slate-900 underline decoration-[#1348f3] decoration-2 underline-offset-[3px]">
            Global Care
          </h1>
          <p className="text-[12px] text-slate-500 mt-1">OPD → IPD Monitor · Canlubang</p>
        </div>

        <div className="bg-white rounded-md border border-slate-200 shadow-sm p-5">
          <h2 className="text-[14px] font-semibold text-slate-800 mb-1">Sign in</h2>
          <p className="text-[11px] text-slate-500 mb-4">
            Use your staff or admin account to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Email</label>
              <input
                type="email"
                required
                autoComplete="username"
                maxLength={120}
                className={field}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@globalcare.ph"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  maxLength={128}
                  className={`${field} pr-9`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-md px-2.5 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-[13px] font-semibold text-white bg-[#1348f3] rounded-md hover:bg-blue-700 disabled:opacity-60"
            >
              <LogIn size={14} />
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-4">
          Data is secure & HIPAA compliant · Global Care Hospital Canlubang
        </p>
      </div>
    </div>
  );
}
