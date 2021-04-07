import { Font, Group, CubeTexture } from "three";
import {
  MeshParamsJson
} from './tools';

type ThreeObjectParams = {
  getMeshParams: (model: any) => MeshParamsJson;
  type: 'front' | 'showcase' | 'back';
  width: number;
  height: number;
}
type Error = (err: string) => void;
type LoadSuccess = (object: Group) => void;
type FontSuccess = (object: Font) => void;
type BackupSuccess = (object: CubeTexture) => void;
type InitTextSuccess = (object: { card: Group, font: Font }) => void;
type LogoInfo = {
  url: string; // 图片url
  opacity?: number; // 透明度
  radiusTop?: number; // 圆柱顶部半径
  radiusBottom?: number; // 圆柱底部半径
  height?: number; // 圆柱高度
  y?: number; // 圆柱Y轴位置
  emissive?: number; // 自发光
  offset?: number; // 贴图偏移
  repeat?: number; // 贴图密度
}
type SceneData = {
  "backgroundInfo"?: string[] | null;
  "logoInfo"?: LogoInfo | null;
  "objectsInfo": any;
}
type MeshNames = {
  mesh: string;
  material: string;
}

export default class ThreeObject {
  constructor(params: ThreeObjectParams);

  domElement: HTMLCanvasElement;
  onClickModel: (object?: Group | null, from?: number) => void;
  ready: boolean;
  font: Font;
  card: Group;
  initText: (success?: InitTextSuccess, error?: Error) => void;
  loadTextCard: (url: string, scale: number, success?: LoadSuccess, error?: Error) => void;
  loadTextFont: (url: string, success?: FontSuccess, error?: Error) => void;
  showLogo: (data: LogoInfo, success?: LoadSuccess, error?: Error) => void;
  showBackgroud: (urls: string[], success?: BackupSuccess, error?: Error) => void;
  animate: () => void;
  start: (success?: () => void, error?: Error) => void;
  loadModel: (info: any, success?: LoadSuccess, error?: Error, data?: MeshParamsJson) => void;
  showText: (str: string, imageUrl: string, success?: LoadSuccess, error?: Error) => void;

  autoRotate: boolean;
  getImage: (withoutBackgroud?: boolean) => string;
  findObjects: (info: any, without?: boolean) => Group[];
  clearScene: (withCake?: boolean) => void;
  deleteObject: (group?: Group | null, withoutRender?: boolean) => void;
  getSceneObjectWithoutCake: () => Group[];
  dragType: 'move' | 'rotate' | 'swing';
  cursor: Group;
  setLockObject: (group: Group | null) => void;
  setLogoOpacity: (num: number) => void;
  getSceneData: () => Array<any>;
  setSceneData: (json: any, success?: () => void, error?: Error) => void;
  selected: Group | null;
  resetObject: (group: Group | null) => void;
  setSceneHeight: () => void;
  changMeshParams: (info: any, success?: LoadSuccess, error?: Error, object?: Group) => void;
  getMeshNames: (group: Group) => MeshNames[];  
  store: Group[];
  dragObjects: Group[];
  heightObjects: Group[];
  setCakeSize: (size: number) => void;
  setCakeColor: (color: number) => void;
  stickToCake: (object?: Group | null) => void;
}