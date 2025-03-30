'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Room } from '@/types'

interface RoomManagerProps {
  onJoinRoom: (roomId: string) => void
  currentRoom?: Room | null
  userId?: string
  onLeaveRoom?: () => void
}

export default function RoomManager({ onJoinRoom, currentRoom, userId, onLeaveRoom }: RoomManagerProps) {
  const [roomName, setRoomName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newRoomCode, setNewRoomCode] = useState<string | null>(null)
  const [userRooms, setUserRooms] = useState<Room[]>([])
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([])

  useEffect(() => {
    fetchUserRooms()
    fetchJoinedRooms()
  }, [])

  const fetchUserRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: rooms, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setUserRooms(rooms || [])
    } catch (error: any) {
      console.error('Error al obtener las salas:', error.message)
    }
  }

  const fetchJoinedRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: memberships, error: membershipError } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id)

      if (membershipError) throw membershipError

      if (memberships && memberships.length > 0) {
        const roomIds = memberships.map(m => m.room_id)
        const { data: rooms, error: roomsError } = await supabase
          .from('rooms')
          .select('*')
          .in('id', roomIds)
          .order('created_at', { ascending: false })

        if (roomsError) throw roomsError
        setJoinedRooms(rooms || [])
      }
    } catch (error: any) {
      console.error('Error al obtener las salas unidas:', error.message)
    }
  }

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError('Por favor, ingresa un nombre para la sala')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Generar un código único para la sala
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { data: room, error: createError } = await supabase
        .from('rooms')
        .insert([
          {
            name: roomName,
            code: code,
            created_by: userId,
          },
        ])
        .select()
        .single()

      if (createError) throw createError

      // Unirse automáticamente a la sala creada
      onJoinRoom(room.id)
    } catch (error: any) {
      setError(error.message || 'Error al crear la sala')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setError('Por favor, ingresa un código de sala')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data: room, error: joinError } = await supabase
        .from('rooms')
        .select()
        .eq('code', roomCode.toUpperCase())
        .single()

      if (joinError) throw joinError

      onJoinRoom(room.id)
    } catch (error: any) {
      setError(error.message || 'Error al unirse a la sala')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRoom = async () => {
    if (!currentRoom || !userId || currentRoom.created_by !== userId) return

    setLoading(true)
    setError(null)

    try {
      // Primero eliminar todas las ubicaciones asociadas a la sala
      const { error: deleteLocationsError } = await supabase
        .from('locations')
        .delete()
        .eq('room_id', currentRoom.id)

      if (deleteLocationsError) throw deleteLocationsError

      // Luego eliminar la sala
      const { error: deleteRoomError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', currentRoom.id)

      if (deleteRoomError) throw deleteRoomError

      if (onLeaveRoom) {
        onLeaveRoom()
      }
    } catch (error: any) {
      setError(error.message || 'Error al eliminar la sala')
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveRoom = async () => {
    if (!currentRoom || !userId) return

    setLoading(true)
    setError(null)

    try {
      // Eliminar las ubicaciones del usuario en la sala
      const { error: deleteLocationsError } = await supabase
        .from('locations')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('user_id', userId)

      if (deleteLocationsError) throw deleteLocationsError

      if (onLeaveRoom) {
        onLeaveRoom()
      }
    } catch (error: any) {
      setError(error.message || 'Error al salir de la sala')
    } finally {
      setLoading(false)
    }
  }

  if (currentRoom) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Sala Actual: {currentRoom.name}</h2>
        <p className="text-gray-600 mb-4">Código de la sala: {currentRoom.code}</p>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="flex gap-4">
          {currentRoom.created_by === userId ? (
            <button
              onClick={handleDeleteRoom}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-red-300"
            >
              {loading ? 'Eliminando...' : 'Eliminar Sala'}
            </button>
          ) : (
            <button
              onClick={handleLeaveRoom}
              disabled={loading}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-yellow-300"
            >
              {loading ? 'Saliendo...' : 'Salir de la Sala'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Gestionar Salas</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Crear Nueva Sala</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre de la sala"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? 'Creando...' : 'Crear Sala'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Unirse a una Sala</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Código de la sala"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleJoinRoom}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-green-300"
            >
              {loading ? 'Uniendo...' : 'Unirse'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
