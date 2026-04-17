const shimmerSvg = `
<svg width="40" height="24" viewBox="0 0 40 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="24" rx="6" fill="#020617"/>
  <rect x="-20" y="0" width="18" height="24" fill="url(#g)">
    <animate attributeName="x" from="-20" to="42" dur="1.4s" repeatCount="indefinite" />
  </rect>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="18" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#020617" stop-opacity="0" />
      <stop offset="0.5" stop-color="#0f172a" stop-opacity="0.9" />
      <stop offset="1" stop-color="#020617" stop-opacity="0" />
    </linearGradient>
  </defs>
</svg>
`;

export const IMAGE_BLUR_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  shimmerSvg
)}`;
