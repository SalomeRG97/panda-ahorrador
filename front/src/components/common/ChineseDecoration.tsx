import React from 'react';

export const ChineseDecoration: React.FC = () => {
  return (
    <div className="decor-container">
      <div className="sakura-petal petal1">🌸</div>
      <div className="sakura-petal petal2">🌸</div>
      <div className="sakura-petal petal3">🌸</div>
      <div className="sakura-petal petal4">🌸</div>
      <div className="lantern lantern-left">🏮</div>
      <div className="lantern lantern-right">🏮</div>

      <style>{`
        .decor-container {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none !important;
          z-index: 999;
          overflow: hidden;
        }
        .lantern {
          position: absolute;
          top: 70px;
          font-size: 2.2rem;
          animation: floatLantern 4s ease-in-out infinite alternate;
          filter: drop-shadow(0 4px 8px rgba(212, 86, 106, 0.2));
          opacity: 0.85;
          pointer-events: none !important;
          user-select: none;
        }
        .lantern-left { left: 15px; }
        .lantern-right { right: 15px; animation-delay: 2s; }

        .sakura-petal {
          position: absolute;
          top: -30px;
          font-size: 1.2rem;
          opacity: 0.7;
          animation: fallSakura 12s linear infinite;
          pointer-events: none !important;
          user-select: none;
        }
        .petal1 { left: 10%; animation-duration: 14s; animation-delay: 0s; }
        .petal2 { left: 35%; animation-duration: 10s; animation-delay: 3s; }
        .petal3 { left: 70%; animation-duration: 16s; animation-delay: 1s; }
        .petal4 { left: 88%; animation-duration: 12s; animation-delay: 5s; }

        @keyframes floatLantern {
          from { transform: translateY(0) rotate(-3deg); }
          to { transform: translateY(12px) rotate(3deg); }
        }

        @keyframes fallSakura {
          0% {
            transform: translateY(0) rotate(0deg) translateX(0);
            opacity: 0;
          }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% {
            transform: translateY(105vh) rotate(360deg) translateX(50px);
            opacity: 0;
          }
        }

        @media (max-width: 768px) {
          .lantern { display: none !important; }
        }
      `}</style>
    </div>
  );
};
