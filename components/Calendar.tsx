
import React, { useState } from 'react';

interface CalendarProps {
  startDate?: string;
  endDate?: string;
  setStartDate?: (date: string) => void;
  setEndDate?: (date: string) => void;
  onClose: () => void;
  bookedDates?: string[];
  mode?: 'range' | 'multi'; // 'range' for buyers, 'multi' for sellers to block dates
  onBlackoutDate?: (date: string) => void; // Callback for 'multi' mode
}

const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;

const Calendar: React.FC<CalendarProps> = ({ 
    startDate, 
    endDate, 
    setStartDate, 
    setEndDate, 
    onClose, 
    bookedDates = [], 
    mode = 'range',
    onBlackoutDate
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    const dateString = clickedDate.toISOString().split('T')[0];

    // Block past dates
    if (clickedDate < today) return;

    if (mode === 'multi') {
        // Seller Mode: Toggle blackout dates
        if (onBlackoutDate) onBlackoutDate(dateString);
        return;
    }

    // Buyer Mode: Select Range
    if (bookedDates.includes(dateString)) return; // Cannot start on a booked date

    if (!start || (start && end)) {
        // Start a new range
        if (setStartDate) setStartDate(dateString);
        if (setEndDate) setEndDate('');
    } else if (start && !end) {
        if (clickedDate < start) {
            // Clicked before start, restart range
            if (setStartDate) setStartDate(dateString);
        } else {
            // Check if range contains a booked date
            const tempEnd = new Date(clickedDate);
            let isRangeValid = true;
            for (let d = new Date(start); d <= tempEnd; d.setDate(d.getDate() + 1)) {
                if (bookedDates.includes(d.toISOString().split('T')[0])) {
                    isRangeValid = false;
                    break;
                }
            }
            if (isRangeValid) {
                if (setEndDate) setEndDate(dateString);
            } else {
                alert("Selected range includes unavailable dates.");
            }
        }
    }
  };

  const renderDays = () => {
    const days = [];
    // Previous month's padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-prev-${i}`} className="p-2 text-center"></div>);
    }
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const isBooked = bookedDates.includes(dateString);
      const isPast = date < today;
      
      let classes = 'p-2 w-10 h-10 mx-auto flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200';

      if (isPast) {
        classes += ' text-gray-300 dark:text-gray-600 cursor-not-allowed';
      } else if (isBooked) {
        // Muted Red for Booked Dates
        classes += ' bg-red-100 text-red-400 cursor-not-allowed dark:bg-red-900/30 dark:text-red-500 line-through decoration-red-500';
        // In multi mode, allow clicking booked dates to unblock them (if they were manually blocked)
        if (mode === 'multi') classes += ' cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/50';
      } else {
        classes += ' cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200';
        
        // Range Logic
        if (mode === 'range') {
            const isStart = start && date.getTime() === start.getTime();
            const isEnd = end && date.getTime() === end.getTime();
            const isInRange = start && end && date > start && date < end;

            if (isStart || isEnd) {
                classes += ' bg-primary text-white shadow-md transform scale-110 z-10'; // Primary Theme Color
            } else if (isInRange) {
                classes += ' bg-primary/20 text-primary dark:text-primary-300';
            }
        }
      }

      days.push(
        <div key={day} className="text-center py-1">
            <div 
                className={classes} 
                onClick={() => (!isPast || mode === 'multi') && handleDateClick(day)}
            >
                {day}
            </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="bg-white dark:bg-dark-surface p-4 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-[340px] animate-fade-in-up">
      <div className="flex justify-between items-center mb-6 px-2">
        <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><ChevronLeftIcon /></button>
        <span className="font-bold text-lg text-gray-900 dark:text-white">{monthName} {year}</span>
        <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"><ChevronRightIcon /></button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {daysOfWeek.map(day => <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wide">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {renderDays()}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800"></div>
                  <span className="text-gray-500">Booked</span>
              </div>
               <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-gray-500">Selected</span>
              </div>
          </div>
          <button onClick={onClose} className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-lg hover:opacity-80 transition-opacity">
            Done
          </button>
      </div>
    </div>
  );
};

export default Calendar;
