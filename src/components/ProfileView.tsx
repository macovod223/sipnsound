import { motion } from 'motion/react';
import { ArrowLeft, Camera, User, LogOut } from 'lucide-react';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';
import { useState, useRef, useEffect } from 'react';
import { ImageWithFallback } from '@/components/chzh/ImageWithFallback';
import { toast } from 'sonner';

export function ProfileView() {
  const { t, animations } = useSettings();
  const { user, updateProfile, logout } = useAuth();
  const [profileName, setProfileName] = useState(user?.displayName || user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfileName(user?.displayName || user?.username || '');
    setAvatarUrl(user?.avatarUrl || '');
    setIsEditing(false);
  }, [user]);

  const handleSave = async () => {
    if (!profileName.trim()) {
      toast.error(t('usernameCannotBeEmpty'));
      return;
    }

    setIsSaving(true);
    const result = await updateProfile({
      username: profileName.trim(),
      displayName: profileName.trim(),
      avatarUrl: avatarUrl || null,
    });
    setIsSaving(false);

    if (!result.success) {
      toast.error(result.message || t('profileUpdatedError'));
      return;
    }

    setIsEditing(false);
    toast.success(t('profileUpdatedSuccess'));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
        setIsEditing(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUrlChange = (url: string) => {
    setAvatarUrl(url);
    setIsEditing(true);
  };

  const getMotionProps = (delay = 0) => {
    if (!animations) {
      return {
        initial: false,
        animate: false,
        transition: { duration: 0 },
      };
    }
    return {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { delay },
    };
  };

  return (
    <motion.div
      {...(animations ? {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 50 },
        transition: { duration: 0.4, ease: 'easeOut' },
      } : {
        initial: false,
        animate: false,
      })}
      className="flex-1 flex flex-col gap-4 sm:gap-5 md:gap-6 min-w-0 h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex-shrink-0">
        <motion.h1
          {...getMotionProps(0)}
          className="playlist-title-spotify text-3xl sm:text-4xl md:text-5xl text-white mb-2"
        >
          {t('profile')}
        </motion.h1>
        <motion.p
          {...getMotionProps(0.1)}
          className="text-white opacity-70 text-sm sm:text-base"
        >
          {t('manageYourProfile')}
        </motion.p>
      </div>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden pr-4 pb-4 space-y-6 sm:space-y-8 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
        }}
      >
        {/* Profile Card */}
        <motion.div
          {...getMotionProps(0.2)}
          className="glass-card rounded-3xl p-6 sm:p-8 max-w-2xl"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div
                className="w-32 h-32 rounded-full overflow-hidden mb-4"
                style={{
                  boxShadow: '0 8px 24px rgba(30, 215, 96, 0.3)',
                  border: '3px solid rgba(30, 215, 96, 0.4)',
                }}
              >
                <ImageWithFallback
                  src={avatarUrl || 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=400'}
                  alt={profileName || user?.username || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <button
                onClick={handleAvatarClick}
                className="absolute bottom-5 right-0 w-10 h-10 rounded-full bg-[#1ED760] flex items-center justify-center fast-transition hover:scale-110 gpu-accelerated"
                style={{
                  boxShadow: '0 4px 12px rgba(30, 215, 96, 0.4)',
                }}
              >
                <Camera className="w-5 h-5 text-black" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <p className="text-white/60 text-sm text-center">
              {t('clickCameraToUpload')}
            </p>
          </div>

          {/* Username Section */}
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('username')}
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value);
                  setIsEditing(true);
                }}
                className="w-full glass px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#1ED760]/50 fast-transition"
                style={{
                  background: 'rgba(40, 40, 40, 0.6)',
                }}
              />
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">
                {t('avatarUrlOptional')}
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => handleAvatarUrlChange(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full glass px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#1ED760]/50 fast-transition"
                style={{
                  background: 'rgba(40, 40, 40, 0.6)',
                }}
              />
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex gap-3"
            >
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl fast-transition hover:scale-105 gpu-accelerated"
                style={{
                  background: '#1ED760',
                  color: '#000',
                  boxShadow: '0 4px 16px rgba(30, 215, 96, 0.4)',
                }}
              >
                {t('saveChanges')}
              </button>
              <button
                onClick={() => {
                  setProfileName(user?.displayName || user?.username || '');
                  setAvatarUrl(user?.avatarUrl || '');
                  setIsEditing(false);
                }}
                className="px-6 py-3 rounded-xl glass fast-transition hover:scale-105 gpu-accelerated text-white"
              >
                {t('cancel')}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Account Actions */}
        <motion.div
          {...getMotionProps(0.3)}
          className="glass-card rounded-3xl p-6 sm:p-8 max-w-2xl"
          style={{
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <h3 className="text-white text-lg mb-4">{t('accountActions')}</h3>
          
          <button
            onClick={logout}
            className="w-full glass px-6 py-4 rounded-xl text-white/80 hover:text-white hover:bg-red-500/10 fast-transition flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 fast-transition">
              <LogOut className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm">{t('logout')}</p>
              <p className="text-xs text-white/50">{t('signOutOfYourAccount')}</p>
            </div>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
