import { Home, Library, Settings, Plus, Shield } from 'lucide-react';
import { useSettings } from './SettingsContext';
import { useAuth } from './AuthContext';
import { ImageWithFallback } from '@/components/timurgenii/ImageWithFallback';

interface CompactSidebarProps {
  activeView: 'home' | 'library' | 'settings' | 'profile' | 'admin';
  onViewChange: (view: 'home' | 'library' | 'settings' | 'profile' | 'admin') => void;
  onCreatePlaylist: () => void;
}

export function CompactSidebar({ activeView, onViewChange, onCreatePlaylist }: CompactSidebarProps) {
  const { t } = useSettings();
  const { user } = useAuth();
  
  const menuItems = [
    { id: 'home' as const, icon: Home, labelKey: 'home' as const },
    { id: 'library' as const, icon: Library, labelKey: 'library' as const },
    { id: 'settings' as const, icon: Settings, labelKey: 'settings' as const },
  ];

  // Добавляем админ-панель только для админов
  const isAdmin = user?.username?.toLowerCase().includes('admin');
  if (isAdmin) {
    menuItems.push({ id: 'admin' as const, icon: Shield, labelKey: 'admin' as const });
  }
  
  return (
    <div
      className="glass-card rounded-3xl p-4 h-full flex flex-col items-center relative overflow-hidden"
      style={{
        boxShadow: '0 10px 50px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Profile Avatar */}
      <div className="relative mb-6">
        <button
          onClick={() => onViewChange('profile')}
          className={`w-14 h-14 rounded-full overflow-hidden hover:scale-105 fast-transition gpu-accelerated relative group focus:outline-none focus:ring-0 ${
            activeView === 'profile' ? 'ring-2 ring-[#1ED760]' : ''
          }`}
          style={{
            boxShadow: activeView === 'profile' 
              ? '0 4px 20px rgba(30, 215, 96, 0.5)' 
              : '0 4px 16px rgba(30, 215, 96, 0.3)',
            border: activeView === 'profile' 
              ? '2px solid rgba(30, 215, 96, 0.8)' 
              : '2px solid rgba(30, 215, 96, 0.4)',
          }}
          title={user?.username}
        >
          <ImageWithFallback
            src={user?.avatar || 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=400'}
            alt={user?.username || 'User'}
            className="w-full h-full object-cover"
          />
        </button>
      </div>

      {/* Divider */}
      <div className="w-10 h-px bg-white/10 mb-4" />

      {/* Navigation */}
      <nav className="flex flex-col gap-4 relative z-10 mb-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-14 h-14 rounded-2xl instant-transition gpu-accelerated flex items-center justify-center relative overflow-hidden group hover:scale-105 ${
              activeView === item.id
                ? 'glass-card' 
                : 'hover:glass-card'
            }`}
            style={activeView === item.id ? { 
              background: '#1ED760',
              color: '#000000',
              boxShadow: '0 6px 20px rgba(30, 215, 96, 0.4)'
            } : {
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
              color: '#b3b3b3'
            }}
            title={t(item.labelKey)}
          >
            <item.icon 
              className="w-6 h-6 relative z-10 instant-transition gpu-accelerated group-hover:scale-110" 
            />
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className="w-10 h-px bg-white/10 mb-4" />

      {/* Create Playlist Button */}
      <button
        onClick={onCreatePlaylist}
        className="w-14 h-14 rounded-2xl instant-transition gpu-accelerated flex items-center justify-center relative overflow-hidden group hover:scale-105 hover:glass-card"
        style={{
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
          color: '#b3b3b3'
        }}
        title={t('createPlaylist')}
      >
        <Plus 
          className="w-6 h-6 relative z-10 instant-transition gpu-accelerated group-hover:scale-110" 
        />
      </button>
    </div>
  );
}
