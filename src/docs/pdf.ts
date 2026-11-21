import {jsPDF} from 'jspdf';
import QRCode from 'qrcode';
import type {Cabinet} from '../domain/cabinet';
import type {FlatPart} from '../cnc/parts';
import type {LabelMap} from './label-job';
import {partDiagram,type Diagram} from './diagrams';
import {partLink} from './project';

function draw(pdf:jsPDF,view:Diagram,x:number,y:number,w:number,h:number){
 const scale=Math.min(w/view.width,h/view.height);
 const left=x+(w-view.width*scale)/2,top=y+(h-view.height*scale)/2;
 for(const {points,shade} of view.faces){
  const first=points[0];
  pdf.setDrawColor(65).setLineWidth(.22).setFillColor(String([227,201,242,90][shade]/255));
  pdf.lines(points.slice(1).map((point,i)=>[(point[0]-points[i][0])*scale,(point[1]-points[i][1])*scale]),
   left+first[0]*scale,top+first[1]*scale,[1,1],'FD',true);
 }
 pdf.setTextColor(0);
}
const mm=(values:readonly number[])=>values.map(value=>+value.toFixed(2)).join(' x ')+' mm';

export type LabelStock={pageWidth:number;pageHeight:number;width:number;height:number;margin:number;gap:number;top?:number;gapX?:number;gapY?:number;start?:number};
export const defaultLabelStock:LabelStock={pageWidth:210,pageHeight:297,width:80,height:48,margin:10,gap:4};
export function labelGrid(stock:LabelStock){
 const columns=Math.floor((stock.pageWidth-2*stock.margin+(stock.gapX??stock.gap))/(stock.width+(stock.gapX??stock.gap)));
 const rows=Math.floor((stock.pageHeight-2*(stock.top??stock.margin)+(stock.gapY??stock.gap))/(stock.height+(stock.gapY??stock.gap)));
 if(![stock.pageWidth,stock.pageHeight,stock.width,stock.height,stock.margin,stock.gap].every(Number.isFinite)||stock.pageWidth>2000||stock.pageHeight>2000||Object.values(stock).some(n=>!Number.isFinite(n)||n<0)||stock.width<40||stock.height<25||columns<1||rows<1)
  throw Error('The sheet must fit at least one label of 40 × 25 mm or larger.');
 if(!Number.isInteger(stock.start??0)||(stock.start??0)<0||(stock.start??0)>=columns*rows)throw Error(`Skip used labels must be between 0 and ${columns*rows-1}.`);
 return {rows,columns};
}
export function partLabels(cabinet:Cabinet,parts:FlatPart[],stock:LabelStock,app:string,calibration=false,map?:LabelMap){
 const {rows,columns}=labelGrid(stock),perPage=rows*columns;
 const pdf=new jsPDF({unit:'mm',format:[stock.pageWidth,stock.pageHeight],orientation:stock.pageWidth>stock.pageHeight?'landscape':'portrait'});
 pdf.setProperties({title:`${cabinet.name} - part labels`});
 const entries=calibration?Array.from({length:perPage},()=>parts[0]):parts;
 for(const [i,part] of entries.entries()){
  const index=i+(calibration?0:stock.start??0),slot=index%perPage;
  if(i>0&&slot===0)pdf.addPage();
  const x=stock.margin+(slot%columns)*(stock.width+(stock.gapX??stock.gap)),y=(stock.top??stock.margin)+Math.floor(slot/columns)*(stock.height+(stock.gapY??stock.gap));
  pdf.setLineWidth(.18).setDrawColor(165).rect(x,y,stock.width,stock.height);
  if(calibration){pdf.setTextColor(0).setFont('helvetica','normal').setFontSize(8).text(`Label ${i+1} - ${stock.width} x ${stock.height} mm`,x+3,y+6).setFontSize(7).text('Print at actual size / 100%',x+3,y+12);continue;}
  const url=partLink(app,cabinet.id,part.id),qr=QRCode.create(url,{errorCorrectionLevel:'M'}).modules;
  const size=Math.min(stock.height-13,stock.width*.30),cell=size/(qr.size+8),qx=x+stock.width-size-2,qy=y+stock.height-size-2;
  if(cell<.20)throw Error('Increase the label size or shorten the app address for a printable QR code.');
  pdf.setFillColor('0');
  for(let r=0;r<qr.size;r++)for(let c=0;c<qr.size;c++)if(qr.get(r,c))pdf.rect(qx+(c+4)*cell,qy+(r+4)*cell,cell+.008,cell+.008,'F');
  pdf.link(qx,qy,size,size,{url});
  pdf.setFont('helvetica','bold').setFontSize(8);
  const title=pdf.splitTextToSize(`${i+1}. ${part.label}`,stock.width-4).slice(0,2);
  pdf.text(title,x+2,y+4);
  const dimensionY=4+(title.length-1)*3+3,imageY=dimensionY+2;
  pdf.setFont('helvetica','normal').setFontSize(6).text(mm([part.width,part.height,part.thickness]),x+2,y+dimensionY,{maxWidth:stock.width-4});
  draw(pdf,partDiagram(part),x+2,y+imageY,stock.width-size-5,stock.height-imageY-2);
 }
 if(map&&!calibration)appendLabelMaps(pdf,parts,map);
 return pdf;
}

/** Reference pages are A4, independent of the adhesive label stock. */
function appendLabelMaps(pdf:jsPDF,parts:FlatPart[],map:LabelMap){
 const number=new Map(parts.map((p,i)=>[p.id,i+1]));
 const page=(title:string,landscape=false)=>{pdf.addPage([210,297],landscape?'landscape':'portrait');pdf.setTextColor(0).setDrawColor(80).setFont('helvetica','bold').setFontSize(15).text(title,12,15);};
 for(const sheet of map.sheets){
  page(`${sheet.label} - label map`,sheet.width>sheet.height);
  pdf.setFont('helvetica','normal').setFontSize(9).text(`${sheet.width} x ${sheet.height} x ${sheet.thickness} mm | dashed: reusable offcuts`,12,23);
  const pageWidth=pdf.internal.pageSize.getWidth(),pageHeight=pdf.internal.pageSize.getHeight();
  const scale=Math.min((pageWidth-24)/sheet.width,(pageHeight-44)/sheet.height),ox=(pageWidth-sheet.width*scale)/2,oy=32;
  pdf.setLineWidth(.3).rect(ox,oy,sheet.width*scale,sheet.height*scale);
  for(const item of sheet.items){
   const x=ox+item.x*scale,y=oy+item.y*scale,w=item.width*scale,h=item.height*scale;
   pdf.setLineDashPattern(item.offcut?[1,1]:[],0).setLineWidth(.18).rect(x,y,w,h);
   const part=parts.find(p=>p.id===item.id)!;
   pdf.setLineDashPattern([],0).setFont('helvetica','bold').setFontSize(w>28&&h>14?6:8);
   const title=pdf.splitTextToSize(`${number.get(item.id)??'?'}. ${part.label}`,Math.max(1,w-3)).slice(0,w>28&&h>14?2:1);
   if(w>28&&h>14){pdf.text(title,x+1.5,y+4);pdf.setFont('helvetica','normal').setFontSize(6).text(`${item.width} x ${item.height}${item.rotated?' | 90 deg':''}`,x+1.5,y+5+title.length*2.5);}
   else pdf.text(String(number.get(item.id)??'?'),x+1.5,y+4);
  }
 }
}
