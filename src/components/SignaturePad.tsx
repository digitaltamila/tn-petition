import {useEffect,useRef} from 'react';
import SignaturePadLib from 'signature_pad';
export function SignaturePad({value,onChange}:{value:string,onChange:(v:string)=>void}){
  const canvas=useRef<HTMLCanvasElement>(null); const pad=useRef<SignaturePadLib|undefined>(undefined);
  useEffect(()=>{const c=canvas.current!;const resize=()=>{const saved=pad.current?.toData();const ratio=Math.max(devicePixelRatio||1,1);c.width=c.offsetWidth*ratio;c.height=220*ratio;c.getContext('2d')!.scale(ratio,ratio);pad.current?.clear();if(saved?.length)pad.current?.fromData(saved)};pad.current=new SignaturePadLib(c,{minWidth:1,maxWidth:2.5});pad.current.addEventListener('endStroke',()=>onChange(pad.current!.toDataURL('image/png')));resize();window.addEventListener('resize',resize);if(value)pad.current.fromDataURL(value);return()=>window.removeEventListener('resize',resize)},[onChange,value]);
  return <div><canvas ref={canvas} className="h-[220px] w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-white" aria-label="Signature drawing area"/><button type="button" className="btn-secondary mt-3" onClick={()=>{pad.current?.clear();onChange('')}}>Clear / அழிக்கவும்</button></div>
}
