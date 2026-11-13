type PortalProps = {
  x: number;
  top: number;
  bottom: number;
  width: number;
  thickness: number;
  opacity?: number;
  accent?: string;
};

function Portal({
  x,
  top,
  bottom,
  width,
  thickness,
  opacity = 1,
  accent = "#D61FA8",
}: PortalProps) {
  const leftX = x - width / 2 - thickness;
  const rightX = x + width / 2;
  const beamX = leftX;
  const beamW = width + thickness * 2;
  const innerOffset = Math.max(3, thickness * 0.2);
  const innerThickness = Math.max(2, thickness - innerOffset * 2);
  const pillarHeight = bottom - top;

  return (
    <g opacity={opacity}>
      <rect
        x={leftX}
        y={top}
        width={thickness}
        height={pillarHeight}
        rx={thickness / 2}
        fill="url(#cwt-frame)"
      />
      <rect
        x={rightX}
        y={top}
        width={thickness}
        height={pillarHeight}
        rx={thickness / 2}
        fill="url(#cwt-frame)"
      />
      <rect
        x={beamX}
        y={top - thickness / 2}
        width={beamW}
        height={thickness}
        rx={thickness / 2}
        fill="url(#cwt-frame)"
      />

      <rect
        x={leftX + innerOffset}
        y={top + innerOffset}
        width={innerThickness}
        height={Math.max(0, pillarHeight - innerOffset * 2)}
        rx={innerThickness / 2}
        fill="#8A5FB8"
        opacity=".22"
      />
      <rect
        x={rightX + innerOffset}
        y={top + innerOffset}
        width={innerThickness}
        height={Math.max(0, pillarHeight - innerOffset * 2)}
        rx={innerThickness / 2}
        fill="#8A5FB8"
        opacity=".22"
      />
      <rect
        x={beamX + innerOffset}
        y={top - thickness / 2 + innerOffset}
        width={beamW - innerOffset * 2}
        height={innerThickness}
        rx={innerThickness / 2}
        fill="#8A5FB8"
        opacity=".22"
      />

      <rect
        x={beamX}
        y={top - thickness / 2}
        width={beamW}
        height={3}
        rx={1.5}
        fill={accent}
        opacity=".7"
      />
      <rect
        x={leftX}
        y={top}
        width={thickness}
        height={3}
        rx={1.5}
        fill={accent}
        opacity=".45"
      />
      <rect
        x={rightX}
        y={top}
        width={thickness}
        height={3}
        rx={1.5}
        fill={accent}
        opacity=".45"
      />
    </g>
  );
}

