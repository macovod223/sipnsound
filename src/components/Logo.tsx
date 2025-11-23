import { motion } from 'motion/react';

export function Logo() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="flex-shrink-0 gpu-accelerated flex items-center gap-2 sm:gap-3"
    >
      {/* Tea Cup Icon */}
      <div className="relative w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex items-center justify-center" style={{ marginTop: '-4px' }}>
        {/* Cup */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Logo Text */}
      <h1
        className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight whitespace-nowrap"
        style={{
          color: "#ffffff",
        }}
      >
        Sip&Sound
      </h1>
    </motion.div>
  );
}
