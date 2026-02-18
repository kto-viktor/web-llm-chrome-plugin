/**
 * Rate App widget with 5 clickable stars.
 * Uses CSS sibling-selector trick with reversed DOM order + flex-direction: row-reverse
 * so that `label:hover ~ label` highlights all stars to the LEFT of the hovered one.
 * Stars 1-3 link to feedback form, stars 4-5 link to Chrome Web Store reviews.
 */

import React from 'react';

const FEEDBACK_URL =
  'https://forms.gle/dnbshTks1he42CBR7';
const STORE_REVIEW_URL =
  'https://forms.gle/Ppn4B5J4uqEHeQ5M8';

const STAR_PATH =
  'M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z';

/** SVG star icon wrapped in a link. */
function StarLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
        <path d={STAR_PATH} />
      </svg>
    </a>
  );
}

/**
 * Returns the URL based on star value: 1-3 → feedback, 4-5 → store review.
 */
function urlForStar(value: number): string {
  return value <= 3 ? FEEDBACK_URL : STORE_REVIEW_URL;
}

/**
 * Rate-us widget using reversed DOM order + flex-direction: row-reverse.
 *
 * DOM order: 5, 4, 3, 2, 1 (high to low)
 * Visual order (row-reverse): 1, 2, 3, 4, 5 (left to right)
 *
 * On hover, `label:hover ~ label` selects all labels AFTER in DOM = lower stars
 * = visually to the LEFT. Combined with `label:hover` for the star itself,
 * this fills gold from left up to the hovered star.
 */
export function RateAppWidget() {
  return (
    <div className="rate-widget">
      <span className="rate-widget-label">Rate us:</span>
      <div className="full-stars">
        <div className="rating-group">
          {[5, 4, 3, 2, 1].map((i) => (
            <label key={i}>
              <StarLink url={urlForStar(i)} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
