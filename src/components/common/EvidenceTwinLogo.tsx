import React from 'react';

interface EvidenceTwinLogoProps {
  className?: string;
  size?: number;
}

export const EvidenceTwinLogo: React.FC<EvidenceTwinLogoProps> = ({
  className = '',
  size = 28,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="EvidenceTwin Logo"
    >
      {/* Background soft rounded container */}
      <rect width="32" height="32" rx="7" fill="#1769AA" />
      
      {/* Physical Evidence Form (Left base prism) */}
      <path
        d="M9 10C9 8.89543 9.89543 8 11 8H18C19.1046 8 20 8.89543 20 10V18C20 19.1046 19.1046 20 18 20H11C9.89543 20 9 19.1046 9 18V10Z"
        fill="white"
        fillOpacity="0.4"
      />
      
      {/* Digital Twin Form (Interlocking offset calibrated twin) */}
      <path
        d="M12 12C12 10.8954 12.8954 10 14 10H21C22.1046 10 23 10.8954 23 12V20C23 21.1046 22.1046 22 21 22H14C12.8954 22 12 21.1046 12 20V12Z"
        fill="#18A6A6"
        fillOpacity="0.85"
      />

      {/* Central Verified Core Alignment */}
      <circle cx="16" cy="16" r="2.2" fill="white" />
      <path
        d="M14.5 16L15.5 17L17.5 15"
        stroke="#1769AA"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
