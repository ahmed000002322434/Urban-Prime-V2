import React from 'react';

interface PasswordStrengthMeterProps {
  password?: string;
}

const checkPasswordStrength = (password: string) => {
  let score = 0;
  if (!password) {
    return { score: 0, label: '', color: 'bg-gray-200' };
  }

  // Award points for different criteria
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let label = 'Too weak';
  let color = 'bg-red-500';

  switch (score) {
    case 1:
      label = 'Weak';
      color = 'bg-red-500';
      break;
    case 2:
      label = 'Medium';
      color = 'bg-orange-400';
      break;
    case 3:
      label = 'Good';
      color = 'bg-yellow-500';
      break;
    case 4:
      label = 'Strong';
      color = 'bg-green-500';
      break;
    case 5:
      label = 'Very Strong';
      color = 'bg-green-600';
      break;
    default:
      label = 'Too weak';
      color = 'bg-red-500';
  }

  return { score, label, color };
};

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
  const { score, label, color } = checkPasswordStrength(password);

  const isVisible = password.length > 0;

  return (
    <div className={`w-full transition-all duration-300 overflow-hidden ${isVisible ? 'opacity-100 h-auto' : 'opacity-0 h-0 pointer-events-none'}`}>
      <div className="flex gap-1 h-1 rounded-full mt-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-colors ${i < score ? color : 'bg-gray-200 dark:bg-gray-600'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-semibold mt-1 text-right pr-1 ${score > 2 ? 'text-gray-600 dark:text-gray-300' : 'text-red-500'}`}>{label}</p>
    </div>
  );
};

export default PasswordStrengthMeter;
