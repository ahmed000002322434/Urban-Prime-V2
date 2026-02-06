
import React, { useEffect, useRef } from 'react';

const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com'];

interface EmailInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAutocomplete?: () => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ value, onChange, onAutocomplete, ...rest }) => {
  // FIX: Replaced NodeJS.Timeout with ReturnType<typeof setTimeout> for browser compatibility.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending autocomplete timer whenever the user types
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const atIndex = value.lastIndexOf('@');
    if (atIndex > -1) {
      const domainPart = value.substring(atIndex + 1);
      if (domainPart.length > 0) {
        const match = commonDomains.find(domain => domain.startsWith(domainPart));

        // If there's a potential match that isn't a full match yet
        if (match && match !== domainPart) {
          // Set a timer to autocomplete after a short delay
          timeoutRef.current = setTimeout(() => {
            const fullEmail = value.substring(0, atIndex + 1) + match;

            // Create a synthetic event to update the parent's state
            const syntheticEvent = {
              target: {
                ...rest, // Pass other properties like name
                value: fullEmail,
              },
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            
            onChange(syntheticEvent);
            
            // Notify the parent component that autocompletion happened
            onAutocomplete?.();

          }, 200); // 0.2 second delay
        }
      }
    }

    // Cleanup function to clear timeout on unmount or when value changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, onChange, onAutocomplete, rest]);

  return (
    <input
      type="email"
      value={value}
      onChange={onChange}
      autoComplete="off"
      {...rest}
    />
  );
};

export default EmailInput;