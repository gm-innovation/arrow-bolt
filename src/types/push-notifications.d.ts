// Web Push API types
interface PushSubscriptionOptionsInit {
  userVisibleOnly?: boolean;
  applicationServerKey?: BufferSource | string | null;
}

interface PushManager {
  getSubscription(): Promise<PushSubscription | null>;
  subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
  permissionState(options?: PushSubscriptionOptionsInit): Promise<PushPermissionState>;
}

type PushPermissionState = 'denied' | 'granted' | 'prompt';

interface ServiceWorkerRegistration {
  readonly pushManager: PushManager;
}
