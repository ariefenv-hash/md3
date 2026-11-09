/* dice/core.js — 骰面数据契约表与顶面判定纯数学（#286 续 ref-only 第七批补 core 提取）
 * 范式：photos/core.js 同款经典 IIFE（零依赖、零 export），经 window.__diceCore 桥自注册；
 * 仅承载无 DOM/渲染/物理库副作用的数据表与纯函数；THREE.Quaternion/Vector3 与
 * {x,y,z,w}/{x,y,z} 普通对象同构（属性读形），桥面零耦合。D6 表保持原内联单行排版。 */
(function () {
  'use strict';
  // D6 点位表：与主 module 骰面画布同坐标系，v(1..6) → 圆心点位数组；非法 v 兜底空数组
  var D6_DOTS = {1:[[128,128]],2:[[76,76],[180,180]],3:[[76,76],[128,128],[180,180]],4:[[76,76],[180,76],[76,180],[180,180]],5:[[76,76],[180,76],[128,128],[76,180],[180,180]],6:[[76,68],[180,68],[76,128],[180,128],[76,188],[180,188]]};
  // BoxGeometry 材质序 → 面值契约：+x,-x,+y,-y,+z,-z 六面材质槽序号对应骰值
  var D6_FACE_ORDER = [1, 6, 2, 5, 3, 4];
  // D6 六向单位向量（与 D6_FACE_ORDER 同序）：判定顶面时与世界上方向 up=(0,1,0) 点积
  var D6_FACE_VECS = [{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }];
  // 四元数旋转向量（v' = q v q*）纯数学：t = 2·cross(q.xyz, v)；v' = v + w·t + cross(q.xyz, t)
  function rotateVecByQuat(vx, vy, vz, q) {
    var tx = 2 * (q.y * vz - q.z * vy), ty = 2 * (q.z * vx - q.x * vz), tz = 2 * (q.x * vy - q.y * vx);
    return { x: vx + q.w * tx + (q.y * tz - q.z * ty), y: vy + q.w * ty + (q.z * tx - q.x * tz), z: vz + q.w * tz + (q.x * ty - q.y * tx) };
  }
  // D6 顶面判定：与 up 点积即旋转后 y 分量；恒等四元数 → +y 面 = D6_FACE_ORDER[2] = 2
  function pickTopFaceD6(q) {
    var res = 1, maxDot = -1;
    for (var idx = 0; idx < D6_FACE_VECS.length; idx++) {
      var rv = rotateVecByQuat(D6_FACE_VECS[idx].x, D6_FACE_VECS[idx].y, D6_FACE_VECS[idx].z, q);
      if (rv.y > maxDot) { maxDot = rv.y; res = D6_FACE_ORDER[idx]; }
    }
    return res;
  }
  // 多面体（D8/D20）顶面判定：faceNormals 为 {val, normal:{x,y,z}} 数组（THREE 生成面法向同构）
  function pickTopFacePoly(q, faceNormals) {
    var res = 1, maxDot = -1;
    for (var i = 0; i < faceNormals.length; i++) {
      var rv = rotateVecByQuat(faceNormals[i].normal.x, faceNormals[i].normal.y, faceNormals[i].normal.z, q);
      if (rv.y > maxDot) { maxDot = rv.y; res = faceNormals[i].val; }
    }
    return res;
  }
  var root = typeof window !== 'undefined' ? window : globalThis;
  root.__diceCore = { D6_DOTS: D6_DOTS, D6_FACE_ORDER: D6_FACE_ORDER, D6_FACE_VECS: D6_FACE_VECS, rotateVecByQuat: rotateVecByQuat, pickTopFaceD6: pickTopFaceD6, pickTopFacePoly: pickTopFacePoly };
})();
