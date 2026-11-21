import {deflateSync,inflateSync,strToU8,strFromU8} from 'fflate';
import type {Cabinet} from '../domain/cabinet';
import {serialize} from '../persistence/files';
import {readSimpleCabinet} from '../persistence/simple';
import {qrDictionaryV1} from './qr-dictionary';
const dictionary=strToU8(qrDictionaryV1),maxBytes=1_000_000;
/** Cabinet intent travels in the URL fragment, without a server or file upload. */
export function encodeQrCabinet(cabinet:Cabinet):string{
 const raw=strToU8(JSON.stringify(JSON.parse(serialize(cabinet))));
 if(raw.length>=maxBytes)throw Error('This cabinet is too large for a label QR link.');
 const compressed=deflateSync(raw,{level:9,dictionary});
 return '1.'+btoa(Array.from(compressed,n=>String.fromCharCode(n)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decodeQrCabinet(value:string):Cabinet{
 try{
  if(!/^1\.[\w-]+$/.test(value)||value.length>12000)throw Error();
  const binary=atob(value.slice(2).replaceAll('-','+').replaceAll('_','/'));
  const bytes=inflateSync(Uint8Array.from(binary,c=>c.charCodeAt(0)),{dictionary,out:new Uint8Array(maxBytes)});
  if(bytes.length>=maxBytes)throw Error();
  return readSimpleCabinet(strFromU8(bytes));
 }catch{throw Error('This label has an invalid or unsupported cabinet snapshot. The current cabinet is unchanged.');}
}
