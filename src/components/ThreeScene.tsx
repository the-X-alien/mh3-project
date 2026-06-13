import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

function AmbientSphere({ cli }: { cli: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = useMemo(() => {
    if (cli > 75) return new THREE.Color('#e6a817')
    if (cli > 40) return new THREE.Color('#e6a817')
    return new THREE.Color('#2ecc71')
  }, [cli])

  const emissiveIntensity = useMemo(() => {
    return 0.2 + (cli / 100) * 1.3
  }, [cli])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const speed = 0.15 + (cli / 100) * 0.6
    meshRef.current.rotation.x += delta * speed * 0.3
    meshRef.current.rotation.y += delta * speed
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      const targetIntensity = 0.2 + (cli / 100) * 1.3
      meshRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
        meshRef.current.material.emissiveIntensity,
        targetIntensity,
        0.05
      )
    }
  })

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[2, 1]} />
      <MeshDistortMaterial
        color="#343755"
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        roughness={0.3}
        metalness={0.1}
        distort={0.15}
        speed={1.5}
      />
    </mesh>
  )
}

export default function ThreeScene({ cli }: { cli: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-40">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={0.5} />
        <AmbientSphere cli={cli} />
      </Canvas>
    </div>
  )
}
