import type {CustomHingeSpec} from '../domain/cabinet';
/** Schematic drilling datums; dimensions are read from the fields, not scaled. */
export function HingeMountingDrawing({spec,cupDistance}:{spec:CustomHingeSpec;cupDistance:number}){
 return <figure className="hinge-mounting-drawing"><svg viewBox="0 0 340 330" role="img" aria-label="Hinge mounting dimensions: D cup diameter, C cup depth, E cup setback, P cup screw pitch, O cup screw offset, L plate line from cabinet front, R plate screw pitch and A opening angle.">
 <g fill="none" stroke="currentColor" strokeWidth="1.2">
 <path d="M45 50H166V180H45Z M210 50H323V180H210Z"/>
 <path className="hinge-datum" d="M100 58V174 M52 112H158 M270 58V174"/>
 <circle cx="100" cy="112" r="26"/><circle cx="82" cy="72" r="3"/><circle cx="82" cy="152" r="3"/>
 <path d="M74 112H126 M71 108L77 116 M123 108L129 116 M82 72H157 M82 152H157 M151 72V152 M147 75L155 69 M147 155L155 149 M82 72V40 M100 86V40 M82 45H100 M79 41L85 49 M97 41L103 49 M45 180V206 M74 112V206 M45 199H74 M42 195L48 203 M71 195L77 203"/>
 <rect x="255" y="80" width="30" height="80" rx="4"/><circle cx="270" cy="92" r="3"/><circle cx="270" cy="148" r="3"/>
 <path d="M285 92H309 M285 148H309 M304 92V148 M300 95L308 89 M300 151L308 145 M210 180V206 M270 148V206 M210 199H270 M207 195L213 203 M267 195L273 203"/>
 <path d="M45 249H75V261H115V249H145V273H45Z M145 249H168 M115 261H168 M161 249V261 M157 252L165 246 M157 264L165 258"/>
 <path d="M217 273H292 M236 273L218 234 M257 273A21 21 0 0 0 227 254"/>
 </g>
 <g fill="currentColor" fontSize="11" textAnchor="middle">
 <text x="103" y="26">Door · inside face</text><text x="267" y="26">Cabinet side</text>
 <text x="102" y="104">ØD {spec.cupDiameter}</text><text x="139" y="119" transform="rotate(-90 139 119)">P {spec.screwPitch}</text>
 <text x="91" y="37">O {spec.screwOffset}</text><text x="60" y="218">E {cupDistance}</text>
 <text x="240" y="218">L {spec.plateLine}</text><text x="296" y="120" transform="rotate(-90 296 120)">R {spec.platePitch}</text>
 <text x="95" y="294">Cup section</text><text x="184" y="259">C {spec.cupDepth}</text><text x="272" y="248">A {spec.maxAngle}°</text>
 <text x="170" y="321">Schematic · dimensions in mm · not to scale</text>
 </g></svg></figure>;
}
