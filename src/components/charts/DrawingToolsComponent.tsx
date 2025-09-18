'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { 
  TrendingUp,
  TrendingDown,
  Square,
  Circle,
  Target,
  Ruler,
  Type,
  Palette,
  Trash2,
  Save,
  Download,
  Upload,
  Eye,
  EyeOff,
  Settings,
  Move,
  RotateCcw,
  RotateCw,
  Layers,
  Grid,
  Zap,
  Star,
  Crown,
  MousePointer,
  X
} from 'lucide-react'

interface DrawingTool {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  category: 'trend' | 'pattern' | 'measurement' | 'annotation'
  enabled: boolean
  settings: Record<string, any>
}

interface DrawingElement {
  id: string
  type: string
  name: string
  data: {
    points: Array<{ x: number; y: number }>
    startPoint?: { x: number; y: number }
    endPoint?: { x: number; y: number }
    text?: string
    width?: number
    height?: number
    radius?: number
    levels?: number[]
  }
  style: {
    color: string
    lineWidth: number
    lineStyle: 'solid' | 'dashed' | 'dotted'
    opacity: number
    visible: boolean
    fillColor?: string
    fontSize?: number
  }
  createdAt: Date
  isSelected?: boolean
}

interface DrawingCanvasProps {
  activeTool: string | null
  toolSettings: any
  drawingElements: DrawingElement[]
  onElementAdd: (element: DrawingElement) => void
  onElementUpdate: (id: string, element: DrawingElement) => void
  onElementSelect: (id: string | null) => void
  selectedElement: string | null
}

