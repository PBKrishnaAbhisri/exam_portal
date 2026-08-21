# YOLO Model Directory

Place your `yolov8m.onnx` file in **this exact folder**:

```
frontend/public/models/yolov8m.onnx
```

## Why here?
The `public/` folder is served statically by Vite.  
The model will be accessible at: `http://localhost:5173/models/yolov8m.onnx`

## Requirements
- File name must be exactly: `yolov8m.onnx`
- Model must be a standard YOLOv8m ONNX export (COCO-80 classes)
- Output tensor shape: `[1, 84, 8400]` (cx, cy, w, h + 80 class scores)

## Detection targets
The proctoring system detects:
- **Cell phones** (COCO class 67)
- **Laptops** (COCO class 63)

## Performance notes
- GPU (WebGL) is used automatically when available
- A warmup inference runs at startup so first detection is fast
- Detection runs every 800ms during an active exam
