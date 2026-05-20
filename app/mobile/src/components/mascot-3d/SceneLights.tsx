/**
 * SceneLights — iluminação 4-point estilo Pixar (chave + rim + fill + uplight).
 * Sem props — valores fixos derivam o "look" coerente com paleta DNA-driven.
 */

import React from 'react';

export function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.55} color={0x4060a0} />
      <directionalLight position={[3, 4, 4]} intensity={0.9} color={0xffffff} />
      <directionalLight position={[-4, 2, -3]} intensity={0.55} color={0xff9bd0} />
      <pointLight position={[0, -2, 3]} intensity={0.45} color={0x7ab8ff} distance={12} />
    </>
  );
}
