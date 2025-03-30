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

export default function MapComponent({ locations, userLocation, roomId, userId, userName, onLocationDelete }: MapComponentProps) {
  const [isAddingMarker, setIsAddingMarker] = useState(false)
  const [newMarker, setNewMarker] = useState<{ lat: number; lng: number } | null>(null)
  const [markerName, setMarkerName] = useState('')
  const [markerDescription, setMarkerDescription] = useState('')

  const handleMapClick = (lat: number, lng: number) => {
    if (isAddingMarker) {
      setNewMarker({ lat, lng })
    }
  }

  const handleAddMarker = async () => {
    if (!newMarker || !markerName.trim()) return

    try {
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

      if (error) throw error

      // Limpiar el formulario
      setNewMarker(null)
      setMarkerName('')
      setMarkerDescription('')
      setIsAddingMarker(false)
    } catch (error) {
      console.error('Error al añadir marcador:', error)
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

  // Filtrar las ubicaciones para mostrar solo la más reciente por usuario
  const filteredLocations = locations.reduce((acc, location) => {
    if (location.is_custom_marker) {
      acc.push(location)
    } else {
      const existingLocation = acc.find(loc => loc.user_id === location.user_id)
      if (!existingLocation || new Date(location.timestamp) > new Date(existingLocation.timestamp)) {
        if (existingLocation) {
          acc = acc.filter(loc => loc.user_id !== location.user_id)
        }
        acc.push(location)
      }
    }
    return acc
  }, [] as Location[])

  return (
    <div style={containerStyle}>
      <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded-lg shadow-lg">
        <button
          onClick={() => setIsAddingMarker(!isAddingMarker)}
          className={`px-4 py-2 rounded ${
            isAddingMarker ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {isAddingMarker ? 'Cancelar' : 'Añadir Marcador'}
        </button>
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
        
        {filteredLocations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={location.is_custom_marker ? customMarkerIcon : defaultIcon}
          >
            <Popup>
              <div>
                <h3 className="font-medium">
                  {location.is_custom_marker ? location.name : location.user_name}
                </h3>
                {location.is_custom_marker && location.description && (
                  <p className="text-sm text-gray-600 mt-1">{location.description}</p>
                )}
                <p className="text-sm text-gray-500">
                  Última actualización: {new Date(location.timestamp).toLocaleTimeString()}
                </p>
                {location.is_custom_marker && (
                  <button
                    onClick={() => handleDeleteMarker(location.id)}
                    className="mt-2 w-full px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
                  >
                    Eliminar Marcador
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {newMarker && (
          <Marker position={[newMarker.lat, newMarker.lng]} icon={customMarkerIcon}>
            <Popup>
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Nombre del marcador"
                  value={markerName}
                  onChange={(e) => setMarkerName(e.target.value)}
                  className="w-full p-2 border rounded mb-2"
                />
                <textarea
                  placeholder="Descripción (opcional)"
                  value={markerDescription}
                  onChange={(e) => setMarkerDescription(e.target.value)}
                  className="w-full p-2 border rounded mb-2"
                />
                <button
                  onClick={handleAddMarker}
                  disabled={!markerName.trim()}
                  className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
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
