/**
 * FormFeatures — traços CORPORAIS das Formas da Jornada (src/game/journey/forms.ts).
 *
 * Diferente do WorldAdornments (elementos orbitais), estes traços fazem parte
 * do CORPO: marquinha na testa, orelhinhas, crista, proto-asas, emblema de
 * arquétipo, estrela na bochecha, pontas douradas, olhos-lúmen, coroa etérea.
 * Acumulam mundo a mundo — o mascote do Mundo 8 carrega a história inteira.
 *
 * Dois sub-componentes porque cabeça e corpo vivem em <G> com transforms
 * próprios no Mascot2D — cada um renderiza dentro do grupo certo.
 * Coordenadas no espaço da viewBox 200x220 (cabeça centrada em ~100,100;
 * corpo em ~100,155).
 */
import { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { ArchetypeId } from '@/game/evolution/archetypeAffinity';
import type { FormFeature } from '@/game/journey/forms';

interface HeadProps {
  features: readonly FormFeature[];
  /** Cor do corpo (traços orgânicos como orelhinhas). */
  brand: string;
  /** Cor de acento do DNA. */
  accent: string;
  gold: string;
  /**
   * 'back' = só traços que ficam ATRÁS da cabeça (orelhinhas — senão viram
   * adesivo sobre o contorno); 'front' = o resto, por cima dos acessórios.
   */
  layer: 'back' | 'front';
}

interface BodyProps {
  features: readonly FormFeature[];
  brand: string;
  accent: string;
  gold: string;
  /** Emblema do arquétipo dominante (null antes do Mundo 6 / sem DNA). */
  emblem: ArchetypeId | null;
}

function star4(x: number, y: number, s: number): string {
  const i = s * 0.3;
  return `M ${x} ${y - s} L ${x + i} ${y - i} L ${x + s} ${y} L ${x + i} ${y + i} L ${x} ${y + s} L ${x - i} ${y + i} L ${x - s} ${y} L ${x - i} ${y - i} Z`;
}

export function FormFeaturesHead({ features, brand, accent, gold, layer }: HeadProps) {
  const has = (f: FormFeature) => features.includes(f);

  if (layer === 'back') {
    if (!has('ear_nubs')) return null;
    return (
      <G pointerEvents="none">
        {/* M3 — orelhinhas no topo da cabeça (cor do corpo: parte orgânica).
            Camada traseira: o contorno da cabeça cobre a base delas. */}
        <Ellipse cx="70" cy="52" rx="7" ry="11" fill={brand} transform="rotate(-18 70 52)" />
        <Ellipse cx="130" cy="52" rx="7" ry="11" fill={brand} transform="rotate(18 130 52)" />
        <Ellipse cx="70" cy="52" rx="3" ry="5.5" fill={accent} opacity="0.5" transform="rotate(-18 70 52)" />
        <Ellipse cx="130" cy="52" rx="3" ry="5.5" fill={accent} opacity="0.5" transform="rotate(18 130 52)" />
      </G>
    );
  }

  return (
    <G pointerEvents="none">
      {/* M2 — marquinha na testa (losango, primeiro traço próprio). */}
      {has('brow_mark') && (
        <Path
          d="M 100 72 L 104 78 L 100 84 L 96 78 Z"
          fill={accent}
          opacity="0.75"
        />
      )}

      {/* M4 — crista de chama na ponta da antena (duas camadas). */}
      {has('antenna_crest') && (
        <>
          <Path d="M 100 30 Q 94 22 100 12 Q 106 22 100 30 Z" fill={accent} opacity="0.85" />
          <Path d="M 100 28 Q 97 23 100 17 Q 103 23 100 28 Z" fill={gold} opacity="0.9" />
        </>
      )}

      {/* M7 — estrela de viajante na bochecha direita. */}
      {has('cheek_star') && <Path d={star4(130, 108, 5)} fill={gold} opacity="0.9" />}

      {/* M8 — pontas douradas: anel na bolinha da antena + parafusos de ouro. */}
      {has('golden_tips') && (
        <>
          <Circle cx="100" cy="32" r="7.5" fill="none" stroke={gold} strokeWidth="2" opacity="0.9" />
          <Circle cx="50" cy="96" r="3.6" fill={gold} opacity="0.9" />
          <Circle cx="150" cy="96" r="3.6" fill={gold} opacity="0.9" />
        </>
      )}

      {/* M9 — olhos-lúmen: anéis de luz ao redor dos olhos. */}
      {has('lumen_eyes') && (
        <>
          <Circle cx="84" cy="98" r="9" fill="none" stroke={accent} strokeWidth="1.6" opacity="0.6" />
          <Circle cx="116" cy="98" r="9" fill="none" stroke={accent} strokeWidth="1.6" opacity="0.6" />
          <Circle cx="84" cy="98" r="12" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.3" />
          <Circle cx="116" cy="98" r="12" fill="none" stroke={accent} strokeWidth="0.8" opacity="0.3" />
        </>
      )}

      {/* M10 — coroa etérea: três losangos flutuando acima da cabeça
          (mais alto que qualquer acessório de chapéu — flutua, não veste). */}
      {has('ethereal_crown') && (
        <G opacity="0.92">
          <Path d="M 84 20 L 87 25 L 84 30 L 81 25 Z" fill={gold} />
          <Path d="M 100 12 L 104 19 L 100 26 L 96 19 Z" fill={gold} />
          <Path d="M 116 20 L 119 25 L 116 30 L 113 25 Z" fill={gold} />
          <Circle cx="100" cy="19" r="1.4" fill="#FFFFFF" opacity="0.8" />
        </G>
      )}
    </G>
  );
}

/** Emblema de peito — 8 variantes por arquétipo dominante (centro ~100,156). */
function ChestEmblem({ emblem, accent, gold }: { emblem: ArchetypeId; accent: string; gold: string }) {
  switch (emblem) {
    case 'lumina': // sol — círculo com raios
      return (
        <G>
          <Circle cx="100" cy="156" r="4" fill={gold} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
            const r = (a * Math.PI) / 180;
            return (
              <Circle key={a} cx={100 + Math.cos(r) * 7} cy={156 + Math.sin(r) * 7} r="1" fill={gold} opacity="0.8" />
            );
          })}
        </G>
      );
    case 'terra': // montanha
      return <Path d="M 93 160 L 100 150 L 107 160 Z" fill={accent} />;
    case 'aqua': // gota
      return <Path d="M 100 149 Q 105 155 105 158 A 5 5 0 1 1 95 158 Q 95 155 100 149 Z" fill={accent} />;
    case 'vento': // espiral de vento
      return (
        <Path
          d="M 93 156 Q 100 148 107 156 M 95 160 Q 100 155 105 160"
          fill="none"
          stroke={accent}
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
    case 'cosmos': // lua crescente + estrela
      return (
        <G>
          <Path d="M 102 149 A 7 7 0 1 0 102 163 A 5.5 5.5 0 1 1 102 149 Z" fill={accent} />
          <Circle cx="105" cy="153" r="1.3" fill={gold} />
        </G>
      );
    case 'flora': // folha
      return (
        <G>
          <Path d="M 100 149 Q 108 152 105 161 Q 97 162 96 154 Q 97 150 100 149 Z" fill={accent} />
          <Path d="M 98 158 L 103 152" stroke={gold} strokeWidth="1" strokeLinecap="round" />
        </G>
      );
    case 'cristal': // diamante facetado
      return (
        <G>
          <Path d="M 100 149 L 106 155 L 100 163 L 94 155 Z" fill={accent} />
          <Path d="M 100 149 L 100 163 M 94 155 L 106 155" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
        </G>
      );
    case 'brasa': // chama
      return (
        <G>
          <Path d="M 100 148 Q 106 154 104 160 A 5 5 0 1 1 96 160 Q 94 154 100 148 Z" fill={accent} />
          <Path d="M 100 153 Q 102 156 101 159 A 2.4 2.4 0 1 1 98 159 Q 98 156 100 153 Z" fill={gold} />
        </G>
      );
    default:
      return null;
  }
}

