export const Hero_1Illustration = () => {
  return (
    <svg 
      viewBox="0 -120 1440 620" 
    //   preserveAspectRatio="xMidYMax slice" 
      preserveAspectRatio="xMinYMax slice"
      className="hero-svg-bg" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="0" y="-120" width="1440" height="620" fill="#FFF5D6" />

      {/* DISTANT HORIZON TREE LINE */}
      <path d="M0 305 Q180 288 360 302 T720 298 T1080 302 T1440 294 L1440 345 L0 345 Z" fill="#89C47E"/>
      <path d="M0 318 Q240 306 480 316 T960 312 T1440 315 L1440 355 L0 355 Z" fill="#68AD5E"/>

      {/* =========================================================
           LEFT LANDMARK: OLUMO ROCK & TWIN ELEVATOR TOWERS
      ========================================================== */}
      <g id="olumo-rock-scene">
        
        {/* 1. LONE SPREADING TREE PERCHED ON SUMMIT */}
        {/* <g id="olumo-summit-tree">
          <path d="M275 182 L275 154 M275 166 L263 156 M275 163 L288 153" stroke="#3E2723" strokeWidth="3.5" strokeLinecap="round"/>
          <ellipse cx="275" cy="144" rx="34" ry="12" fill="#1B5E20"/>
          <ellipse cx="264" cy="140" rx="22" ry="10" fill="#2E7D32"/>
          <ellipse cx="287" cy="141" rx="21" ry="9.5" fill="#388E3C"/>
          <ellipse cx="275" cy="135" rx="20" ry="8" fill="#4A9E48"/>
        </g> */}

        {/* 2. MASSIVE DARK CHARCOAL-BROWN SUMMIT BOULDERS */}
        <g id="olumo-summit-boulders">
          {/* Expanded Left Summit Boulder */}
          <path
            d="M188 238 C178 196, 212 172, 256 180 C284 186, 294 212, 282 240 C268 252, 206 252, 188 238 Z"
            fill="#3D3835"
          />
          {/* Matching Moss/Weathered Ridge Highlight */}
          <path
            d="M204 200 C224 184, 254 184, 274 198"
            stroke="#7A7256"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Under-shadow tucked into the main rock */}
          <path
            d="M192 232 C218 240, 258 240, 280 234 C276 248, 212 250, 192 232 Z"
            fill="#24211E"
          />
          <line
            x1="198"
            y1="238"
            x2="272"
            y2="239"
            stroke="#E2E8F0"
            strokeWidth="1.5"
            strokeDasharray="6,4"
          />

          {/* Main Right Capstone Boulder */}
          <path
            d="M258 212 C272 168, 338 156, 396 172 C432 182, 452 204, 444 226 C436 244, 385 248, 325 244 C282 242, 254 232, 258 212 Z"
            fill="#332F2C"
          />
          <path
            d="M276 196 C312 178, 378 176, 428 194"
            stroke="#7A7256"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M266 226 C312 216, 388 218, 438 232 C432 248, 385 256, 322 252 C280 250, 262 240, 266 226 Z"
            fill="#1F1C1A"
          />
          <path
            d="M255 252 C305 244, 395 246, 455 262 L465 292 L245 288 Z"
            fill="#6D665F"
          />
          <line
            x1="282"
            y1="244"
            x2="365"
            y2="245"
            stroke="#E2E8F0"
            strokeWidth="1.5"
            strokeDasharray="6,4"
          />
        </g>

        {/* 3. SLOPING GREEN HILLSIDE & BOULDERS */}
        <g id="olumo-hillside">
          <path d="M95 352 L175 245 L455 255 L505 352 Z" fill="#4A9E48"/>
          <path d="M120 352 L210 262 L425 268 L480 352 Z" fill="#5BB450"/>

          <ellipse cx="195" cy="318" rx="34" ry="20" fill="#7D756D"/>
          <path d="M170 312 Q195 298 222 312" stroke="#9C9389" strokeWidth="3" fill="none"/>

          <ellipse cx="322" cy="285" rx="28" ry="17" fill="#6E665F"/>
          <ellipse cx="362" cy="306" rx="38" ry="22" fill="#7D756D"/>
          <path d="M335 298 Q362 284 392 300" stroke="#A39A90" strokeWidth="3.5" fill="none"/>
          <ellipse cx="318" cy="332" rx="32" ry="18" fill="#635C55"/>
          <ellipse cx="415" cy="335" rx="35" ry="20" fill="#6E665F"/>
        </g>

        {/* 4. WINDING STONE STAIRCASE WITH RED HANDRAILS */}
        <g id="olumo-staircase">
          {/* Base stone ramp backing */}
          <path
            d="M242 252 Q254 286 248 312 Q244 332 260 354 L296 354 Q282 330 286 308 Q290 282 258 252 Z"
            fill="#8C857C"
          />

          {/* Individual stone treads (top surface + darker front riser edge) */}
          <g>
            {/* Step 1 (top) */}
            <polygon points="244,254 257,254 258,259 245,259" fill="#B5AEA4" />
            <line x1="245" y1="259" x2="258" y2="259" stroke="#4A4540" strokeWidth="1.4" />

            {/* Step 2 */}
            <polygon points="245,263 260,263 262,268 246,268" fill="#B0A99F" />
            <line x1="246" y1="268" x2="262" y2="268" stroke="#4A4540" strokeWidth="1.4" />

            {/* Step 3 */}
            <polygon points="246,272 263,272 265,278 247,278" fill="#ABA49A" />
            <line x1="247" y1="278" x2="265" y2="278" stroke="#4A4540" strokeWidth="1.4" />

            {/* Step 4 (beginning gentle bend right) */}
            <polygon points="247,282 266,282 269,288 248,288" fill="#A69F95" />
            <line x1="248" y1="288" x2="269" y2="288" stroke="#4A4540" strokeWidth="1.4" />

            {/* Step 5 */}
            <polygon points="248,292 270,292 273,299 249,299" fill="#A19A90" />
            <line x1="249" y1="299" x2="273" y2="299" stroke="#4A4540" strokeWidth="1.4" />

            {/* Step 6 (curving slightly left/wider) */}
            <polygon points="249,303 274,303 278,310 251,310" fill="#9C958B" />
            <line x1="251" y1="310" x2="278" y2="310" stroke="#4A4540" strokeWidth="1.4" />

            {/* Step 7 */}
            <polygon points="251,314 278,314 283,322 254,322" fill="#979086" />
            <line x1="254" y1="322" x2="283" y2="322" stroke="#4A4540" strokeWidth="1.4" />

            {/* Step 8 */}
            <polygon points="254,326 283,326 289,335 257,335" fill="#928B81" />
            <line x1="257" y1="335" x2="289" y2="335" stroke="#4A4540" strokeWidth="1.4" />

            {/* Step 9 (bottom landing) */}
            <polygon points="257,339 289,339 295,350 261,350" fill="#8D867C" />
            <line x1="261" y1="350" x2="295" y2="350" stroke="#4A4540" strokeWidth="1.6" />
          </g>

          {/* Red handrails following the winding curve */}
          <path
            d="M244 252 Q251 286 248 312 Q246 332 260 352"
            stroke="#B91C1C"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M257 252 Q270 286 278 312 Q286 332 295 350"
            stroke="#B91C1C"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Subtle vertical rail posts for rhythm */}
          <g stroke="#B91C1C" strokeWidth="1.3" opacity="0.85">
            <line x1="246" y1="268" x2="246" y2="274" />
            <line x1="248" y1="292" x2="248" y2="299" />
            <line x1="252" y1="316" x2="254" y2="324" />
            <line x1="268" y1="274" x2="270" y2="282" />
            <line x1="276" y1="298" x2="279" y2="307" />
            <line x1="286" y1="324" x2="290" y2="334" />
          </g>
        </g>

        {/* 5. UPPER RED SKYBRIDGE */}
        <g id="olumo-upper-skybridge">
          <polygon points="212,175 262,216 262,232 212,193" fill="#7F1D1D"/>
          <polygon points="212,171 264,213 262,218 212,177" fill="#DC2626"/>
          <line x1="226" y1="202" x2="226" y2="232" stroke="#334155" strokeWidth="2"/>
          <line x1="244" y1="216" x2="244" y2="242" stroke="#334155" strokeWidth="2"/>
        </g>

        {/* 6. REAR TALLER ELEVATOR TOWER */}
        <g id="olumo-tower-rear">
          <polygon points="164,132 214,122 214,310 164,310" fill="#635B54"/>
          <polygon points="142,136 164,132 164,310 142,310" fill="#786F67"/>
          
          <g fill="#292524">
            <rect x="172" y="164" width="8" height="3.5" rx="1"/>
            <rect x="172" y="182" width="8" height="3.5" rx="1"/>
            <rect x="172" y="200" width="8" height="3.5" rx="1"/>
            <rect x="172" y="218" width="8" height="3.5" rx="1"/>
            <rect x="172" y="236" width="8" height="3.5" rx="1"/>
            <rect x="172" y="254" width="8" height="3.5" rx="1"/>
          </g>

          <rect x="188" y="150" width="22" height="156" rx="4" fill="#0F172A"/>
          <rect x="192" y="152" width="5" height="152" fill="#334155" opacity="0.55"/>
          <g stroke="#475569" strokeWidth="1.3">
            <line x1="188" y1="168" x2="210" y2="168"/>
            <line x1="188" y1="186" x2="210" y2="186"/>
            <line x1="188" y1="204" x2="210" y2="204"/>
            <line x1="188" y1="222" x2="210" y2="222"/>
            <line x1="188" y1="240" x2="210" y2="240"/>
            <line x1="188" y1="258" x2="210" y2="258"/>
            <line x1="188" y1="276" x2="210" y2="276"/>
          </g>

          <polygon points="138,132 186,120 186,148 138,154" fill="#D6C7B2"/>
          <polygon points="186,120 218,112 218,152 186,148" fill="#E8DCC8"/>
        </g>

        {/* 7. LOWER RED SKYBRIDGE & TRUSSES */}
        <g id="olumo-lower-skybridge">
          <polygon points="108,214 166,238 166,262 108,238" fill="#881313"/>
          <polygon points="106,210 168,235 166,240 106,215" fill="#DC2626"/>
          <line x1="124" y1="244" x2="124" y2="328" stroke="#1E293B" strokeWidth="2.2"/>
          <line x1="148" y1="254" x2="148" y2="322" stroke="#1E293B" strokeWidth="2.2"/>
          <line x1="124" y1="265" x2="148" y2="288" stroke="#334155" strokeWidth="1.3"/>
          <line x1="148" y1="265" x2="124" y2="288" stroke="#334155" strokeWidth="1.3"/>
        </g>

        {/* 8. FRONT CLOSER ELEVATOR TOWER */}
        <g id="olumo-tower-front">
          <polygon points="34,162 110,152 110,352 34,352" fill="#7C736B"/>
          <polygon points="82,156 110,152 110,352 82,352" fill="#686059"/>

          <g fill="#292524">
            <rect x="91" y="192" width="9" height="4" rx="1"/>
            <rect x="91" y="214" width="9" height="4" rx="1"/>
            <rect x="91" y="236" width="9" height="4" rx="1"/>
            <rect x="91" y="258" width="9" height="4" rx="1"/>
            <rect x="91" y="280" width="9" height="4" rx="1"/>
            <rect x="91" y="302" width="9" height="4" rx="1"/>
            <rect x="91" y="324" width="9" height="4" rx="1"/>
          </g>

          <rect x="44" y="176" width="32" height="22" rx="3" fill="#5D473A"/>
          <rect x="43" y="192" width="34" height="160" rx="6" fill="#0F172A"/>
          <rect x="49" y="194" width="7" height="158" fill="#334155" opacity="0.6"/>
          <g stroke="#475569" strokeWidth="1.5">
            <line x1="43" y1="212" x2="77" y2="212"/>
            <line x1="43" y1="232" x2="77" y2="232"/>
            <line x1="43" y1="252" x2="77" y2="252"/>
            <line x1="43" y1="272" x2="77" y2="272"/>
            <line x1="43" y1="292" x2="77" y2="292"/>
            <line x1="43" y1="312" x2="77" y2="312"/>
            <line x1="43" y1="332" x2="77" y2="332"/>
          </g>

          <polygon points="28,156 88,144 88,176 28,182" fill="#E6D8C3"/>
          <polygon points="88,144 114,152 114,182 88,176" fill="#CFC0AA"/>
        </g>

        <circle cx="435" cy="242" r="24" fill="#1B5E20"/>
        <circle cx="462" cy="252" r="22" fill="#2E7D32"/>
        <circle cx="132" cy="342" r="18" fill="#2E7D32"/>
        <circle cx="158" cy="346" r="16" fill="#388E3C"/>
      </g>

      {/* =========================================================
           MAIN FOREGROUND & MIDGROUND: GATEWAY CITY GATE MONUMENT
      ========================================================== */}
      <rect x="0" y="330" width="1440" height="170" fill="#5BB450"/>
      <polygon points="0,360 720,332 1440,360 1440,420 720,332 0,420" fill="#6CC261" opacity="0.55"/>

        <g id="gateway-city-gate-monument" transform="translate(110, 0)">
        <ellipse cx="720" cy="332" rx="125" ry="16" fill="#E2E8F0"/>
        <ellipse cx="720" cy="328" rx="112" ry="13" fill="#F8FAFC"/>
        <ellipse cx="720" cy="324" rx="98" ry="10" fill="#FFFFFF"/>

        <g stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round">
          <line x1="628" y1="326" x2="628" y2="296"/>
          <line x1="640" y1="325" x2="640" y2="295"/>
          <line x1="652" y1="324" x2="652" y2="294"/>
          <line x1="664" y1="323" x2="664" y2="293"/>
          <line x1="776" y1="323" x2="776" y2="293"/>
          <line x1="788" y1="324" x2="788" y2="294"/>
          <line x1="800" y1="325" x2="800" y2="295"/>
          <line x1="812" y1="326" x2="812" y2="296"/>
        </g>
        <rect x="628" y="296" width="7" height="4" fill="#4A9E48"/>
        <rect x="652" y="294" width="7" height="4" fill="#4A9E48"/>
        <rect x="788" y="294" width="7" height="4" fill="#4A9E48"/>
        <rect x="812" y="296" width="7" height="4" fill="#4A9E48"/>

        <defs>
          <linearGradient id="armLight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F1F5F9" />
          </linearGradient>
          <linearGradient id="armShade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
          <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="45%" stopColor="#D97706" />
            <stop offset="75%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id="ogunGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E8E46" />
            <stop offset="100%" stopColor="#0F5E2B" />
          </linearGradient>
          <linearGradient id="ribbonGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A3E635" />
            <stop offset="50%" stopColor="#BEF264" />
            <stop offset="100%" stopColor="#84CC16" />
          </linearGradient>
          <clipPath id="medallionInnerClip">
            <circle cx={200} cy={224} r={20} />
          </clipPath>
          <clipPath id="shieldClip">
            <path d="M 192,211 L 208,211 L 208,223 C 208,229 204,233 200,235 C 196,233 192,229 192,223 Z" />
          </clipPath>
          <path id="topArc" d="M 175.5,224 A 24.5,24.5 0 0,1 224.5,224" />
          <path id="bottomArc" d="M 175.5,224 A 24.5,24.5 0 0,0 224.5,224" />
        </defs>

        {/* Positioned & scaled V-monument sitting on the circular platform */}
        <g id="monument-v-placed" transform="translate(622, 90) scale(0.5)">
          <g stroke="#64748B" strokeWidth={2.2} strokeLinecap="round">
            <line x1={118} y1={145} x2={176} y2={210} />
            <line x1={157} y1={308} x2={178} y2={240} />
            <line x1={274} y1={168} x2={224} y2={210} />
            <line x1={234} y1={312} x2={222} y2={240} />
          </g>

          <g id="monument-base">
            <rect
              x={164}
              y={388}
              width={66}
              height={26}
              fill="#F8FAFC"
              stroke="#94A3B8"
              strokeWidth={1.5}
            />
            <line x1={164} y1={401} x2={230} y2={401} stroke="#CBD5E1" strokeWidth={1.5} />
          </g>

          <g id="monument-left">
            <polygon
              points="82,22 104,26 154,322 164,388 164,468 124,468 124,388 118,322"
              fill="url(#armLight)"
              stroke="#94A3B8"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <polygon
              points="104,26 112,28 162,322 170,388 170,468 164,468 164,388 154,322"
              fill="url(#armShade)"
            />
            <g stroke="#CBD5E1" strokeWidth={1.6}>
              <line x1={86} y1={54} x2={109} y2={58} />
              <line x1={91} y1={86} x2={114} y2={90} />
              <line x1={96} y1={118} x2={120} y2={122} />
              <line x1={101} y1={150} x2={126} y2={154} />
              <line x1={106} y1={182} x2={132} y2={186} />
              <line x1={111} y1={214} x2={138} y2={218} />
              <line x1={116} y1={246} x2={144} y2={250} />
              <line x1={121} y1={278} x2={150} y2={282} />
              <line x1={125} y1={310} x2={156} y2={314} />
              <line x1={124} y1={342} x2={164} y2={342} />
              <line x1={124} y1={372} x2={164} y2={372} />
              <line x1={124} y1={418} x2={164} y2={418} />
              <line x1={124} y1={444} x2={164} y2={444} />
            </g>
          </g>

          <g id="monument-right">
            <polygon
              points="284,48 304,44 274,322 268,388 268,468 228,468 228,388 238,322"
              fill="url(#armLight)"
              stroke="#94A3B8"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <polygon
              points="277,50 284,48 238,322 228,388 228,468 222,468 222,388 231,322"
              fill="url(#armShade)"
            />
            <g stroke="#CBD5E1" strokeWidth={1.6}>
              <line x1={280} y1={78} x2={300} y2={74} />
              <line x1={275} y1={108} x2={297} y2={104} />
              <line x1={270} y1={138} x2={294} y2={134} />
              <line x1={265} y1={168} x2={290} y2={164} />
              <line x1={260} y1={198} x2={287} y2={194} />
              <line x1={255} y1={228} x2={283} y2={224} />
              <line x1={250} y1={258} x2={280} y2={254} />
              <line x1={244} y1={288} x2={277} y2={284} />
              <line x1={239} y1={316} x2={274} y2={316} />
              <line x1={228} y1={344} x2={268} y2={344} />
              <line x1={228} y1={372} x2={268} y2={372} />
              <line x1={228} y1={418} x2={268} y2={418} />
              <line x1={228} y1={444} x2={268} y2={444} />
            </g>
          </g>

          <g id="ogun-state-logo">
            <circle cx={200} cy={224} r={32} fill="url(#goldRim)" />
            <circle cx={200} cy={224} r={29.5} fill="url(#ogunGreen)" />
            <circle cx={200} cy={224} r={20} fill="#FFFFFF" />

            <polygon
              points="174.5,222.3 175.1,223.6 176.5,223.8 175.5,224.8 175.7,226.2 174.5,225.5 173.3,226.2 173.5,224.8 172.5,223.8 173.9,223.6"
              fill="#FACC15"
            />
            <polygon
              points="225.5,222.3 226.1,223.6 227.5,223.8 226.5,224.8 226.7,226.2 225.5,225.5 224.3,226.2 224.5,224.8 223.5,223.8 224.9,223.6"
              fill="#FACC15"
            />

            <g clipPath="url(#medallionInnerClip)">
              <path
                d="M 183,210 L 187,209 L 189,212 L 193,212 L 195,216 L 214,218 L 216,222 L 214,225 L 217,228 L 214,231 L 209,231 L 206,236 L 185,235 L 184,228 L 182,222 Z"
                fill="#16A34A"
                opacity={0.78}
              />

              <g clipPath="url(#shieldClip)">
                <rect x={191} y={210} width={9} height={12} fill="#FEF9C3" />
                <polygon points="195.5,213 199.5,214.5 195.5,216 191.5,214.5" fill="#1E293B" />
                <rect x={192.5} y={217.5} width={6} height={2.5} fill="#B45309" />

                <rect x={200} y={210} width={9} height={12} fill="#E2E8F0" />
                <rect x={202} y={213} width={1.5} height={5} fill="#64748B" />
                <rect x={205} y={214} width={1.5} height={4} fill="#64748B" />
                <path d="M 200,219 Q 204.5,217 209,219 L 209,222 L 200,222 Z" fill="#854D0E" />

                <rect x={191} y={222} width={18} height={14} fill="#BAE6FD" />
                <path d="M 191,231 L 197,224 L 202,227 L 206,223 L 209,231 Z" fill="#475569" />
                <path d="M 191,231 Q 200,229 209,231 L 209,236 L 191,236 Z" fill="#0284C7" />
              </g>

              <path
                d="M 192,211 L 208,211 L 208,223 C 208,229 204,233 200,235 C 196,233 192,229 192,223 Z"
                fill="none"
                stroke="#15803D"
                strokeWidth={1.3}
              />
              <line x1={192} y1={222} x2={208} y2={222} stroke="#15803D" strokeWidth={0.9} />
              <line x1={200} y1={211} x2={200} y2={222} stroke="#15803D" strokeWidth={0.9} />

              <ellipse cx={189.5} cy={229} rx={2.2} ry={4.2} fill="#9A3412" />
              <ellipse cx={210.5} cy={229} rx={2.2} ry={4.2} fill="#9A3412" />

              <path
                d="M 186,234 Q 200,232 214,234 L 213,238.5 Q 200,236.5 187,238.5 Z"
                fill="url(#ribbonGold)"
                stroke="#4D7C0F"
                strokeWidth={0.6}
              />
              <text
                x={200}
                y={237.3}
                fill="#14532D"
                fontSize={3.1}
                fontWeight={700}
                textAnchor="middle"
              >
                GATEWAY STATE
              </text>
            </g>

            <text
              fill="#FFFFFF"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize={5.4}
              fontWeight={700}
              letterSpacing={1.1}
            >
              <textPath href="#topArc" startOffset="50%" textAnchor="middle">
                OGUN STATE
              </textPath>
            </text>
            <text
              fill="#FFFFFF"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontSize={5.3}
              fontWeight={700}
              letterSpacing={1.3}
            >
              <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">
                NIGERIA
              </textPath>
            </text>
          </g>
        </g>

        {/* AVENUE */}
        <polygon points="694,335 746,335 975,495 465,495" fill="#1E293B"/>
        <polygon points="696,335 744,335 964,495 476,495" fill="#475569"/>
        <polygon points="700,335 717,335 675,495 485,495" fill="#334155"/>
        <polygon points="723,335 740,335 955,495 765,495" fill="#334155"/>

        <line x1="708" y1="342" x2="585" y2="485" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="14,14" opacity="0.85"/>
        <line x1="732" y1="342" x2="855" y2="485" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="14,14" opacity="0.85"/>

        <polygon points="717,335 723,335 762,495 678,495" fill="#3D8B3B"/>
        <circle cx="720" cy="352" r="5" fill="#2E7D32"/>
        <circle cx="720" cy="374" r="6.5" fill="#4A9E48"/>
        <circle cx="720" cy="400" r="8" fill="#2E7D32"/>

        {/* CENTER GATE KIOSK WITH BLACK-AND-WHITE CURB & TERRACOTTA PAD */}
        <g id="center-gate-kiosk">
          {/* Outer black-and-white curb around the island */}
          <path
            d="M684 440 Q686 432 696 432 L744 432 Q754 432 756 440 L762 474 Q763 482 752 482 L688 482 Q677 482 678 474 Z"
            fill="#1E293B"
          />
          <path
            d="M686 441 Q688 434 697 434 L718 434 L718 438 L698 438 Q691 438 690 443 L686 462 L682 461 Z"
            fill="#FFFFFF"
          />
          <path
            d="M722 434 L743 434 Q752 434 754 441 L758 461 L754 462 L750 443 Q749 438 742 438 L722 438 Z"
            fill="#FFFFFF"
          />
          <path
            d="M683 475 L698 475 L698 480 L688 480 Q683 480 683 475 Z"
            fill="#FFFFFF"
          />
          <path
            d="M712 475 L728 475 L728 480 L712 480 Z"
            fill="#FFFFFF"
          />
          <path
            d="M742 475 L757 475 Q757 480 752 480 L742 480 Z"
            fill="#FFFFFF"
          />

          {/* Terracotta / rust island base */}
          <polygon
            points="691,438 749,438 755,475 685,475"
            fill="#B86B43"
            stroke="#7C3F22"
            strokeWidth="1.2"
          />

          {/* Kiosk lower white wall & dark glazed window band */}
          <rect
            x="701"
            y="422"
            width="38"
            height="38"
            rx="2"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />
          <rect x="703" y="427" width="34" height="17" fill="#334155" />
          {/* Subtle window reflection */}
          <line x1="709" y1="429" x2="715" y2="442" stroke="#94A3B8" strokeWidth="1.2" opacity="0.6" />
          <line x1="725" y1="429" x2="731" y2="442" stroke="#94A3B8" strokeWidth="1.2" opacity="0.6" />

          {/* Wide overhanging roof slab */}
          <polygon
            points="688,422 752,422 748,415 692,415"
            fill="#F1F5F9"
            stroke="#94A3B8"
            strokeWidth="1.2"
          />
          <line x1="689" y1="422" x2="751" y2="422" stroke="#475569" strokeWidth="1.5" />

          {/* Raised rectangular roof parapet box on top */}
          <rect
            x="704"
            y="403"
            width="32"
            height="12"
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth="1.2"
          />
          <rect
            x="708"
            y="405"
            width="24"
            height="7"
            fill="#D6C7B2"
            stroke="#CBD5E1"
            strokeWidth="0.9"
          />
        </g>

        <g stroke="#1E293B" strokeWidth="2.2" fill="none">
          <path d="M625 385 L625 348 L633 348"/>
          <path d="M555 435 L555 390 L565 390"/>
          <path d="M815 385 L815 348 L807 348"/>
          <path d="M885 435 L885 390 L875 390"/>
        </g>
        <circle cx="634" cy="348" r="2.5" fill="#FDE047"/>
        <circle cx="566" cy="390" r="3" fill="#FDE047"/>
        <circle cx="806" cy="348" r="2.5" fill="#FDE047"/>
        <circle cx="874" cy="390" r="3" fill="#FDE047"/>

        {/* TREES */}
        <g id="avenue-tree-left">
          <path d="M475 415 L483 375 L493 375 L500 415 Z" fill="#4E342E"/>
          <ellipse cx="488" cy="365" rx="95" ry="28" fill="#1B5E20"/>
          <ellipse cx="485" cy="350" rx="82" ry="26" fill="#2E7D32"/>
          <ellipse cx="490" cy="336" rx="60" ry="22" fill="#4A9E48"/>
        </g>

        <g id="avenue-tree-right">
          <path d="M945 420 L953 378 L964 378 L972 420 Z" fill="#4E342E"/>
          <ellipse cx="958" cy="368" rx="102" ry="30" fill="#1B5E20"/>
          <ellipse cx="955" cy="352" rx="88" ry="28" fill="#2E7D32"/>
          <ellipse cx="960" cy="337" rx="64" ry="23" fill="#4A9E48"/>
        </g>

        {/* LEFT GATEWAY WALL WITH PILASTER, EMBLEM & FENCE ACCENTS */}
        <g id="gateway-wall-left" transform="translate(0, 14)">
          {/* Main white wall body */}
          <rect
            x="295"
            y="424"
            width="152"
            height="34"
            rx="2"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="1.3"
          />
          {/* Slightly raised inner pilaster post on right end of left wall */}
          <rect
            x="443"
            y="420"
            width="22"
            height="38"
            rx="2"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="1.3"
          />
          {/* Top coping ledge */}
          <rect
            x="292"
            y="418"
            width="154"
            height="6"
            rx="1.5"
            fill="#E2E8F0"
            stroke="#CBD5E1"
            strokeWidth="1"
          />
          <rect
            x="441"
            y="415"
            width="26"
            height="6"
            rx="1.5"
            fill="#E2E8F0"
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {/* Green lettering */}
          <text
            x="369"
            y="446"
            textAnchor="middle"
            fill="#15803D"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            fontSize="13.5"
            letterSpacing="-0.2"
          >
            Gateway City Gate
          </text>

          {/* Small green/white circular badge on right pilaster */}
          <circle cx="454" cy="441" r="6.5" fill="#15803D" />
          <circle cx="454" cy="441" r="4.2" fill="#FFFFFF" />
          <circle cx="454" cy="441" r="2" fill="#15803D" />
        </g>

        {/* RIGHT GATEWAY WALL WITH PILASTER, EMBLEM & FENCE ACCENTS */}
        <g id="gateway-wall-right" transform="translate(0, 14)">
          {/* Slightly raised inner pilaster post on left end of right wall */}
          <rect
            x="975"
            y="420"
            width="22"
            height="38"
            rx="2"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="1.3"
          />
          {/* Main white wall body */}
          <rect
            x="993"
            y="424"
            width="152"
            height="34"
            rx="2"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="1.3"
          />
          {/* Top coping ledge */}
          <rect
            x="973"
            y="415"
            width="26"
            height="6"
            rx="1.5"
            fill="#E2E8F0"
            stroke="#CBD5E1"
            strokeWidth="1"
          />
          <rect
            x="994"
            y="418"
            width="154"
            height="6"
            rx="1.5"
            fill="#E2E8F0"
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {/* Small green/white circular badge on left pilaster */}
          <circle cx="986" cy="441" r="6.5" fill="#15803D" />
          <circle cx="986" cy="441" r="4.2" fill="#FFFFFF" />
          <circle cx="986" cy="441" r="2" fill="#15803D" />

          {/* Green lettering */}
          <text
            x="1071"
            y="446"
            textAnchor="middle"
            fill="#15803D"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="800"
            fontSize="13.5"
            letterSpacing="-0.2"
          >
            Gateway City Gate
          </text>
        </g>
      </g>  

      <g id="sketchy-bottom-edge">
        <path
          d="M0 490
            C18 486, 34 483, 56 488
            C78 493, 96 485, 124 488
            C154 491, 174 484, 206 489
            C238 494, 262 486, 298 488
            C334 490, 356 483, 392 489
            C428 495, 458 485, 496 488
            C534 492, 562 484, 602 489
            C642 495, 672 485, 712 488
            C752 491, 782 484, 824 490
            C866 495, 896 485, 938 488
            C980 492, 1012 484, 1056 490
            C1100 495, 1134 485, 1178 488
            C1222 491, 1258 484, 1304 489
            C1350 495, 1392 486, 1440 488
            L1440 504 L0 504 Z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
};