"use client"

import React from "react"
import { EnhancedRestaurantForm } from "../enhanced-form"

export default function NewRestaurantPage() {
  return (
    <div className="container py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Add New Restaurant</h1>
          <p className="text-gray-500">Create a new restaurant listing with detailed information</p>
        </div>
        
        <EnhancedRestaurantForm />
      </div>
    </div>
  )
} 