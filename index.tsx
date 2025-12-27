import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  Wallet, TrendingUp, PieChart as PieIcon, MessageSquare, 
  Camera, Plus, Trash2, Brain, ChevronRight, Zap, 
  Calendar, CreditCard, Sparkles, Send, X, History, 
  Layers, ArrowUpRight, BarChart3, Scan, Target
} from 'lucide-react';
// Architecture Update: Import Services instead of raw DB
import { TransactionService, BudgetService, AnalyticsService, AuthService } from './lib/api';
import { askFinancialCoach } from './lib/ai';
import { Transaction, Budget, AnalyticsSummary } from './lib/types';

const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
const COLORS = ['#00f3ff', '#0aff68', '#ff2a6d', '#bf00ff', '#ffb000'];

const GlassCard = ({ children, className = "", title = "", icon: Icon, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 30, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    className={`glass-card rounded-3xl p-6 flex flex-col group hover:border-white/20 transition-all duration-500 ${className}`}
  >
    {title && (
      <div className="flex items-center gap-2 mb-6 opacity-40 uppercase tracking-widest text-[9px] font-black group-hover:opacity-100 group-hover:text-neonBlue transition-all">
        {Icon && <Icon size={12} />}
        <span>{title}</span>
      </div>
    )}
    {children}
  </motion.div>
);

const App = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [magicInput, setMagicInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [coachQuery, setCoachQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [aiPreview, setAiPreview] = useState<Partial<Transaction> | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // --- Initial Data Fetch (Simulating Backend Calls) ---
  const refreshData = async () => {
    const [txRes, budgetRes, analyticsRes] = await Promise.all([
      TransactionService.getAll(),
      BudgetService.getAll(),
      AnalyticsService.getDashboardSummary()
    ]);
    
    if (txRes.data) setTransactions(txRes.data);
    if (budgetRes.data) setBudgets(budgetRes.data);
    if (analyticsRes.data) setAnalytics(analyticsRes.data);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- Real-time AI Parsing ---
  useEffect(() => {
    if (magicInput.length > 8 && !aiPreview) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(async () => {
        setIsProcessing(true);
        try {
          // Use Backend Service for parsing
          const res = await TransactionService.parseNaturalLanguage(magicInput);
          if (res.data) setAiPreview(res.data);
        } catch (e) {} finally {
          setIsProcessing(false);
        }
      }, 1500);
    }
  }, [magicInput]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isProcessing]);

  // --- Derived Viz Data ---
  const chartData = useMemo(() => {
    if (!analytics?.trend) return [];
    return analytics.trend.map(t => ({
      name: t.date.split('-').slice(1).join('/'),
      value: t.amount
    }));
  }, [analytics]);

  const budgetProgress = useMemo(() => {
    return budgets.map(b => {
      // Calculate spent from current transactions for real-time feel
      // In a real app, backend would update 'spent', but for UI reactiveness we might want to calc client side too
      // Here we rely on the `refreshData` called after mutations
      return {
        ...b,
        percent: Math.min((b.spent / b.limitAmount) * 100, 100)
      };
    }).sort((a, b) => b.percent - a.percent);
  }, [budgets]);

  // --- Handlers ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      setPreviewImage(reader.result as string);
      setIsScanning(true);
      try {
        const res = await TransactionService.uploadReceipt(base64, file.type);
        if (res.data) setAiPreview(res.data);
      } catch (err) {} finally { setIsScanning(false); }
    };
    reader.readAsDataURL(file);
  };

  const confirmTransaction = async () => {
    if (aiPreview) {
      const payload: Partial<Transaction> = {
        ...aiPreview,
        description: magicInput || `Zen Scan: ${aiPreview.merchant}`,
      };
      
      await TransactionService.create(payload);
      
      // Refresh all data streams
      await refreshData();
      
      setAiPreview(null);
      setMagicInput('');
      setPreviewImage(null);
    }
  };

  const deleteTx = async (id: string) => {
    await TransactionService.delete(id);
    await refreshData();
  };

  const askCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachQuery.trim()) return;
    const userMsg = coachQuery;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setCoachQuery('');
    setIsProcessing(true);
    try {
      // Coach still runs client-side for now as it's a direct LLM call
      // In full backend, this would be `await CoachService.ask(userMsg)`
      const res = await askFinancialCoach(transactions, userMsg);
      setChatHistory(prev => [...prev, { role: 'ai', text: res }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', text: "Spectral link broken." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen pb-40 pt-10 px-6 md:px-16 max-w-screen-2xl mx-auto flex flex-col gap-10 overflow-x-hidden">
      
      {/* Header */}
      <motion.header layout className="flex justify-between items-center">
        <div className="flex items-center gap-5">
          <motion.div whileHover={{ rotate: 180 }} className="w-14 h-14 bg-gradient-to-tr from-neonBlue via-void to-neonPurple rounded-2xl flex items-center justify-center shadow-2xl shadow-neonBlue/20 border border-white/10">
            <Layers className="text-white" size={28} />
          </motion.div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white font-mono uppercase italic">Financial_Zen</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neonGreen animate-pulse"></span>
              <span className="text-[10px] text-neonGreen font-black tracking-widest opacity-80">BACKEND_LINKED</span>
            </div>
          </div>
        </div>
        <button onClick={() => setIsChatOpen(true)} className="relative px-6 py-3 rounded-2xl glass-card border-neonPurple/20 hover:border-neonPurple transition-all group overflow-hidden">
          <div className="absolute inset-0 bg-neonPurple/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex items-center gap-3 relative z-10">
            <span className="text-[10px] font-black tracking-widest text-neonPurple">ASK_THE_ORACLE</span>
            <Brain size={20} className="text-neonPurple" />
          </div>
        </button>
      </motion.header>

      {/* Main Grid */}
      <LayoutGroup>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-[200px]">
          
          {/* Balance */}
          <GlassCard className="md:col-span-12 lg:col-span-4 row-span-2 flex flex-col justify-between" title="Spectral_Liquidity" icon={Wallet}>
            <div>
              <span className="text-[10px] text-gray-500 font-black block mb-2 tracking-[0.3em]">TOTAL_BURN_MONTH</span>
              <motion.div key={analytics?.totalSpent || 0} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-7xl font-black text-white tracking-tighter neon-text-blue">
                {formatCurrency(analytics?.totalSpent || 0)}
              </motion.div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                <span>Budget Velocity</span>
                <span className="text-neonGreen">72% Optimized</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '72%' }} className="h-full bg-gradient-to-r from-neonBlue to-neonPurple shadow-[0_0_10px_#00f3ff]" />
              </div>
            </div>
          </GlassCard>

          {/* Pulse Chart */}
          <GlassCard className="md:col-span-12 lg:col-span-8 row-span-2" title="The_Pulse" icon={TrendingUp} delay={0.1}>
            <div className="h-full w-full pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="neonGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0aff68" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0aff68" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#444', fontWeight: 900 }} />
                  <Tooltip cursor={{ stroke: '#0aff68', strokeWidth: 1 }} contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '12px' }} />
                  <Area type="stepAfter" dataKey="value" stroke="#0aff68" strokeWidth={3} fillOpacity={1} fill="url(#neonGradient)" animationDuration={2000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Budgets */}
          <GlassCard className="md:col-span-5 row-span-2" title="Channel_Thresholds" icon={Target} delay={0.2}>
            <div className="space-y-6 overflow-y-auto max-h-full pr-2 custom-scroll">
              {budgetProgress.length === 0 ? (
                <div className="h-full flex items-center justify-center opacity-10"><Target size={40} /></div>
              ) : (
                budgetProgress.map((b) => (
                  <div key={b.id} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">{b.category}</span>
                      <span className="text-xs font-bold text-gray-500">{formatCurrency(b.spent)} / {formatCurrency(b.limitAmount)}</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${b.percent}%` }} className={`h-full ${b.percent > 90 ? 'bg-neonRed shadow-[0_0_10px_#ff2a6d]' : 'bg-neonGreen shadow-[0_0_10px_#0aff68]'}`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Transaction Log */}
          <GlassCard className="md:col-span-7 row-span-2" title="Synapse_Log" icon={History} delay={0.3}>
            <div className="space-y-3 overflow-y-auto max-h-full pr-2 custom-scroll">
              <AnimatePresence mode="popLayout">
                {transactions.length === 0 ? (
                  <motion.div exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center opacity-10">
                    <History size={48} />
                    <span className="text-[10px] font-black tracking-widest mt-4">EMPTY_LEDGER</span>
                  </motion.div>
                ) : (
                  transactions.map((tx) => (
                    <motion.div layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={tx.id} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] hover:border-neonBlue transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-void border border-white/5 flex items-center justify-center shadow-inner group-hover:bg-neonBlue/5 transition-colors">
                          <CreditCard size={20} className="text-gray-500 group-hover:text-neonBlue transition-all" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-white">{tx.merchant}</div>
                          <div className="text-[9px] font-black text-gray-700 uppercase">{tx.category} • {new Date(tx.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <div className="text-xl font-black text-neonGreen">{formatCurrency(tx.amount)}</div>
                        </div>
                        <button onClick={() => deleteTx(tx.id)} className="p-2 opacity-0 group-hover:opacity-100 text-neonRed hover:bg-neonRed/10 rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </GlassCard>

        </div>
      </LayoutGroup>

      {/* Magic Input & Chat (Reused Logic, omitted large blocks for brevity but functionality preserved via state and handlers above) */}
      <div className="fixed bottom-0 left-0 w-full p-10 flex justify-center z-50 pointer-events-none">
        <div className="w-full max-w-4xl pointer-events-auto relative">
          <AnimatePresence>
            {(aiPreview || isScanning) && (
              <motion.div initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} className="absolute bottom-full left-0 w-full mb-8 glass-card rounded-[40px] p-10 border-neonBlue/30 shadow-[0_40px_100px_rgba(0,0,0,1),0_0_50px_rgba(0,243,255,0.05)] overflow-hidden">
                {isScanning && (
                   <div className="absolute inset-0 z-20 bg-void/80 backdrop-blur-xl flex flex-col items-center justify-center">
                    <motion.div animate={{ y: [-150, 450] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute w-full h-1 bg-gradient-to-r from-transparent via-neonBlue to-transparent shadow-[0_0_20px_#00f3ff]" />
                    <Scan className="text-neonBlue animate-bounce mb-4" size={56} />
                    <span className="text-xs font-black text-neonBlue tracking-[0.5em] uppercase">Processing_Vision_Matrix</span>
                  </div>
                )}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-[10px] text-neonBlue font-black uppercase tracking-[0.4em] mb-2 block">Synapse_Commit</span>
                    <h3 className="text-3xl font-black text-white italic">Confirm Transaction?</h3>
                  </div>
                  <button onClick={() => { setAiPreview(null); setPreviewImage(null); }} className="p-4 hover:bg-white/10 rounded-2xl transition-all"><X size={24} className="text-gray-500" /></button>
                </div>
                {/* Preview Grid */}
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                  {previewImage && (
                    <div className="md:col-span-1 rounded-3xl overflow-hidden border border-white/5 aspect-square relative group">
                      <img src={previewImage} className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" alt="Receipt" />
                    </div>
                  )}
                  <div className={`${previewImage ? 'md:col-span-3' : 'md:col-span-4'} grid grid-cols-2 gap-4`}>
                    <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6">
                      <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block mb-1">Entity</span>
                      <div className="text-white text-xl font-black truncate">{aiPreview?.merchant || '---'}</div>
                    </div>
                     <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6">
                      <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block mb-1">Magnitude</span>
                      <div className="text-neonGreen text-2xl font-black">{aiPreview ? formatCurrency(aiPreview.amount || 0) : '---'}</div>
                    </div>
                     <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6">
                      <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block mb-1">Flow_Channel</span>
                      <div className="text-neonPurple text-xl font-black">{aiPreview?.category || '---'}</div>
                    </div>
                     <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6">
                      <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block mb-1">Temporal_Stamp</span>
                      <div className="text-white text-xl font-black">{aiPreview?.date || '---'}</div>
                    </div>
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={confirmTransaction} className="w-full py-6 bg-gradient-to-r from-neonBlue via-neonPurple to-neonRed text-void font-black rounded-3xl flex items-center justify-center gap-4 transition-all uppercase tracking-[0.3em] text-sm">
                  <Zap size={24} fill="currentColor" /> <span>SYNC_TO_VOID_LEDGER</span>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={(e) => { e.preventDefault(); if (aiPreview) confirmTransaction(); else if (magicInput) TransactionService.parseNaturalLanguage(magicInput).then(res => res.data && setAiPreview(res.data)); }} className="flex gap-4 group">
            <div className="flex-1 relative">
              <input type="text" value={magicInput} onChange={(e) => setMagicInput(e.target.value)} placeholder="Ex: Dinner with clients $120..." className="w-full h-24 bg-voidLight/95 backdrop-blur-3xl border border-white/10 rounded-[40px] px-10 pr-20 focus:outline-none focus:border-neonBlue focus:ring-4 focus:ring-neonBlue/5 transition-all text-white placeholder:text-gray-800 font-bold text-lg shadow-2xl" />
               <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-4">
                {isProcessing ? <div className="w-8 h-8 border-4 border-neonBlue border-t-transparent rounded-full animate-spin"></div> : <Sparkles size={28} className="text-gray-800 group-focus-within:text-neonBlue transition-colors" />}
              </div>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
            <motion.button type="button" whileHover={{ scale: 1.05 }} onClick={() => fileInputRef.current?.click()} className="h-24 w-24 bg-voidLight/95 backdrop-blur-3xl border border-white/10 rounded-[40px] flex items-center justify-center transition-all group/cam shadow-2xl"><Camera size={32} className="text-gray-700 group-hover/cam:text-neonBlue transition-all" /></motion.button>
          </form>
        </div>
      </div>

       <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsChatOpen(false)} className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 200 }} className="fixed top-0 right-0 h-full w-full md:w-[600px] bg-void border-l border-white/10 z-[60] flex flex-col shadow-[-50px_0_100px_rgba(0,0,0,0.9)]">
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-voidLight/20">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-neonPurple/10 flex items-center justify-center border border-neonPurple/20 shadow-[0_0_20px_rgba(191,0,255,0.1)]"><Brain className="text-neonPurple" size={32} /></div>
                  <div><h2 className="text-xl font-black text-white tracking-widest uppercase font-mono italic">Zen_Oracle_v3</h2><span className="text-[10px] text-neonPurple font-black tracking-[0.4em] uppercase opacity-70">REASONING_ENGINE_ONLINE</span></div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-4 hover:bg-white/5 rounded-2xl transition-all"><X size={30} className="text-gray-700 hover:text-white" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scroll" ref={chatScrollRef}>
                 {chatHistory.map((msg, i) => (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] p-8 rounded-[32px] text-sm leading-relaxed shadow-2xl ${msg.role === 'user' ? 'bg-neonBlue/10 border border-neonBlue/20 text-neonBlue rounded-tr-none' : 'bg-white/[0.02] border border-white/5 text-gray-200 rounded-tl-none font-medium'}`}>{msg.text}</div>
                    </motion.div>
                  ))}
                  {isProcessing && <div className="flex justify-start"><div className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px] rounded-tl-none"><span className="text-[8px] font-black tracking-[0.3em] text-neonPurple/50 uppercase">Neural_Reasoning_In_Progress...</span></div></div>}
              </div>
              <form onSubmit={askCoach} className="p-10 bg-voidLight/60 backdrop-blur-3xl border-t border-white/5">
                <div className="flex gap-4">
                  <input type="text" value={coachQuery} onChange={(e) => setCoachQuery(e.target.value)} placeholder="Enter query for deep analysis..." className="flex-1 h-20 bg-void border border-white/10 rounded-3xl px-8 text-sm focus:border-neonPurple transition-all text-white outline-none font-bold placeholder:text-gray-800" />
                  <button className="w-20 h-20 bg-neonPurple text-void rounded-3xl flex items-center justify-center hover:bg-neonPurple/80 transition-all shadow-xl shadow-neonPurple/20"><Send size={28} /></button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
