import { useState, useEffect } from 'react';

export interface ResponsiveBreakpoints {
  isMobile: boolean;       // < 640px
  isTablet: boolean;       // 640px - 1023px
  isLaptop: boolean;       // 1024px - 1439px
  isDesktop: boolean;      // >= 1024px
  isUltrawide: boolean;    // >= 1536px
  isTouch: boolean;
  width: number;
  height: number;
}

export function useResponsive(): ResponsiveBreakpoints {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsTouch(
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { width, height } = dimensions;

  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isLaptop: width >= 1024 && width < 1440,
    isDesktop: width >= 1024,
    isUltrawide: width >= 1536,
    isTouch,
    width,
    height,
  };
}
