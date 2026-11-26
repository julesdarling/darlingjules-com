type JulesCylinderControlGroup = {
  heightPx?: number;
  scale?: number;
  x?: number;
  y?: number;
  z?: number;
  pitch?: number;
  yaw?: number;
  speed?: number;
  backfaceVisible?: boolean;
};

type JulesLogoCylinderControlGroup = JulesCylinderControlGroup & {
  bandHeightPx?: number;
  heightCompression?: number;
};

type JulesCameraControlGroup = {
  fov?: number;
  z?: number;
  x?: number;
  y?: number;
  pitch?: number;
  yaw?: number;
  roll?: number;
};

type JulesCanvasControlGroup = {
  topOffsetPx?: number;
  heightOffsetPx?: number;
  widthOffsetPx?: number;
  x?: number;
  opacity?: number;
};

type JulesFogControlGroup = {
  enabled?: boolean;
  near?: number;
  far?: number;
};

type JulesCylinderControlState = {
  canvas?: JulesCanvasControlGroup;
  title?: JulesCylinderControlGroup;
  logos?: JulesLogoCylinderControlGroup;
  camera?: JulesCameraControlGroup;
  fog?: JulesFogControlGroup;
};

interface Window {
  __julesCylinderControls?: JulesCylinderControlState;
}
