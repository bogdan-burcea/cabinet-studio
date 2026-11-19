import type {Cabinet} from '../domain/cabinet';
import {isSimpleCabinet} from '../domain/simple-cabinet';
import {deserializeWithInfo} from './files';
export const SIMPLE_AUTOSAVE_KEY='cabinet-studio.simple.autosave.v1';
export function readSimpleCabinet(text:string):Cabinet{
 const {cabinet}=deserializeWithInfo(text);
 if(!isSimpleCabinet(cabinet))throw new Error('This file uses features outside the simple editor. Your current cabinet and the original file are unchanged.');
 return cabinet;
}
