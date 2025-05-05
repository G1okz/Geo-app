'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

export default function AuthPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hashPassword = (password: string): string => {
    return crypto.createHash('sha256').update(password).digest('hex')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      // Primero crear la cuenta de autenticación con la contraseña original
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password, // Usar la contraseña original, no la hasheada
        options: {
          data: {
            username,
          },
        },
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Error al crear el usuario')
      }

      // Luego crear el usuario en la tabla de usuarios con la contraseña hasheada
      const hashedPassword = hashPassword(password)
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            username,
            password_hash: hashedPassword,
          },
        ])

      if (userError) throw userError

      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 flex flex-col">
      <div className="flex-grow flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-4xl font-extrabold text-white">
            Geo-App
          </h2>
          <p className="mt-2 text-center text-sm text-indigo-200">
            Comparte tu ubicación en tiempo real
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/10 backdrop-blur-md py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-white/20">
            <div className="flex justify-center mb-8">
              <div className="border-b border-white/20">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('login')}
                    className={`${
                      activeTab === 'login'
                        ? 'border-indigo-400 text-indigo-300'
                        : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    onClick={() => setActiveTab('register')}
                    className={`${
                      activeTab === 'register'
                        ? 'border-indigo-400 text-indigo-300'
                        : 'border-transparent text-white/70 hover:text-white hover:border-white/30'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                  >
                    Registro
                  </button>
                </nav>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border-l-4 border-red-500 text-red-200 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="relative">
              <div className={`transition-all duration-300 ease-in-out ${activeTab === 'login' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full absolute'}`}>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white">
                      Email
                    </label>
                    <div className="mt-1">
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-white/20 rounded-md shadow-sm bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 sm:text-sm transition-colors duration-200"
                        required
                        autoComplete="off"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-white">
                      Contraseña
                    </label>
                    <div className="mt-1">
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 border border-white/20 rounded-md shadow-sm bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 sm:text-sm transition-colors duration-200"
                        required
                        autoComplete="off"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors duration-200"
                    >
                      {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                  </div>
                </form>
              </div>
              <div className={`transition-all duration-300 ease-in-out ${activeTab === 'register' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute'}`}>
                <form onSubmit={handleRegister} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="register-email" className="block text-sm font-medium text-white">
                          Email
                        </label>
                        <div className="mt-1">
                          <input
                            id="register-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-white/20 rounded-md shadow-sm bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 sm:text-sm transition-colors duration-200"
                            required
                            autoComplete="off"
                            placeholder="tu@email.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="username" className="block text-sm font-medium text-white">
                          Nombre de usuario
                        </label>
                        <div className="mt-1">
                          <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-white/20 rounded-md shadow-sm bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 sm:text-sm transition-colors duration-200"
                            required
                            autoComplete="off"
                            placeholder="usuario123"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="register-password" className="block text-sm font-medium text-white">
                          Contraseña
                        </label>
                        <div className="mt-1">
                          <input
                            id="register-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-white/20 rounded-md shadow-sm bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 sm:text-sm transition-colors duration-200"
                            required
                            autoComplete="off"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-white">
                          Confirmar Contraseña
                        </label>
                        <div className="mt-1">
                          <input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-white/20 rounded-md shadow-sm bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 sm:text-sm transition-colors duration-200"
                            required
                            autoComplete="off"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors duration-200"
                    >
                      {loading ? 'Registrando...' : 'Registrarse'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="bg-white/10 backdrop-blur-md shadow-md py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-white/80 mb-2">Developed by Miguel Reyna</p>
          <a
            href="https://github.com/G1okz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-300 hover:text-indigo-200 transition-colors duration-200 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
