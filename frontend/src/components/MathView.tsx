import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathViewProps {
  math: string;
  block?: boolean;
  className?: string;
}

export const MathView: React.FC<MathViewProps> = ({ math, block = false, className = '' }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false,
          output: 'htmlAndMathml'
        });
      } catch (err) {
        containerRef.current.innerText = math;
      }
    }
  }, [math, block]);

  return <span ref={containerRef} className={`${block ? 'block overflow-x-auto py-1 text-center' : 'inline'} ${className}`} />;
};
