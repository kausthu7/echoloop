import React, { useState, useEffect } from 'react';
import { 
  X, 
  Coffee, 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  CreditCard, 
  Smartphone, 
  ArrowRight, 
  History,
  Gift
} from 'lucide-react';
import { TreatRecord } from '../types';

interface SendTreatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTreatSent: (treat: TreatRecord) => void;
  onCelebrationChime?: () => void;
  onConfetti?: () => void;
  recipientName?: string | null;
}

interface PresetOption {
  amount: number;
  label: string;
  emoji: string;
  description: string;
}

const PRESET_OPTIONS: PresetOption[] = [
  {
    amount: 100,
    label: 'Chai / Coffee',
    emoji: '☕',
    description: 'Quick warm boost for focus',
  },
  {
    amount: 200,
    label: 'Quick Snack',
    emoji: '🥐',
    description: 'Fuel for the next work sprint',
  },
  {
    amount: 300,
    label: 'Sweet Treat',
    emoji: '🍰',
    description: 'A delicious victory bite',
  },
  {
    amount: 500,
    label: 'Celebration Meal',
    emoji: '🍕',
    description: 'Reward for a milestone win',
  },
];

const INITIAL_SEEDS: TreatRecord[] = [];

export const SendTreatModal: React.FC<SendTreatModalProps> = ({
  isOpen,
  onClose,
  onTreatSent,
  onCelebrationChime,
  onConfetti,
  recipientName,
}) => {
  const [selectedType, setSelectedType] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [selectedPreset, setSelectedPreset] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('250');
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'GPAY' | 'PHONEPE' | 'PAYTM' | 'CARD'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTreat, setCompletedTreat] = useState<TreatRecord | null>(null);
  const [recentTreats, setRecentTreats] = useState<TreatRecord[]>([]);
  const [viewTab, setViewTab] = useState<'GIFT' | 'HISTORY'>('GIFT');
  const [totalAmountGiven, setTotalAmountGiven] = useState<number>(0);

  // Fetch real treats when opened with local storage sync
  const fetchTreats = async () => {
    try {
      const res = await fetch('/api/treats');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.treats) ? data.treats : [];
        setRecentTreats(list);
        setTotalAmountGiven(data.totalAmount || list.reduce((acc: number, t: TreatRecord) => acc + (Number(t.amount) || 0), 0));
        try {
          localStorage.setItem('echoloop_treats', JSON.stringify(list));
        } catch {}
        return;
      }
    } catch (err) {
      console.warn('Backend treats API sync note:', err);
    }

    // Fallback to local storage if offline
    try {
      const cached = localStorage.getItem('echoloop_treats');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setRecentTreats(parsed);
          setTotalAmountGiven(parsed.reduce((acc: number, t: TreatRecord) => acc + (Number(t.amount) || 0), 0));
        }
      }
    } catch {}
  };



  useEffect(() => {
    if (isOpen) {
      fetchTreats();
      setCompletedTreat(null);
      setIsProcessing(false);
      setViewTab('GIFT');
      if (recipientName) {
        setNote(`Great work, ${recipientName}! Here is a treat to keep the momentum going! 🚀`);
      }
    }
  }, [isOpen, recipientName]);

  if (!isOpen) return null;

  const currentAmount = selectedType === 'PRESET' 
    ? selectedPreset 
    : Math.max(1, Number(customAmount) || 0);

  const getCurrentEmoji = () => {
    if (selectedType === 'PRESET') {
      const p = PRESET_OPTIONS.find((opt) => opt.amount === selectedPreset);
      return p ? p.emoji : '🎁';
    }
    return '🎁';
  };

  const getCurrentLabel = () => {
    if (selectedType === 'PRESET') {
      const p = PRESET_OPTIONS.find((opt) => opt.amount === selectedPreset);
      return p ? p.label : 'Custom Treat';
    }
    return 'Custom Treat';
  };

  const handleSendTreat = async () => {
    if (currentAmount <= 0) return;

    setIsProcessing(true);

    const payload = {
      amount: currentAmount,
      label: getCurrentLabel(),
      emoji: getCurrentEmoji(),
      customNote: note.trim(),
      paymentMethod,
    };

    try {
      // Small simulated latency for authentic banking confirmation feel
      await new Promise((resolve) => setTimeout(resolve, 600));

      const res = await fetch('/api/treats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const treat = data.treat;
        setCompletedTreat(treat);
        setTotalAmountGiven(data.totalAmount || totalAmountGiven + currentAmount);
        setRecentTreats((prev) => {
          const next = [treat, ...prev];
          try { localStorage.setItem('echoloop_treats', JSON.stringify(next)); } catch {}
          return next;
        });
        onTreatSent(treat);

        // Trigger celebratory chimes and confetti
        if (onCelebrationChime) onCelebrationChime();
        if (onConfetti) onConfetti();
      } else {
        // Fallback local creation if offline / dev server reload
        const fallbackTreat: TreatRecord = {
          id: `treat-${Date.now()}`,
          amount: currentAmount,
          label: getCurrentLabel(),
          emoji: getCurrentEmoji(),
          customNote: note.trim(),
          paymentMethod,
          createdAt: new Date().toISOString(),
        };
        setCompletedTreat(fallbackTreat);
        setTotalAmountGiven((prev) => prev + currentAmount);
        setRecentTreats((prev) => {
          const next = [fallbackTreat, ...prev];
          try { localStorage.setItem('echoloop_treats', JSON.stringify(next)); } catch {}
          return next;
        });
        onTreatSent(fallbackTreat);
        if (onCelebrationChime) onCelebrationChime();
        if (onConfetti) onConfetti();
      }
    } catch (e) {
      console.warn('Treat processing error:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetForAnother = () => {
    setCompletedTreat(null);
    setNote('');
    setSelectedType('PRESET');
    setSelectedPreset(100);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div 
        id="send-treat-modal-card"
        className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[92vh] transition-all transform animate-in zoom-in-95 duration-200"
      >
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b border-zinc-100 flex items-center justify-between bg-linear-to-r from-indigo-50/60 via-white to-violet-50/40">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs shrink-0">
              <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-semibold text-zinc-900 tracking-tight">
                  Send a Treat
                </h2>
                <span className="text-[10px] sm:text-[11px] font-medium text-indigo-950 bg-indigo-100/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Support & Reward</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5 truncate">
                Reward your progress or fuel the creator with chai & treats!
              </p>
            </div>
          </div>

          <button
            id="close-treat-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher (Send Treat vs History) */}
        <div className="px-4 sm:px-6 pt-2.5 sm:pt-3 flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="tab-send-treat"
              type="button"
              onClick={() => setViewTab('GIFT')}
              className={`pb-2 sm:pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                viewTab === 'GIFT'
                  ? 'border-indigo-600 text-indigo-950 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Send Treat</span>
            </button>

            <button
              id="tab-treat-history"
              type="button"
              onClick={() => setViewTab('HISTORY')}
              className={`pb-2 sm:pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                viewTab === 'HISTORY'
                  ? 'border-indigo-600 text-indigo-950 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Ledger ({recentTreats.length})</span>
            </button>
          </div>

          <div className="text-[11px] font-medium text-zinc-500 pb-2 sm:pb-2.5">
            Total: <span className="font-bold text-zinc-900">₹{totalAmountGiven.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">

          {/* VIEW: TREAT HISTORY */}
          {viewTab === 'HISTORY' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Recent treats given</span>
                <span>{recentTreats.length} total</span>
              </div>

              {recentTreats.length === 0 ? (
                <div className="text-center py-10 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <Coffee className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-700">No treats sent yet</p>
                  <p className="text-xs text-zinc-400 mt-1">Be the first to send a celebratory treat!</p>
                  <button
                    type="button"
                    onClick={() => setViewTab('GIFT')}
                    className="mt-4 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800"
                  >
                    Send ₹100 Treat
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  {recentTreats.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-zinc-50/70 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl p-1 bg-amber-50 rounded-lg">{item.emoji || '🎁'}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">
                            {item.label}
                          </p>
                          {item.customNote ? (
                            <p className="text-zinc-500 italic truncate text-[11px]">
                              "{item.customNote}"
                            </p>
                          ) : (
                            <p className="text-zinc-400 text-[11px]">
                              Via {item.paymentMethod || 'UPI'} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-sm text-emerald-700">
                          +₹{item.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: SEND TREAT FORM & SUCCESS SCREEN */}
          {viewTab === 'GIFT' && (
            <>
              {completedTreat ? (
                /* Success Celebration State */
                <div 
                  id="treat-success-view"
                  className="py-4 text-center space-y-4 animate-in zoom-in-95 duration-200"
                >
                  <div className="relative inline-block">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-2xl">
                      {completedTreat.emoji}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
                      Treat Sent Successfully!
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                      Thank you for the warm <span className="font-semibold text-zinc-800">₹{completedTreat.amount} {completedTreat.label}</span>! Your support fuels relentless momentum.
                    </p>
                  </div>

                  {completedTreat.customNote && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 italic max-w-sm mx-auto">
                      "{completedTreat.customNote}"
                    </div>
                  )}

                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-left text-xs max-w-sm mx-auto space-y-1.5">
                    <div className="flex justify-between text-zinc-500">
                      <span>Transaction Ref:</span>
                      <span className="font-mono text-zinc-700">{completedTreat.id}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Payment Method:</span>
                      <span className="font-medium text-zinc-800">{completedTreat.paymentMethod} (Verified)</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Amount:</span>
                      <span className="font-bold text-emerald-700">₹{completedTreat.amount}.00</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      id="send-another-treat-btn"
                      type="button"
                      onClick={handleResetForAnother}
                      className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors"
                    >
                      Send Another Treat
                    </button>

                    <button
                      id="treat-done-btn"
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Primary Treat Selection Form */
                <>
                  {recipientName && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-950 text-xs shadow-xs">
                      <span className="text-lg">🤝</span>
                      <div className="flex-1">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-600 block">Circle Partner</span>
                        Sending treat to <strong className="font-semibold text-zinc-900">{recipientName}</strong>
                      </div>
                    </div>
                  )}

                  {/* Presets Grid: 100rs, 200rs, 300rs, 500rs */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                      <span>Choose Treat Amount</span>
                      <span className="text-[11px] font-normal text-zinc-400">Select preset or enter custom</span>
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                      {PRESET_OPTIONS.map((opt) => {
                        const isSelected = selectedType === 'PRESET' && selectedPreset === opt.amount;
                        return (
                          <button
                            key={opt.amount}
                            id={`preset-treat-${opt.amount}`}
                            type="button"
                            onClick={() => {
                              setSelectedType('PRESET');
                              setSelectedPreset(opt.amount);
                            }}
                            className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'bg-white border-zinc-200/90 hover:border-indigo-200 hover:bg-indigo-50/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform">
                                {opt.emoji}
                              </span>
                              <span className={`text-xs font-bold ${isSelected ? 'text-indigo-950' : 'text-zinc-900'}`}>
                                ₹{opt.amount}
                              </span>
                            </div>
                            <div className="mt-1.5 sm:mt-2">
                              <div className="text-xs font-medium text-zinc-800 truncate">
                                {opt.label}
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                                {opt.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Amount Button & Input */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                      <button
                        id="select-custom-amount-btn"
                        type="button"
                        onClick={() => setSelectedType('CUSTOM')}
                        className={`text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          selectedType === 'CUSTOM'
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                            : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:text-zinc-900'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Custom Amount</span>
                      </button>

                      {selectedType === 'CUSTOM' && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {[50, 100, 250, 500, 1000].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => {
                                setSelectedType('CUSTOM');
                                setCustomAmount(String(val));
                              }}
                              className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md transition-colors cursor-pointer"
                            >
                              ₹{val}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedType === 'CUSTOM' && (
                      <div className="relative mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500 font-semibold text-sm">
                          ₹
                        </div>
                        <input
                          id="custom-amount-input"
                          type="number"
                          min="1"
                          max="100000"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder="Enter amount (e.g. 250, 750)"
                          className="w-full pl-8 pr-4 py-2 sm:py-2.5 rounded-xl border border-zinc-300 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 text-sm font-semibold text-zinc-900 outline-hidden transition-all bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Personal Note Field */}
                  <div className="space-y-1.5">
                    <label 
                      htmlFor="treat-note-input"
                      className="text-xs font-semibold text-zinc-700 flex items-center justify-between"
                    >
                      <span>Add a Note (Optional)</span>
                      <span className="text-[10px] sm:text-[11px] font-normal text-zinc-400">e.g. Finished pitch deck!</span>
                    </label>
                    <input
                      id="treat-note-input"
                      type="text"
                      maxLength={120}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Say something nice or celebrate a victory..."
                      className="w-full px-3 sm:px-3.5 py-2 rounded-xl border border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 text-xs text-zinc-800 placeholder:text-zinc-400 outline-hidden transition-all bg-zinc-50/50"
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2 pt-1">
                    <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Payment Method</span>
                    </label>

                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                      <button
                        id="pay-method-upi"
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`p-2 sm:p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer truncate ${
                          paymentMethod === 'UPI'
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        ⚡ UPI
                      </button>

                      <button
                        id="pay-method-gpay"
                        type="button"
                        onClick={() => setPaymentMethod('GPAY')}
                        className={`p-2 sm:p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer truncate ${
                          paymentMethod === 'GPAY'
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        GPay
                      </button>

                      <button
                        id="pay-method-phonepe"
                        type="button"
                        onClick={() => setPaymentMethod('PHONEPE')}
                        className={`p-2 sm:p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer truncate ${
                          paymentMethod === 'PHONEPE'
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        PhonePe / Card
                      </button>
                    </div>
                  </div>

                  {/* Submit Action Button */}
                  <div className="pt-3">
                    <button
                      id="submit-treat-btn"
                      type="button"
                      disabled={isProcessing || currentAmount <= 0}
                      onClick={handleSendTreat}
                      className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.99] text-white font-semibold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing Treat...</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4 fill-white text-white" />
                          <span>Send ₹{currentAmount} Treat {getCurrentEmoji()}</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>
                    
                    <p className="text-[11px] text-zinc-400 text-center mt-2 flex items-center justify-center gap-1">
                      <span>🔒 Simulated instant payment</span>
                      <span>•</span>
                      <span>Instant celebration & ledger credit</span>
                    </p>
                  </div>
                </>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
};
