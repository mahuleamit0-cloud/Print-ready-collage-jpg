import { PhotoItem } from './printLayoutEngine';

/**
 * Generates high-resolution, self-contained SVG fine-art studio plates as data URLs.
 * Zero external network calls, instantaneous loading, and 100% CORS-safe on offscreen HTML5 Canvas for 300 DPI PDF/JPG export.
 */
function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const DEMO_STUDIO_PHOTOS: PhotoItem[] = [
  {
    id: 'demo-editorial-portrait',
    name: '01_Editorial_Studio_Portrait.svg',
    width: 1200,
    height: 1600,
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600" width="1200" height="1600">
        <defs>
          <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#e7dfd5"/>
            <stop offset="55%" stop-color="#cfc2b2"/>
            <stop offset="100%" stop-color="#9e8c78"/>
          </linearGradient>
          <linearGradient id="coat1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#6e472b"/>
            <stop offset="100%" stop-color="#3b2313"/>
          </linearGradient>
          <radialGradient id="sun1" cx="0.7" cy="0.25" r="0.6">
            <stop offset="0%" stop-color="#fff8ef" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="#fff8ef" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1200" height="1600" fill="url(#bg1)"/>
        <rect width="1200" height="1600" fill="url(#sun1)"/>
        <!-- Window shadow geometry -->
        <polygon points="0,0 520,0 180,1600 0,1600" fill="#2c221a" opacity="0.14"/>
        <polygon points="680,0 1200,0 1200,520" fill="#2c221a" opacity="0.1"/>
        <!-- Fine art architectural arch backdrop -->
        <path d="M 240,1600 L 240,560 A 360,360 0 0,1 960,560 L 960,1600 Z" fill="#f5efe8" opacity="0.7"/>
        <!-- Editorial portrait bust & structured coat -->
        <circle cx="600" cy="610" r="145" fill="#8d5b3c"/>
        <path d="M 485,560 C 485,430 715,430 715,560 C 715,510 660,475 600,475 C 540,475 485,510 485,560 Z" fill="#1e1612"/>
        <rect x="552" y="720" width="96" height="120" rx="30" fill="#7c4e32"/>
        <path d="M 250,1600 C 270,1040 410,830 600,830 C 790,830 930,1040 950,1600 Z" fill="url(#coat1)"/>
        <!-- Structured lapels -->
        <polygon points="550,830 430,1150 600,1320" fill="#52331d"/>
        <polygon points="650,830 770,1150 600,1320" fill="#462b18"/>
        <!-- Editorial frame caption -->
        <rect x="70" y="70" width="1060" height="1460" fill="none" stroke="#3b2a1e" stroke-width="3" opacity="0.3"/>
        <text x="110" y="1475" font-family="sans-serif" font-size="28" font-weight="600" fill="#3b2a1e" letter-spacing="6" opacity="0.75">ATELIER PORTRAIT I · 35MM</text>
      </svg>
    `),
  },
  {
    id: 'demo-architecture-villa',
    name: '02_Minimalist_Cedar_Pavilion.svg',
    width: 1600,
    height: 1200,
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200" width="1600" height="1200">
        <defs>
          <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="45%" stop-color="#475569"/>
            <stop offset="75%" stop-color="#cbd5e1"/>
            <stop offset="100%" stop-color="#f8fafc"/>
          </linearGradient>
          <linearGradient id="pool2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="50%" stop-color="#1e3a5f"/>
            <stop offset="100%" stop-color="#0f172a"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="820" fill="url(#sky2)"/>
        <!-- Warm golden hour orb -->
        <circle cx="1180" cy="480" r="190" fill="#fde68a" opacity="0.55"/>
        <!-- Distant mountain ridge -->
        <polygon points="0,780 380,540 760,710 1180,510 1600,690 1600,820 0,820" fill="#334155" opacity="0.5"/>
        <!-- Minimalist concrete & cedar pavilion -->
        <rect x="180" y="420" width="960" height="45" fill="#e2e8f0"/>
        <rect x="240" y="465" width="840" height="315" fill="#1e293b"/>
        <!-- Warm glowing interior glass bays -->
        <rect x="290" y="495" width="340" height="265" fill="#f59e0b" opacity="0.82"/>
        <rect x="660" y="495" width="370" height="265" fill="#fbbf24" opacity="0.72"/>
        <!-- Cedar slat columns -->
        <rect x="630" y="465" width="30" height="315" fill="#78350f"/>
        <rect x="240" y="465" width="35" height="315" fill="#78350f"/>
        <rect x="1045" y="465" width="35" height="315" fill="#78350f"/>
        <!-- Travertine terrace & reflective pool -->
        <rect x="0" y="780" width="1600" height="70" fill="#d6d3d1"/>
        <rect x="0" y="850" width="1600" height="350" fill="url(#pool2)"/>
        <!-- Water reflection highlights -->
        <rect x="290" y="865" width="740" height="18" fill="#fde68a" opacity="0.35"/>
        <rect x="340" y="910" width="620" height="12" fill="#fde68a" opacity="0.22"/>
        <text x="90" y="1130" font-family="sans-serif" font-size="26" font-weight="600" fill="#e2e8f0" letter-spacing="6" opacity="0.8">PAVILION STUDY II · KYOTO</text>
      </svg>
    `),
  },
  {
    id: 'demo-botanical-still-life',
    name: '03_Botanical_Still_Life.svg',
    width: 1200,
    height: 1600,
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600" width="1200" height="1600">
        <defs>
          <linearGradient id="bg3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#132a23"/>
            <stop offset="100%" stop-color="#091512"/>
          </linearGradient>
          <linearGradient id="vase3" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#f5f5f4"/>
            <stop offset="60%" stop-color="#d6d3d1"/>
            <stop offset="100%" stop-color="#78716c"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="1600" fill="url(#bg3)"/>
        <!-- Travertine plinth -->
        <rect x="220" y="1240" width="760" height="360" fill="#cbbFB2"/>
        <polygon points="220,1240 980,1240 1060,1300 140,1300" fill="#e5dec9"/>
        <!-- Botanical stems and sculptural leaves -->
        <path d="M 600,820 Q 430,520 340,260" fill="none" stroke="#d4a373" stroke-width="10" stroke-linecap="round"/>
        <path d="M 600,820 Q 720,480 830,220" fill="none" stroke="#e9c46a" stroke-width="9" stroke-linecap="round"/>
        <path d="M 600,820 Q 590,500 580,180" fill="none" stroke="#ccd5ae" stroke-width="8" stroke-linecap="round"/>
        <!-- Translucent lunaria seed pods -->
        <ellipse cx="360" cy="310" rx="68" ry="92" transform="rotate(-24 360 310)" fill="#fefae0" opacity="0.82"/>
        <ellipse cx="445" cy="465" rx="62" ry="84" transform="rotate(-15 445 465)" fill="#fefae0" opacity="0.72"/>
        <ellipse cx="515" cy="610" rx="55" ry="76" transform="rotate(-8 515 610)" fill="#fefae0" opacity="0.65"/>
        <ellipse cx="800" cy="285" rx="70" ry="90" transform="rotate(22 800 285)" fill="#faedcd" opacity="0.85"/>
        <ellipse cx="725" cy="450" rx="64" ry="82" transform="rotate(16 725 450)" fill="#faedcd" opacity="0.75"/>
        <ellipse cx="580" cy="240" rx="60" ry="85" fill="#e9edc9" opacity="0.88"/>
        <ellipse cx="590" cy="410" rx="58" ry="80" fill="#e9edc9" opacity="0.75"/>
        <!-- Sculptural ceramic vessel -->
        <path d="M 520,760 L 680,760 L 710,850 C 790,940 780,1150 690,1240 L 510,1240 C 420,1150 410,940 490,850 Z" fill="url(#vase3)"/>
        <rect x="70" y="70" width="1060" height="1460" fill="none" stroke="#e9edc9" stroke-width="2" opacity="0.25"/>
        <text x="110" y="1475" font-family="sans-serif" font-size="28" font-weight="600" fill="#3b3731" letter-spacing="6">BOTANICA PLATE III · ARCHIVAL</text>
      </svg>
    `),
  },
  {
    id: 'demo-alpine-horizon',
    name: '04_Alpine_Grand_Tourer.svg',
    width: 1600,
    height: 1200,
    dataUrl: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1200" width="1600" height="1200">
        <defs>
          <linearGradient id="dawn4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#31102f"/>
            <stop offset="38%" stop-color="#7c2d12"/>
            <stop offset="72%" stop-color="#f97316"/>
            <stop offset="100%" stop-color="#fde047"/>
          </linearGradient>
        </defs>
        <rect width="1600" height="820" fill="url(#dawn4)"/>
        <!-- Sun disk -->
        <circle cx="800" cy="590" r="220" fill="#fef08a" opacity="0.75"/>
        <!-- Layered Alpine peaks -->
        <polygon points="0,760 290,410 610,650 980,350 1340,620 1600,430 1600,820 0,820" fill="#431407" opacity="0.75"/>
        <polygon points="0,820 460,520 840,740 1240,490 1600,710 1600,860 0,860" fill="#1c1917"/>
        <!-- Winding mountain tarmac -->
        <rect x="0" y="820" width="1600" height="380" fill="#18181b"/>
        <polygon points="0,1200 620,820 980,820 1600,1200" fill="#27272a"/>
        <line x1="800" y1="820" x2="800" y2="1200" stroke="#facc15" stroke-width="10" stroke-dasharray="48 36"/>
        <!-- Classic Grand Tourer silhouette -->
        <path d="M 450,940 L 590,835 L 940,835 L 1130,930 L 1170,1010 L 420,1010 Z" fill="#e4e4e7"/>
        <path d="M 605,850 L 915,850 L 1030,925 L 515,925 Z" fill="#18181b"/>
        <circle cx="565" cy="1010" r="68" fill="#09090b" stroke="#a1a1aa" stroke-width="18"/>
        <circle cx="1025" cy="1010" r="68" fill="#09090b" stroke="#a1a1aa" stroke-width="18"/>
        <rect x="1135" y="945" width="35" height="24" rx="6" fill="#fef08a"/>
        <rect x="420" y="948" width="28" height="22" rx="4" fill="#ef4444"/>
        <text x="90" y="1135" font-family="sans-serif" font-size="26" font-weight="600" fill="#f4f4f5" letter-spacing="6" opacity="0.85">ALPINE PASS IV · MEDIUM FORMAT</text>
      </svg>
    `),
  },
];
