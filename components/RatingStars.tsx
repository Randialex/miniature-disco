interface RatingStarsProps {
  rating: number;
  size?: "small" | "large";
  showValue?: boolean;
}

export default function RatingStars({ rating, size = "small", showValue = true }: RatingStarsProps) {
  const normalized = Math.max(0, Math.min(5, rating));

  return (
    <div className={`rating rating--${size}`} aria-label={`评分 ${normalized.toFixed(1)} 分，满分 5 分`}>
      <span className="rating__stars" aria-hidden="true">
        <span className="rating__empty">★★★★★</span>
        <span className="rating__fill" style={{ width: `${normalized * 20}%` }}>★★★★★</span>
      </span>
      {showValue && <strong>{normalized.toFixed(1)}</strong>}
    </div>
  );
}
