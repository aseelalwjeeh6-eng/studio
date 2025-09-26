'use client';

import { useEffect, useState } from 'react';

const Hearts = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1] overflow-hidden">
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="heart"
          style={{
            left: `${Math.random() * 100}vw`,
            animationDuration: `${Math.random() * 5 + 10}s`,
            animationDelay: `${Math.random() * 10}s`,
            transform: `scale(${Math.random() * 0.5 + 0.5})`,
          }}
        />
      ))}
    </div>
  );
};

export default Hearts;
