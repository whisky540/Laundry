import { useEffect, useState } from 'react';

const getGreeting = (hour: number): string => {
  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
};

export function useTimeGreeting(): string {
  const [greeting, setGreeting] = useState(() =>
    getGreeting(new Date().getHours()),
  );

  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getGreeting(new Date().getHours()));
    };

    const interval = setInterval(updateGreeting, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return greeting;
}