export function FormFeaturesBody({ features, brand, accent, gold, emblem }: BodyProps) {
  const has = (f: FormFeature) => features.includes(f);
  return (
    <G pointerEvents="none">
      {/* M5 — proto-asas: brotos arredondados nas laterais do corpo.
          Menores e mais altos que as asas do stage 6 (que são pétalas grandes) —
          quando as asas plenas chegam, os brotos viram a "base" delas. */}
      {has('proto_wings') && (
        <>
          <Path d="M 62 138 Q 50 132 48 144 Q 52 152 62 148 Z" fill={brand} opacity="0.95" />
          <Path d="M 138 138 Q 150 132 152 144 Q 148 152 138 148 Z" fill={brand} opacity="0.95" />
          <Path d="M 58 141 Q 54 139 53 144" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.6" />
          <Path d="M 142 141 Q 146 139 147 144" fill="none" stroke={accent} strokeWidth="1.2" opacity="0.6" />
        </>
      )}

      {/* M6 — emblema do arquétipo no centro do peito (substitui o ponto). */}
      {has('chest_emblem') && emblem && <ChestEmblem emblem={emblem} accent={accent} gold={gold} />}

      {/* M8 — pontas douradas no corpo: linha de brilho na base. */}
      {has('golden_tips') && (
        <Path d="M 70 182 Q 100 188 130 182" fill="none" stroke={gold} strokeWidth="1.6" opacity="0.7" strokeLinecap="round" />
      )}
    </G>
  );
}
