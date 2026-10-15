"use client";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  publicKeyAvailable: boolean;
}

/**
 * Check if the browser/device supports Web Push and current permission status
 */
export async function getDevicePushStatus(workspaceSlug: string): Promise<PushStatus> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return {
      supported: false,
      permission: "unsupported",
      isSubscribed: false,
      publicKeyAvailable: false,
    };
  }

  const permission = Notification.permission;

  try {
    const reg = await navigator.serviceWorker.ready;
    const existingSub = await reg.pushManager.getSubscription();

    const res = await fetch(`/api/notifications/push-subscribe?workspaceSlug=${workspaceSlug}`);
    const data = await res.json();

    return {
      supported: true,
      permission,
      isSubscribed: !!existingSub && data.isSubscribed,
      publicKeyAvailable: !!data.publicKey,
    };
  } catch {
    return {
      supported: true,
      permission,
      isSubscribed: false,
      publicKeyAvailable: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    };
  }
}

/**
 * Request notification permission from the user and register device push subscription
 */
export async function registerDevicePush(workspaceSlug: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (typeof window === "undefined") {
    return { success: false, error: "Window is not available" };
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return {
      success: false,
      error: "Device notifications are not supported on this browser or platform.",
    };
  }

  try {
    // 1. Request permission from user
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        success: false,
        error: "Notification permission was denied. Please allow notifications in browser settings.",
      };
    }

    // 2. Fetch VAPID public key
    const statusRes = await fetch(`/api/notifications/push-subscribe?workspaceSlug=${workspaceSlug}`);
    const statusData = await statusRes.json();
    const vapidPublicKey = statusData.publicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      return { success: false, error: "VAPID Public Key not configured on server." };
    }

    // 3. Ensure service worker is registered & ready
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js");
    }
    await navigator.serviceWorker.ready;

    // 4. Subscribe to Push Manager
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    // 5. Send subscription to our server
    const subscribeRes = await fetch("/api/notifications/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceSlug,
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
      }),
    });

    const result = await subscribeRes.json();
    if (!subscribeRes.ok) {
      throw new Error(result.error || "Failed to register subscription on server");
    }

    return { success: true };
  } catch (err: any) {
    console.error("[registerDevicePush] Error:", err);
    return { success: false, error: err.message || "Failed to enable notifications" };
  }
}

/**
 * Unsubscribe device from push notifications
 */
export async function unregisterDevicePush(workspaceSlug: string): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return true;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await fetch("/api/notifications/push-subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          endpoint,
        }),
      });
    }

    return true;
  } catch (err) {
    console.error("[unregisterDevicePush] Error:", err);
    return false;
  }
}
