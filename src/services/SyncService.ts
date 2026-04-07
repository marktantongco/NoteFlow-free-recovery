import { toast } from 'sonner';

class SyncService {
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
    }
  }

  private handleOnline = async () => {
    console.log('Network restored. Starting sync...');
    await this.syncData();
  };

  public async syncData() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real app, this would:
      // 1. Push local changes (from Dexie) to the server
      // 2. Pull remote changes from the server
      // 3. Resolve conflicts

      console.log('Sync complete');
      const now = new Date().toISOString();
      localStorage.setItem('lastSyncTime', now);
      toast.success('Data synchronized with cloud');
      return now;
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Sync failed. Will retry later.');
    } finally {
      this.isSyncing = false;
    }
  }

  public cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
    }
  }
}

export const syncService = new SyncService();
