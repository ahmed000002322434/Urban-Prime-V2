
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { isBackendConfigured } from './backendClient';

type HeartbeatListener = () => void;

class OmniHeartbeatController {
    private listeners: HeartbeatListener[] = [];
    private isInitialized = false;

    /**
     * Initializes the global listener for any new bookings/orders on the platform.
     */
    public init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        if (isBackendConfigured()) return;

        // Listen for the absolute latest booking added to the system
        const q = query(collection(db, 'bookings'), orderBy('startDate', 'desc'), limit(1));
        
        onSnapshot(q, (snapshot) => {
            // Only trigger if it's a new document and not local optimistic update
            if (!snapshot.empty && !snapshot.metadata.hasPendingWrites) {
                this.trigger();
            }
        }, (error) => {
            console.warn('Omni heartbeat listener failed:', error);
        });
    }

    public subscribe(listener: HeartbeatListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private trigger() {
        this.listeners.forEach(l => l());
    }
}

export const OmniHeartbeat = new OmniHeartbeatController();
