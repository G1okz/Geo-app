export interface User {
  id: string
  email: string
  username: string
  created_at: string
}

export interface Room {
  id: string
  name: string
  code: string
  created_by: string
  created_at: string
  members: RoomMember[]
}

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  joined_at: string
}

export interface Location {
  id: string
  room_id: string
  user_id: string
  user_name: string
  latitude: number
  longitude: number
  timestamp: string
  name?: string
  description?: string
  is_custom_marker?: boolean
}

export interface Event {
  id: string
  room_id: string
  user_id: string
  user_name: string
  type: string
  data: any
  timestamp: string
} 
