import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, updateDoc, where, doc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

type EmployeeTask = {
  id: string;
  customerEmail: string;
  serviceName: string;
  quantity: number;
  pickupDate: string;
  pickupTime: string;
  pickupMethod: string;
  pickupAddress: string | null;
  status: string;
  total: number;
};

const isDone = (status: string): boolean =>
  status === 'Ready' || status === 'Completed' || status === 'Delivered';

export default function EmployeeTasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTask, setUpdatingTask] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, 'orders'), where('employeeId', '==', user.uid)),
      );
      const loadedTasks = snapshot.docs.map(orderDocument => {
        const data = orderDocument.data();

        return {
          id: orderDocument.id,
          customerEmail: (data.customerEmail as string) || 'Customer',
          serviceName: (data.serviceName as string) || 'Laundry service',
          quantity: (data.quantity as number) || 0,
          pickupDate: (data.pickupDate as string) || '',
          pickupTime: (data.pickupTime as string) || '',
          pickupMethod: (data.pickupMethod as string) || 'Pickup',
          pickupAddress: (data.pickupAddress as string | null) || null,
          status: (data.status as string) || 'Processing',
          total: (data.total as number) || 0,
        };
      });

      loadedTasks.sort((first, second) => Number(isDone(first.status)) - Number(isDone(second.status)));
      setTasks(loadedTasks);
    } catch {
      Alert.alert('Tasks unavailable', 'Unable to load your assigned tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const markTaskDone = async (task: EmployeeTask) => {
    try {
      setUpdatingTask(task.id);
      await updateDoc(doc(db, 'orders', task.id), {
        status: 'Ready',
        completedBy: auth.currentUser?.uid,
        completedAt: new Date().toISOString(),
      });
      setTasks(currentTasks =>
        currentTasks.map(currentTask =>
          currentTask.id === task.id
            ? { ...currentTask, status: 'Ready' }
            : currentTask,
        ),
      );
    } catch {
      Alert.alert('Update failed', 'The task could not be marked as done.');
    } finally {
      setUpdatingTask(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>My tasks</Text>
          <Pressable onPress={() => void loadTasks()}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Orders assigned to you by the administrator
        </Text>

        {loading ? (
          <ActivityIndicator color={styles.loader.color} style={styles.loader} />
        ) : tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No tasks assigned</Text>
            <Text style={styles.emptyText}>
              New assignments from the administrator will appear here.
            </Text>
          </View>
        ) : (
          tasks.map(task => {
            const done = isDone(task.status);

            return (
              <View key={task.id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <View style={styles.taskHeading}>
                    <Text style={styles.taskId}>{task.id}</Text>
                    <Text style={styles.serviceName}>{task.serviceName}</Text>
                  </View>
                  <Text style={[styles.status, done ? styles.doneStatus : styles.activeStatus]}>
                    {done ? 'Done' : task.status}
                  </Text>
                </View>

                <Text style={styles.taskDetail}>Customer: {task.customerEmail}</Text>
                <Text style={styles.taskDetail}>
                  {task.quantity} {task.quantity === 1 ? 'item' : 'items'} · {task.pickupMethod}
                </Text>
                <Text style={styles.taskDetail}>
                  Pickup: {task.pickupDate} at {task.pickupTime}
                </Text>
                {task.pickupAddress ? (
                  <Text style={styles.taskDetail}>Address: {task.pickupAddress}</Text>
                ) : null}

                <Pressable
                  style={[styles.doneButton, done && styles.doneButtonDisabled]}
                  onPress={() => void markTaskDone(task)}
                  disabled={done || updatingTask === task.id}
                >
                  {updatingTask === task.id ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.doneButtonText}>
                      {done ? 'Task completed' : 'Mark as done'}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backText: { color: '#1976D2', fontSize: 15, fontWeight: '700' },
  title: { color: '#172B4D', fontSize: 22, fontWeight: '800' },
  refreshText: { color: '#1976D2', fontSize: 13, fontWeight: '800' },
  subtitle: { color: '#6B7280', fontSize: 13, marginBottom: 20 },
  loader: { color: '#1976D2', marginTop: 30 },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: { color: '#172B4D', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 6 },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E7EEF5',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  taskHeading: { flex: 1 },
  taskId: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  serviceName: { color: '#172B4D', fontSize: 16, fontWeight: '800', marginTop: 3 },
  status: { fontSize: 12, fontWeight: '800', marginLeft: 8 },
  activeStatus: { color: '#B7791F' },
  doneStatus: { color: '#16803C' },
  taskDetail: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
  doneButton: {
    backgroundColor: '#1976D2',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 16,
  },
  doneButtonDisabled: { backgroundColor: '#16803C' },
  doneButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
