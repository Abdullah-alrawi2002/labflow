import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, X, MapPin, Clock, Beaker, Trash2 } from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isSameDay
} from 'date-fns';
import { api } from '../utils/api';

export default function CalendarSection({ scheduled, projectId, onRefresh }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get events for a specific date
  const getEventsForDate = (date) => {
    return scheduled.filter(s => isSameDay(new Date(s.scheduled_date), date));
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowScheduleModal(true);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await api.deleteSchedule(scheduleId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Calendar</h2>
        <button
          onClick={() => {
            setSelectedDate(new Date());
            setShowScheduleModal(true);
          }}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="card p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);
            const dayEvents = getEventsForDate(day);
            const hasEvents = dayEvents.length > 0;
            
            return (
              <button
                key={i}
                onClick={() => handleDateClick(day)}
                className={`
                  relative aspect-square flex flex-col items-center justify-center text-sm rounded-lg
                  transition-colors hover:bg-gray-50
                  ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                  ${isDayToday ? 'bg-primary-500 text-white hover:bg-primary-600' : ''}
                  ${hasEvents && !isDayToday ? 'bg-primary-50' : ''}
                `}
              >
                <span>{format(day, 'd')}</span>
                {hasEvents && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`w-1 h-1 rounded-full ${isDayToday ? 'bg-white' : 'bg-primary-500'}`} 
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Upcoming Events */}
        {scheduled.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Upcoming</p>
            <div className="space-y-2">
              {scheduled
                .filter(s => new Date(s.scheduled_date) >= new Date())
                .slice(0, 3)
                .map(event => (
                  <div key={event.id} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary-500" />
                    <span className="text-gray-600 flex-1 truncate">{event.title}</span>
                    <span className="text-gray-400">
                      {format(new Date(event.scheduled_date), 'MMM d')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          selectedDate={selectedDate}
          events={selectedDate ? getEventsForDate(selectedDate) : []}
          projectId={projectId}
          onClose={() => setShowScheduleModal(false)}
          onRefresh={onRefresh}
          onDelete={handleDeleteSchedule}
        />
      )}
    </div>
  );
}

function ScheduleModal({ selectedDate, events, projectId, onClose, onRefresh, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    time: '',
    location: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setLoading(true);
    try {
      await api.createSchedule(projectId, {
        title: formData.title,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        time: formData.time || null,
        location: formData.location || null,
        description: formData.description || null
      });
      setFormData({ title: '', time: '', location: '', description: '' });
      setShowForm(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h2>
            <p className="text-sm text-gray-500">
              {events.length} experiment{events.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5">
          {/* Existing Events */}
          {events.length > 0 && (
            <div className="space-y-3 mb-4">
              {events.map(event => (
                <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl group">
                  <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                    <Beaker className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm">{event.title}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {event.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.time}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(event.id)}
                    className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Form */}
          {showForm ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experiment Name *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Run Temperature Test"
                  className="input"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Lab 201"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Any additional details..."
                  rows={2}
                  className="input resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.title.trim()}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  {loading ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full btn btn-secondary flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Schedule Experiment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
