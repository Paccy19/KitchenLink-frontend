import{a as c,r,j as l}from"./index-DNpXlZGA.js";/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=c("CornerUpRight",[["polyline",{points:"15 14 20 9 15 4",key:"1tbx3s"}],["path",{d:"M4 20v-7a4 4 0 0 1 4-4h12",key:"1lu4f8"}]]);/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=c("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=c("Minimize2",[["polyline",{points:"4 14 10 14 10 20",key:"11kfnr"}],["polyline",{points:"20 10 14 10 14 4",key:"rlmsce"}],["line",{x1:"14",x2:"21",y1:"10",y2:"3",key:"o5lafz"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);function f(){const[e,o]=r.useState(!1);return r.useEffect(()=>{if(!e)return;const{body:t}=document,s=window.scrollY,i={position:t.style.position,top:t.style.top,width:t.style.width,overflow:t.style.overflow};t.style.position="fixed",t.style.top=`-${s}px`,t.style.width="100%",t.style.overflow="hidden";const n=a=>a.key==="Escape"&&o(!1);return window.addEventListener("keydown",n),()=>{window.removeEventListener("keydown",n),Object.assign(t.style,i),window.scrollTo(0,s)}},[e]),[e,o]}function u({full:e,label:o,className:t,children:s}){const i=r.useRef(null);return r.useEffect(()=>{var a;if(!e)return;const n=document.activeElement;return(a=i.current)==null||a.focus(),()=>{var d;return(d=n==null?void 0:n.focus)==null?void 0:d.call(n)}},[e]),l.jsx("div",{ref:i,tabIndex:e?-1:void 0,role:e?"dialog":void 0,"aria-label":e?o:void 0,className:e?"fixed inset-0 z-[1000] bg-white flex flex-col outline-none":t,children:s})}function w({full:e,onChange:o,label:t="map"}){return l.jsxs("button",{type:"button",onClick:()=>o(!e),"aria-label":e?"Exit full screen":`Full screen ${t}`,className:"inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 border border-stone-200 shadow-md text-xs font-bold text-stone-700 hover:text-blue-700",children:[e?l.jsx(x,{className:"w-3.5 h-3.5"}):l.jsx(y,{className:"w-3.5 h-3.5"}),e?"Exit full screen":"Full screen"]})}const v=e=>e?{paddingTop:"max(0.75rem, env(safe-area-inset-top))"}:void 0,b=e=>e?{paddingBottom:"max(0.75rem, env(safe-area-inset-bottom))"}:void 0;export{m as C,u as F,w as a,b,v as s,f as u};
