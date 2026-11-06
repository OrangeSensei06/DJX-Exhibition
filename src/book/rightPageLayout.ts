import type {CSSProperties} from 'react';
export interface PageLayerTransform {x?:number;y?:number;rotation?:number;scale?:number;opacity?:number}
/** Native 1920x1200 coordinates; zero offsets preserve Figma.
 * IDs and labels: design/right-page-layers.json.
 * Example: 1: {'126:3130': {x:30,y:-20,rotation:5,scale:1.1}}.
 * Applies to settled pages and both faces of the turning sheet.
 */
export const rightPageLayout:Record<number,Record<string,PageLayerTransform>>={1:{},2:{},3:{},4:{},5:{}};
export function rightPageStyle(chapter:number):CSSProperties{
 const style:Record<string,string|number>={};
 for(const [id,v] of Object.entries(rightPageLayout[chapter]??{})){
  const p='--layer-'+id.replace(':','-');
  if(v.x!==undefined)style[p+'-x']=v.x+'px';
  if(v.y!==undefined)style[p+'-y']=v.y+'px';
  if(v.rotation!==undefined)style[p+'-rotation']=v.rotation+'deg';
  if(v.scale!==undefined)style[p+'-scale']=v.scale;
  if(v.opacity!==undefined)style[p+'-opacity']=v.opacity;
 }return style as CSSProperties;
}
