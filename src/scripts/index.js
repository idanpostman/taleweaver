import 'leaflet/dist/leaflet.css';
import '../styles/styles.css';
import '../styles/main.css';

import L from 'leaflet';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

import App from './pages/app.js';
import { registerSW } from 'virtual:pwa-register';

import { getToken, savePushSubscription, removePushSubscriptionFromServer } from './data/api.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
let swRegistration = null;
let isSubscribed = false;
let pushButton = null;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function updatePushButton() {
  if (pushButton === null) {
    console.log('updatePushButton: pushButton element not found yet.');
    return;
  }

  pushButton.classList.remove('disabled', 'subscribed-state', 'unsubscribed-state');
  pushButton.removeAttribute('title');
  pushButton.disabled = false;

  if (Notification.permission === 'denied') {
    pushButton.innerHTML = '<i class="fas fa-ban"></i> Blocked';
    pushButton.title = 'Push Notifications Blocked by browser';
    pushButton.classList.add('disabled');
    pushButton.setAttribute('aria-disabled', 'true');
    return;
  }

  pushButton.removeAttribute('aria-disabled');

  if (isSubscribed) {
    pushButton.innerHTML = '<i class="fas fa-bell-slash"></i> Unsubscribe';
    pushButton.title = 'Disable Push Notifications';
    pushButton.classList.add('subscribed-state');
  } else {
    pushButton.innerHTML = '<i class="fas fa-bell"></i> Subscribe';
    pushButton.title = 'Enable Push Notifications';
    pushButton.classList.add('unsubscribed-state');
  }
}

async function initializePushSubscriptionUI() {
  pushButton = document.getElementById('pushButton');
  if (!pushButton) {
    console.warn('Push button with ID "pushButton" not found in DOM for UI initialization.');
    return;
  }

  pushButton.addEventListener('click', (event) => {
    event.preventDefault();
    pushButton.disabled = true;
    if (isSubscribed) {
      unsubscribeUser();
    } else {
      subscribeUser();
    }
  });

  if (!('serviceWorker' in navigator) || !('PushManager'in window)) {
    console.warn('Push messaging is not supported or Service Worker not supported.');
    pushButton.innerHTML = '<i class="fas fa-exclamation-circle"></i> Not Supported';
    pushButton.classList.add('disabled');
    pushButton.setAttribute('aria-disabled', 'true');
    pushButton.title = 'Push Notifications are not supported by this browser.';
    return;
  }

  if (!swRegistration) {
    console.log('initializePushSubscriptionUI: Service Worker registration not available yet. Will wait for onRegisteredSW.');
    return;
  }
  
  console.log('initializePushSubscriptionUI: SW Registration found, getting subscription status...');
  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    isSubscribed = !(subscription === null);
    if (isSubscribed) {
      console.log('User IS currently subscribed.');
    } else {
      console.log('User is NOT currently subscribed.');
    }
  } catch (error) {
    console.error('Error during push UI initialization (getSubscription):', error);
  }
  updatePushButton();
}

async function subscribeUser() {
  if (!swRegistration) {
    console.error('subscribeUser: Service Worker registration not found.');
    updatePushButton();
    return;
  }
  if (!getToken()) {
    alert('Please log in to enable notifications.');
    pushButton.disabled = false;
    updatePushButton();
    return;
  }

  try {
    if (Notification.permission !== 'granted') {
        const permissionResult = await Notification.requestPermission();
        if (permissionResult !== 'granted') {
          console.warn('Notification permission not granted by user.');
          alert('Notification permission was not granted.');
          updatePushButton();
          return;
        }
    }
    
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    console.log('User subscribed successfully to PushManager:', JSON.stringify(subscription.toJSON()));
    await savePushSubscription(subscription);
    console.log('Subscription details sent to server.');
    isSubscribed = true;
    alert('Successfully subscribed to notifications!');
  } catch (error) {
    console.error('Failed to subscribe user to push notifications:', error);
    alert(`Subscription failed: ${error.message}`);
    isSubscribed = false;
  }
  updatePushButton();
}

async function unsubscribeUser() {
  if (!swRegistration) {
    console.log('unsubscribeUser: Service Worker registration not found.');
    updatePushButton();
    return;
  }
  console.log('unsubscribeUser: Attempting to unsubscribe...');
  pushButton.disabled = true;

  let browserUnsubscribedSuccessfully = false;

  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    if (subscription) {
      console.log('unsubscribeUser: Found active subscription:', subscription.endpoint);
      const unsubscribed = await subscription.unsubscribe();

      if (unsubscribed) {
        console.log('unsubscribeUser: Successfully unsubscribed from browser PushManager.');
        isSubscribed = false;
        browserUnsubscribedSuccessfully = true;

        try {
          console.log('unsubscribeUser: Attempting to remove subscription from server...');
          await removePushSubscriptionFromServer(subscription.endpoint);
          console.log('unsubscribeUser: Successfully removed subscription from server.');
          alert('Successfully unsubscribed from notifications.');
        } catch (serverError) {
          console.error('unsubscribeUser: Failed to remove subscription from server. User is still unsubscribed from browser.', serverError);
          alert('Unsubscribed from this browser, but an error occurred while updating the server.');
        }
      } else {
        console.error('unsubscribeUser: Failed to unsubscribe from browser PushManager.');
        alert('Failed to unsubscribe from browser notifications. Please try again.');
      }
    } else {
      console.log('unsubscribeUser: No active subscription found to unsubscribe.');
      isSubscribed = false;
      browserUnsubscribedSuccessfully = true;
    }
  } catch (error) {
    console.error('unsubscribeUser: Error during unsubscription process:', error);
    alert('An error occurred while trying to unsubscribe. Please check the console.');
  }
  
  if (!browserUnsubscribedSuccessfully && !isSubscribed) {
    isSubscribed = false;
  }
  updatePushButton();
}

document.addEventListener('DOMContentLoaded', async () => {
  pushButton = document.getElementById('pushButton');
  if (!pushButton) {
    console.warn('Push button element "pushButton" not found on DOMContentLoaded.');
  } else {
    if (Notification.permission === 'denied') {
        updatePushButton();
    } else {
        pushButton.innerHTML = '<i class="fas fa-bell"></i> Subscribe';
        pushButton.title = 'Enable Push Notifications';
        pushButton.classList.add('unsubscribed-state');
    }
  }

  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  try {
    await app.renderPage();
  } catch (error) {
    console.error('Error during initial page render:', error);
    if (app._content) {
        app._content.innerHTML = '<h2>Error loading page. Please try again.</h2>';
    }
  }

  window.addEventListener('hashchange', async () => {
    try {
      await app.renderPage();
    } catch (error) {
      console.error('Error during hashchange page render:', error);
    }
  });

  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('A new version of the app is available. Reload now?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App is ready to work offline!');
    },
    onRegisteredSW(swUrl, registration) {
      console.log(`Service Worker registered: ${swUrl}`);
      swRegistration = registration;
      initializePushSubscriptionUI(); 
    },
    onRegisterError(error) {
      console.error('Service Worker registration failed:', error);
      if (pushButton) {
        pushButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> SW Error';
        pushButton.classList.add('disabled');
        pushButton.setAttribute('aria-disabled', 'true');
        pushButton.title = 'Service Worker registration failed. Push notifications unavailable.';
      }
    },
  });
});


