import {
  Scene,
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  WebGLRenderer,
  PCFSoftShadowMap,
  TextureLoader,
  CubeTextureLoader,
  RepeatWrapping,
  Vector2,
  Mesh,
  CylinderGeometry,
  MeshPhongMaterial,
  Color,
  BackSide,
  Vector3,
  Euler,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DragControls } from './DragControls';
import { loadFont, loadCard, createText } from './Text3D';
import {
  setMeshParams,
  selectAnimation,
  selectLocaltion,
  forMesh,
} from './tools';
import {
  setObjectHeight,
  getHeight,
  setVeneer,
  setCakeVeneer,
} from './collision';
import G, { panInfo, cursorInfo } from './globalValues';

function ThreeObject(params) {
  const { getMeshParams, type, width, height, cakeInfo } = params,
    isBack = type === 'back',
    isFront = type === 'front',
    isShowcase = type === 'showcase',
    far = 20000,
    lightFar = 200,
    store = [],
    dragObjects = [], //可拖曳物件
    heightObjects = [];

  let ready = false,
    skyTypeList = [],
    onClickModel = null,
    pan = null,
    cursor = null,
    card = null,
    font = null,
    logo = null,
    text = null,
    selected = null,
    orgMaterials = null,
    cakeSize = G.CakeDiam,
    cakeColor = -1,
    cardInfo = params.cardInfo
      ? params.cardInfo
      : { url: `${G.HostUrl}/Card.glb`, type: '字牌', name: '字牌' }, //--
    textFont = params.font ? params.font : `${G.HostUrl}/FZSTK.TTF`; //--

  //场景
  const scene = new Scene();

  //灯光
  scene.add(new AmbientLight(0x999999));
  var directionalLight = new DirectionalLight(0x666666, 1);
  directionalLight.position.set(far, far, far).normalize();
  scene.add(directionalLight);
  directionalLight = new DirectionalLight(0x101010, 1);
  directionalLight.position.set(far / 6, far, far / 3).normalize();
  directionalLight.shadow.camera.near = -lightFar; //产生阴影的最近距离
  directionalLight.shadow.camera.lightFar = lightFar; //产生阴影的最远距离
  directionalLight.shadow.camera.left = -lightFar; //产生阴影距离位置的最左边位置
  directionalLight.shadow.camera.right = lightFar; //最右边
  directionalLight.shadow.camera.top = lightFar; //最上边
  directionalLight.shadow.camera.bottom = -lightFar; //最下面
  directionalLight.shadow.mapSize.height = 256; //使用多少像素生成阴影 默认512
  directionalLight.shadow.mapSize.width = 256; //使用多少像素生成阴影 默认512
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  directionalLight = new DirectionalLight(0x333333, 1);
  directionalLight.position.set(-far, far, -far).normalize();
  scene.add(directionalLight);

  //相机
  const camera = new PerspectiveCamera(30, width / height, 1, far);
  if (isBack) {
    //设置相机位置
    camera.position.set(0, 0, 600);
  } else {
    camera.position.set(0, 800, 800);
  }
  camera.lookAt(scene.position); //设置相机方向(指向的场景对象)

  //渲染器
  const renderer = new WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
    alpha: true,
  });
  renderer.setSize(width, height); //设置渲染区域尺寸
  // renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(0xbcb0a6, 1); //设置背景颜色

  //场景控制器
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.5;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 8;
  controls.enablePan = false;
  controls.zoomSpeed = 0.5;
  controls.minDistance = 700; //设置相机距离原点的最远距离
  controls.maxDistance = 2000; //设置相机距离原点的最远距离
  if (isBack) {
    controls.minDistance = 50;
    controls.addEventListener('change', animate);
  } else if (isShowcase) {
    controls.addEventListener('change', animate);
    controls.autoRotateSpeed = 3;
  }

  //物件控制器
  const dragControls = new DragControls(
    dragObjects,
    camera,
    renderer.domElement,
  );
  dragControls.heightObjects = heightObjects;
  dragControls.transformGroup = true;
  dragControls.type = 'move';
  dragControls.enabled = !isShowcase;
  function dragHandle(event) {
    if (!dragControls.enabled) return;
    switch (event.type) {
      case 'hoveron': // 鼠标略过事件
        break;
      case 'dragstart': // 开始拖拽
        dragControls.setLockObject(null);
        const model = dragControls.getSelectedObjects();
        if (isFront) selected = model;
        if (model) {
          controls.saveState();
          controls.enabled = false;
          if (cursor) selectLocaltion(model, cursor);
        } else {
          if (cursor) cursor.visible = false;
        }
        if (onClickModel) onClickModel(model, 0);
        break;
      case 'drag':
        break;
      case 'dragend': // 拖拽结束
        controls.reset();
        controls.enabled = true;
        break;
      default:
        break;
    }
    if (!isFront) animate();
  }
  dragControls.addEventListener('dragstart', dragHandle);
  dragControls.addEventListener('drag', dragHandle);
  dragControls.addEventListener('dragend', dragHandle);

  // 场景渲染
  function animate() {
    if (isFront) {
      requestAnimationFrame(animate);
      controls.update();
    }
    renderer.render(scene, camera);
  }

  function loadPan(success, error) {
    loadModel(
      {
        url: `${G.HostUrl}/dizuo.glb`,
        name: 'pan',
      },
      (group) => {
        pan = group;
        pan.rotation.y = Math.PI / 4;
        scene.add(pan);
        heightObjects.push(pan);
        success();
      },
      () => {
        if (error) error('加载底座失败');
      },
      panInfo,
    );
  }
  function loadCursor(success, error) {
    loadModel(
      {
        url: `${G.HostUrl}/point.glb`,
        name: 'cursor',
      },
      (group) => {
        cursor = group;
        selectAnimation(cursor);
        scene.add(cursor);
        cursor.visible = false;
        cursor.getObjectByName('gPy').position.y = G.CakeDeep + G.CakeHeight;
        if (success) success();
      },
      () => {
        if (error) error('加载光标失败');
      },
      cursorInfo,
    );
  }
  function loadBasicCake(success, error) {
    if (cakeInfo) {
      loadModel(
        cakeInfo,
        () => {
          animate();
          if (success) success();
        },
        error,
      );
    } else {
      animate();
      if (success) success();
    }
  }
  //启动
  function start(success, error) {
    if (ready) {
      loadBasicCake(success, error);
      return;
    }
    loadPan(() => {
      ready = true;
      if (isBack) {
        loadBasicCake(success, error);
      } else if (isFront) {
        loadCursor(() => {
          loadBasicCake(success, error);
        }, error);
      } else {
        if (success) success();
      }
    }, error);
  }
  function getSkuTypeList(arr) {
    skyTypeList = arr;
  }
  //显示背景
  function showBackgroud(urls, success, error) {
    if (!urls) {
      success();
      return;
    }
    new CubeTextureLoader().load(
      urls,
      (map) => {
        scene.background = map;
        scene.data = urls;
        if (!isFront) animate();
        if (success) success(map);
      },
      undefined,
      () => {
        if (error) error('加载背景失败');
      },
    );
  }
  //显示logo
  function showLogo(data, success, error) {
    if (!data) {
      success();
      return;
    }
    let {
      url, // 图片url
      opacity, // 透明度
      radiusTop, // 圆柱顶部半径
      radiusBottom, // 圆柱底部半径
      height, // 圆柱高度
      y, // 圆柱Y轴位置
      emissive, // 自发光
      offset, // 贴图偏移
      repeat, // 贴图密度
    } = data;
    opacity = opacity ? opacity : 0.5;
    radiusTop = radiusTop ? radiusTop : 2000;
    radiusBottom = radiusBottom ? radiusBottom : 2000;
    height = height ? height : 500;
    y = y ? y : 0;
    emissive = emissive ? emissive : 0xffffff;
    offset = offset ? offset : new Vector2(0.5, 0);
    repeat = repeat ? repeat : new Vector2(-12, 1);
    new TextureLoader().load(
      url,
      (map) => {
        map.wrapS = map.wrapT = RepeatWrapping;
        map.offset = offset;
        map.repeat = repeat;
        logo = new Mesh(
          new CylinderGeometry(radiusTop, radiusBottom, height, 64, 1, true),
          new MeshPhongMaterial({
            map,
            emissive: new Color(emissive),
            transparent: true,
            opacity: opacity,
            side: BackSide,
          }),
        );
        logo.position.y = y;
        logo.data = data;
        scene.add(logo);
        if (!isFront) animate();
        if (success) success(logo);
      },
      undefined,
      error,
    );
  }
  //更改背景透明度
  function setLogoOpacity(num) {
    if (logo) logo.material.opacity = num;
  }

  //加载模型
  function loadModel(info, success, error, data) {
    if (!data) data = getMeshParams(info);
    const objectType = data.type;
    if (!data.isMult) {
      const arr = findObjects({ name: data.name });
      if (arr.length > 0) {
        success(arr[0]);
        return;
      }
    }
    new GLTFLoader().load(
      data.url,
      (gltf) => {
        let model = gltf.scene;
        setMeshParams(model, info, data)
          .then((group) => {
            let remove = [];
            if (pan) group.position.y = pan.position.y;
            if (objectType === '蛋糕') {
              remove = findObjects({ type: objectType });
            } else if (objectType === '围边') {
              remove = findObjects({ type: ['围边', '淋边', '贴面'] });
              setOtherSize(group, cakeSize / G.CakeDiam);
            } else if (objectType === '淋边') {
              remove = findObjects({ type: ['围边', '淋边'] });
              setOtherSize(group, cakeSize / G.CakeDiam);
            } else if (objectType === '贴面') {
              remove = findObjects({ type: ['围边'] });
              stickFromCameraToCake(group);
            } else if (ready) {
              setObjectHeight(group, heightObjects);
            }
            remove.forEach((g) => {
              deleteObject(g);
            });

            if (objectType === '蛋糕') {
              heightObjects.push(group);
              requestAnimationFrame(() => {
                setSceneHeight();
              });
            }
            if (group.data.canSelect || (isBack && objectType === '蛋糕')) {
              dragObjects.push(group);
              if (cursor)
                requestAnimationFrame(() => {
                  selectLocaltion(group, cursor);
                });
            }
            scene.add(group);
            if (ready) {
              store.push(group);
              if (isBack) {
                const ms = [];
                forMesh(model, (mesh) => {
                  const m = mesh.material.clone();
                  ms.push(m);
                  m.MeshName = mesh.name;
                });
                orgMaterials = ms;
                animate();
                if (!isFront) animate();
              }
            }
            selected = group;
            if (success) success(group);
          })
          .catch((err) => {
            if (error) error('加载材质失败');
          });
      },
      undefined,
      function (err) {
        if (error) error('模型加载失败');
      },
    );
  }

  // 初始化字牌
  function initText(success, error) {
    loadTextCard(
      cardInfo,
      () => {
        loadTextFont(
          textFont,
          () => {
            if (success) success({ card, font });
          },
          error,
        );
      },
      error,
    );
  }
  function loadTextCard(info, success, error) {
    cardInfo = info;
    const data = getMeshParams(cardInfo);
    loadCard(data.url, data.scale)
      .then((c) => {
        card = c;
        if (success) success(c);
      })
      .catch(() => {
        if (error) error('加载字牌失败');
      });
  }
  function loadTextFont(url, success, error) {
    textFont = url;
    loadFont(url)
      .then((f) => {
        font = f;
        textFont = url;
        if (success) success(f);
      })
      .catch(() => {
        if (error) error('加载字体失败');
      });
  }
  //展示字牌
  function showText(txt, success, error) {
    if ((font === null || card === null) && error) error('字体未始化');
    const data = getMeshParams(cardInfo);
    data.text = txt;
    data.textFont = textFont;

    if (text) {
      deleteObject(text);
    }
    if (txt === '') {
      if (success) success(null);
    } else {
      let position = new Vector3(),
        rotation = new Euler(-Math.PI / 9, 0, 0);
      if (text) {
        let gRy = text.getObjectByName('gRy'),
          gRxz = text.getObjectByName('gRxz');
        position = new Vector3(
          text.position.x,
          gRy.position.y,
          text.position.z,
        );
        rotation = new Euler(gRxz.rotation.x, gRy.rotation.y, gRxz.rotation.z);
      }
      try {
        text = createText(txt, font, card);
        text = Object.assign(text, { data, info: cardInfo });
        let gPy = text.getObjectByName('gPy'),
          gRy = text.getObjectByName('gRy'),
          gRxz = text.getObjectByName('gRxz');
        text.position.set(position.x, 0, position.z);
        gPy.position.y = getHeight(text.position, heightObjects);
        gRy.position.y = position.y;
        gRy.rotation.y = rotation.y;
        gRxz.rotation.set(rotation.x, 0, rotation.z);
        dragObjects.push(text);
        if (cursor) selectLocaltion(text, cursor);
        scene.add(text);
        store.push(text);
        dragObjects.push(text);
        if (!isFront) animate();
        if (success) success(text);
      } catch (err) {
        if (error) error('字牌创建失败');
      }
    }
  }
  //锁定选择模型
  function setLockObject(model) {
    dragControls.setLockObject(model);
    selected = model;
    if (model) {
      controls.saveState();
      controls.enabled = false;
      if (cursor) selectLocaltion(model, cursor);
    }
  }
  //重置模型
  function resetObject(group) {
    if (!group) return;
    group.getObjectByName('gRy').rotation.y = 0;
    group.getObjectByName('gRy').position.y = group.data.y;
    group.getObjectByName('gRxz').rotation.x = 0;
    group.getObjectByName('gRxz').rotation.z = 0;
    if (!isFront) animate();
  }
  //刷新场景模型的Y轴
  function setSceneHeight() {
    store.forEach((g) => {
      if (g.data.canMove) {
        setObjectHeight(g, heightObjects);
      }
    });
    if (!isFront) animate();
  }
  function findSkuObjects(from) {
    let data = this.getSceneObjectWithoutCake(),
      cake = this.findObjects({ type: '蛋糕' });
    return [data, cake];
  }
  //查找模型
  function findObjects(data, without, array) {
    if (!array) array = store;
    let arr = [];
    const kvs = Object.entries(data);
    function check(g, kv) {
      let pass = false;
      if (kv[1] instanceof Array) {
      } else {
        kv[1] = [kv[1]];
      }
      kv[1].forEach((val) => {
        if (without) {
          pass = pass || g.data[kv[0]] !== val;
        } else {
          pass = pass || g.data[kv[0]] === val;
        }
      });
      return pass;
    }
    array.forEach((g) => {
      let pass = false;
      kvs.forEach((kv) => {
        pass = pass || check(g, kv);
      });
      if (pass) arr.push(g);
    });
    return arr;
  }
  //查找除蛋糕外的模型
  function getSceneObjectWithoutCake() {
    return findObjects({ type: '蛋糕' }, true);
  }
  //删除
  function deleteObject(object, withoutRender) {
    if (!object) object = selected;
    if (object) {
      if (cursor) {
        cursor.visible = false;
        scene.add(cursor);
      }
      let index = store.indexOf(object);
      if (index !== -1) {
        scene.remove(object);
        store.splice(index, 1);
        index = dragObjects.indexOf(object);
        if (index !== -1) {
          dragObjects.splice(index, 1);
        }
        index = heightObjects.indexOf(object);
        if (index !== -1) {
          heightObjects.splice(index, 1);
        }
      }
    }
    if (!withoutRender && !isFront) animate();
  }
  //清空场景
  function clearScene(withCake) {
    let cake = null;
    while (store.length > 0) {
      let object = store[0];
      if (!withCake && object.data.type === '蛋糕') cake = object;
      deleteObject(object, isBack);
    }
    if (cake) {
      scene.add(cake);
      store.push(cake);
      heightObjects.push(cake);
      if (isBack) dragObjects.push(cake);
    }
    if (!isFront) animate();
  }
  //截图
  function getImage(withoutBackgroud) {
    if (withoutBackgroud) {
      renderer.setClearColor(0xbcb0a6, 0.0);
      const hide = findObjects({ type: store.length > 1 ? ['蛋糕'] : [] }),
        background = scene.background;
      scene.background = null;
      if (logo) logo.visible = false;
      pan.visible = false;
      hide.forEach((obj) => {
        obj.visible = false;
      });
      animate();
      let img = renderer.domElement.toDataURL('image/png');
      renderer.setClearColor(0xbcb0a6, 1);
      scene.background = background;
      if (logo) logo.visible = true;
      pan.visible = true;
      hide.forEach((obj) => {
        obj.visible = true;
      });
      animate();
      return img;
    } else return renderer.domElement.toDataURL('image/png');
  }
  //生成场景数据
  function getSceneData() {
    const backgroundInfo = scene.data,
      logoInfo = logo ? logo.data : undefined,
      objectsInfo = [];
    store.forEach((object) => {
      const gRy = object.getObjectByName('gRy'),
        gRxz = object.getObjectByName('gRxz'),
        group = gRxz.children[0],
        { info, data } = object;
      objectsInfo.push({
        info,
        data,
        position: {
          x: object.position.x,
          y: gRy.position.y,
          z: object.position.z,
        },
        rotation: { x: gRxz.rotation.x, y: gRy.rotation.y, z: gRxz.rotation.z },
        scale: group.scale.clone(),
      });
    });
    return {
      backgroundInfo,
      logoInfo,
      objectsInfo,
      size: cakeSize,
      color: cakeColor,
      cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
    };
  }
  //还原场景
  function setSceneData(json, success, error) {
    clearScene(true);
    pan.position.y = 0;
    const {
      backgroundInfo,
      logoInfo,
      objectsInfo,
      size,
      color,
      cameraPosition,
    } = json;
    function nextStep1() {
      showLogo(logoInfo, nextStep2, (err) => {
        nextStep2();
      });
    }
    function nextStep2() {
      const objects = [...objectsInfo];
      function setLocaltion(object, info) {
        const gRy = object.getObjectByName('gRy'),
          gRxz = object.getObjectByName('gRxz'),
          group = gRxz.children[0];
        object.position.set(info.position.x, 0, info.position.z);
        gRy.position.y = info.position.y;
        gRy.rotation.y = info.rotation.y;
        gRxz.rotation.set(info.rotation.x, 0, info.rotation.z);
        group.scale.copy(info.scale);
        load();
      }
      function load() {
        if (objects.length > 0) {
          let object = objects.shift();
          if (object.data.text && object.data.text !== '') {
            showText(
              object.data.text,
              object.info,
              (group) => {
                setLocaltion(group, object);
              },
              error,
            );
          } else {
            loadModel(
              object.info,
              (group) => {
                setLocaltion(group, object);
              },
              error,
              object.data,
            );
          }
        } else {
          camera.position.set(
            cameraPosition[0],
            cameraPosition[1],
            cameraPosition[2],
          );
          cakeSize = size;
          if (color !== -1) setCakeColor(color);
          setSceneHeight();
          controls.update();
          animate();
          if (success) success();
        }
      }
      load();
    }
    showBackgroud(backgroundInfo, nextStep1, (err) => {
      nextStep1();
    });
  }
  //取模型名与材质名
  function getMeshNames(group) {
    if (!group) group = selected;
    if (!group) return [];
    const arr = [];
    forMesh(group, (mesh) => {
      arr.push({
        mesh: mesh.name,
        material: mesh.material.name,
      });
    });
    return arr;
  }
  //更改模型参数
  function changMeshParams(info, success, error, object) {
    if (!object) object = selected;
    if (!info || !object) {
      success(null);
      return;
    }
    const group = object.getObjectByName('gRxz').children[0];
    const data = getMeshParams(info);
    forMesh(group, (mesh) => {
      orgMaterials.forEach((m) => {
        if (m.MeshName === mesh.name) {
          mesh.material = m.clone();
        }
      });
    });
    deleteObject(object);
    let changeType = object.data.type !== data.type;
    if (changeType) {
      if (data.type === '蛋糕') {
        const cake = findObjects({ type: '蛋糕' });
        if (cake.length > 0) deleteObject(cake[0]);
      }
      if (object.data.type === '蛋糕') {
        loadBasicCake(() => {
          formatObject();
        }, error);
      } else {
        formatObject();
      }
    } else {
      formatObject();
    }
    function formatObject() {
      setMeshParams(group, info, data)
        .then((group) => {
          group.position.copy(object.position);
          const objectType = group.data.type;
          if (
            objectType === '蛋糕' ||
            objectType === '围边' ||
            objectType === '淋边'
          ) {
          } else if (objectType === '贴面') {
            if (changeType) {
              stickFromCameraToCake(group);
            } else {
              group
                .getObjectByName('gPy')
                .position.copy(object.getObjectByName('gPy').position);
              group
                .getObjectByName('gRy')
                .rotation.copy(object.getObjectByName('gRy').rotation);
            }
          } else {
            setObjectHeight(group, heightObjects);
          }
          if (group.data.type === '蛋糕') {
            heightObjects.push(group);
          }
          dragObjects.push(group);
          scene.add(group);
          store.push(group);
          selected = group;
          animate();
          if (!isFront) animate();
          if (success) success(group);
        })
        .catch(() => {
          error('加载材质失败');
          animate();
        });
    }
  }
  //更改蛋糕尺寸
  function setCakeSize(size) {
    const cakes = findObjects({ type: '蛋糕' });
    let cake = null;
    for (let key in cakes) {
      cake = cakes[key];
      const group = cake.getObjectByName('gRxz').children[0];
      const sr = size / cakeSize;
      group.scale.set(sr * group.scale.x, group.scale.y, sr * group.scale.z);
      group.updateWorldMatrix(false, true);

      const objs = findObjects({ type: ['围边', '淋边'] });
      objs.forEach((obj) => {
        setOtherSize(obj, sr);
      });
      cakeSize = size;
      break;
    }
    const objs = findObjects({ type: '贴面' });
    objs.forEach((obj) => {
      setVeneer(obj, cake);
    });
    setSceneHeight();
  }
  //根据蛋糕尺寸等比绽放模型尺寸
  function setOtherSize(obj, sr) {
    const g = obj.getObjectByName('gRxz').children[0];
    g.scale.set(sr * g.scale.x, g.scale.y, sr * g.scale.z);
    g.updateWorldMatrix(false, true);
  }
  //更改蛋糕颜色
  function setCakeColor(color) {
    const arr = findObjects({ type: '蛋糕' });
    cakeColor = color;
    for (let key in arr) {
      forMesh(arr[key], (mesh) => {
        mesh.material.color = new Color(color);
        return false;
      });
    }
    if (!isFront) animate();
  }
  //把物件贴在蛋糕旁边
  function stickToCake(object, outside) {
    if (!object) object = selected;
    if (object) {
      setCakeVeneer(object, heightObjects, outside);
    }
    if (!isFront) animate();
  }
  //把物件以相机方向贴在蛋糕旁边
  function stickFromCameraToCake(object, outside) {
    setObjectHeight(object, [pan]);
    object.position.set(camera.position.x, pan.position.y, camera.position.z);
    object.updateWorldMatrix(false, true);
    stickToCake(object, outside);
  }

  Object.defineProperties(this, {
    domElement: {
      get: () => {
        return renderer.domElement;
      },
    },
    onClickModel: {
      get: () => {
        return onClickModel;
      },
      set: (v) => {
        onClickModel = v;
      },
    },
    ready: {
      get: () => {
        return ready;
      },
    },
    font: {
      get: () => {
        return font;
      },
    },
    card: {
      get: () => {
        return card;
      },
    },
    initText: { value: initText },
    loadTextCard: { value: loadTextCard },
    loadTextFont: { value: loadTextFont },
    showLogo: { value: showLogo },
    showBackgroud: { value: showBackgroud },
    getSkuTypeList: { value: getSkuTypeList },
    animate: { value: animate },
    start: { value: start },
    loadModel: { value: loadModel },
    showText: { value: showText },
    autoRotate: {
      get: () => {
        return controls.autoRotate;
      },
      set: (v) => {
        controls.autoRotate = v;
      },
    },
    getImage: { value: getImage },
    findObjects: { value: findObjects },
    clearScene: { value: clearScene },
    deleteObject: { value: deleteObject },
    getSceneObjectWithoutCake: { value: getSceneObjectWithoutCake },
    dragType: {
      get: () => {
        return dragControls.type;
      },
      set: (v) => {
        dragControls.type = v;
      },
    },
    cursor: {
      get: () => {
        return cursor;
      },
    },
    setLockObject: { value: setLockObject },
    setLogoOpacity: { value: setLogoOpacity },
    getSceneData: { value: getSceneData },
    setSceneData: { value: setSceneData },
    selected: {
      get: () => {
        return selected;
      },
      set: (v) => {
        if (cursor) cursor.visible = v.data.canSelect;
        selected = v;
      },
    },
    resetObject: { value: resetObject },
    findSkuObjects: { value: findSkuObjects },
    setSceneHeight: { value: setSceneHeight },
    changMeshParams: { value: changMeshParams },
    getMeshNames: { value: getMeshNames },
    store: {
      get: () => {
        return store;
      },
    },
    dragObjects: {
      get: () => {
        return dragObjects;
      },
    },
    heightObjects: {
      get: () => {
        return heightObjects;
      },
    },
    setCakeSize: { value: setCakeSize },
    setCakeColor: { value: setCakeColor },
    stickToCake: { value: stickToCake },
    stickFromCameraToCake: { value: stickFromCameraToCake },
  });
}

ThreeObject.prototype.constructor = ThreeObject;

export default ThreeObject;
