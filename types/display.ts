export type ContentType = 'image' | 'video' | 'presentation' | 'audio'

export interface DisplayContent {
  type: ContentType
  url?: string
  urls?: string[]
  duration?: number
}

export interface WebSocketMessage {
  command: 'display'
  type: ContentType
  fileId: string
  urls?: string[]
  duration?: number
}
