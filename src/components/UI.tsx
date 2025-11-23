import { motion } from 'motion/react';
import { usePlayer } from './PlayerContext';
import { useEffect, useState } from 'react';

// Music Visualizer Component
interface MusicVisualizerProps {
  color?: string;
}

export function MusicVisualizer({ color = '#1ED760' }: MusicVisualizerProps) {
  const { isPlaying } = usePlayer();
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    // Initialize random bar heights
    setBars(Array.from({ length: 4 }, () => Math.random() * 60 + 40));
  }, []);

  if (!isPlaying) {
    return (
      <div className="flex items-end gap-1 h-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="w-1 rounded-full opacity-30"
            style={{
              height: '30%',
              background: color,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-1 h-5">
      {bars.map((initialHeight, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{
            background: color,
          }}
          animate={{
            height: ['30%', `${initialHeight}%`, '30%'],
          }}
          transition={{
            duration: 0.6 + i * 0.1,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

// Animated Gradient Text Component
interface AnimatedGradientTextProps {
  children: string;
  className?: string;
}

export function AnimatedGradientText({ children, className = '' }: AnimatedGradientTextProps) {
  const { dominantColor, currentTrack } = usePlayer();

  if (!currentTrack) {
    return <span className={className}>{children}</span>;
  }

  return (
    <motion.span
      className={`${className} inline-block`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${dominantColor}, white, ${dominantColor})`,
        backgroundSize: '200% 200%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
      animate={{
        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  );
}
