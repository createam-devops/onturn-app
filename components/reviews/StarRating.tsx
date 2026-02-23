'use client'

import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: number
  interactive?: boolean
  onChange?: (rating: number) => void
  showLabel?: boolean
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 20,
  interactive = false,
  onChange,
  showLabel = false
}: StarRatingProps) {
  const handleClick = (selectedRating: number) => {
    if (interactive && onChange) {
      onChange(selectedRating)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1
        const isFilled = starValue <= rating
        const isHalfFilled = starValue - 0.5 === rating

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(starValue)}
            disabled={!interactive}
            className={`${
              interactive
                ? 'cursor-pointer hover:scale-110 transition-transform'
                : 'cursor-default'
            } focus:outline-none`}
            aria-label={`${starValue} estrella${starValue > 1 ? 's' : ''}`}
          >
            {isHalfFilled ? (
              <div className="relative" style={{ width: size, height: size }}>
                <Star
                  size={size}
                  className="absolute text-slate-300"
                  fill="currentColor"
                />
                <div className="absolute overflow-hidden" style={{ width: size / 2 }}>
                  <Star
                    size={size}
                    className="text-yellow-400"
                    fill="currentColor"
                  />
                </div>
              </div>
            ) : (
              <Star
                size={size}
                className={isFilled ? 'text-yellow-400' : 'text-slate-300'}
                fill={isFilled ? 'currentColor' : 'none'}
              />
            )}
          </button>
        )
      })}
      {showLabel && (
        <span className="ml-2 text-sm font-medium text-slate-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
