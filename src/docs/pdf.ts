import {jsPDF} from 'jspdf';
import QRCode from 'qrcode';
import type {Cabinet} from '../domain/cabinet';
import type {FlatPart} from '../cnc/parts';
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

export type LabelStock={pageWidth:number;pageHeight:number;width:number;height:number;margin:number;gap:number};
export const defaultLabelStock:LabelStock={pageWidth:210,pageHeight:297,width:80,height:48,margin:10,gap:4};
export function labelGrid(stock:LabelStock){
 const columns=Math.floor((stock.pageWidth-2*stock.margin+stock.gap)/(stock.width+stock.gap));
 const rows=Math.floor((stock.pageHeight-2*stock.margin+stock.gap)/(stock.height+stock.gap));
 if(Object.values(stock).some(n=>!Number.isFinite(n)||n<0)||stock.width<50||stock.height<30||columns<1||rows<1)
  throw Error('The sheet must fit at least one label of 50 × 30 mm or larger.');
 return {rows,columns};
}
export function partLabels(cabinet:Cabinet,parts:FlatPart[],stock:LabelStock,app:string){
 const {rows,columns}=labelGrid(stock),perPage=rows*columns;
 const pdf=new jsPDF({unit:'mm',format:[stock.pageWidth,stock.pageHeight],orientation:stock.pageWidth>stock.pageHeight?'landscape':'portrait'});
 pdf.setProperties({title:`${cabinet.name} - part labels`});
 for(const [i,part] of parts.entries()){
  const slot=i%perPage;
  if(i>0&&slot===0)pdf.addPage();
  const x=stock.margin+(slot%columns)*(stock.width+stock.gap),y=stock.margin+Math.floor(slot/columns)*(stock.height+stock.gap);
  pdf.setLineWidth(.18).setDrawColor(165).rect(x,y,stock.width,stock.height);
  const url=partLink(app,cabinet.id,part.id),qr=QRCode.create(url,{errorCorrectionLevel:'M'}).modules;
  const size=Math.min(stock.height-6,stock.width*.42),cell=size/(qr.size+8),qx=x+stock.width-size-3,qy=y+stock.height-size-3;
  if(cell<.25)throw Error('Increase the label size or shorten the app address for a printable QR code.');
  pdf.setFillColor('0');
  for(let r=0;r<qr.size;r++)for(let c=0;c<qr.size;c++)if(qr.get(r,c))pdf.rect(qx+(c+4)*cell,qy+(r+4)*cell,cell+.012,cell+.012,'F');
  pdf.link(qx,qy,size,size,{url});
  const content=stock.width-size-9;
  pdf.setFont('helvetica','bold').setFontSize(9);
  const title=pdf.splitTextToSize(`${i+1}. ${part.label}`,content).slice(0,2);
  pdf.text(title,x+3,y+5);
  pdf.setFont('helvetica','normal').setFontSize(7).text(mm([part.width,part.height,part.thickness]),x+3,y+13,{maxWidth:content});
  draw(pdf,partDiagram(part),x+3,y+18,content,stock.height-21);
 }
 return pdf;
}
