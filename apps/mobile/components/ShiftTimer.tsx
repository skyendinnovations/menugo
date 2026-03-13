import { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ShiftTimerProps {
  clockedInAt: string | null;
  isClockedIn: boolean;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Displays a live work timer counting up from the clock-in time.
 * Only visible when clocked in.
 */
export function ShiftTimer({ clockedInAt, isClockedIn }: ShiftTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isClockedIn && clockedInAt) {
      const start = new Date(clockedInAt).getTime();
      // Update immediately
      setElapsed(Date.now() - start);

      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - start);
      }, 1000);
    } else {
      setElapsed(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isClockedIn, clockedInAt]);

  if (!isClockedIn || !clockedInAt) return null;

  return (
    <View className="flex-row items-center gap-1.5">
      <MaterialIcons name="timer" size={14} color="#22C55E" />
      <Text className="text-sm font-bold text-green-400">
        {formatDuration(elapsed)}
      </Text>
    </View>
  );
}
