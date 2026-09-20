import React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';

// ==========================================
// Shared drag-and-drop Kanban primitives, built on @dnd-kit/core.
// Used by both the Leads and Opportunities Kanban boards so cards can be
// dragged between stage/status columns instead of the boards being static.
// ==========================================

interface KanbanColumnProps {
  id: string;
  className?: string;
  children: React.ReactNode;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, className, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`${className || ''} transition-colors ${
        isOver ? 'ring-2 ring-indigo-400 bg-indigo-50/60 border-indigo-300' : ''
      }`}
    >
      {children}
    </div>
  );
};

interface KanbanCardProps {
  id: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ id, onClick, className, children }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
        position: 'relative'
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`${className || ''} cursor-grab active:cursor-grabbing touch-none ${
        isDragging ? 'opacity-50 shadow-xl scale-[1.02]' : ''
      }`}
    >
      {children}
    </div>
  );
};
