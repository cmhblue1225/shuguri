'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { getSupabase } from './supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, name?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()

    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session using getUser for reliable validation
    const initializeAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(user)
      } catch {
        setSession(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Refresh session on token refresh or sign in
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          const { data: { user } } = await supabase.auth.getUser()
          setUser(user)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } as AuthError }
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, name?: string) => {
    const supabase = getSupabase()
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } as AuthError }
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })
    return { error }
  }

  const signOut = async () => {
    const supabase = getSupabase()
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
