'use client'

import dynamic from 'next/dynamic'
import { Location } from '@/types'

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg text-gray-600">Cargando mapa...</p>
    </div>
  ),
})

interface LiveMapProps {
  locations: Location[]
  userLocation: { lat: number; lng: number } | null
  roomId: string
  userId: string
  userName: string
  onLocationDelete?: (locationId: string) => void
}

export default function LiveMap({ locations, userLocation, roomId, userId, userName, onLocationDelete }: LiveMapProps) {
  return (
    <MapComponent
      locations={locations}
      userLocation={userLocation}
      roomId={roomId}
      userId={userId}
      userName={userName}
      onLocationDelete={onLocationDelete}
    />
  )
} 
