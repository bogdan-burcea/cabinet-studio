import type {partPreview} from '../geometry/part-preview';

export function PartDrawing({preview,label}:{preview:ReturnType<typeof partPreview>;label:string}){
 const {width,height}=preview.face;
 const scale=Math.min(228/width,232/height),w=width*scale,h=height*scale,x=(280-w)/2,y=(280-h)/2;
 return <svg className="part-thumbnail" viewBox="0 0 280 310" role="img" aria-label={`${label}, ${width} by ${height} millimetres`}>
  <svg x={x} y={y} width={w} height={h} viewBox={`0 0 ${width} ${height}`} overflow="visible">
   <PartPaths preview={preview}/>
  </svg>
  <text x="140" y={y+h+20} textAnchor="middle">{+width.toFixed(1)} mm</text>
  <text x={x-12} y="140" textAnchor="middle" transform={`rotate(-90 ${x-12} 140)`}>{+height.toFixed(1)} mm</text>
 </svg>;
}

export function PartPaths({preview}:{preview:ReturnType<typeof partPreview>}){return <>
   <path className="part-outline" d={preview.outline} vectorEffect="non-scaling-stroke" fillRule="evenodd"/>
   <path className="through-machining" d={preview.throughPath} vectorEffect="non-scaling-stroke" fillRule="evenodd"/>
   <path className="back-pocket" d={preview.slots} vectorEffect="non-scaling-stroke" fillRule="evenodd"/>
   {preview.bores.map(b=><path key={b.kind} className={b.kind==='housing'?'housing-bore':'receiver-bore'} d={b.path} vectorEffect="non-scaling-stroke" fillRule="evenodd"/>)}
 </>;}
