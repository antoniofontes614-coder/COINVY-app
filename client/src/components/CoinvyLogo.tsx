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
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const sloganSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs',
    xl: 'text-sm',
  };

  // The official app icon with the stylized 3D Coin C and ascending chart arrow
  const AppIcon = (
    <div
      className={`relative rounded-2xl overflow-hidden shrink-0 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/20 ${iconSizes[size]}`}
    >
      <img
        src="/coinvy-logo.png"
        alt="COINVY"
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
        {AppIcon}
        <div className="mt-3 flex items-center justify-center tracking-tight font-extrabold select-none">
          <span className={`text-slate-900 dark:text-white ${textSizes[size]}`}>
            COIN
          </span>
          <span className={`text-emerald-500 dark:text-emerald-400 ${textSizes[size]}`}>
            VY
          </span>
        </div>
        {showSlogan && (
          <p className={`text-slate-500 dark:text-slate-400 font-medium mt-0.5 tracking-normal ${sloganSizes[size]}`}>
            Inteligência para cuidar do seu dinheiro.
          </p>
        )}
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
            COIN
          </span>
          <span className={`text-emerald-500 dark:text-emerald-400 ${textSizes[size]}`}>
            VY
          </span>
        </div>
        {showSlogan && (
          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium mt-0.5 leading-tight">
            Inteligência para cuidar do seu dinheiro.
          </span>
        )}
      </div>
    </div>
  );
};
