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
      <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-8 py-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Sala Actual</h2>
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">{currentRoom.name}</h3>
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-base font-medium text-gray-500">Código:</span>
              <span className="px-4 py-2 bg-gray-100 text-black rounded-full font-mono text-lg font-bold">
                {currentRoom.code}
              </span>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {currentRoom.created_by === userId ? (
              <button
                onClick={() => handleDeleteRoom(currentRoom.id)}
                disabled={loading}
                className="w-full px-8 py-4 bg-red-500 text-white rounded-lg font-medium text-lg shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Eliminando...' : 'Eliminar Sala'}
              </button>
            ) : (
              <button
                onClick={handleLeaveRoom}
                disabled={loading}
                className="w-full px-8 py-4 bg-yellow-500 text-white rounded-lg font-medium text-lg shadow-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex flex-col">
      <div className="flex-grow flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
          <h2 className="mt-6 text-center text-5xl font-extrabold text-white">
            Geo-App
          </h2>
          <p className="mt-4 text-center text-lg text-indigo-200">
            Gestiona tus salas y únete a otras
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
          <div className="bg-white/10 backdrop-blur-md py-8 px-6 shadow-xl sm:rounded-lg sm:px-10 border border-white/20">
            <div className="flex justify-center mb-8">
              <div className="border-b border-white/20">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`${
                      activeTab === 'create'
                        ? 'border-indigo-400 text-indigo-300'
                        : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors duration-200`}
                  >
                    Crear Sala
                  </button>
                  <button
                    onClick={() => setActiveTab('join')}
                    className={`${
                      activeTab === 'join'
                        ? 'border-indigo-400 text-indigo-300'
                        : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors duration-200`}
                  >
                    Unirse a Sala
                  </button>
                </nav>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border-l-4 border-red-500 text-red-200 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {activeTab === 'create' ? (
              <div className="space-y-8">
                <div>
                  <label htmlFor="roomName" className="block text-lg font-medium text-white">
                    Nombre de la Sala
                  </label>
                  <div className="mt-2">
                    <input
                      id="roomName"
                      type="text"
                      placeholder="Ej: Sala de Amigos"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="appearance-none block w-full px-4 py-3 border border-white/20 rounded-md shadow-sm bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-lg transition-colors duration-200"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateRoom}
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors duration-200"
                >
                  {loading ? 'Creando...' : 'Crear Sala'}
                </button>

                {userRooms.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-medium text-white mb-6">Tus Salas Creadas</h3>
                    <div className="space-y-4">
                      {userRooms.map((room) => (
                        <div
                          key={room.id}
                          className="bg-white/10 p-6 rounded-lg border border-white/20 hover:border-indigo-400 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium text-white text-lg">{room.name}</h4>
                              <p className="text-base text-indigo-200">Código: {room.code}</p>
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => onJoinRoom(room.id)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-base hover:bg-indigo-700 transition-colors"
                              >
                                Unirse
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('¿Estás seguro de que quieres eliminar esta sala? Esta acción no se puede deshacer.')) {
                                    handleDeleteRoom(room.id)
                                  }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-md text-base hover:bg-red-700 transition-colors"
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
              <div className="space-y-8">
                <div>
                  <label htmlFor="roomCode" className="block text-lg font-medium text-white">
                    Código de la Sala
                  </label>
                  <div className="mt-2">
                    <input
                      id="roomCode"
                      type="text"
                      placeholder="Ingresa el código"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="appearance-none block w-full px-4 py-3 border border-white/20 rounded-md shadow-sm bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 text-lg uppercase transition-colors duration-200"
                      maxLength={6}
                    />
                  </div>
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-colors duration-200"
                >
                  {loading ? 'Uniéndose...' : 'Unirse a la Sala'}
                </button>

                {joinedRooms.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-medium text-white mb-6">Salas a las que te has unido</h3>
                    <div className="space-y-4">
                      {joinedRooms.map((room) => (
                        <div
                          key={room.id}
                          className="bg-white/10 p-6 rounded-lg border border-white/20 hover:border-green-400 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium text-white text-lg">{room.name}</h4>
                              <p className="text-base text-indigo-200">Código: {room.code}</p>
                            </div>
                            <button
                              onClick={() => onJoinRoom(room.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-md text-base hover:bg-green-700 transition-colors"
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

            <div className="mt-8 pt-6 border-t border-white/20">
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/')
                }}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
      <footer className="bg-white/10 backdrop-blur-md shadow-md py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/80 mb-2 text-sm">Developed by Miguel Reyna</p>
          <div className="flex justify-center items-center space-x-4">
            <a
              href="https://github.com/G1okz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 hover:text-indigo-200 transition-colors duration-200 inline-flex items-center text-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
            <span className="text-white/70 text-sm inline-flex items-center">
              <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              {new Date().getFullYear()}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
} 
