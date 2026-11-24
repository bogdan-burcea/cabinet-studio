import type {Cabinet} from '../domain/cabinet';
import {evaluate} from '../geometry/evaluate';
import {stock} from '../catalogue/materials';
import {flattenParts} from '../cnc/parts';
import {librarySnapshot,libraryConstructionInfo,putLibraryEntry,type LibraryEntry} from '../persistence/library';
import {cabinetThumbnail} from '../viewport/cabinet-thumbnail';
export function saveToLibrary(cabinet:Cabinet,overwriteId?:string){
 const model=evaluate(cabinet),parts=flattenParts(model);
 const entry:LibraryEntry={id:crypto.randomUUID(),...librarySnapshot(cabinet,cabinet.name),savedAt:new Date().toISOString(),thumbnail:cabinetThumbnail(model),info:{size:[cabinet.envelope.width,cabinet.envelope.height,cabinet.envelope.depth],doors:cabinet.fronts.length,drawers:cabinet.drawers?.length??0,parts:parts.length,stock:stock(cabinet,'carcass').thickness,...libraryConstructionInfo(cabinet,parts)}};
 return putLibraryEntry(localStorage,entry,overwriteId);
}
