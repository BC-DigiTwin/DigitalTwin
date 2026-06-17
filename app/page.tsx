'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import '../src/index.css'

const TwinCampusApp = dynamic(() => import('../src/App'), { ssr: false })

const queryClient = new QueryClient()

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <TwinCampusApp />
    </QueryClientProvider>
  )
}
