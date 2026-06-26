import { useState, useEffect } from 'react';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  isExpired: boolean;
  totalSeconds: number;
}

export const useCountdown = (deadlineSeconds: number): Countdown => {
  const calculateTimeLeft = (): Countdown => {
    const now = Math.floor(Date.now() / 1000);
    const difference = deadlineSeconds - now;

    if (difference <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formatted: '00:00:00',
        isExpired: true,
        totalSeconds: 0,
      };
    }

    const days = Math.floor(difference / (3600 * 24));
    const hours = Math.floor((difference % (3600 * 24)) / 3600);
    const minutes = Math.floor((difference % 3600) / 60);
    const seconds = Math.floor(difference % 60);

    const pad = (num: number) => String(num).padStart(2, '0');
    let formatted = '';
    if (days > 0) {
      formatted = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    } else {
      formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    return {
      days,
      hours,
      minutes,
      seconds,
      formatted,
      isExpired: false,
      totalSeconds: difference,
    };
  };

  const [timeLeft, setTimeLeft] = useState<Countdown>(calculateTimeLeft());

  useEffect(() => {
    // Initial calculation
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [deadlineSeconds]);

  return timeLeft;
};
