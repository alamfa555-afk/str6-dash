import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Delete, RefreshCw, Lock, Unlock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (customUser?: { email: string; uid: string }) => void;
}

type ScreenMode = 'ENTER_PIN' | 'SET_PIN' | 'CONFIRM_PIN';

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<ScreenMode>('SET_PIN');
  const [pin, setPin] = useState<string>('');
  const [firstPin, setFirstPin] = useState<string>(''); // Used during registration
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);

  // Check if a PIN is already saved
  useEffect(() => {
    const savedPin = localStorage.getItem('cosmic_dashboard_pin');
    if (savedPin && savedPin.length === 5) {
      setMode('ENTER_PIN');
    } else {
      setMode('SET_PIN');
    }
  }, []);

  // Handle number pad button click
  const handleNumberClick = (num: number) => {
    if (pin.length < 5) {
      setError('');
      const newPin = pin + num;
      setPin(newPin);

      // Perform action once 5 digits are entered
      if (newPin.length === 5) {
        // Debounce slightly to let the user see the fifth dot filled
        setTimeout(() => {
          processFinishedPin(newPin);
        }, 250);
      }
    }
  };

  // Process the PIN when it reaches 5 digits
  const processFinishedPin = (completedPin: string) => {
    const savedPin = localStorage.getItem('cosmic_dashboard_pin');

    if (mode === 'ENTER_PIN') {
      if (completedPin === savedPin) {
        setSuccess('PIN matched! Logging in...');
        setTimeout(() => {
          onLoginSuccess({
            email: 'Swadhin Owner (PIN Lock)',
            uid: 'pin-unlocked-session-1'
          });
        }, 400);
      } else {
        triggerErrorState('Galat PIN code! Please try again.');
      }
    } else if (mode === 'SET_PIN') {
      setFirstPin(completedPin);
      setPin('');
      setMode('CONFIRM_PIN');
      setSuccess('Zabardast! Ab is 5-Digit PIN ko dobara dalkar confirm krein.');
    } else if (mode === 'CONFIRM_PIN') {
      if (completedPin === firstPin) {
        localStorage.setItem('cosmic_dashboard_pin', completedPin);
        setSuccess('Sadhana safal! Naya Phone-style PIN save ho gya.');
        setTimeout(() => {
          onLoginSuccess({
            email: 'Swadhin Owner (PIN Lock)',
            uid: 'pin-unlocked-session-1'
          });
        }, 800);
      } else {
        setFirstPin('');
        setPin('');
        setMode('SET_PIN');
        triggerErrorState('Fark hai dono pins me! Shuruat se dobara naya PIN select krein.');
      }
    }
  };

  const triggerErrorState = (msg: string) => {
    setError(msg);
    setPin('');
    setShake(true);
    setTimeout(() => {
      setShake(false);
    }, 500);
  };

  // Backspace function
  const handleBackspace = () => {
    if (pin.length > 0) {
      setError('');
      setPin(pin.slice(0, -1));
    }
  };

  // Full clear function
  const handleClear = () => {
    setPin('');
    setError('');
  };

  // Safe reset of authorization PIN
  const handleResetPin = () => {
    const confirmReset = window.confirm("Kyan aap apna saved 5-digit lock clear karke naya PIN code set karna chahte hain?");
    if (confirmReset) {
      localStorage.removeItem('cosmic_dashboard_pin');
      setPin('');
      setFirstPin('');
      setError('');
      setSuccess('Purana PIN clear ho gya! Naya digital password banayein.');
      setMode('SET_PIN');
    }
  };

  // Get responsive mode labels and text
  const getSubheading = () => {
    if (mode === 'ENTER_PIN') {
      return {
        title: 'Unlock Screen',
        desc: 'Apna 5-Digit Mobile security passcode enter krein:',
        color: 'text-amber-400'
      };
    }
    if (mode === 'SET_PIN') {
      return {
        title: 'Digital PIN Register',
        desc: 'Naya 5-digit unlock PIN select krein jo aapki screen lock krega:',
        color: 'text-emerald-400'
      };
    }
    return {
      title: 'Confirm Passcode',
      desc: 'Same 5-digit PIN ko dobara confirm karne ke liye dial krein:',
      color: 'text-sky-400'
    };
  };

  const currentMeta = getSubheading();

  return (
    <div id="login-container" className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#030712] px-4">
      {/* Background neon elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-slate-800/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      
      <div className="w-full max-w-sm relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-6">
          <div className="inline-flex p-3.5 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-full mb-3.5 relative shadow-lg">
            {mode === 'ENTER_PIN' ? (
              <Lock className="w-6 h-6 text-slate-950 relative z-10" />
            ) : (
              <KeyRound className="w-6 h-6 text-slate-950 relative z-10" />
            )}
            <div className="absolute inset-0 bg-white/10 rounded-full filter blur-sm" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white font-sans">
            COSMIC <span className="text-amber-400">STORES</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5 tracking-wider text-[9px] uppercase">
            ⚠️ PRIVATE MOBILE-ACCESS SECURITY LOCK
          </p>
        </div>

        {/* Lock glass panel container */}
        <div className="galaxy-glass rounded-3xl p-6 border border-white/10 shadow-2xl relative bg-slate-950/80">
          
          {/* Header indicator bar */}
          <div className="text-center mb-6">
            <span className={`text-[10px] uppercase tracking-widest font-extrabold px-3 py-1 rounded-full bg-white/5 border border-white/10 ${currentMeta.color}`}>
              🛡️ {currentMeta.title}
            </span>
            <p className="text-slate-300 text-xs mt-3.5 px-2 font-medium leading-relaxed">
              {currentMeta.desc}
            </p>
          </div>

          {/* Bullet/Dot display screen with optional Shake animation */}
          <div className={`flex justify-center gap-4 mb-6 py-2.5 px-4 bg-slate-900/60 rounded-2xl border border-white/5 shadow-inner ${shake ? 'animate-bounce border-rose-500/40 bg-rose-950/10' : ''}`}>
            {[0, 1, 2, 3, 4].map((index) => {
              const isFilled = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    isFilled 
                      ? 'bg-amber-400 scale-125 shadow-lg shadow-amber-400/50' 
                      : 'border-2 border-slate-600 bg-slate-800'
                  }`}
                />
              );
            })}
          </div>

          {/* Notifications/Feedback Messages */}
          {error && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 text-center">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 text-center leading-tight">
              <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Interactive Telephone Lock screen Keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleNumberClick(num)}
                className="aspect-square flex flex-col items-center justify-center rounded-full bg-slate-900/60 border border-white/10 hover:bg-slate-800 hover:border-amber-400/30 text-white hover:text-amber-400 active:scale-90 font-black text-lg transition-all cursor-pointer shadow-md"
              >
                {num}
              </button>
            ))}
            
            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              className="aspect-square flex items-center justify-center rounded-full text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 active:scale-95 transition-all uppercase font-medium tracking-wider cursor-pointer"
            >
              Clear
            </button>

            {/* Zero Button */}
            <button
              type="button"
              onClick={() => handleNumberClick(0)}
              className="aspect-square flex items-center justify-center rounded-full bg-slate-900/60 border border-white/10 hover:bg-slate-800 hover:border-amber-400/30 text-white hover:text-amber-400 active:scale-90 font-black text-lg transition-all cursor-pointer shadow-md"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              type="button"
              onClick={handleBackspace}
              className="aspect-square flex items-center justify-center rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 active:scale-95 transition-all cursor-pointer"
              title="Delete last digit"
            >
              <Delete size={18} />
            </button>
          </div>

          {/* Bottom Settings Bar */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center flex flex-col justify-center items-center gap-2">
            {mode === 'ENTER_PIN' ? (
              <button
                type="button"
                onClick={handleResetPin}
                className="text-[10px] text-slate-400 hover:text-amber-300 font-bold transition-all flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw size={10} />
                PIN Bhool gaye? Safely Reset PIN
              </button>
            ) : (
              <p className="text-[10px] text-slate-500 font-medium">
                👉 Yeh check system hai, naya security PIN dial krein.
              </p>
            )}
          </div>

        </div>

        <div className="mt-4 text-center text-[9px] text-slate-600 font-mono uppercase tracking-widest">
          Cosmic Haptic Security OS • Off-grid Device Protection
        </div>
      </div>
    </div>
  );
}
