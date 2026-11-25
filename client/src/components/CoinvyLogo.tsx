import React from 'react';

interface CoinvyLogoProps {
  variant?: 'full' | 'horizontal' | 'icon-only';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
  className?: string;
}

export const CoinvyLogo: React.FC<CoinvyLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showSlogan = false,
  className = '',
}) => {
  // Dimensions mapping
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-16 h-16',
    xl: 'w-32 h-32 sm:w-36 sm:h-36',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  // The official DIM+ app badge with 3D arrow, DIM+ lettering and glowing neon frame
  const AppIcon = (
    <div
      className={`relative rounded-2xl overflow-hidden shrink-0 shadow-lg shadow-emerald-950/40 select-none ${iconSizes[size]}`}
    >
      <img
        src="/dim-logo.png"
        alt="DIM+"
        className="w-full h-full object-cover object-center select-none"
      />
    </div>
  );

  if (variant === 'icon-only') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{AppIcon}</div>;
  }

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/25 select-none w-36 h-36 sm:w-40 sm:h-40 border border-emerald-500/30">
          <img
            src="/dim-logo.png"
            alt="DIM+ — Seu dinheiro, sob controle."
            className="w-full h-full object-cover object-center select-none"
          />
        </div>
      </div>
    );
  }

  // Horizontal variant (default for Navbar / Headers)
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {AppIcon}
      <div className="flex flex-col">
        <div className="flex items-center tracking-tight font-extrabold leading-none">
          <span className={`text-slate-900 dark:text-white ${textSizes[size]}`}>
            DIM
          </span>
          <span className={`text-emerald-500 dark:text-emerald-400 ${textSizes[size]}`}>
            +
          </span>
        </div>
        {showSlogan && (
          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium mt-0.5 leading-tight">
            Seu dinheiro, sob controle.
          </span>
        )}
      </div>
    </div>
  );
};