// Drawing Canvas Component
function DrawingCanvas({
  activeTool,
  toolSettings,
  drawingElements,
  onElementAdd,
  onElementUpdate,
  onElementSelect,
  selectedElement
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null)

  const getCanvasCoordinates = useCallback((event: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }, [])

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!activeTool) return
    
    const coords = getCanvasCoordinates(event)
    setStartPoint(coords)
    setIsDrawing(true)

    // Check if clicking on existing element
    const clickedElement = findElementAtPoint(coords)
    if (clickedElement) {
      onElementSelect(clickedElement.id)
      return
    }

    // Start new drawing
    const newElement: DrawingElement = {
      id: `${activeTool}_${Date.now()}`,
      type: activeTool,
      name: `${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} ${drawingElements.length + 1}`,
      data: {
        points: [coords],
        startPoint: coords
      },
      style: {
        color: toolSettings.color,
        lineWidth: toolSettings.lineWidth,
        lineStyle: toolSettings.lineStyle,
        opacity: toolSettings.opacity,
        visible: true
      },
      createdAt: new Date()
    }
    
    setCurrentElement(newElement)
  }, [activeTool, toolSettings, drawingElements.length, getCanvasCoordinates, onElementSelect])

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDrawing || !currentElement) return
    
    const coords = getCanvasCoordinates(event)
    
    if (activeTool === 'trendline' || activeTool === 'horizontal_line' || activeTool === 'vertical_line') {
      const updatedElement = {
        ...currentElement,
        data: {
          ...currentElement.data,
          endPoint: coords,
          points: [currentElement.data.startPoint!, coords]
        }
      }
      setCurrentElement(updatedElement)
    } else if (activeTool === 'rectangle') {
      const width = coords.x - currentElement.data.startPoint!.x
      const height = coords.y - currentElement.data.startPoint!.y
      const updatedElement = {
        ...currentElement,
        data: {
          ...currentElement.data,
          endPoint: coords,
          width: Math.abs(width),
          height: Math.abs(height)
        }
      }
      setCurrentElement(updatedElement)
    } else if (activeTool === 'ellipse') {
      const radius = Math.sqrt(
        Math.pow(coords.x - currentElement.data.startPoint!.x, 2) +
        Math.pow(coords.y - currentElement.data.startPoint!.y, 2)
      )
      const updatedElement = {
        ...currentElement,
        data: {
          ...currentElement.data,
          endPoint: coords,
          radius
        }
      }
      setCurrentElement(updatedElement)
    }
  }, [isDrawing, currentElement, activeTool, getCanvasCoordinates])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentElement) return
    
    setIsDrawing(false)
    setStartPoint(null)
    
    // Add the completed element
    onElementAdd(currentElement)
    setCurrentElement(null)
  }, [isDrawing, currentElement, onElementAdd])

  const findElementAtPoint = useCallback((point: { x: number; y: number }) => {
    return drawingElements.find(element => {
      if (element.type === 'trendline' || element.type === 'horizontal_line' || element.type === 'vertical_line') {
        const { startPoint, endPoint } = element.data
        if (!startPoint || !endPoint) return false
        
        const distance = distanceToLine(point, startPoint, endPoint)
        return distance < 10 // 10px tolerance
      } else if (element.type === 'rectangle') {
        const { startPoint, width, height } = element.data
        if (!startPoint || !width || !height) return false
        
        return point.x >= startPoint.x && point.x <= startPoint.x + width &&
               point.y >= startPoint.y && point.y <= startPoint.y + height
      } else if (element.type === 'ellipse') {
        const { startPoint, radius } = element.data
        if (!startPoint || !radius) return false
        
        const distance = Math.sqrt(
          Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2)
        )
        return distance <= radius
      }
      return false
    })
  }, [drawingElements])

  const distanceToLine = (point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) => {
    const A = point.x - start.x
    const B = point.y - start.y
    const C = end.x - start.x
    const D = end.y - start.y

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) param = dot / lenSq

    let xx, yy

    if (param < 0) {
      xx = start.x
      yy = start.y
    } else if (param > 1) {
      xx = end.x
      yy = end.y
    } else {
      xx = start.x + param * C
      yy = start.y + param * D
    }

    const dx = point.x - xx
    const dy = point.y - yy

    return Math.sqrt(dx * dx + dy * dy)
  }

  // Draw function
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw all elements
    drawingElements.forEach(element => {
      if (!element.style.visible) return
      
      ctx.strokeStyle = element.style.color
      ctx.lineWidth = element.style.lineWidth
      ctx.globalAlpha = element.style.opacity
      
      // Set line style
      if (element.style.lineStyle === 'dashed') {
        ctx.setLineDash([5, 5])
      } else if (element.style.lineStyle === 'dotted') {
        ctx.setLineDash([2, 2])
      } else {
        ctx.setLineDash([])
      }
      
      if (element.type === 'trendline' || element.type === 'horizontal_line' || element.type === 'vertical_line') {
        const { startPoint, endPoint } = element.data
        if (startPoint && endPoint) {
          ctx.beginPath()
          ctx.moveTo(startPoint.x, startPoint.y)
          ctx.lineTo(endPoint.x, endPoint.y)
          ctx.stroke()
        }
      } else if (element.type === 'rectangle') {
        const { startPoint, width, height } = element.data
        if (startPoint && width && height) {
          ctx.beginPath()
          ctx.rect(startPoint.x, startPoint.y, width, height)
          ctx.stroke()
          
          if (element.style.fillColor) {
            ctx.fillStyle = element.style.fillColor
            ctx.fill()
          }
        }
      } else if (element.type === 'ellipse') {
        const { startPoint, radius } = element.data
        if (startPoint && radius) {
          ctx.beginPath()
          ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI)
          ctx.stroke()
          
          if (element.style.fillColor) {
            ctx.fillStyle = element.style.fillColor
            ctx.fill()
          }
        }
      }
    })
    
    // Draw current element being created
    if (currentElement) {
      ctx.strokeStyle = currentElement.style.color
      ctx.lineWidth = currentElement.style.lineWidth
      ctx.globalAlpha = currentElement.style.opacity
      
      if (currentElement.style.lineStyle === 'dashed') {
        ctx.setLineDash([5, 5])
      } else if (currentElement.style.lineStyle === 'dotted') {
        ctx.setLineDash([2, 2])
      } else {
        ctx.setLineDash([])
      }
      
      if (currentElement.type === 'trendline' || currentElement.type === 'horizontal_line' || currentElement.type === 'vertical_line') {
        const { startPoint, endPoint } = currentElement.data
        if (startPoint && endPoint) {
          ctx.beginPath()
          ctx.moveTo(startPoint.x, startPoint.y)
          ctx.lineTo(endPoint.x, endPoint.y)
          ctx.stroke()
        }
      } else if (currentElement.type === 'rectangle') {
        const { startPoint, width, height } = currentElement.data
        if (startPoint && width && height) {
          ctx.beginPath()
          ctx.rect(startPoint.x, startPoint.y, width, height)
          ctx.stroke()
        }
      } else if (currentElement.type === 'ellipse') {
        const { startPoint, radius } = currentElement.data
        if (startPoint && radius) {
          ctx.beginPath()
          ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI)
          ctx.stroke()
        }
      }
    }
    
    // Reset line dash
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }, [drawingElements, currentElement])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
        drawCanvas()
      }
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [drawCanvas])

  return (
    <div className="relative w-full h-[400px] border rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {activeTool && (
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs">
          Active: {activeTool}
        </div>
      )}
    </div>
  )
}

