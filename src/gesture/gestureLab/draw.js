const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];
const TIPS = [4, 8, 12, 16, 20];

const LINE = '240, 236, 228';
const ACCENT = '244, 184, 72';

export function drawHands(ctx, hands, w, h) {
  ctx.clearRect(0, 0, w, h);
  const u = Math.max(2, h / 320);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const hand of hands) {
    const lm = hand.landmarks;
    const a = hand.coasting ? 0.35 : 1;
    ctx.setLineDash(hand.coasting ? [u * 2, u * 3] : []);
    ctx.lineWidth = u;
    ctx.strokeStyle = `rgba(${LINE}, ${0.78 * a})`;
    ctx.beginPath();
    for (const [i, j] of BONES) {
      ctx.moveTo(lm[i].x * w, lm[i].y * h);
      ctx.lineTo(lm[j].x * w, lm[j].y * h);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    lm.forEach((p, i) => {
      const tip = TIPS.includes(i);
      ctx.fillStyle = tip ? `rgba(${ACCENT}, ${a})` : `rgba(${LINE}, ${0.9 * a})`;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, u * (tip ? 2.1 : 1.35), 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
