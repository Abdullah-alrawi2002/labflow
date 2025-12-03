import React, { useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import { api } from '../utils/api';

export default function NextStepsSection({ tasks, projectId, onRefresh }) {
  const [newTask, setNewTask] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAdd = async () => {
    if (!newTask.trim()) return;
    try {
      await api.createTask(projectId, { title: newTask.trim() });
      setNewTask('');
      setShowInput(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const handleToggle = async (taskId) => {
    try {
      await api.toggleTask(taskId);
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.deleteTask(taskId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdd();
    } else if (e.key === 'Escape') {
      setNewTask('');
      setShowInput(false);
    }
  };

  // Sort: unchecked first, then checked
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.checked === b.checked) return 0;
    return a.checked ? 1 : -1;
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Next Steps</h2>
        <button
          onClick={() => setShowInput(true)}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="card p-4 space-y-2">
        {/* Add Task Input */}
        {showInput && (
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a task..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!newTask.trim()}
              className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Empty State */}
        {tasks.length === 0 && !showInput && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">No tasks yet</p>
            <button
              onClick={() => setShowInput(true)}
              className="text-sm text-primary-600 hover:text-primary-700 mt-1"
            >
              Add your first task
            </button>
          </div>
        )}

        {/* Task List */}
        {sortedTasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-start gap-3 group py-1.5 ${task.checked ? 'opacity-60' : ''}`}
          >
            {/* Custom Checkbox */}
            <button
              onClick={() => handleToggle(task.id)}
              className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
                task.checked
                  ? 'bg-primary-500 border-primary-500 text-white'
                  : 'border-gray-300 hover:border-primary-400'
              }`}
            >
              {task.checked && <Check className="w-3 h-3" />}
            </button>

            {/* Task Text */}
            <span
              className={`flex-1 text-sm leading-snug ${
                task.checked ? 'text-gray-400 line-through' : 'text-gray-700'
              }`}
            >
              {task.title}
            </span>

            {/* Delete Button */}
            <button
              onClick={() => handleDelete(task.id)}
              className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Progress */}
        {tasks.length > 0 && (
          <div className="pt-3 mt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>{tasks.filter(t => t.checked).length}/{tasks.length}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.checked).length / tasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
