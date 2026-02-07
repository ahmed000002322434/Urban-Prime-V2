
import React, { useState, useEffect, useCallback } from 'react';
import Spinner from '../../components/Spinner';
import BackButton from '../../components/BackButton';

type PermissionName = 'camera' | 'microphone' | 'geolocation';

const icons: Record<PermissionName, React.ReactNode> = {
    camera: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>,
    microphone: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>,
    geolocation: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
};

const descriptions: Record<PermissionName, string> = {
    camera: "Used for features like image search, scanning barcodes, and adding photos to reviews.",
    microphone: "Used for voice search and communicating with other users.",
    geolocation: "Used to find items and sellers near you for local pickup and faster delivery.",
};

const PermissionRow: React.FC<{ name: PermissionName }> = ({ name }) => {
    const [status, setStatus] = useState<PermissionState | 'loading'>('loading');

    const checkStatus = useCallback(async () => {
        try {
            const permissionStatus = await navigator.permissions.query({ name: name as any });
            setStatus(permissionStatus.state);
            permissionStatus.onchange = () => setStatus(permissionStatus.state);
        } catch (error) {
            console.error(`Permission query for ${name} failed`, error);
            setStatus('prompt'); // Fallback for browsers that don't support query for this perm
        }
    }, [name]);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const handleRequest = async () => {
        try {
            if (name === 'geolocation') {
                navigator.geolocation.getCurrentPosition(() => checkStatus(), () => checkStatus());
            } else {
                await navigator.mediaDevices.getUserMedia({ [name]: true });
            }
            // Status will update automatically via the onchange listener
        } catch (error) {
            console.error(`Request for ${name} permission failed`, error);
            checkStatus(); // Re-check status in case it was denied
        }
    };
    
    const statusTextAndColor = {
        granted: { text: 'Allowed', color: 'text-green-600' },
        prompt: { text: 'Ask for Access', color: 'text-text-secondary' },
        denied: { text: 'Blocked', color: 'text-red-600' },
        loading: { text: 'Loading...', color: 'text-text-secondary' },
    };

    return (
        <div className="flex items-center gap-4 p-4 border-b border-border last:border-b-0">
            <div className="text-text-secondary">{icons[name]}</div>
            <div className="flex-1">
                <p className="font-bold capitalize text-text-primary">{name}</p>
                <p className="text-sm text-text-secondary">{descriptions[name]}</p>
            </div>
            {status === 'loading' && <Spinner size="sm" />}
            {status === 'granted' && <span className={`font-semibold text-sm ${statusTextAndColor[status].color}`}>{statusTextAndColor[status].text}</span>}
            {status === 'prompt' && <button onClick={handleRequest} className="px-4 py-1.5 text-sm bg-primary text-white font-bold rounded-md">Allow</button>}
            {status === 'denied' && <span className={`font-semibold text-sm ${statusTextAndColor[status].color}`}>{statusTextAndColor[status].text}</span>}
        </div>
    );
};

const PermissionsPage: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <BackButton />
                <h1 className="text-3xl font-bold font-display text-text-primary">App Permissions</h1>
            </div>
             <div className="bg-surface rounded-xl shadow-soft border border-border">
                <div className="p-4 border-b border-border">
                     <h2 className="font-bold text-lg text-text-primary">Device Access</h2>
                     <p className="text-sm text-text-secondary">Manage what features Urban Prime can use on your device.</p>
                </div>
                <div className="divide-y divide-border">
                    <PermissionRow name="camera" />
                    <PermissionRow name="microphone" />
                    <PermissionRow name="geolocation" />
                </div>
                <div className="p-4 bg-surface-soft rounded-b-xl">
                    <p className="text-xs text-text-secondary">You may need to adjust permissions in your browser or system settings if access is blocked.</p>
                </div>
            </div>
        </div>
    );
};

export default PermissionsPage;

