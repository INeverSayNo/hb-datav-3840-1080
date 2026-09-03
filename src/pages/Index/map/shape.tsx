import { useImperativeHandle, useLayoutEffect, useRef, type Ref } from "react";
import { Box2, BufferGeometry, Float32BufferAttribute, Mesh } from "three";
import type { ThreeElements } from "@react-three/fiber";

export type ShapeProps = Omit<React.JSX.IntrinsicElements["mesh"], "args"> & {
  ref?: Ref<Mesh>;
  args?: ThreeElements["extrudeGeometry"]["args"];
  /**
   * 预先建好的挤出几何体。传了就直接用，不再让 R3F 按 args 建一份 ——
   * 调用方往往还要基于同一份几何体派生 EdgesGeometry，否则会白白三角化两次。
   * 传入的几何体由调用方负责 dispose（R3F 只回收它自己按 args 创建的那份）。
   */
  geometry?: BufferGeometry;
  bbox: Box2;
};

export default function ShapeBox(props: ShapeProps) {
  const { ref, args, geometry, bbox, children, ...meshProps } = props;
  const meshRef = useRef<Mesh>(null!);

  useImperativeHandle(ref, () => meshRef.current);
  // 依赖 bbox/args/geometry：只有几何体或包围盒变化时才重算 UV。
  // 缺少依赖数组会导致每次 render 都全量遍历顶点并重建 attribute。
  useLayoutEffect(() => {
    const { geometry: meshGeometry } = meshRef.current;

    const pos = meshGeometry.attributes.position;
    const width = bbox.max.x - bbox.min.x;
    const height = bbox.max.y - bbox.min.y;

    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) - bbox.min.x) / width;
      uv[i * 2 + 1] = (pos.getY(i) - bbox.min.y) / height;
    }

    meshGeometry.deleteAttribute("uv");
    meshGeometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  }, [bbox, args, geometry]);

  return (
    <mesh ref={meshRef} {...meshProps} geometry={geometry}>
      {!geometry && <extrudeGeometry attach="geometry" args={args} />}
      {children}
    </mesh>
  );
}
