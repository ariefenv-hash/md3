const t=new Set;export function registerOverlayBack(e){return t.add(e),()=>t.delete(e)}export function findActiveOverlayBack(){for(const e of t)try{if(e.isActive())return e}catch{}return null}
