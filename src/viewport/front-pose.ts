export function inspectionRotation(handing:'left'|'right',angle:number):number {
  const degrees=Number.isFinite(angle)?Math.max(0,Math.min(110,angle)):0;
  if(degrees===0)return 0;
  return (handing==='left'?-1:1)*degrees*Math.PI/180;
}
