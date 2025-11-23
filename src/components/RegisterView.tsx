import { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Eye, EyeOff, Check, Coffee } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';

interface RegisterViewProps {
  onSwitchToLogin?: () => void;
}

export function RegisterView({ onSwitchToLogin }: RegisterViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const { animations, t } = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (username.length < 2) {
      setError(t('usernameTooShort'));
      return;
    }

    if (password.length < 3) {
      setError(t('passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }

    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const registerSuccess = register(username, password);
    
    if (!registerSuccess) {
      setError(t('usernameExists'));
      setIsLoading(false);
    } else {
      // Show success message
      setSuccess(true);
      setIsLoading(false);
      
      // Redirect to login after 1.5 seconds
      setTimeout(() => {
        if (onSwitchToLogin) {
          onSwitchToLogin();
        }
      }, 1500);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#121212] flex items-center justify-center p-4">
      {/* Optimized static background - no animations, smaller blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-full h-full"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(30, 215, 96, 0.12) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Register card */}
      <motion.div
        {...(animations ? {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, ease: 'easeOut' },
        } : {
          initial: false,
          animate: false,
        })}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8 sm:p-10 md:p-12" style={{ boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)' }}>
          {/* Logo and title */}
          <div className="text-center mb-8">
            <motion.div
              {...(animations ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.1, duration: 0.3 },
              } : {})}
              className="inline-flex items-center justify-center mb-6"
            >
              <Coffee className="w-24 h-24 text-[#1ED760]" strokeWidth={1.5} />
            </motion.div>

            <motion.h1
              {...(animations ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.15, duration: 0.3 },
              } : {})}
              className="playlist-title-spotify text-4xl sm:text-5xl text-white mb-2"
            >
              Sip&Sound
            </motion.h1>
            <motion.p
              {...(animations ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.2, duration: 0.3 },
              } : {})}
              className="text-white/60 text-sm sm:text-base"
            >
              {t('registerSubtitle')}
            </motion.p>
          </div>

          {/* Register form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div
              {...(animations ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.25, duration: 0.3 },
              } : {})}
            >
              <label htmlFor="username" className="block text-white text-sm mb-2">
                {t('username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:border-[#1ED760] focus:outline-none fast-transition"
                placeholder={t('enterUsername')}
                autoFocus
                required
              />
            </motion.div>

            <motion.div
              {...(animations ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.3, duration: 0.3 },
              } : {})}
            >
              <label htmlFor="password" className="block text-white text-sm mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-white/40 focus:border-[#1ED760] focus:outline-none fast-transition"
                  placeholder={t('enterPassword')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white fast-transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            <motion.div
              {...(animations ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.35, duration: 0.3 },
              } : {})}
            >
              <label htmlFor="confirmPassword" className="block text-white text-sm mb-2">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-white/40 focus:border-[#1ED760] focus:outline-none fast-transition"
                  placeholder={t('confirmPassword')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white fast-transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1ED760]/10 border border-[#1ED760]/30 rounded-lg px-4 py-3 text-[#1ED760] text-sm flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{t('registrationSuccess')}</span>
              </motion.div>
            )}

            <motion.button
              {...(animations ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.4, duration: 0.3 },
                whileHover: { scale: 1.02 },
                whileTap: { scale: 0.98 },
              } : {})}
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-full flex items-center justify-center gap-2 fast-transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #1ED760 0%, #1DB954 100%)',
                color: '#000',
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(30, 215, 96, 0.3)',
              }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>{t('signUp')}</span>
                </>
              )}
            </motion.button>
          </form>

          {/* Login link */}
          {onSwitchToLogin && (
            <motion.div
              {...(animations ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { delay: 0.45, duration: 0.3 },
              } : {})}
              className="mt-6 text-center text-white/60 text-sm"
            >
              {t('alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-[#1ED760] hover:underline font-semibold"
              >
                {t('login')}
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>


    </div>
  );
}
