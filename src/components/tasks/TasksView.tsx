import React, { useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { Task, TaskPriority, TaskType } from '../../types';
import { CheckSquare, Circle, CheckCircle2, Plus, X, Filter } from 'lucide-react';

const TYPES: TaskType[] = ['Call', 'Email', 'Meeting', 'Follow-up', 'Demo', 'Internal', 'Approval', 'Other'];
const PRIORITIES: TaskPriority[] = ['Urgent', 'High', 'Medium', 'Low'];

export const TasksView: React.FC = () => {
  const { currentUser, allUsers, accessibleTasks, createTask, updateTask, completeTask, deleteTask } = useCRM();
  const [filter, setFilter] = useState<'mine' | 'all' | 'overdue' | 'completed'>('mine');
  const [showNew, setShowNew] = useState(false);

  const filtered = accessibleTasks.filter(t => {
    if (filter === 'mine') return t.assignedToId === currentUser.id && t.status !== 'Completed' && t.status !== 'Cancelled';
    if (filter === 'overdue') return t.status !== 'Completed' && t.status !== 'Cancelled' && new Date(t.dueDate) < new Date(new Date().toDateString());
    if (filter === 'completed') return t.status === 'Completed';
    return true;
  }).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tasks &amp; Activities</h1>
          <p className="text-xs text-slate-500 mt-1">Your daily work queue, plus anything you've assigned to others.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        {(['mine', 'all', 'overdue', 'completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg font-semibold capitalize ${filter === f ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filtered.map(t => (
          <TaskRow key={t.id} task={t} onComplete={() => completeTask(t.id)} onDelete={() => deleteTask(t.id)} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-16 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-300" />
            Nothing here — you're caught up.
          </div>
        )}
      </div>

      {showNew && (
        <NewTaskModal
          currentUser={currentUser}
          allUsers={allUsers}
          onClose={() => setShowNew(false)}
          onCreate={(data) => { createTask(data); setShowNew(false); }}
        />
      )}
    </div>
  );
};

const TaskRow: React.FC<{ task: Task; onComplete: () => void; onDelete: () => void }> = ({ task, onComplete, onDelete }) => {
  const overdue = task.status !== 'Completed' && task.status !== 'Cancelled' && new Date(task.dueDate) < new Date(new Date().toDateString());
  return (
    <div className={`bg-white p-4 rounded-2xl border shadow-xs flex items-center justify-between gap-3 ${overdue ? 'border-rose-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onComplete} disabled={task.status === 'Completed'}>
          {task.status === 'Completed' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500" />}
        </button>
        <div className="min-w-0">
          <p className={`text-sm font-semibold truncate ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {task.type} &middot; {task.assignedToName} &middot; Due {new Date(task.dueDate).toLocaleDateString()}
            {task.linkedEntityName && ` • ${task.linkedEntityName}`}
            {task.source === 'AI Suggested' && ' • ✨ AI Suggested'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          task.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' : task.priority === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {overdue ? 'Overdue' : task.priority}
        </span>
        <button onClick={onDelete} className="text-slate-300 hover:text-rose-500 text-xs px-1">✕</button>
      </div>
    </div>
  );
};

const NewTaskModal: React.FC<{ currentUser: any; allUsers: any[]; onClose: () => void; onCreate: (data: Partial<Task>) => void }> = ({ currentUser, allUsers, onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('Follow-up');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedToId, setAssignedToId] = useState(currentUser.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-amber-600" /> New Task</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const assignee = allUsers.find((u: any) => u.id === assignedToId);
            onCreate({ title, type, priority, dueDate, assignedToId, assignedToName: assignee?.name || currentUser.name });
          }}
          className="space-y-4 pt-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Task Title</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="e.g. Call HDFC Bank re: renewal" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type</label>
              <select value={type} onChange={e => setType(e.target.value as TaskType)} className="input">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="input">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assign To</label>
              <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="input">
                {allUsers.filter((u: any) => u.isActive).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  );
};