export function CarWashTunnel({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 95 720 465"
      role="img"
      aria-labelledby="carwash-title carwash-desc"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="carwash-title">Lumina car wash tunnel</title>
      <desc id="carwash-desc">
        An isometric violet car wash tunnel with a magenta car moving through water jets, brushes, and a drying arch.
      </desc>

      <defs>
        <linearGradient id="cwt-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#260B5C" />
          <stop offset="100%" stopColor="#12003B" />
        </linearGradient>

        <linearGradient id="cwt-belt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B0348" />
          <stop offset="100%" stopColor="#0D002E" />
        </linearGradient>

        <linearGradient id="cwt-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#E8DDF8" />
          <stop offset="100%" stopColor="#A078C8" />
        </linearGradient>

        <linearGradient id="cwt-car" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF7ADD" />
          <stop offset="42%" stopColor="#D61FA8" />
          <stop offset="100%" stopColor="#8A066F" />
        </linearGradient>

        <linearGradient id="cwt-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B9D8FF" />
          <stop offset="100%" stopColor="#3A2BB0" />
        </linearGradient>

        <linearGradient id="cwt-brush" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2A166F" />
          <stop offset="34%" stopColor="#8FA6FF" />
          <stop offset="62%" stopColor="#5078E0" />
          <stop offset="100%" stopColor="#24104A" />
        </linearGradient>

        <radialGradient id="cwt-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C010A0" stopOpacity=".5" />
          <stop offset="100%" stopColor="#C010A0" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="cwt-blue-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5078E0" stopOpacity=".4" />
          <stop offset="100%" stopColor="#5078E0" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="cwt-aqua-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#80F0F0" stopOpacity=".4" />
          <stop offset="100%" stopColor="#80F0F0" stopOpacity="0" />
        </radialGradient>

        <filter id="cwt-soft" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="12" />
        </filter>

        <g id="cwt-car-symbol">
          <ellipse cx="124" cy="82" rx="136" ry="14" fill="#08001F" opacity=".42" />

          <path
            d="M 6 52 C 6 40 14 32 26 30 L 64 26 L 90 6 C 98 -2 110 -6 124 -6 L 158 -6 C 174 -6 188 2 198 16 L 216 32 L 230 36 C 242 38 248 46 246 56 L 242 66 C 241 73 236 77 229 77 L 18 77 C 9 77 4 71 4 63 Z"
            fill="url(#cwt-car)"
          />
          <path
            d="M 12 65 L 238 65 L 234 74 L 18 74 Z"
            fill="#6A0060"
            opacity=".34"
          />
          <path
            d="M 92 22 L 122 22 L 122 60 L 88 60 Z"
            fill="#7A066D"
            opacity=".12"
          />

          <path d="M 96 9 L 118 3 L 122 21 L 94 21 Z" fill="url(#cwt-window)" />
          <path d="M 130 3 L 158 3 L 174 21 L 130 21 Z" fill="url(#cwt-window)" />
          <path d="M 177 7 L 195 21 L 170 21 Z" fill="url(#cwt-window)" opacity=".9" />

          <path d="M 100 8 L 114 5 L 116 9" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity=".55" />
          <path d="M 134 6 L 152 6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity=".45" />

          <path d="M 128 21 L 128 63" stroke="#7A066D" strokeWidth="1.5" opacity=".38" />
          <rect x="134" y="32" width="12" height="4" rx="2" fill="#FFD6F2" opacity=".7" />

          <ellipse cx="237" cy="44" rx="12" ry="8" fill="#80F0F0" opacity=".16" />
          <ellipse cx="237" cy="44" rx="5" ry="3.5" fill="#80F0F0" />
          <rect x="5" y="38" width="8" height="12" rx="2" fill="#D61FA8" />
          <ellipse cx="9" cy="44" rx="10" ry="7" fill="#D61FA8" opacity=".18" />

          <circle cx="58" cy="72" r="25" fill="#08001F" />
          <circle cx="196" cy="72" r="25" fill="#08001F" />

          <g>
            <circle cx="58" cy="72" r="20" fill="#16002F" stroke="#4E117F" strokeWidth="2" />
            <circle cx="58" cy="72" r="12.5" fill="#24104A" stroke="#A078C8" strokeWidth="2.4" />
            <circle cx="58" cy="72" r="4.5" fill="#D8C0E8" />
            <path
              d="M58 63 L58 81 M49 72 L67 72 M52 66 L64 78 M64 66 L52 78"
              stroke="#8A5FB8"
              strokeWidth="1.3"
              opacity=".85"
            />
          </g>
          <g>
            <circle cx="196" cy="72" r="20" fill="#16002F" stroke="#4E117F" strokeWidth="2" />
            <circle cx="196" cy="72" r="12.5" fill="#24104A" stroke="#A078C8" strokeWidth="2.4" />
            <circle cx="196" cy="72" r="4.5" fill="#D8C0E8" />
            <path
              d="M196 63 L196 81 M187 72 L205 72 M190 66 L202 78 M202 66 L190 78"
              stroke="#8A5FB8"
              strokeWidth="1.3"
              opacity=".85"
            />
          </g>

          <path
            d="M 90 6 C 98 -2 110 -6 124 -6 L 158 -6 C 174 -6 188 2 198 16"
            fill="none"
            stroke="#FFB6EA"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity=".65"
          />
          <path d="M 16 34 L 64 30" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity=".2" />
        </g>

        <g id="cwt-spark-symbol">
          <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" />
        </g>
      </defs>

      {/* Atmosphere */}
      <ellipse cx="380" cy="300" rx="310" ry="230" fill="url(#cwt-glow)" opacity=".7" />
      <ellipse cx="510" cy="210" rx="210" ry="150" fill="url(#cwt-blue-glow)" opacity=".7" />
      <circle
        cx="560"
        cy="150"
        r="148"
        fill="none"
        stroke="#6C4AB7"
        strokeOpacity=".22"
        strokeDasharray="2 10"
      />
      <circle
        cx="560"
        cy="150"
        r="205"
        fill="none"
        stroke="#6C4AB7"
        strokeOpacity=".12"
        strokeDasharray="2 12"
      />

      {/* Floor */}
      <path d="M 80 360 L 640 360 L 720 532 L 0 532 Z" fill="url(#cwt-floor)" />
      <path d="M 80 360 L 640 360" stroke="#A078C8" strokeOpacity=".25" strokeWidth="1.5" />
      {Array.from({ length: 7 }, (_, i) => {
        const xTop = 80 + (560 / 6) * i;
        const xBottom = (720 / 6) * i;
        return (
          <line
            key={`floor-v-${i}`}
            x1={xTop}
            y1={360}
            x2={xBottom}
            y2={532}
            stroke="#6C4AB7"
            strokeOpacity=".14"
          />
        );
      })}
      {[392, 428, 466, 504, 524].map((y, i) => {
        const t = (y - 360) / 172;
        const left = 80 - 80 * t;
        const right = 640 + 80 * t;
        return (
          <line
            key={`floor-h-${i}`}
            x1={left}
            y1={y}
            x2={right}
            y2={y}
            stroke="#6C4AB7"
            strokeOpacity=".13"
          />
        );
      })}

      {/* Floor process labels */}
      <g
        fill="#C0A0D8"
        fillOpacity=".72"
        fontFamily="monospace"
        fontSize="10"
        letterSpacing="2.5"
      >
        <text x="150" y="542" transform="rotate(-2 150 542)">PRE-SOAK</text>
        <text x="262" y="548" transform="rotate(-2 262 548)">WASH</text>
        <text x="348" y="554" transform="rotate(-2 348 554)">RINSE</text>
        <text x="444" y="556" transform="rotate(-2 444 556)">WAX</text>
        <text x="536" y="556" transform="rotate(-2 536 556)">DRY</text>
      </g>

      {/* Conveyor */}
      <ellipse
        cx="400"
        cy="470"
        rx="260"
        ry="52"
        fill="#08001F"
        opacity=".35"
        filter="url(#cwt-soft)"
      />
      <path d="M 315 365 L 485 365 L 645 505 L 155 505 Z" fill="url(#cwt-belt)" />
      <path
        d="M 315 365 L 485 365 L 645 505 L 155 505 Z"
        fill="none"
        stroke="#4E117F"
        strokeWidth="2"
      />
      <path d="M 155 505 L 645 505" stroke="#8A5FB8" strokeWidth="2" strokeOpacity=".55" />
      <path d="M 315 365 L 155 505" stroke="#A078C8" strokeOpacity=".28" />
      <path d="M 485 365 L 645 505" stroke="#A078C8" strokeOpacity=".28" />
      <path
        d="M 400 365 L 400 505"
        stroke="#8A5FB8"
        strokeWidth="1.5"
        strokeDasharray="6 10"
        strokeOpacity=".3"
      />
      <path d="M 355 365 L 280 505" stroke="#6C4AB7" strokeOpacity=".2" />
      <path d="M 445 365 L 520 505" stroke="#6C4AB7" strokeOpacity=".2" />
      {Array.from({ length: 8 }, (_, i) => {
        const t = i / 7;
        const xL = 315 + (155 - 315) * t;
        const xR = 485 + (645 - 485) * t;
        const y = 365 + (505 - 365) * t;
        const r = 5 + 3 * t;
        return (
          <g key={`roller-${i}`}>
            <ellipse cx={xL} cy={y} rx={r} ry={r * 0.36} fill="#4E117F" opacity=".7" />
            <ellipse cx={xR} cy={y} rx={r} ry={r * 0.36} fill="#4E117F" opacity=".7" />
          </g>
        );
      })}
      <path d="M 155 505 L 645 505 L 630 515 L 170 515 Z" fill="#2A0B5A" />
      <path d="M 170 515 L 630 515" stroke="#C010A0" strokeOpacity=".45" strokeWidth="1.5" />

      {/* Back car + back arch */}
      <use href="#cwt-car-symbol" transform="translate(414 330) scale(0.42) skewY(-4)" opacity=".32" />
      <Portal x={400} top={215} bottom={370} width={190} thickness={16} opacity={0.4} />

      {/* Brushes behind the car + overhead brush */}
      <g opacity=".9">
        <rect x="228" y="248" width="28" height="138" rx="14" fill="url(#cwt-brush)" />
        <ellipse cx="242" cy="250" rx="14" ry="5.5" fill="#8FA6FF" />
        <ellipse cx="242" cy="384" rx="14" ry="5.5" fill="#2A166F" />
        <path
          d="M233 258 L233 378 M239 255 L239 381 M245 255 L245 381 M251 258 L251 378"
          stroke="#C8D4FF"
          strokeWidth="1"
          strokeOpacity=".45"
        />
        <rect x="238" y="205" width="8" height="48" rx="4" fill="#4E117F" opacity=".55" />
      </g>
      <g>
        <rect x="300" y="225" width="200" height="28" rx="14" fill="url(#cwt-brush)" />
        <ellipse cx="400" cy="227" rx="100" ry="5" fill="#8FA6FF" opacity=".9" />
        <ellipse cx="400" cy="251" rx="100" ry="5" fill="#24104A" opacity=".9" />
        <path
          d="M320 230 L320 248 M340 228 L340 250 M360 227 L360 251 M380 227 L380 251 M400 227 L400 251 M420 227 L420 251 M440 227 L440 251 M460 227 L460 251 M480 228 L480 250"
          stroke="#C8D4FF"
          strokeWidth="1"
          strokeOpacity=".45"
        />
      </g>

      {/* Mid arch */}
      <Portal x={400} top={185} bottom={420} width={270} thickness={22} opacity={0.78} />

      {/* Water mist behind car */}
      <ellipse cx="400" cy="330" rx="160" ry="44" fill="url(#cwt-aqua-glow)" opacity=".55" />

      {/* Main car */}
      <use href="#cwt-car-symbol" transform="translate(260 330) scale(1.15) skewY(-4)" />

      {/* Brush in front of the car */}
      <g>
        <rect x="520" y="242" width="30" height="146" rx="15" fill="url(#cwt-brush)" />
        <ellipse cx="535" cy="244" rx="15" ry="6" fill="#8FA6FF" />
        <ellipse cx="535" cy="386" rx="15" ry="6" fill="#2A166F" />
        <path
          d="M526 252 L526 380 M532 249 L532 383 M538 249 L538 383 M544 252 L544 380"
          stroke="#C8D4FF"
          strokeWidth="1"
          strokeOpacity=".45"
        />
        <rect x="531" y="200" width="8" height="44" rx="4" fill="#4E117F" opacity=".55" />
      </g>

      {/* Water jets */}
      <g
        fill="none"
        stroke="#80F0F0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 8"
        className="animate-water"
      >
        <path d="M330 196 C326 236 330 266 338 318" opacity=".8" />
        <path d="M370 196 C368 242 364 276 372 322" opacity=".9" />
        <path d="M410 196 C412 242 406 278 410 324" opacity=".75" />
        <path d="M450 196 C452 240 448 276 452 320" opacity=".9" />
        <path d="M490 196 C492 236 486 266 490 316" opacity=".7" />
      </g>
      <g fill="#80F0F0">
        <circle cx="338" cy="322" r="2.6" opacity=".9" />
        <circle cx="372" cy="326" r="2.2" opacity=".8" />
        <circle cx="410" cy="328" r="2.8" opacity=".9" />
        <circle cx="452" cy="324" r="2.2" opacity=".8" />
        <circle cx="490" cy="320" r="2.6" opacity=".85" />
      </g>
      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".4"
      >
        <path d="M338 322 Q350 312 364 322" />
        <path d="M410 328 Q424 316 438 326" />
        <path d="M470 322 Q482 312 494 321" />
      </g>

      {/* Dryer air + sparkles */}
      <g
        fill="none"
        stroke="#C0A0D8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="2 8"
        opacity=".6"
      >
        <path d="M550 306 C580 294 596 326 624 314" />
        <path d="M558 342 C586 332 600 360 626 350" />
        <path d="M546 380 C574 372 590 396 616 388" />
      </g>
      <ellipse cx="590" cy="346" rx="64" ry="48" fill="url(#cwt-aqua-glow)" opacity=".35" />

      <g fill="#80F0F0">
        <g transform="translate(270 250) scale(0.8)">
          <use href="#cwt-spark-symbol" className="animate-twinkle" />
        </g>
        <g transform="translate(560 268)">
          <use
            href="#cwt-spark-symbol"
            className="animate-twinkle"
            style={{ animationDelay: "0.9s" }}
          />
        </g>
        <g transform="translate(598 398) scale(0.7)">
          <use
            href="#cwt-spark-symbol"
            className="animate-twinkle"
            style={{ animationDelay: "1.7s" }}
          />
        </g>
        <g transform="translate(238 330) scale(0.55)">
          <use
            href="#cwt-spark-symbol"
            className="animate-twinkle"
            style={{ animationDelay: "2.3s" }}
          />
        </g>
        <g transform="translate(510 210) scale(0.5)" fill="#FFFFFF">
          <use
            href="#cwt-spark-symbol"
            className="animate-twinkle"
            style={{ animationDelay: "1.2s" }}
          />
        </g>
      </g>
      <g fill="none" stroke="#80F0F0" strokeOpacity=".28">
        <circle cx="292" cy="286" r="6" />
        <circle cx="472" cy="292" r="9" />
        <circle cx="518" cy="250" r="4.5" />
        <circle cx="330" cy="222" r="4" />
        <circle cx="560" cy="300" r="5" />
        <circle cx="212" cy="300" r="5.5" />
      </g>

      {/* Front arch + exiting car */}
      <Portal x={400} top={150} bottom={480} width={360} thickness={28} opacity={1} />
      <g>
        <circle cx="400" cy="150" r="16" fill="#80F0F0" opacity=".14" />
        <circle cx="400" cy="150" r="5" fill="#80F0F0" />
        <circle cx="352" cy="164" r="3" fill="#D61FA8" opacity=".8" />
        <circle cx="448" cy="164" r="3" fill="#D61FA8" opacity=".8" />
      </g>

      <use href="#cwt-car-symbol" transform="translate(178 400) scale(0.8) skewY(-4)" opacity=".95" />

      {/* Floor splash in front */}
      <g fill="none" stroke="#80F0F0" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round">
        <path d="M250 484 Q286 470 320 484" />
        <path d="M290 500 Q320 488 350 500" />
      </g>
      <ellipse cx="300" cy="492" rx="92" ry="10" fill="#41FAE9" opacity=".08" />
    </svg>
  );
}
