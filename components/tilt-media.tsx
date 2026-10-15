"use client";
import {useEffect,useRef,type ReactNode} from 'react';

/** Subtle 3D presentation of original media; does not reconstruct its contents. */
export function TiltMedia({children}:{children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null);
 const frame=useRef<number|null>(null);
 const reset=()=>{
  if(frame.current!==null)cancelAnimationFrame(frame.current);
  frame.current=null;
  ref.current?.style.setProperty('--tilt-x','0deg');
  ref.current?.style.setProperty('--tilt-y','0deg');
 };
 useEffect(()=>{
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const changed=()=>{if(motion.matches)reset();};
  motion.addEventListener('change',changed);
  return()=>{motion.removeEventListener('change',changed);if(frame.current!==null)cancelAnimationFrame(frame.current);};
 },[]);
 const tilt=(x:number,y:number)=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(frame.current!==null)cancelAnimationFrame(frame.current);
  frame.current=requestAnimationFrame(()=>{
   ref.current?.style.setProperty('--tilt-x',`${y}deg`);
   ref.current?.style.setProperty('--tilt-y',`${x}deg`);
   frame.current=null;
  });
 };
 return <div className="tilt-media" ref={ref} onPointerMove={event=>{
  if(event.pointerType!=='mouse')return;
  const rect=event.currentTarget.getBoundingClientRect();
  tilt(Math.max(-5,Math.min(5,((event.clientX-rect.left)/rect.width-.5)*10)),Math.max(-4,Math.min(4,-((event.clientY-rect.top)/rect.height-.5)*8)));
 }} onPointerDown={event=>{if(event.pointerType==='touch')tilt(2,-1.5);}} onPointerUp={event=>{if(event.pointerType!=='mouse')reset();}} onPointerLeave={reset} onPointerCancel={reset} onBlur={reset}><div className="tilt-media-surface">{children}</div></div>;
}
