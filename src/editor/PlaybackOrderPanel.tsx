import { useRef, useState } from 'react';
import type { Scenario } from '../scenario';

type Step = Scenario['steps'][number];

/** 再生順の表示・並べ替え専用。編集データの所有権はFlowEditorに残す。 */
export default function PlaybackOrderPanel({ steps, selectedStep, onChange, onSelect, onDelete }: {
 steps: Step[];
 selectedStep: string | null;
 onChange: (steps: Step[]) => void;
 onSelect: (id: string) => void;
 onDelete: (id: string) => void;
}) {
 const [draggedStep, setDraggedStep] = useState<string | null>(null);
 const dragRef = useRef<{ id: string; pointerId: number; startY: number } | null>(null);
 const [dropTarget, setDropTarget] = useState<string | null>(null);
 const setSteps = (updater: (current: Step[]) => Step[]) => onChange(updater(steps).map((step, index) => ({ ...step, order: index + 1 })));
 const moveStep = (fromId: string, toId: string) => {
  if (fromId === toId) return;
  setSteps(current => {
   const from = current.findIndex(item => item.id === fromId);
   const to = current.findIndex(item => item.id === toId);
   if (from < 0 || to < 0) return current;
   const reordered = [...current];
   const [moved] = reordered.splice(from, 1);
   reordered.splice(to, 0, moved);
   return reordered.map((step, index) => ({ ...step, order: index + 1 }));
  });
 };
 const targetAt = (element: HTMLElement, x: number, y: number) => {
  const row = element.ownerDocument.elementFromPoint(x, y)?.closest<HTMLElement>('[data-order-step-id]');
  return row && element.closest('.editor-step-list')?.contains(row) ? row.dataset.orderStepId ?? null : null;
 };
 return <>
    <details className="editor-section" open><summary>通信の再生順（{steps.length}件）</summary>
    <p className="editor-reorder-hint">左の「⠿」をドラッグして再生順を入れ替えられます。</p>
    <div className="editor-step-list">{steps.map((step, index) =>
     <div key={step.id} data-order-step-id={step.id} className={dropTarget === step.id && draggedStep !== step.id ? 'editor-step-drop-target' : '' }>
      <span className="editor-step-drag-handle" role="button" tabIndex={0} aria-label={step.title + 'をドラッグして並び替え'}
       title="ドラッグして並び替え" style={{ touchAction: 'none', cursor: 'grab', userSelect: 'none' }}
       onPointerDown={event => {
        if (event.button !== 0) return;
        event.preventDefault();
        dragRef.current = { id: step.id, pointerId: event.pointerId, startY: event.clientY };
        setDraggedStep(step.id);
        event.currentTarget.setPointerCapture(event.pointerId);
       }}
       onPointerMove={event => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const target = targetAt(event.currentTarget, event.clientX, event.clientY);
        setDropTarget(target && target !== drag.id ? target : null);
       }}
       onPointerUp={event => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const target = targetAt(event.currentTarget, event.clientX, event.clientY);
        if (target && target !== drag.id && Math.abs(event.clientY - drag.startY) > 3) moveStep(drag.id, target);
        dragRef.current = null;
        setDraggedStep(null);
        setDropTarget(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
       }}
       onPointerCancel={() => { dragRef.current = null; setDraggedStep(null); setDropTarget(null); }}
       onKeyDown={event => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        event.preventDefault();
        const destination = steps[index + (event.key === 'ArrowUp' ? -1 : 1)];
        if (destination) moveStep(step.id, destination.id);
       }}>⠿</span>
      <button className={selectedStep === step.id ? 'selected' : ''} onClick={() => { onSelect(step.id); }}>{index + 1}. {step.title}</button>
      <button disabled={index === 0} aria-label="上へ" onClick={() => setSteps(v => { const copy = [...v]; [copy[index-1], copy[index]] = [copy[index], copy[index-1]]; return copy; })}>↑</button>
      <button disabled={index === steps.length-1} aria-label="下へ" onClick={() => setSteps(v => { const copy = [...v]; [copy[index+1], copy[index]] = [copy[index], copy[index+1]]; return copy; })}>↓</button>
      <button type="button" className="editor-step-delete" aria-label={`${step.title}を削除`} title="このステップを削除" onClick={() => onDelete(step.id)}>削除</button>
     </div>)}</div>
    </details>
 </>;
}
