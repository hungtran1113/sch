import React, { useEffect, useRef } from 'react';

export default function Effects({ isDarkMode }: { isDarkMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // --- SỐ LƯỢNG HẠT NGẪU NHIÊN (3 ĐẾN 7 HẠT) ---
    const particles: any[] = [];
    const numParticles = Math.floor(Math.random() * 5) + 3; // Random từ 3 đến 7
    
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedY: Math.random() * 0.4 + 0.1, 
        speedX: (Math.random() - 0.5) * 0.2, 
        // --- TĂNG KÍCH THƯỚC THÊM 2PX ---
        size: Math.random() * 2 + 3.5, // Cũ là 1.5, giờ base là 3.5 (tổng to hơn)
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        
        if (p.y > height + 10) { p.y = -10; p.x = Math.random() * width; }
        if (p.x > width + 10) { p.x = -10; }
        else if (p.x < -10) { p.x = width + 10; }
        
        if (isDarkMode) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, 0.4)`; 
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(76, 175, 80, 0.3)`; 
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 2, p.size, Math.PI / 4, 0, 2 * Math.PI); 
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isDarkMode]);

  return (
    <>
      <style>
        {`
          @keyframes gradientAnimation {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .bg-animate-gradient {
            background-size: 300% 300%; 
            /* GIẢM LAG: Kéo dài thời gian chuyển động lên 45s để trình duyệt đỡ phải vẽ lại (repaint) liên tục */
            animation: gradientAnimation 45s ease infinite; 
          }
        `}
      </style>
      <div 
        className={`fixed inset-0 w-full h-full z-[-1] pointer-events-none transition-colors duration-700 bg-animate-gradient ${
          isDarkMode 
            ? 'bg-gradient-to-br from-black via-[#1e0a4a] to-[#0f172a]' 
            : 'bg-gradient-to-br from-white via-[#e9d5ff] to-[#bfdbfe]' 
        }`}
      >
        <canvas ref={canvasRef} className="w-full h-full opacity-60" />
      </div>
    </>
  );
}