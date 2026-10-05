import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '@/config/firebase';
import { db } from '@/config/firebase';

export type AttendanceRecord = {
  employeeId: string;
  employeeEmail: string | null;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: 'checked-in' | 'checked-out';
};

const getDateKey = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getAttendanceReference = () => {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  const date = getDateKey();
  return {
    user,
    date,
    reference: doc(db, 'attendance', `${user.uid}_${date}`),
  };
};

export function useAttendance() {
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const attendance = getAttendanceReference();

      if (!attendance) {
        setRecord(null);
        return;
      }

      const attendanceSnapshot = await getDoc(attendance.reference);
      setRecord(
        attendanceSnapshot.exists()
          ? (attendanceSnapshot.data() as AttendanceRecord)
          : null,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const saveRecord = async (nextRecord: AttendanceRecord) => {
    const attendance = getAttendanceReference();

    if (!attendance) {
      throw new Error('No authenticated employee found.');
    }

    await setDoc(attendance.reference, nextRecord, { merge: true });
    setRecord(nextRecord);
  };

  const checkIn = async () => {
    const attendance = getAttendanceReference();

    if (!attendance) {
      throw new Error('No authenticated employee found.');
    }

    await saveRecord({
      employeeId: attendance.user.uid,
      employeeEmail: attendance.user.email,
      date: attendance.date,
      checkInAt: new Date().toISOString(),
      checkOutAt: null,
      status: 'checked-in',
    });
  };

  const checkOut = async () => {
    const attendance = getAttendanceReference();

    if (!attendance) {
      throw new Error('No authenticated employee found.');
    }

    const currentRecord = record ?? {
      employeeId: attendance.user.uid,
      employeeEmail: attendance.user.email,
      date: attendance.date,
      checkInAt: null,
      checkOutAt: null,
      status: 'checked-in' as const,
    };

    await saveRecord({
      ...currentRecord,
      checkOutAt: new Date().toISOString(),
      status: 'checked-out',
    });
  };

  return {
    loading,
    record,
    hasMarkedToday: Boolean(record?.checkInAt),
    isCheckedIn: Boolean(record?.checkInAt),
    isCheckedOut: Boolean(record?.checkOutAt),
    checkIn,
    checkOut,
    refresh: loadAttendance,
  };
}
