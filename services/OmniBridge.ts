
import { runTransaction, doc, collection, setDoc, updateDoc, arrayUnion, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { storefrontService } from './storefrontService';

export interface OmniAction {
  type:
    | 'list_product'
    | 'design_store'
    | 'set_promotion'
    | 'notify_users'
    | 'adjust_pricing'
    | 'update_inventory'
    | 'create_coupon'
    | 'schedule_payout'
    | 'resolve_dispute'
    | 'issue_refund'
    | 'feature_product'
    | 'create_campaign'
    | 'update_store_policy';
  payload: any;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  description: string;
}

export type OmniLogEntry = {
    id: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'process' | 'ai';
    timestamp: any;
    expiresAt: any;
};

class OmniBridgeController {
  public async pushOmniLog(message: string, type: OmniLogEntry['type'] = 'info') {
    try {
      const logRef = collection(db, 'live_logs');
      const expiresAt = new Date(Date.now() + 10000); 
      await addDoc(logRef, {
        message,
        type,
        timestamp: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt)
      });
    } catch (error) {
      // Offline or unauthenticated; fallback to console.
      console.log(`[OmniLog:${type}] ${message}`);
    }
  }

  public async uploadAsset(userId: string, blob: Blob, onProgress: (p: number) => void): Promise<string> {
    if (!auth.currentUser) {
      onProgress(100);
      return URL.createObjectURL(blob);
    }
    
    const fileRef = ref(storage, `temp_nexus/${userId}/${Date.now()}.jpg`);
    const uploadTask = uploadBytesResumable(fileRef, blob);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        }, 
        (error) => reject(error), 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  }

  public async executeBatch(userId: string, actions: OmniAction[]) {
    if (!auth.currentUser) {
      await this.pushOmniLog(`Running in guest mode for ${userId}. Actions will be simulated.`, 'ai');
      for (const action of actions) {
        await this.pushOmniLog(`Simulated ${action.type}.`, 'success');
      }
      return;
    }
    
    await this.pushOmniLog(`Omni processing batch for authenticated user: ${userId.slice(0, 5)}`, 'ai');
    
    try {
      await runTransaction(db, async (transaction) => {
        for (const action of actions) {
          await this.pushOmniLog(`Syncing ${action.type}...`, 'process');
          
          switch (action.type) {
            case 'list_product':
              const itemRef = doc(collection(db, 'items'));
              transaction.set(itemRef, {
                ...action.payload,
                owner: { id: userId, name: auth.currentUser?.displayName || 'Merchant' },
                createdAt: new Date().toISOString(),
                status: 'published'
              });
              break;
            case 'adjust_pricing':
              if (action.payload?.itemId && action.payload?.price !== undefined) {
                const itemDoc = doc(db, 'items', action.payload.itemId);
                transaction.update(itemDoc, { salePrice: action.payload.price });
              }
              break;
            case 'set_promotion':
              await addDoc(collection(db, 'promotions'), {
                ...action.payload,
                createdAt: serverTimestamp(),
                createdBy: userId
              });
              break;
            case 'notify_users':
              await addDoc(collection(db, 'notifications'), {
                ...action.payload,
                createdAt: new Date().toISOString()
              });
              break;
            case 'create_coupon':
              await addDoc(collection(db, 'discountCodes'), {
                ...action.payload,
                createdAt: new Date().toISOString(),
                createdBy: userId
              });
              break;
            default:
              await this.pushOmniLog(`Omni queued ${action.type}.`, 'info');
              break;
          }
        }
      });
      await this.pushOmniLog("Sequence completed. Reality synced.", 'success');
    } catch (err) {
      await this.pushOmniLog(`CRITICAL FAIL: ${err instanceof Error ? err.message : 'State locked'}`, 'error');
      throw err;
    }
  }
}

export const OmniBridge = new OmniBridgeController();
