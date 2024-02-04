export interface WebsocketConnection {
  connected: number;
  disconnected: number;
  lastConnectionTime: number;
  names: string[];
  failedLogins: number;
  ip: string;
}
