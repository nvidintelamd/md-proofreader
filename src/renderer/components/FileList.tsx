import React from 'react'
import { useAppStore } from '../store/appStore'

interface Props {
  onFileSelect: (index: number) => void
}

export function FileList({ onFileSelect }: Props) {
  const { files, currentFileIndex } = useAppStore()

  if (files.length === 0) {
    return (
      <div className="w-64 bg-gray-50 border-r flex flex-col h-full">
        <div className="p-3 border-b bg-gray-100">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">文件列表</h2>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
          请上传MD文件
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-gray-50 border-r flex flex-col h-full">
      <div className="p-3 border-b bg-gray-100">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">文件列表</h2>
        <div className="text-[10px] text-gray-400 mt-1">
          {files.filter(f => f.done).length}/{files.length} 已校对
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.map((file, index) => (
          <div
            key={file.path}
            className={`
              flex items-center gap-2 p-2 rounded cursor-pointer text-xs
              transition-colors duration-150
              ${index === currentFileIndex
                ? 'bg-indigo-100 text-indigo-800 font-semibold'
                : 'hover:bg-gray-100 text-gray-700'
              }
            `}
            onClick={() => onFileSelect(index)}
          >
            <span className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
              file.done
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}>
              {file.done ? '✓' : (index + 1)}
            </span>
            <span className="truncate flex-1">{file.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
