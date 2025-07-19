import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pen, Eraser, Square, Trash2, Palette } from "lucide-react";

interface CollaborativeWhiteboardProps {
  ws: WebSocket | null;
}

interface DrawingData {
  type: "draw" | "erase" | "clear";
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  size?: number;
}

export function CollaborativeWhiteboard({ ws }: CollaborativeWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser" | "shape">("pen");
  const [color, setColor] = useState("#3b82f6");
  const [brushSize, setBrushSize] = useState(2);

  // Estado para armazenar as coordenadas anteriores
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Set canvas styles
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data); // Debug log

        if (data.type === "whiteboard_draw") {
          drawFromData(data.data);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws]);

  const drawFromData = (data: DrawingData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    console.log("Drawing from data:", data); // Debug log

    if (data.type === "clear") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Configurar contexto para desenho
    ctx.globalCompositeOperation =
      data.type === "erase" ? "destination-out" : "source-over";
    ctx.strokeStyle = data.color || "#3b82f6";
    ctx.lineWidth = data.size || 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Desenhar apenas se tiver coordenadas anteriores
    if (data.prevX !== undefined && data.prevY !== undefined) {
      ctx.beginPath();
      ctx.moveTo(data.prevX, data.prevY);
      ctx.lineTo(data.x, data.y);
      ctx.stroke();
    } else {
      // Se não tiver coordenadas anteriores, desenhar um ponto
      ctx.beginPath();
      ctx.arc(data.x, data.y, (data.size || 2) / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const getCanvasPosition = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const pos = getCanvasPosition(e);
    setLastPos(pos); // Armazenar posição inicial

    if (tool === "pen" || tool === "eraser") {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.globalCompositeOperation =
        tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Desenhar ponto inicial
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, 2 * Math.PI);
      ctx.fill();

      // Enviar dados iniciais para outros clientes
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "whiteboard_draw",
            data: {
              type: tool === "eraser" ? "erase" : "draw",
              x: pos.x,
              y: pos.y,
              color: color,
              size: brushSize,
            },
          }),
        );
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !lastPos) return;

    const pos = getCanvasPosition(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (tool === "pen" || tool === "eraser") {
      // Desenhar localmente
      ctx.globalCompositeOperation =
        tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      // Enviar dados para outros clientes com coordenadas anteriores
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "whiteboard_draw",
            data: {
              type: tool === "eraser" ? "erase" : "draw",
              x: pos.x,
              y: pos.y,
              prevX: lastPos.x,
              prevY: lastPos.y,
              color: color,
              size: brushSize,
            },
          }),
        );
      }

      // Atualizar posição anterior
      setLastPos(pos);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setLastPos(null); // Limpar posição anterior
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Send clear command to other clients
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "whiteboard_draw",
          data: { type: "clear", x: 0, y: 0 },
        }),
      );
    }
  };

  const colors = [
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
    "#10b981", // Green
    "#ef4444", // Red
    "#f59e0b", // Orange
    "#ffffff", // White
    "#000000", // Black
  ];

  return (
    <div className="relative w-[900px] h-[600px] border border-gray-700 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair bg-gray-900"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Drawing Tools */}
      <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            variant={tool === "pen" ? "default" : "ghost"}
            onClick={() => setTool("pen")}
            className={`w-8 h-8 p-0 ${
              tool === "pen"
                ? "bg-blue-600 hover:bg-blue-700"
                : "hover:bg-gray-700"
            }`}
          >
            <Pen className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant={tool === "eraser" ? "default" : "ghost"}
            onClick={() => setTool("eraser")}
            className={`w-8 h-8 p-0 ${
              tool === "eraser"
                ? "bg-blue-600 hover:bg-blue-700"
                : "hover:bg-gray-700"
            }`}
          >
            <Eraser className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant={tool === "shape" ? "default" : "ghost"}
            onClick={() => setTool("shape")}
            className={`w-8 h-8 p-0 ${
              tool === "shape"
                ? "bg-blue-600 hover:bg-blue-700"
                : "hover:bg-gray-700"
            }`}
          >
            <Square className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-1">
            {colors.map((clr) => (
              <button
                key={clr}
                onClick={() => setColor(clr)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  color === clr ? "border-white scale-110" : "border-gray-600"
                }`}
                style={{ backgroundColor: clr }}
              />
            ))}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={clearCanvas}
            className="w-8 h-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Real-time User Indicators */}
      <div className="absolute top-4 right-4 space-y-2">
        <div className="flex items-center space-x-2 bg-gray-800 bg-opacity-80 backdrop-blur-sm rounded-lg p-2 border border-gray-700">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-white">Online</span>
        </div>
      </div>
    </div>
  );
}
