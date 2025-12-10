import { Injectable, signal, computed, inject, OnDestroy, effect } from '@angular/core';
import { LogEntry, LogLevel } from '../models/log.model';
import { Apollo, gql } from 'apollo-angular';
import { Subscription } from 'rxjs';
import { AuthService } from './auth.service';

// ==========================================
// GRAPHQL DEFINITIONS
// ==========================================

// [UPDATED] Query with Variables
const GET_LOGS = gql`
  query GetLogs($offset: Int, $limit: Int, $search: String) {
    logs(offset: $offset, limit: $limit, search: $search) {
      id, level, message, source, timestamp, avatar, details
    }
  }
`;

// 2. MUTATIONS (Write Operations)
const CREATE_LOG = gql`
  mutation CreateLog($level: String!, $message: String!, $source: String!) {
    createLog(level: $level, message: $message, source: $source) {
      id
    }
  }
`;

const DELETE_LOG = gql`
  mutation DeleteLog($id: ID!) {
    deleteLog(id: $id)
  }
`;

const UPDATE_LOG = gql`
  mutation UpdateLog($id: ID!, $message: String!) {
    updateLog(id: $id, message: $message) {
      id
    }
  }
`;

// 3. SUBSCRIPTIONS (Real-time Listeners)
const LOG_ADDED_SUB = gql`
  subscription OnLogAdded {
    logAdded {
      id, level, message, source, timestamp, avatar, details
    }
  }
`;

const LOG_UPDATED_SUB = gql`
  subscription OnLogUpdated {
    logUpdated {
      id, level, message, source, timestamp, avatar, details
    }
  }
`;

