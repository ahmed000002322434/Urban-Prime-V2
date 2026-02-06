import React from 'react';

interface ProgressBarProps {
  steps: { title: string }[];
  currentStep: number;
}

const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);


const ProgressBar: React.FC<ProgressBarProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-start">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = currentStep > stepNumber;
        const isActive = currentStep === stepNumber;

        return (
          <React.Fragment key={step.title}>
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary border-primary text-white'
                    : isActive
                    ? 'border-primary text-primary'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? <CheckIcon /> : stepNumber}
              </div>
              <p
                className={`mt-2 text-xs font-semibold text-center w-20 transition-colors duration-300 ${
                  isActive || isCompleted ? 'text-primary' : 'text-gray-400'
                }`}
              >
                {step.title}
              </p>
            </div>
            {stepNumber < steps.length && (
              <div className="flex-1 h-0.5 mt-4 transition-colors duration-300">
                <div className="w-full h-full bg-gray-200 rounded-full">
                    <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{width: isCompleted ? '100%' : isActive ? '50%' : '0%'}}
                    ></div>
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProgressBar;