export function DrawingToolsComponent() {
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [drawingElements, setDrawingElements] = useState<DrawingElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [toolSettings, setToolSettings] = useState({
    color: '#3b82f6',
    lineWidth: 2,
    lineStyle: 'solid' as const,
    opacity: 1,
    fontSize: 14,
    fontFamily: 'Arial',
    fillColor: '#3b82f6'
  })

  // Drawing Tools
  const drawingTools: DrawingTool[] = [
    {
      id: 'trendline',
      name: 'Trend Line',
      icon: TrendingUp,
      description: 'Draw trend lines for support and resistance',
      category: 'trend',
      enabled: true,
      settings: { snapToPrice: true, extendLine: false }
    },
    {
      id: 'horizontal_line',
      name: 'Horizontal Line',
      icon: Ruler,
      description: 'Draw horizontal support/resistance lines',
      category: 'trend',
      enabled: true,
      settings: { snapToPrice: true }
    },
    {
      id: 'vertical_line',
      name: 'Vertical Line',
      icon: Ruler,
      description: 'Draw vertical time markers',
      category: 'measurement',
      enabled: true,
      settings: { snapToTime: true }
    },
    {
      id: 'rectangle',
      name: 'Rectangle',
      icon: Square,
      description: 'Draw rectangles for pattern analysis',
      category: 'pattern',
      enabled: true,
      settings: { fillOpacity: 0.1 }
    },
    {
      id: 'ellipse',
      name: 'Ellipse',
      icon: Circle,
      description: 'Draw ellipses for pattern identification',
      category: 'pattern',
      enabled: true,
      settings: { fillOpacity: 0.1 }
    },
    {
      id: 'text',
      name: 'Text Annotation',
      icon: Type,
      description: 'Add text annotations to charts',
      category: 'annotation',
      enabled: true,
      settings: { fontSize: 14, fontFamily: 'Arial' }
    }
  ]

  // Color presets
  const colorPresets = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1'
  ]

  // Line style options
  const lineStyles = [
    { value: 'solid', label: 'Solid' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' }
  ]

  const handleToolSelect = (toolId: string) => {
    setActiveTool(activeTool === toolId ? null : toolId)
    setSelectedElement(null)
  }

  const handleElementAdd = (element: DrawingElement) => {
    setDrawingElements(prev => [...prev, element])
  }

  const handleElementUpdate = (id: string, updatedElement: DrawingElement) => {
    setDrawingElements(prev => prev.map(el => el.id === id ? updatedElement : el))
  }

  const handleElementSelect = (id: string | null) => {
    setSelectedElement(id)
  }

  const removeDrawingElement = (elementId: string) => {
    setDrawingElements(prev => prev.filter(el => el.id !== elementId))
    if (selectedElement === elementId) {
      setSelectedElement(null)
    }
  }

  const toggleElementVisibility = (elementId: string) => {
    setDrawingElements(prev => prev.map(el =>
      el.id === elementId ? { ...el, style: { ...el.style, visible: !el.style.visible } } : el
    ))
  }

  const exportDrawings = () => {
    const data = {
      elements: drawingElements,
      settings: toolSettings,
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `drawings_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importDrawings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (data.elements) {
            setDrawingElements(data.elements)
          }
          if (data.settings) {
            setToolSettings(data.settings)
          }
        } catch (error) {
          console.error('Error importing drawings:', error)
        }
      }
      reader.readAsText(file)
    }
  }

  const clearAllDrawings = () => {
    setDrawingElements([])
    setSelectedElement(null)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'trend': return 'bg-blue-100 text-blue-800'
      case 'pattern': return 'bg-purple-100 text-purple-800'
      case 'measurement': return 'bg-green-100 text-green-800'
      case 'annotation': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Drawing Canvas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Grid className="h-5 w-5" />
                Drawing Canvas
              </CardTitle>
              <CardDescription>
                Interactive drawing area for technical analysis
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveTool(null)}
                className={!activeTool ? 'bg-primary text-primary-foreground' : ''}
              >
                <MousePointer className="h-4 w-4 mr-2" />
                Select
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllDrawings}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DrawingCanvas
            activeTool={activeTool}
            toolSettings={toolSettings}
            drawingElements={drawingElements}
            onElementAdd={handleElementAdd}
            onElementUpdate={handleElementUpdate}
            onElementSelect={handleElementSelect}
            selectedElement={selectedElement}
          />
        </CardContent>
      </Card>

      {/* Drawing Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5" />
            Drawing Tools
          </CardTitle>
          <CardDescription>
            Select a tool to start drawing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {drawingTools.map((tool) => {
              const Icon = tool.icon
              return (
                <Button
                  key={tool.id}
                  variant={activeTool === tool.id ? "default" : "outline"}
                  size="sm"
                  className="flex flex-col items-center gap-2 h-auto p-3"
                  onClick={() => handleToolSelect(tool.id)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{tool.name}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tool Settings */}
      {activeTool && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Tool Settings
            </CardTitle>
            <CardDescription>
              Customize your drawing tool appearance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Color Selection */}
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded border cursor-pointer"
                    style={{ backgroundColor: toolSettings.color }}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'color'
                      input.value = toolSettings.color
                      input.onchange = (e) => setToolSettings(prev => ({ 
                        ...prev, 
                        color: (e.target as HTMLInputElement).value 
                      }))
                      input.click()
                    }}
                  />
                  <div className="grid grid-cols-5 gap-1">
                    {colorPresets.map((color) => (
                      <div
                        key={color}
                        className="w-4 h-4 rounded cursor-pointer border"
                        style={{ backgroundColor: color }}
                        onClick={() => setToolSettings(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Line Width */}
              <div className="space-y-2">
                <Label>Line Width</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={toolSettings.lineWidth}
                  onChange={(e) => setToolSettings(prev => ({ 
                    ...prev, 
                    lineWidth: parseInt(e.target.value) 
                  }))}
                />
              </div>

              {/* Line Style */}
              <div className="space-y-2">
                <Label>Line Style</Label>
                <Select 
                  value={toolSettings.lineStyle} 
                  onValueChange={(value: any) => setToolSettings(prev => ({ 
                    ...prev, 
                    lineStyle: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {lineStyles.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Opacity */}
              <div className="space-y-2">
                <Label>Opacity</Label>
                <Input
                  type="number"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={toolSettings.opacity}
                  onChange={(e) => setToolSettings(prev => ({ 
                    ...prev, 
                    opacity: parseFloat(e.target.value) 
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drawing Elements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Drawing Elements ({drawingElements.length})
              </CardTitle>
              <CardDescription>
                Manage your drawing elements
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportDrawings}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => document.getElementById('import-drawings')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <input
                id="import-drawings"
                type="file"
                accept=".json"
                onChange={importDrawings}
                className="hidden"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {drawingElements.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {drawingElements.map((element) => (
                <div
                  key={element.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    selectedElement === element.id ? 'bg-primary/10 border-primary' : 'bg-muted/50'
                  }`}
                  onClick={() => setSelectedElement(element.id)}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: element.style.color }}
                    />
                    <div>
                      <div className="font-medium text-sm">{element.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {element.type} • {element.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleElementVisibility(element.id)
                      }}
                    >
                      {element.style.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeDrawingElement(element.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Ruler className="h-8 w-8 mx-auto mb-2" />
              <p>No drawing elements yet</p>
              <p className="text-xs">Select a tool and start drawing on the canvas</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common drawing actions and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" onClick={() => setActiveTool('trendline')}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Trend Line
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTool('rectangle')}>
              <Square className="h-4 w-4 mr-2" />
              Rectangle
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTool('ellipse')}>
              <Circle className="h-4 w-4 mr-2" />
              Ellipse
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTool('horizontal_line')}>
              <Ruler className="h-4 w-4 mr-2" />
              Horizontal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
