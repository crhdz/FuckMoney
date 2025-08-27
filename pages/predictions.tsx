import React, { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Predictions() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to monthly predictions by default
    router.replace('/predictions-monthly')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-gray-500">Redirigiendo a predicciones mensuales...</div>
      </div>
    </div>
  )
}
