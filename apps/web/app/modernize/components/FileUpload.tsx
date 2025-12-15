'use client'

import { useCallback, useState } from 'react'

interface FileUploadProps {
  onFileLoad: (content: string, filename: string) => void
  accept?: string
}

export function FileUpload({ onFileLoad, accept = '.cpp,.h,.hpp,.c,.cc,.cxx' }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      onFileLoad(content, file.name)
    }
    reader.readAsText(file)
  }, [onFileLoad])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        relative border-2 border-dashed rounded-lg p-4 text-center transition-colors
        ${isDragging
          ? 'border-primary-500 bg-primary-50'
          : 'border-slate-300 hover:border-slate-400'
        }
      `}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex flex-col items-center gap-2">
        <svg
          className={`w-8 h-8 ${isDragging ? 'text-primary-500' : 'text-slate-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <div className="text-sm">
          <span className="text-primary-600 font-medium">Click to upload</span>
          <span className="text-slate-500"> or drag and drop</span>
        </div>
        <p className="text-xs text-slate-400">.cpp, .h, .hpp, .c, .cc, .cxx</p>
      </div>
    </div>
  )
}
