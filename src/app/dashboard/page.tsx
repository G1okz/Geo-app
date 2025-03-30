'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import RoomManager from '@/components/room/RoomManager'
import LiveMap from '@/components/map/LiveMap'
import { Location, Room } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Verificar autenticación y obtener usuario
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
        return
      }

      setUserId(session.user.id)

      // Obtener el nombre del usuario
      const { data: userData } = await supabase
        .from('users')
        .select('username')
        .eq('id', session.user.id)
        .single()

      if (userData) {
        setUserName(userData.username)
      }
    }
    checkAuth()

    // Obtener ubicación del usuario
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setUserLocation(newLocation)

          // Si estamos en una sala, actualizar la ubicación en Supabase
          if (currentRoom) {
            updateLocation(newLocation)
          }
        },
        (error) => {
          console.error('Error al obtener la ubicación:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      )

      return () => {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [router, currentRoom])

  const updateLocation = async (location: { lat: number; lng: number }) => {
    try {
      if (!userId || !currentRoom) {
        console.error('No hay usuario autenticado o sala seleccionada')
        return
      }

      const { error } = await supabase
        .from('locations')
        .insert([
          {
            room_id: currentRoom.id,
            user_id: userId,
            user_name: userName,
            latitude: location.lat,
            longitude: location.lng,
            timestamp: new Date().toISOString(),
          },
        ])

      if (error) {
        console.error('Error de Supabase:', error)
        throw error
      }
    } catch (error: any) {
      console.error('Error al actualizar la ubicación:', error.message || error)
    }
  }

  useEffect(() => {
    if (!currentRoom) return

    // Suscribirse a cambios en las ubicaciones de la sala
    const locationsSubscription = supabase
      .channel('locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations',
          filter: `room_id=eq.${currentRoom.id}`,
        },
        (payload) => {
          console.log('Cambio en ubicaciones:', payload)
          if (payload.eventType === 'INSERT') {
            setLocations((prev) => [...prev, payload.new as Location])
          } else if (payload.eventType === 'UPDATE') {
            setLocations((prev) =>
              prev.map((loc) =>
                loc.id === payload.new.id ? (payload.new as Location) : loc
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setLocations((prev) =>
              prev.filter((loc) => loc.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    // Obtener ubicaciones existentes
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('room_id', currentRoom.id)
          .order('timestamp', { ascending: false })

        if (error) throw error
        setLocations(data as Location[])
      } catch (error) {
        console.error('Error al obtener ubicaciones:', error)
      }
    }

    fetchLocations()

    return () => {
      locationsSubscription.unsubscribe()
    }
  }, [currentRoom])

  useEffect(() => {
    if (!userId || !currentRoom) return

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })

        try {
          // Buscar si ya existe una ubicación para este usuario en esta sala
          const { data: existingLocation } = await supabase
            .from('locations')
            .select('id')
            .eq('room_id', currentRoom.id)
            .eq('user_id', userId)
            .eq('is_custom_marker', false)
            .single()

          if (existingLocation) {
            // Actualizar la ubicación existente
            const { error } = await supabase
              .from('locations')
              .update({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: new Date().toISOString(),
              })
              .eq('id', existingLocation.id)

            if (error) throw error
          } else {
            // Crear una nueva ubicación
            const { error } = await supabase.from('locations').insert([
              {
                room_id: currentRoom.id,
                user_id: userId,
                user_name: userName,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                timestamp: new Date().toISOString(),
              },
            ])
            if (error) throw error
          }
        } catch (error) {
          console.error('Error al actualizar la ubicación:', error)
        }
      },
      (error) => {
        console.error('Error al obtener la ubicación:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [userId, currentRoom, userName])

  const handleJoinRoom = async (roomId: string) => {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select()
        .eq('id', roomId)
        .single()

      if (error) throw error
      setCurrentRoom(room)

      // Obtener ubicaciones existentes
      const { data: existingLocations } = await supabase
        .from('locations')
        .select()
        .eq('room_id', roomId)
        .order('timestamp', { ascending: false })

      if (existingLocations) {
        setLocations(existingLocations)
      }
    } catch (error) {
      console.error('Error al unirse a la sala:', error)
    }
  }

  const handleLocationDelete = (locationId: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== locationId))
  }

  const handleLeaveRoom = () => {
    setCurrentRoom(null)
    setLocations([])
    setUserLocation(null)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              {currentRoom ? currentRoom.name : 'Geolocalización en Tiempo Real'}
            </h1>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/')
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentRoom ? (
          <LiveMap 
            locations={locations} 
            userLocation={userLocation} 
            roomId={currentRoom.id}
            userId={userId || ''}
            userName={userName}
            onLocationDelete={handleLocationDelete}
          />
        ) : (
          <RoomManager 
            onJoinRoom={handleJoinRoom}
            currentRoom={currentRoom}
            userId={userId || ''}
            onLeaveRoom={handleLeaveRoom}
          />
        )}
      </main>
    </div>
  )
} 
