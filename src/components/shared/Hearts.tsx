'use client';

import React, { useEffect, useState } from 'react';

const Hearts = () => {
  const [elements, setElements] = useState<{ id: number; style: React.CSSProperties; content: string }[]>([]);

  useEffect(() => {
    const createElements = () => {
      const newElements = Array.from({ length: 25 }).map((_, i) => {
        const isHeart = Math.random() > 0.3;
        const content = isHeart ? '❤' : Math.random() > 0.5 ? 'aseel' : 'soso';
        const size = isHeart ? Math.random() * 20 + 10 : Math.random() * 10 + 12;
        const duration = Math.random() * 5 + 8;
        const delay = Math.random() * 10;
        const left = Math.random() * 100;

        return {
          id: i,
          content: content,
          style: {
            left: `${left}vw`,
            fontSize: `${size}px`,
            animation: `fly ${duration}s linear ${delay}s infinite`,
            textShadow: isHeart 
              ? '0 0 5px #ff0000, 0 0 10px #ff0000, 0 0 15px #ff4d4d' 
              : '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #ff69b4',
            color: isHeart ? 'red' : '#ffc0cb',
            position: 'absolute',
            bottom: '-50px',
            userSelect: 'none',
          } as React.CSSProperties,
        };
      });
      setElements(newElements);
    };
    
    createElements();

    // No interval needed as the animation is infinite
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
      {elements.map((el) => (
        <div key={el.id} style={el.style}>
          {el.content}
        </div>
      ))}
    </div>
  );
};

export default Hearts;
