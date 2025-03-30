'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Location } from '@/types'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'

// Definir los iconos personalizados
const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
})

const customMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
})

const userMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
})

interface MapComponentProps {
  locations: Location[]
  userLocation: { lat: number; lng: number } | null
  roomId: string
  userId: string
  userName: string
  onLocationDelete?: (locationId: string) => void
  onBackToRooms?: () => void
}

const defaultCenter = {
  lat: 40.4168, // Madrid
  lng: -3.7038,
}

const containerStyle = {
  width: '100%',
  height: '100vh',
}

// Componente para manejar eventos del mapa
function MapEventHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function MapComponent({ 
  locations, 
  userLocation, 
  roomId, 
  userId, 
  userName, 
  onLocationDelete,
  onBackToRooms 
}: MapComponentProps) {
  const [isAddingMarker, setIsAddingMarker] = useState(false)
  const [newMarker, setNewMarker] = useState<{ lat: number; lng: number } | null>(null)
  const [markerName, setMarkerName] = useState('')
  const [markerDescription, setMarkerDescription] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleMapClick = (lat: number, lng: number) => {
    if (isAddingMarker) {
      setNewMarker({ lat, lng })
    }
  }

  // Agrupar ubicaciones por usuario
  const groupedLocations = locations.reduce((acc, location) => {
    if (location.is_custom_marker) {
      acc.customMarkers.push(location)
    } else {
      if (!acc.userLocations[location.user_id]) {
        acc.userLocations[location.user_id] = []
      }
      acc.userLocations[location.user_id].push(location)
    }
    return acc
  }, { userLocations: {} as Record<string, Location[]>, customMarkers: [] as Location[] })

  // Ordenar ubicaciones por timestamp para cada usuario
  Object.keys(groupedLocations.userLocations).forEach(userId => {
    groupedLocations.userLocations[userId].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  })

  const handleAddMarker = async () => {
    if (!newMarker || !markerName.trim()) return

    try {
      console.log('Intentando añadir marcador con datos:', {
        room_id: roomId,
        user_id: userId,
        user_name: userName,
        latitude: newMarker.lat,
        longitude: newMarker.lng,
        name: markerName,
        description: markerDescription,
        is_custom_marker: true,
        timestamp: new Date().toISOString(),
      })

      const { data, error } = await supabase
        .from('locations')
        .insert([
          {
            room_id: roomId,
            user_id: userId,
            user_name: userName,
            latitude: newMarker.lat,
            longitude: newMarker.lng,
            name: markerName,
            description: markerDescription,
            is_custom_marker: true,
            timestamp: new Date().toISOString(),
          },
        ])
        .select()

      if (error) {
        console.error('Error de Supabase:', error)
        throw new Error(`Error al añadir marcador: ${error.message}`)
      }

      if (!data) {
        throw new Error('No se recibieron datos de respuesta')
      }

      console.log('Marcador añadido exitosamente:', data)

      // Limpiar el formulario
      setNewMarker(null)
      setMarkerName('')
      setMarkerDescription('')
      setIsAddingMarker(false)
    } catch (error: any) {
      console.error('Error detallado al añadir marcador:', error)
      throw new Error(`Error al añadir marcador: ${error.message || 'Error desconocido'}`)
    }
  }

  const handleDeleteMarker = async (locationId: string) => {
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId)

      if (error) throw error

      if (onLocationDelete) {
        onLocationDelete(locationId)
      }
    } catch (error) {
      console.error('Error al eliminar marcador:', error)
    }
  }

  return (
    <div style={containerStyle} className="relative">
      {/* Botón desplegable de opciones */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="bg-white p-2.5 rounded-xl shadow-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-xl"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Menú desplegable */}
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-[1001] border border-gray-100">
            {onBackToRooms && (
              <button
                onClick={() => {
                  onBackToRooms()
                  setIsMenuOpen(false)
                }}
                className="w-full px-4 py-2.5 text-left text-gray-700 hover:bg-blue-50 flex items-center gap-3 transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Volver a Salas</span>
              </button>
            )}
            
            <button
              onClick={() => {
                setIsAddingMarker(!isAddingMarker)
                setIsMenuOpen(false)
              }}
              className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors duration-200 ${
                isAddingMarker ? 'text-red-600 hover:bg-red-50' : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">{isAddingMarker ? 'Cancelar Marcador' : 'Añadir Marcador'}</span>
            </button>
          </div>
        )}

        {/* Overlay para cerrar el menú al hacer clic fuera */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 z-[999] bg-black/10 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </div>

      <MapContainer
        center={userLocation || defaultCenter}
        zoom={13}
        style={containerStyle}
      >
        <MapEventHandler onMapClick={handleMapClick} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Mostrar marcadores personalizados */}
        {groupedLocations.customMarkers.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={customMarkerIcon}
          >
            <Popup>
              <div className="p-3 max-w-xs">
                <h3 className="font-semibold text-lg text-gray-800">{location.name}</h3>
                {location.description && (
                  <p className="text-sm text-gray-600 mt-2">{location.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Última actualización: {new Date(location.timestamp).toLocaleTimeString()}
                </p>
                {location.user_id === userId && (
                  <button
                    onClick={() => handleDeleteMarker(location.id)}
                    className="mt-3 w-full px-3 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  >
                    Eliminar Marcador
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Mostrar ubicaciones de usuarios */}
        {Object.entries(groupedLocations.userLocations).map(([userLocationId, userLocations]) => {
          const latestLocation = userLocations[0]
          const userColor = userLocationId === userId ? 'blue' : 'green'
          const userIcon = new L.Icon({
            iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${userColor}.png`,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
            shadowAnchor: [12, 41],
          })

          return (
            <div key={userLocationId}>
              {/* Mostrar ubicación actual */}
              <Marker
                position={[latestLocation.latitude, latestLocation.longitude]}
                icon={userIcon}
              >
                <Popup>
                  <div className="p-3 max-w-xs">
                    <h3 className="font-semibold text-lg text-gray-800">{latestLocation.user_name}</h3>
                    <p className="text-xs text-gray-500 mt-2">
                      Última actualización: {new Date(latestLocation.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </div>
          )
        })}

        {newMarker && (
          <Marker position={[newMarker.lat, newMarker.lng]} icon={customMarkerIcon}>
            <Popup>
              <div className="p-3 max-w-xs">
                <h3 className="font-semibold text-lg text-gray-800 mb-3">Nuevo Marcador</h3>
                <input
                  type="text"
                  placeholder="Nombre del marcador"
                  value={markerName}
                  onChange={(e) => setMarkerName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <textarea
                  placeholder="Descripción (opcional)"
                  value={markerDescription}
                  onChange={(e) => setMarkerDescription(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
                <button
                  onClick={handleAddMarker}
                  disabled={!markerName.trim()}
                  className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 text-sm transition-colors duration-200"
                >
                  Guardar Marcador
                </button>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
} 
