'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Room } from '@/types'
import { useRouter } from 'next/navigation'

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
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create')
  const router = useRouter()

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

      // Obtener las membresías de sala del usuario
      const { data: memberships, error: membershipError } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id)

      if (membershipError) throw membershipError

      if (memberships && memberships.length > 0) {
        const roomIds = memberships.map(m => m.room_id)
        
        // Obtener los detalles de las salas
        const { data: rooms, error: roomsError } = await supabase
          .from('rooms')
          .select('*')
          .in('id', roomIds)
          .order('created_at', { ascending: false })

        if (roomsError) throw roomsError
        
        // Actualizar el estado con las salas unidas
        setJoinedRooms(rooms || [])
      } else {
        setJoinedRooms([])
      }
    } catch (error: any) {
      console.error('Error al obtener las salas unidas:', error.message)
      setError('Error al cargar las salas unidas')
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      // Buscar la sala por código
      const { data: room, error: joinError } = await supabase
        .from('rooms')
        .select()
        .eq('code', roomCode.toUpperCase())
        .single()

      if (joinError) throw joinError

      // Registrar al usuario como miembro de la sala
      const { error: membershipError } = await supabase
        .from('room_members')
        .insert([
          {
            room_id: room.id,
            user_id: user.id
          }
        ])

      if (membershipError) throw membershipError

      // Actualizar la lista de salas unidas
      await fetchJoinedRooms()

      // Unirse a la sala
      onJoinRoom(room.id)
    } catch (error: any) {
      setError(error.message || 'Error al unirse a la sala')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRoom = async (roomId?: string) => {
    const targetRoomId = roomId || currentRoom?.id
    if (!targetRoomId || !userId) return

    setLoading(true)
    setError(null)

    try {
      // Primero eliminar todas las ubicaciones asociadas a la sala
      const { error: deleteLocationsError } = await supabase
        .from('locations')
        .delete()
        .eq('room_id', targetRoomId)

      if (deleteLocationsError) throw deleteLocationsError

      // Luego eliminar la sala
      const { error: deleteRoomError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', targetRoomId)

      if (deleteRoomError) throw deleteRoomError

      // Si estamos en la sala actual, salir de ella
      if (currentRoom?.id === targetRoomId && onLeaveRoom) {
        onLeaveRoom()
      }

      // Actualizar la lista de salas
      fetchUserRooms()
      fetchJoinedRooms()
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
      <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Sala Actual</h2>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">{currentRoom.name}</h3>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-sm font-medium text-gray-500">Código:</span>
              <span className="px-3 py-1 bg-gray-100 text-black rounded-full font-mono text-sm font-bold">
                {currentRoom.code}
              </span>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {currentRoom.created_by === userId ? (
              <button
                onClick={() => handleDeleteRoom(currentRoom.id)}
                disabled={loading}
                className="w-full px-6 py-3 bg-red-500 text-white rounded-lg font-medium shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Eliminando...' : 'Eliminar Sala'}
              </button>
            ) : (
              <button
                onClick={handleLeaveRoom}
                disabled={loading}
                className="w-full px-6 py-3 bg-yellow-500 text-white rounded-lg font-medium shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saliendo...' : 'Salir de la Sala'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center mb-6">Gestionar Salas</h2>
        
        <div className="flex mb-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Crear Sala
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'join'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Unirse a Sala
          </button>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {activeTab === 'create' ? (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Sala
              </label>
              <input
                id="roomName"
                type="text"
                placeholder="Ej: Sala de Amigos"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm sm:text-base"
              />
            </div>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-medium shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
            >
              {loading ? 'Creando...' : 'Crear Sala'}
            </button>

            {userRooms.length > 0 && (
              <div className="mt-6 sm:mt-8">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">Tus Salas Creadas</h3>
                <div className="space-y-3">
                  {userRooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-800 text-sm sm:text-base">{room.name}</h4>
                          <p className="text-xs sm:text-sm text-black font-medium">Código: {room.code}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onJoinRoom(room.id)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-xs sm:text-sm hover:bg-blue-200 transition-colors"
                          >
                            Unirse
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('¿Estás seguro de que quieres eliminar esta sala? Esta acción no se puede deshacer.')) {
                                handleDeleteRoom(room.id)
                              }
                            }}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-xs sm:text-sm hover:bg-red-200 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
                Código de la Sala
              </label>
              <input
                id="roomCode"
                type="text"
                placeholder="Ingresa el código"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow uppercase text-sm sm:text-base"
                maxLength={6}
              />
            </div>
            <button
              onClick={handleJoinRoom}
              disabled={loading}
              className="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-medium shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
            >
              {loading ? 'Uniéndose...' : 'Unirse a la Sala'}
            </button>

            {joinedRooms.length > 0 && (
              <div className="mt-6 sm:mt-8">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">Salas a las que te has unido</h3>
                <div className="space-y-3">
                  {joinedRooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-green-300 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-800 text-sm sm:text-base">{room.name}</h4>
                          <p className="text-xs sm:text-sm text-black font-medium">Código: {room.code}</p>
                        </div>
                        <button
                          onClick={() => onJoinRoom(room.id)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-xs sm:text-sm hover:bg-green-200 transition-colors"
                        >
                          Unirse
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botón de cerrar sesión */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/')
            }}
            className="w-full px-6 py-3 bg-red-500 text-white rounded-lg font-medium shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-gray-600">
            <span className="text-sm">Developed by Miguel Reyna</span>
            <a
              href="https://github.com/g1okz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors duration-200 inline-flex items-center"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 
