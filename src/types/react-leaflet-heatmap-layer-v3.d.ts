declare module "react-leaflet-heatmap-layer-v3" {
  import { Component } from "react";
  import { LayerProps } from "react-leaflet";

  interface HeatmapLayerProps extends LayerProps {
    points: any[];
    longitudeExtractor: (point: any) => number;
    latitudeExtractor: (point: any) => number;
    intensityExtractor: (point: any) => number;
    radius?: number;
    blur?: number;
    max?: number;
  }

  export default class HeatmapLayer extends Component<HeatmapLayerProps> { }
}
