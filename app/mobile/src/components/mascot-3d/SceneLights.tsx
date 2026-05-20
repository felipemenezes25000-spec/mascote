/**
 * SceneLights — iluminação 4-point estilo Pixar (chave + rim + fill + uplight).
 * Sem props — valores fixos derivam o "look" coerente com paleta DNA-driven.
 */

import React from 'react';

export function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.62} color={0xfff6ef} />
      <directionalLight position={[3, 4, 4]} intensity={0.85} color={0xfffaf5} />
      <directionalLight position={[-4, 2, -3]} intensity={0.4} color={0xffd4c8} />
      <pointLight position={[0, -2, 3]} intensity={0.32} color={0xffe8dc} distance={12} />
    </>
  );
}
