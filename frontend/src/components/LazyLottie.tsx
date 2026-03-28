import React, { Suspense, lazy, memo, useEffect, useRef, useState } from 'react';
import type { LottieRefCurrentProps } from 'lottie-react';

const Lottie = lazy(() => import('lottie-react'));

interface LazyLottieProps {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  style?: React.CSSProperties;
  className?: string;
  [key: string]: any;
}

/**
 * 性能优化的 Lottie 动画组件
 * - 使用 memo 避免不必要的重渲染
 * - 使用 Intersection Observer 仅在可见时播放
 * - 优化渲染设置
 */
const LazyLottie: React.FC<LazyLottieProps> = memo(({ 
  animationData, 
  loop = true, 
  autoplay = true,
  style,
  className,
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // Intersection Observer - 仅在可见时播放动画
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        // 控制动画播放/暂停
        if (lottieRef.current) {
          if (entry.isIntersecting) {
            lottieRef.current.play();
          } else {
            lottieRef.current.pause();
          }
        }
      },
      { rootMargin: '50px', threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <Suspense fallback={null}>
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={loop}
          autoplay={isVisible && autoplay}
          style={style}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice',
            progressiveLoad: true,
            hideOnTransparent: true,
          }}
          {...props}
        />
      </Suspense>
    </div>
  );
});

LazyLottie.displayName = 'LazyLottie';

export default LazyLottie;
