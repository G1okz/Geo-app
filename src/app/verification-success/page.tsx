'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function VerificationSuccess() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a la página de inicio de sesión después de 5 segundos
    const timer = setTimeout(() => {
      router.push('/')
    }, 5000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex flex-col items-center justify-center">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-lg shadow-xl border border-white/20 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-green-400 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            ¡Usuario registrado exitosamente!
          </h2>
          <p className="text-indigo-200 mb-6">
            Tu cuenta ha sido verificada correctamente. Serás redirigido a la página de inicio de sesión en unos segundos.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
          >
            Ir a inicio de sesión
          </button>
        </div>
      </div>
    </div>
  )
} 
