import { selectLocaltion } from './tools';
import G from './globalValues';
import { getMeshInfo, getVeneerPoint, setObjectHeight, getCollisionGroup, checkCollisionArea, getCollisionPosition } from './collision';
import { Matrix4, Matrix3, Plane, Raycaster, Vector2, Vector3, Scene, EventDispatcher } from 'three';

function DragControls(_objects, _camera, _domElement) {
  var _plane = new Plane();
  var _raycaster = new Raycaster();

  var _mouse = new Vector2();
  var _offset = new Vector3();
  var _intersection = new Vector3();
  var _worldPosition = new Vector3();
  var _inverseMatrix = new Matrix4();
  var _intersections = [];

  var _selected = null,
    _hovered = null;

  var scope = this;

  //
  var _radianY = 0;
  var _om = new Vector2(0, 0);
  var touches = undefined;
  function setSelectedMatrix() {
    _selected.position.y = 0;
    _selected.updateWorldMatrix(false, true);
    _inverseMatrix.copy(_selected.parent.matrixWorld).invert();
    _offset
      .copy(_intersection)
      .sub(_worldPosition.setFromMatrixPosition(_selected.matrixWorld));
    const pan = scope.heightObjects.find((item) => {
      return item.data.type === '底盘';
    });
    if (pan) _selected.position.y = pan.position.y;
  }
  function setRadianY() {
    let x = _camera.position.x;
    let y = _camera.position.z;
    _radianY = Math.atan(y / x);
    if (x < 0 && y > 0) _radianY = _radianY - Math.PI;
    if (x < 0 && y < 0) _radianY = _radianY + Math.PI;
    _om.copy(_mouse);
  }
  this.type = 'move';
  this.limit = {
    maxC: undefined,
    maxS: {
      maxX: 118,
      maxZ: 118,
      rotate: Math.PI / 4,
      radius: 28,
    }
  };
  this.moveLimit = [];
  this.heightObjects = [];
  this.veneerObjects = [];
  function veneer(vector, object) {
    //贴面
    if (!object.data.canVeneer || scope.veneerObjects.length < 1) return;
    const cake = scope.veneerObjects[0];
    const
      gRy = object.getObjectByName('gRy'),
      gPy = object.getObjectByName('gPy');
    // 处理X轴
    const x = vector.x - _om.x;
    const { center, size } = getMeshInfo(object);
    const r = getVeneerPoint(center, 0, scope.veneerObjects).length();
    const a = (x / r) * 200;
    let v = new Vector3(object.position.x, 0, object.position.z);
    v.applyAxisAngle(new Vector3(0, 1, 0), a);
    object.position.copy(v);
    // 处理Y轴
    if (object.data.deep !== 0) {
      const y = vector.y - _om.y;
      const keep = 3 / 4;
      let yy = gRy.position.y + y * 100;
      if (yy + size.y * keep + gPy.position.y > G.CakeHeight + G.CakeDeep)
        yy = G.CakeHeight + G.CakeDeep - size.y * keep - gPy.position.y;
      if (yy < 0) yy = 0;
      gRy.position.y = yy;
    }
    // 处理方向
    v = new Vector3(
      object.position.x - cake.position.x,
      0,
      object.position.z - cake.position.z,
    );
    v.setLength(1000);
    v.y = gRy.position.y + gPy.position.y;
    gRy.lookAt(v);
    return;
  }
  function move(vector, object) {
    //移动
    if (_selected.data.type === '蛋糕') {
      const y = (_mouse.y - _om.y) * _camera.position.length() / 4.2;
      _selected.parent.children.forEach((object) => {
        if (object.isGroup) {
          object.position.y += y;
        }
      });
      return;
    }
    if (!object.data.canMove) return;
    const { maxC, maxS } = scope.limit;
    let x = vector.x;
    let y = vector.y;
    let z = vector.z;
    x -= Math.cos(_radianY) * y;
    z -= Math.sin(_radianY) * y;
    vector.set(x, 0, z);
    if (maxC) {
      let lsq = vector.length();
      if (lsq > maxC) {
        vector.setLength(maxC);
      }
    } else if (maxS) {
      const { maxX, maxZ, rotate, radius } = maxS;
      let m4 = new Matrix4();
      m4.makeRotationY(rotate);
      vector.applyMatrix4(m4);
      // 去除超出方形
      let v = new Vector3().copy(vector);
      if (Math.abs(vector.x) > maxX || Math.abs(vector.z) > maxZ) {
        let A = Math.atan(Math.abs(v.z) / Math.abs(v.x));
        let length =
          A < Math.PI / 4 ? maxX / Math.cos(A) : maxX / Math.sin(A);
        v.setLength(length);
      }
      // 去除超出倒角
      if (Math.abs(v.x) > maxX - radius && Math.abs(v.z) > maxZ - radius) {
        let p = new Vector3(maxX - radius, 0, maxZ - radius);
        if (v.x < 0) p.x *= -1;
        if (v.z < 0) p.z *= -1;
        if (p.clone().sub(v).length() > radius) {
          let A = v.angleTo(p);
          let D = radius / Math.sin(A);
          let sinB = p.length() / D;
          let B = Math.asin(sinB);
          let C = Math.PI - A - B;
          let length = D * Math.sin(C);
          v.setLength(length);
        }
      }
      vector.copy(v);
      m4 = new Matrix4();
      m4.makeRotationY(-rotate);
      vector.applyMatrix4(m4);
    }
    object.position.copy(getCollisionPosition(object, vector, scope.moveLimit));
    setObjectHeight(object, scope.heightObjects);
  }
  function moveY(vector, object) {
    //上下
    const
      deep = object.data.deep,
      gPy = object.getObjectByName('gPy'),
      cursor = gPy.children.length > 1 ? gPy.children[1] : null,
      gRy = object.getObjectByName('gRy');
    if (object.data.deep === 0) return;
    const group = getCollisionGroup(object.position, scope.heightObjects);
    if (group && group.data) {
      if (group.data.type === '底盘') {
        if (cursor) cursor.position.y -= gRy.position.y;
        gRy.position.y = 0;
      } else {
        let y = (vector.y - _om.y) * 160;
        if (gRy.position.y + y > 0) y = 0 - gRy.position.y;
        if (gRy.position.y + y < deep) y = deep - gRy.position.y;
        if (gPy.position.y + gRy.position.y + y < G.CakeDeep) y = G.CakeDeep - gPy.position.y - gRy.position.y;
        if (cursor) cursor.position.y += y;
        gRy.position.y += y;
      }
    }
  }
  function rotate(vector, object) {
    //旋转
    if (!object.data.canRotate) return;
    const gRy = object.getObjectByName('gRy');
    let y = (vector.x - _om.x) * 6;
    gRy.rotation.y += y;
    if (checkCollisionArea(object, object.position, scope.moveLimit).length > 0) {
      gRy.rotation.y -= y;
    }
    moveY(vector, object);
  }
  function swing(vector, object) {
    //摆动
    if (!object.data.canSwing) return;
    const
      gPy = object.getObjectByName('gPy'),
      cursor = gPy.children.length > 1 ? gPy.children[1] : null,
      gRxz = object.getObjectByName('gRxz'),
      orgXZ = gRxz.orgXZ;
    if (orgXZ) {
      gRxz.rotation.x -= orgXZ.x;
      gRxz.rotation.z -= orgXZ.z;
    }
    const rxz = _om.sub(vector).multiplyScalar(4);
    rxz.applyMatrix3(new Matrix3().rotate(_radianY));
    if (Math.abs(gRxz.rotation.x + rxz.x) < Math.PI / 4)
      gRxz.rotation.x += rxz.x;
    if (Math.abs(gRxz.rotation.z - rxz.y) < Math.PI / 4)
      gRxz.rotation.z -= rxz.y;
    if (orgXZ) {
      gRxz.rotation.x += orgXZ.x;
      gRxz.rotation.z += orgXZ.z;
    }
    if (cursor) selectLocaltion(object, cursor);
  }
  function gesture(touches, object) {
    const move1 = touches['move'][0].point,
      move2 = touches['move'][1].point,
      org1 = touches['org'][0].point,
      org2 = touches['org'][1].point,
      now1 = touches['now'][0].point,
      now2 = touches['now'][1].point;
    const gRy = object.getObjectByName('gRy');
    const p1 = now1.clone().sub(move1),
      p2 = now2.clone().sub(move2);
    _om = org1;
    if (Math.abs(p1.y) > 0 && Math.abs(p2.y) > 0) {
      rotate(now1, object);
    } else {
      gRy.rotation.y += (now2.angle() - org2.angle()) * 3;
      swing(now1, object);
    }
    touches['move'] = touches['org'];
    touches['org'] = touches['now'];
    delete touches['now'];
  }
  var orgTime = 0; //减少运算量
  function setObject() {
    if (Date.now() - orgTime < 16) return;
    orgTime = Date.now();
    if (touches) {
      gesture(touches, _selected);
    } else {
      switch (scope.type) {
        case 'move':
          // 移动状态下，如果模型是贴面类型
          if (_selected.data.type === '贴面') {
            veneer(_mouse, _selected);
          } else {
            // 非贴面类型
            move(
              _intersection.sub(_offset).applyMatrix4(_inverseMatrix),
              _selected,
            );
          }

          break;
        case 'moveY':
          moveY(_mouse, _selected);
          break;
        case 'rotate':
          rotate(_mouse, _selected);
          break;
        case 'swing':
          swing(_mouse, _selected);
          break;
        default:
          break;
      }
      _om.copy(_mouse);
    }
    const pan = scope.heightObjects.find((item) => {
      return item.data.type === '底盘';
    });
    if (pan) _selected.position.y = pan.position.y;
  }
  function find() {
    var obj = null;
    if (_lock) obj = _lock;
    else if (scope.transformGroup === true) {
      obj = _intersections[0].object;
      if (!obj || !obj.parent) return null;
      while (!(obj.parent instanceof Scene)) {
        if (!obj.parent) return null;
        else obj = obj.parent;
      }
    } else {
      obj = _intersections[0].object;
    }
    return obj;
  }
  this.getSelectedObjects = function () {
    return _selected;
  };
  var touchId = -1;
  function getPoint(event) {
    var rect = _domElement.getBoundingClientRect();
    let mouse = new Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    return mouse;
  }
  function getTouchEvent(event) {
    function findEvent(id) {
      id = id ? id : touchId;
      for (let i = 0; i < event.touches.length; i++) {
        if (event.touches[i].identifier === id) {
          return event.touches[i];
        }
      }
      return null;
    }
    function setGesture(value, ids) {
      touches[value] = [];
      let ee = findEvent(ids[0]);
      touches[value].push({
        id: ee.identifier,
        point: getPoint(ee),
      });
      ee = findEvent(ids[1]);
      touches[value].push({
        id: ee.identifier,
        point: getPoint(ee),
      });
    }
    let e = event;
    switch (event.type) {
      case 'touchstart':
        e = event.changedTouches[0];
        if (touchId === -1) {
          touchId = e.identifier;
        } else {
          if (event.touches.length === 2) {
            touches = {};
            setGesture('org', [touchId, e.identifier]);
            touches['move'] = touches['org'];
          }
          return;
        }
        break;
      case 'touchmove':
        e = findEvent();
        if (touches && touches['org'] && event.touches.length > 1) {
          setGesture('now', [touches['org'][0].id, touches['org'][1].id]);
        }
        break;
      case 'touchend':
        e = event.changedTouches[0];
        if (e.identifier === touchId) {
          touches = undefined;
          touchId = -1;
        } else if (touches && e.identifier === touches['org'][1].id) {
          touches = undefined;
          if (_selected) {
            setSelectedMatrix();
          }
        }
        break;
      default:
        break;
    }
    return e;
  }
  var _lock = null;
  this.setLockObject = function (lockObject) {
    _lock = lockObject;
  };
  this.getLockObject = function () {
    return _lock;
  };

  function activate() {
    _domElement.addEventListener('pointermove', onPointerMove, false);
    _domElement.addEventListener('pointerdown', onPointerDown, false);
    _domElement.addEventListener('pointerup', onPointerCancel, false);
    _domElement.addEventListener('pointerleave', onPointerCancel, false);
    _domElement.addEventListener('touchmove', onTouchMove, false);
    _domElement.addEventListener('touchstart', onTouchStart, false);
    _domElement.addEventListener('touchend', onTouchEnd, false);
  }

  function deactivate() {
    _domElement.removeEventListener('pointermove', onPointerMove, false);
    _domElement.removeEventListener('pointerdown', onPointerDown, false);
    _domElement.removeEventListener('pointerup', onPointerCancel, false);
    _domElement.removeEventListener('pointerleave', onPointerCancel, false);
    _domElement.removeEventListener('touchmove', onTouchMove, false);
    _domElement.removeEventListener('touchstart', onTouchStart, false);
    _domElement.removeEventListener('touchend', onTouchEnd, false);

    _domElement.style.cursor = '';
  }

  function dispose() {
    deactivate();
  }

  function getObjects() {
    return _objects;
  }

  function onPointerMove(event) {
    event.preventDefault();

    switch (event.pointerType) {
      case 'mouse':
      case 'pen':
        onMouseMove(event);
        break;
      default:
        break;

      // TODO touch
    }
  }

  function onMouseMove(event) {
    _mouse = getPoint(event);

    _raycaster.setFromCamera(_mouse, _camera);

    if (_selected && scope.enabled) {
      if (_raycaster.ray.intersectPlane(_plane, _intersection)) {
        setObject();
      }

      scope.dispatchEvent({ type: 'drag', object: _selected });

      return;
    }

    _intersections.length = 0;

    _raycaster.setFromCamera(_mouse, _camera);
    _raycaster.intersectObjects(_objects, true, _intersections);

    if (_intersections.length > 0 || _lock) {
      var object = find();
      if (object === null) return;

      _plane.setFromNormalAndCoplanarPoint(
        _camera.getWorldDirection(_plane.normal),
        _worldPosition.setFromMatrixPosition(object.matrixWorld),
      );

      if (_hovered !== object) {
        scope.dispatchEvent({ type: 'hoveron', object: object });

        _domElement.style.cursor = 'pointer';
        _hovered = object;
      }
    } else {
      if (_hovered !== null) {
        scope.dispatchEvent({ type: 'hoveroff', object: _hovered });

        _domElement.style.cursor = 'auto';
        _hovered = null;
      }
    }
  }

  function onPointerDown(event) {
    event.preventDefault();

    switch (event.pointerType) {
      case 'mouse':
      case 'pen':
        onMouseDown(event);
        break;
      default:
        break;

      // TODO touch
    }
  }

  function onMouseDown(event) {
    event.preventDefault();

    _intersections.length = 0;

    _raycaster.setFromCamera(_mouse, _camera);
    _raycaster.intersectObjects(_objects, true, _intersections);

    if (_intersections.length > 0 || _lock) {
      var object = find();
      if (object === null) return;
      else _selected = object;

      if (_raycaster.ray.intersectPlane(_plane, _intersection)) {
        setSelectedMatrix();
        setRadianY();
      }

      _domElement.style.cursor = 'move';

      scope.dispatchEvent({ type: 'dragstart', object: _selected });
    } else {
      scope.dispatchEvent({ type: 'dragstart', object: null });
    }
  }

  function onPointerCancel(event) {
    event.preventDefault();

    switch (event.pointerType) {
      case 'mouse':
      case 'pen':
        onMouseCancel(event);
        break;
      default:
        break;

      // TODO touch
    }
  }

  function onMouseCancel(event) {
    event.preventDefault();

    if (_selected) {
      scope.dispatchEvent({ type: 'dragend', object: _selected });

      _selected = null;
    }

    _domElement.style.cursor = _hovered ? 'pointer' : 'auto';
  }

  function onTouchMove(event) {
    event.preventDefault();
    event = getTouchEvent(event);
    if (!event) return;
    _mouse = getPoint(event);
    _raycaster.setFromCamera(_mouse, _camera);

    if (_selected && scope.enabled) {
      if (_raycaster.ray.intersectPlane(_plane, _intersection)) {
        setObject();
      }

      scope.dispatchEvent({ type: 'drag', object: _selected });

      return;
    }
  }

  function onTouchStart(event) {
    event.preventDefault();
    event = getTouchEvent(event);
    if (!event) return;
    _mouse = getPoint(event);

    _intersections.length = 0;

    _raycaster.setFromCamera(_mouse, _camera);
    _raycaster.intersectObjects(_objects, true, _intersections);

    if (_intersections.length > 0 || _lock) {
      var object = find();
      if (object === null) return;
      else _selected = object;

      _plane.setFromNormalAndCoplanarPoint(
        _camera.getWorldDirection(_plane.normal),
        _worldPosition.setFromMatrixPosition(_selected.matrixWorld),
      );

      if (_raycaster.ray.intersectPlane(_plane, _intersection)) {
        setSelectedMatrix();
        setRadianY();
      }

      _domElement.style.cursor = 'move';

      scope.dispatchEvent({ type: 'dragstart', object: _selected });
    } else {
      scope.dispatchEvent({ type: 'dragstart', object: null });
    }
  }

  function onTouchEnd(event) {
    event.preventDefault();
    event = getTouchEvent(event);
    if (touchId > -1) return;

    if (_selected) {
      scope.dispatchEvent({ type: 'dragend', object: _selected });

      _selected = null;
    }

    _domElement.style.cursor = 'auto';
  }

  activate();

  // API

  this.enabled = true;
  this.transformGroup = true;

  this.activate = activate;
  this.deactivate = deactivate;
  this.dispose = dispose;
  this.getObjects = getObjects;
};

DragControls.prototype = Object.create(EventDispatcher.prototype);
DragControls.prototype.constructor = DragControls;

export { DragControls };