const LOG_DELETED_SUB = gql`
  subscription OnLogDeleted {
    logDeleted
  }
`;
const GET_STATS = gql`
  query GetLogStats {
    logStats {
      level
      count
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class LogService implements OnDestroy {
  private apollo = inject(Apollo);
  private authService = inject(AuthService); // [NEW] Auth Inject karein (Feature -> Core dependency safe hai)
  // ==========================================
  // STATE SIGNALS
  // ==========================================
  private readonly _logs = signal<LogEntry[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Filters
  private readonly _filter = signal<string>('');
  readonly _levelFilter = signal<LogLevel | 'ALL'>('ALL');

  // Selection
  readonly selectedLog = signal<LogEntry | null>(null);

  // Simulation
  private timerId: any = null;
  readonly isSimulating = signal<boolean>(false);
  // Pagination State
  private currentOffset = 0;
  private readonly PAGE_SIZE = 20;
  private hasMoreData = true; // Kya aur data bacha hai?
  // Stats Signal
  logStats = signal<{ level: string, count: number }[]>([]);
  private searchTerm = '';
  // [NEW] Subscription Management Array
  // Yahan hum active listeners ko store karenge
  private rtSubscriptions: Subscription[] = [];
  constructor() {
    this.fetchLogs();
    // 2. [NEW] Auto-Cleanup Effect 🧹
    // Jaise hi User Logout karega (currentUser null hoga), ye effect chalega
    effect(() => {
      const user = this.authService.currentUser();
      
      if (!user) {
        // Agar user nahi hai (Logout), toh Stream band karo
        this.stopRealtimeUpdates();
        
        // Optional: Logs clear kar do taaki agle user ko purana data na dikhe
        this._logs.set([]); 
      } 
      // Note: Login hone par 'fetchLogs' apne aap call hota hai component se, 
      // isliye yahan start karne ki zaroorat nahi hai.
    });
  }

  // ==========================================
  // 1. DATA FETCHING & REALTIME SETUP
  // ==========================================

  // 1. INITIAL LOAD (Reset)
  fetchLogs() {
    this.isLoading.set(true);
    this.currentOffset = 0;
    this.hasMoreData = true;

    this.apollo.query<{ logs: any[] }>({
      query: GET_LOGS,
      variables: {
        offset: 0,
        limit: this.PAGE_SIZE,
        search: this.searchTerm // [IMPORTANT] Yahan search text bhejo
      },
      fetchPolicy: 'network-only'
    })
      .subscribe({
        next: (result) => {
          const newLogs = this.normalizeLogs(result.data?.logs || []);

          // [RESET] Purana data hata kar naya set karo
          this._logs.set(newLogs);

          this.currentOffset = newLogs.length;
          this.isLoading.set(false);
          // 👇 YAHAN CALL KAREIN (List aate hi Stats bhi update karo)
          this.fetchStats();
          // Realtime updates on kar do
          this.startRealtimeUpdates();
        },
        error: () => this.isLoading.set(false)
      });
  }

  // 2. LOAD MORE (Append) 📜
  loadMoreLogs() {
    // Agar loading chal rahi hai ya data khatam ho gaya hai toh ruk jao
    if (this.isLoading() || !this.hasMoreData) return;

    this.isLoading.set(true);

    this.apollo.query<{ logs: any[] }>({
      query: GET_LOGS,
      variables: {
        offset: this.currentOffset,
        limit: this.PAGE_SIZE,
        search: this.searchTerm // [IMPORTANT] Load more mein bhi search term bhejo
      },
      fetchPolicy: 'network-only'
    }).subscribe({
      next: (result) => {
        const moreLogs = this.normalizeLogs(result.data?.logs || []);

        if (moreLogs.length === 0) {
          this.hasMoreData = false; // Data khatam!
        } else {
          // [APPEND] Naye logs ko purane logs ke neeche jod do
          this._logs.update(current => [...current, ...moreLogs]);
          this.currentOffset += moreLogs.length;
        }

        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // ==========================================
  // [FIXED] REALTIME MANAGEMENT 🛡️
  // ==========================================

  private startRealtimeUpdates() {
    // 1. GUARD CLAUSE: Agar pehle se subscriptions active hain, toh ruk jao.
    // Isse duplicate listeners nahi banenge chahe fetchLogs 100 baar call ho.
    if (this.rtSubscriptions.length > 0) {
      console.log('♻️ Realtime updates already active. Skipping...');
      return;
    }

    console.log('🎧 Starting Realtime Stream...');

    // A. Listen: New Log Added
    // Subscription object ko variable mein save karein
    const sub1 = this.apollo.subscribe({ query: LOG_ADDED_SUB }).subscribe({ // LOG_ADDED_SUB upar defined hona chahiye
      next: (result: any) => {
        const newLog = result.data?.logAdded;
        if (newLog) {
          const normalized = this.normalizeLogs([newLog])[0];
          this._logs.update(logs => [normalized, ...logs]);
          this.fetchStats();
        }
      }
    });

    // B. Listen: Log Updated
    const sub2 = this.apollo.subscribe({ query: LOG_UPDATED_SUB }).subscribe({ // LOG_UPDATED_SUB upar defined hona chahiye
      next: (result: any) => {
        const updatedLog = result.data?.logUpdated;
        if (updatedLog) {
          this._logs.update(logs =>
            logs.map(log => log.id === updatedLog.id ? { ...log, ...this.normalizeLogs([updatedLog])[0] } : log)
          );
        }
      }
    });

    // C. Listen: Log Deleted
    const sub3 = this.apollo.subscribe({ query: LOG_DELETED_SUB }).subscribe({ // LOG_DELETED_SUB upar defined hona chahiye
      next: (result: any) => {
        const deletedId = result.data?.logDeleted;
        if (deletedId) {
          this._logs.update(logs => logs.filter(log => log.id !== deletedId));
          this.fetchStats();
        }
      }
    });

    // 2. STORE REFERENCES: Taaki baad mein unsubscribe kar sakein
    this.rtSubscriptions.push(sub1, sub2, sub3);
  }

  // [NEW] Method to Stop Updates (Call this on Logout)
  public stopRealtimeUpdates() {
    if (this.rtSubscriptions.length > 0) {
      console.log('🛑 Stopping Realtime Stream...');
      this.rtSubscriptions.forEach(sub => sub.unsubscribe());
      this.rtSubscriptions = []; // Array clear karein
    }
  }

  // ==========================================
  // 2. COMPUTED LOGIC (Selectors)
  // ==========================================
  public readonly logs = computed(() => {
    const currentLogs = this._logs();
    const levelFilter = this._levelFilter();

    // NOTE: 'searchText' logic hata diya gaya hai.
    // Kyunki ab server khud search karke filtered data bhej raha hai.

    return currentLogs.filter(log => {
      // Sirf Tabs (Level) ka filter abhi bhi UI par hoga
      const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;

      return matchesLevel;
    });
  });

  public readonly totalLogs = computed(() => this.logs().length);
  public readonly errorCount = computed(() => this.logs().filter(log => log.level === 'ERROR').length);
  public readonly warnCount = computed(() => this.logs().filter(log => log.level === 'WARN').length);
  readonly activeLevel = this._levelFilter.asReadonly();

  // ==========================================
  // 3. USER ACTIONS
  // ==========================================

  selectLog(log: LogEntry) { this.selectedLog.set(log); }
  clearSelection() { this.selectedLog.set(null); }

  updateFilter(query: string) {
    this.searchTerm = query; // Variable update karo
    this.fetchLogs();        // Aur turant Server se naya data mangwao
  }
  filterByLevel(level: LogLevel | 'ALL') { this._levelFilter.set(level); }

  // ==========================================
  // 4. MUTATIONS (C.U.D)
  // ==========================================

  // DELETE
  deleteLogItem(id: string) {
    this.isLoading.set(true);
    // Note: 'refetchQueries' hata diya kyunki Subscription UI update karega
    this.apollo.mutate({
      mutation: DELETE_LOG,
      variables: { id }
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.selectedLog.set(null);
      },
      error: (err) => {
        console.error('Delete Failed', err);
        this.isLoading.set(false);
      }
    });
  }

  // UPDATE
  updateLogItem(id: string, newMessage: string) {
    this.isLoading.set(true);
    this.apollo.mutate({
      mutation: UPDATE_LOG,
      variables: { id, message: newMessage }
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.selectedLog.set(null);
      },
      error: (err) => {
        console.error('Update Failed', err);
        this.isLoading.set(false);
      }
    });
  }

  // CREATE (Simulation)
  toggleSimulation() {
    if (this.isSimulating()) {
      clearInterval(this.timerId);
      this.isSimulating.set(false);
    } else {
      this.isSimulating.set(true);
      // Fast Simulation: 100ms
      this.timerId = setInterval(() => this.addRandomLog(), 100);
    }
  }

  private addRandomLog() {
    const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'SUCCESS'];
    const sources = ['Auth-Service', 'Payment-Gateway', 'Database', 'Frontend-Client'];
    const messages = ['User login successful', 'Timeout waiting for DB', 'Payment declined', 'API Rate limit exceeded'];

    const level = levels[Math.floor(Math.random() * levels.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];

    this.apollo.mutate({
      mutation: CREATE_LOG,
      variables: { level, message, source }
    }).subscribe({
      error: (err) => console.error('Simulation Error:', err)
      // Success par kuch nahi karna, Subscription UI handle karega
    });
  }

  // ==========================================
  // 5. HELPER
  // ==========================================
  private normalizeLogs(backendLogs: any[]): LogEntry[] {
    return backendLogs.map(log => ({
      ...log,
      timestamp: new Date(Number(log.timestamp) || log.timestamp),
      details: typeof log.details === 'string' ? JSON.parse(log.details || '{}') : log.details
    }));
  }

  fetchStats() {
    this.apollo.query<{ logStats: any[] }>({
      query: GET_STATS,
      fetchPolicy: 'network-only'
    }).subscribe({
      next: (res) => {
        this.logStats.set(res.data?.logStats as any);
      },
      error: (err) => console.error(err)
    });
  }

  ngOnDestroy(): void {
    this.stopRealtimeUpdates();
  }
}