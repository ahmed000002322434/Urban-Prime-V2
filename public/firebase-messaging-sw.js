/* global importScripts, firebase */

importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyA1jRYePU98X-bbBxZUpoks5lV4lGPPE24',
  authDomain: 'urbanprime-eb918.firebaseapp.com',
  projectId: 'urbanprime-eb918',
  storageBucket: 'urbanprime-eb918.appspot.com',
  messagingSenderId: '616449055186',
  appId: '1:616449055186:web:a3aa281ee86011c314100b',
  measurementId: 'G-M7WGG2TY12'
});

const messaging = firebase.messaging();

const defaultLink = '/#/profile/messages';

const resolveOpenLink = (value) => {
  const link = String(value || '').trim();
  if (!link) return defaultLink;
  if (/^https?:\/\//i.test(link)) return link;
  if (link.startsWith('/#/')) return link;
  if (link.startsWith('#/')) return `/${link}`;
  return `/#${link.startsWith('/') ? link : `/${link}`}`;
};

messaging.onBackgroundMessage((payload) => {
  const title = String(payload?.notification?.title || payload?.data?.title || 'Urban Prime');
  const body = String(payload?.notification?.body || payload?.data?.body || 'New message');
  const link = resolveOpenLink(payload?.data?.link || payload?.fcmOptions?.link || defaultLink);
  const threadId = String(payload?.data?.threadId || '');
  const senderId = String(payload?.data?.senderId || '');

  self.registration.showNotification(title, {
    body,
    icon: '/icons/favicon-192.png',
    badge: '/icons/favicon-64.png',
    tag: threadId ? `chat-thread-${threadId}` : 'chat-message',
    renotify: true,
    data: {
      link,
      threadId,
      senderId
    },
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'mark_read', title: 'Mark read' },
      { action: 'react', title: 'React +1' }
    ]
  });
});

self.addEventListener('notificationclick', (event) => {
  const rawData = event.notification?.data || {};
  const action = String(event.action || '').trim();
  let targetLink = resolveOpenLink(rawData.link || defaultLink);

  if (action === 'mark_read') {
    targetLink += targetLink.includes('?') ? '&pushAction=mark_read' : '?pushAction=mark_read';
  } else if (action === 'react') {
    targetLink += targetLink.includes('?') ? '&pushAction=react' : '?pushAction=react';
  }

  event.notification.close();
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if (!client || typeof client.url !== 'string') continue;
      if ('focus' in client) {
        await client.focus();
      }
      if ('navigate' in client) {
        await client.navigate(targetLink);
      }
      return;
    }
    await clients.openWindow(targetLink);
  })());
});
