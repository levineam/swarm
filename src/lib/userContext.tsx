import React, {createContext, useContext, ReactNode} from 'react'

interface User {
  handle: string
  // Add other user properties as needed
}

interface UserContextType {
  currentUser: User | null
  // Add other context properties as needed
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({children, currentUser}: {children: ReactNode, currentUser: User | null}) {
  return (
    <UserContext.Provider value={{currentUser}}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider')
  }
  return context
} 