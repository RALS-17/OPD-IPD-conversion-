import { useState, FormEvent } from 'react';
import { LogIn } from 'lucide-react';

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

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left — login form */}
      <div className="w-full lg:w-[42%] xl:w-[38%] flex flex-col justify-center px-8 sm:px-12 lg:px-14 py-10">
        <div className="w-full max-w-[360px] mx-auto">
          <div className="flex items-center gap-2.5 mb-8">
            <img src="/logo.svg" alt="Global Care" className="w-9 h-9 object-contain" />
            <div>
              <p className="text-[14px] font-bold text-slate-800 leading-tight underline decoration-[#1348f3] decoration-2 underline-offset-[3px]">
                Global Care
              </p>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">
                OPD → IPD Monitor
              </p>
            </div>
          </div>

          <h1 className="text-[28px] font-bold text-slate-900 leading-tight tracking-tight">
            Welcome back
          </h1>
          <p className="text-[13px] text-slate-500 mt-1.5 mb-7">
            Sign in to monitor OPD to IPD conversion and admissions.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="username"
                maxLength={120}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gcmcc.com"
                className="w-full px-3.5 py-2.5 text-[13px] border border-slate-200 rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1348f3]/20 focus:border-[#1348f3]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 pr-14 text-[13px] border border-slate-200 rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1348f3]/20 focus:border-[#1348f3]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] font-medium text-slate-500 hover:text-slate-800 px-1.5 py-0.5"
                  tabIndex={-1}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[12px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 mt-1 text-[14px] font-semibold text-white bg-[#1348f3] rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm shadow-blue-500/20"
            >
              <LogIn size={16} />
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-[11px] text-slate-400 mt-6 leading-relaxed">
            Accounts are created by administrators only. Contact IT if you need access.
          </p>
        </div>
      </div>

      {/* Right — hospital photo */}
      <div className="hidden lg:block relative flex-1 min-h-screen">
        <img
          src="/hospital-bg.png"
          alt="Global Care Medical Center of Canlubang"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/55 via-slate-900/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
          <p className="text-[18px] font-bold tracking-tight drop-shadow-sm">
            Global Care Medical Center of Canlubang
          </p>
          <p className="text-[13px] text-white/85 mt-1 max-w-md drop-shadow-sm">
            Monitor OPD to IPD conversion rates and admission trends in real time.
          </p>
        </div>
      </div>
    </div>
  );
}
