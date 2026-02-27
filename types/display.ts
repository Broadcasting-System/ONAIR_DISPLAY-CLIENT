export type ContentType = 'image' | 'video' | 'presentation' | 'audio' | 'standby'

export interface DisplayContent {
  type: ContentType
  url?: string
  urls?: string[]
  duration?: number
  serverTimestamp?: number
}

export interface WebSocketMessage {
  command: 'display'
  type: ContentType
  fileId: string
  url?: string
  urls?: string[]
  duration?: number
  serverTimestamp?: number
}
