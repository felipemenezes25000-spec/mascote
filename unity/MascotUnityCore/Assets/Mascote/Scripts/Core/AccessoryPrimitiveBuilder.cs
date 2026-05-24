using UnityEngine;

namespace Mascote.Unity.Core
{
    /// <summary>
    /// Gera VISUAL primitivo pros acessórios quando GLB não tem mesh real.
    /// Cada slot vira uma combinação de primitives reconhecível: chapéu = cilindro+disco,
    /// óculos = 2 toros achatados, asa = quad inclinado, aura = sphere semi-transparente.
    ///
    /// Cores definidas por assetKey — coerente com a paleta dos preview .png.
    /// </summary>
    public static class AccessoryPrimitiveBuilder
    {
        // Paleta de acessórios — combina com as previews em app/mobile/assets/mascot-3d/accessories/.
        static readonly System.Collections.Generic.Dictionary<string, Color> Palette = new()
        {
            { "cap_classic",     new Color(0.85f, 0.20f, 0.25f) }, // vermelho
            { "beanie",          new Color(0.30f, 0.60f, 0.85f) }, // azul gorro
            { "bow_tie",         new Color(0.95f, 0.45f, 0.65f) }, // rosa laço
            { "cape_velvet",     new Color(0.55f, 0.10f, 0.55f) }, // roxo manto
            { "crown_flowers",   new Color(0.95f, 0.85f, 0.55f) }, // creme floral
            { "crown_royal",     new Color(0.95f, 0.80f, 0.20f) }, // dourado
            { "flame_mane",      new Color(0.95f, 0.40f, 0.10f) }, // laranja fogo
            { "flower_daisy",    new Color(0.95f, 0.85f, 0.20f) }, // amarelo centro
            { "glasses_round",   new Color(0.10f, 0.10f, 0.15f) }, // preto óculos
            { "heart_glow",      new Color(0.95f, 0.30f, 0.45f) }, // rosa glow
            { "monocle_gold",    new Color(0.85f, 0.70f, 0.20f) }, // ouro
            { "scarf_cozy",      new Color(0.70f, 0.30f, 0.30f) }, // bordô
            { "sunglasses",      new Color(0.05f, 0.05f, 0.05f) }, // preto
            { "sword_floating",  new Color(0.75f, 0.80f, 0.90f) }, // prata
            { "wings_angel",     new Color(0.95f, 0.95f, 0.95f) }, // branco asa
            { "wings_butterfly", new Color(0.85f, 0.55f, 0.95f) }, // lilás
            { "wings_dragon",    new Color(0.45f, 0.30f, 0.10f) }, // marrom
            { "aura_cosmic",     new Color(0.45f, 0.80f, 0.95f) }, // ciano glow
        };

        /// <summary>
        /// Adiciona visual primitivo ao GameObject anchor baseado em slot+assetKey.
        /// </summary>
        public static void Build(GameObject anchor, string assetKey, string slot)
        {
            var color = Palette.TryGetValue(assetKey, out var c) ? c : new Color(0.7f, 0.7f, 0.7f);
            var mat = CreateMaterial(color, IsGlow(assetKey));

            switch (slot)
            {
                case "hat":
                    BuildHat(anchor, mat, assetKey);
                    break;
                case "glasses":
                    BuildGlasses(anchor, mat, assetKey);
                    break;
                case "neck":
                    BuildNeck(anchor, mat, assetKey);
                    break;
                case "back":
                    BuildBack(anchor, mat, assetKey);
                    break;
                case "aura":
                    BuildAura(anchor, mat, assetKey);
                    break;
                case "body":
                    BuildBody(anchor, mat, assetKey);
                    break;
                default:
                    BuildBlob(anchor, mat);
                    break;
            }
        }

        static bool IsGlow(string assetKey) =>
            assetKey == "aura_cosmic" || assetKey == "heart_glow" || assetKey == "flame_mane";

        static Material CreateMaterial(Color color, bool glow)
        {
            var shader =
                Shader.Find("Universal Render Pipeline/Lit") ??
                Shader.Find("Universal Render Pipeline/Simple Lit") ??
                Shader.Find("Standard");
            var mat = new Material(shader);
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
            if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);
            if (glow && mat.HasProperty("_EmissionColor"))
            {
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", color * 2.5f);
            }
            return mat;
        }

        static GameObject Prim(Transform parent, PrimitiveType type, string name, Vector3 pos, Vector3 scale, Material mat, Quaternion? rot = null)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.transform.localRotation = rot ?? Quaternion.identity;
            go.transform.localScale = scale;
            go.GetComponent<Renderer>().sharedMaterial = mat;
            var col = go.GetComponent<Collider>();
            if (col != null) Object.DestroyImmediate(col);
            return go;
        }

        // ===== SHAPES =====

        static void BuildHat(GameObject anchor, Material mat, string key)
        {
            switch (key)
            {
                case "cap_classic":
                    // Boné: cilindro chato + visor
                    Prim(anchor.transform, PrimitiveType.Cylinder, "Cap",  new Vector3(0, 0.08f, 0), new Vector3(0.5f, 0.08f, 0.5f), mat);
                    Prim(anchor.transform, PrimitiveType.Cube,     "Visor", new Vector3(0, 0.08f, 0.35f), new Vector3(0.55f, 0.03f, 0.25f), mat);
                    break;
                case "beanie":
                    // Gorro: hemisphere achatada
                    Prim(anchor.transform, PrimitiveType.Sphere, "Beanie", new Vector3(0, 0.05f, 0), new Vector3(0.55f, 0.45f, 0.55f), mat);
                    break;
                case "crown_flowers":
                case "crown_royal":
                    // Coroa: cilindro vazado (anel) + spikes ou flowers em cima
                    Prim(anchor.transform, PrimitiveType.Cylinder, "Band", new Vector3(0, 0.08f, 0), new Vector3(0.5f, 0.06f, 0.5f), mat);
                    for (int i = 0; i < 5; i++)
                    {
                        float ang = i * Mathf.PI * 2f / 5f;
                        var spike = Prim(anchor.transform,
                            key == "crown_flowers" ? PrimitiveType.Sphere : PrimitiveType.Cube,
                            $"Tip_{i}",
                            new Vector3(Mathf.Sin(ang) * 0.4f, 0.20f, Mathf.Cos(ang) * 0.4f),
                            Vector3.one * 0.14f, mat);
                    }
                    break;
                case "bow_tie":
                    // Laço: 2 cubos finos diagonal + node
                    Prim(anchor.transform, PrimitiveType.Cube, "BowL", new Vector3(-0.13f, 0.02f, 0), new Vector3(0.20f, 0.18f, 0.04f), mat,
                        Quaternion.Euler(0, 0, -25f));
                    Prim(anchor.transform, PrimitiveType.Cube, "BowR", new Vector3(0.13f, 0.02f, 0),  new Vector3(0.20f, 0.18f, 0.04f), mat,
                        Quaternion.Euler(0, 0, 25f));
                    Prim(anchor.transform, PrimitiveType.Cube, "Knot", Vector3.zero, new Vector3(0.06f, 0.10f, 0.06f), mat);
                    break;
                case "flower_daisy":
                    // Flor: centro amarelo + 6 pétalas brancas
                    var pet = CreateMaterial(Color.white, false);
                    Prim(anchor.transform, PrimitiveType.Sphere, "Center", Vector3.zero, Vector3.one * 0.18f, mat);
                    for (int i = 0; i < 6; i++)
                    {
                        float ang = i * Mathf.PI * 2f / 6f;
                        Prim(anchor.transform, PrimitiveType.Sphere, $"Petal_{i}",
                            new Vector3(Mathf.Sin(ang) * 0.18f, 0, Mathf.Cos(ang) * 0.18f),
                            new Vector3(0.16f, 0.06f, 0.16f), pet);
                    }
                    break;
                case "flame_mane":
                    // Chama: 3 spikes verticais emissive
                    Prim(anchor.transform, PrimitiveType.Capsule, "Flame_C", new Vector3(0, 0.18f, 0), new Vector3(0.18f, 0.30f, 0.18f), mat);
                    Prim(anchor.transform, PrimitiveType.Capsule, "Flame_L", new Vector3(-0.18f, 0.12f, 0), new Vector3(0.14f, 0.22f, 0.14f), mat);
                    Prim(anchor.transform, PrimitiveType.Capsule, "Flame_R", new Vector3(0.18f, 0.12f, 0), new Vector3(0.14f, 0.22f, 0.14f), mat);
                    break;
                default:
                    Prim(anchor.transform, PrimitiveType.Sphere, "HatBlob", new Vector3(0, 0.1f, 0), Vector3.one * 0.35f, mat);
                    break;
            }
        }

        static void BuildGlasses(GameObject anchor, Material mat, string key)
        {
            switch (key)
            {
                case "glasses_round":
                case "sunglasses":
                    // 2 toros (sphere achatada) + ponte
                    Prim(anchor.transform, PrimitiveType.Sphere, "Lens_L", new Vector3(-0.18f, 0, 0), new Vector3(0.18f, 0.18f, 0.04f), mat);
                    Prim(anchor.transform, PrimitiveType.Sphere, "Lens_R", new Vector3(0.18f, 0, 0),  new Vector3(0.18f, 0.18f, 0.04f), mat);
                    Prim(anchor.transform, PrimitiveType.Cube,   "Bridge", new Vector3(0, 0, 0),       new Vector3(0.20f, 0.04f, 0.03f), mat);
                    break;
                case "monocle_gold":
                    // Monóculo: 1 lente direita + cabinho
                    Prim(anchor.transform, PrimitiveType.Sphere, "Lens", new Vector3(0.18f, 0, 0), new Vector3(0.20f, 0.20f, 0.04f), mat);
                    Prim(anchor.transform, PrimitiveType.Cube,   "Chain", new Vector3(0.30f, -0.10f, 0), new Vector3(0.02f, 0.20f, 0.02f), mat);
                    break;
                default:
                    Prim(anchor.transform, PrimitiveType.Cube, "GlassBlob", Vector3.zero, new Vector3(0.5f, 0.1f, 0.05f), mat);
                    break;
            }
        }

        static void BuildNeck(GameObject anchor, Material mat, string key)
        {
            // Cachecol: torus achatado (cylinder esmagado em Y)
            Prim(anchor.transform, PrimitiveType.Cylinder, "Scarf", new Vector3(0, 0, 0), new Vector3(0.65f, 0.08f, 0.65f), mat);
            // Pontinha
            Prim(anchor.transform, PrimitiveType.Cube, "Tail", new Vector3(0.15f, -0.15f, 0.25f), new Vector3(0.18f, 0.30f, 0.06f), mat,
                Quaternion.Euler(0, 0, -20f));
        }

        static void BuildBack(GameObject anchor, Material mat, string key)
        {
            switch (key)
            {
                case "cape_velvet":
                    // Capa: cubo grande inclinado
                    Prim(anchor.transform, PrimitiveType.Cube, "Cape", new Vector3(0, -0.2f, -0.1f), new Vector3(0.9f, 1.1f, 0.05f), mat,
                        Quaternion.Euler(15f, 0, 0));
                    break;
                case "wings_angel":
                case "wings_butterfly":
                case "wings_dragon":
                    // Asas: 2 quads inclinados
                    Prim(anchor.transform, PrimitiveType.Cube, "Wing_L",
                        new Vector3(-0.45f, 0.20f, 0), new Vector3(0.6f, 0.5f, 0.04f), mat,
                        Quaternion.Euler(0, -15f, 35f));
                    Prim(anchor.transform, PrimitiveType.Cube, "Wing_R",
                        new Vector3(0.45f, 0.20f, 0), new Vector3(0.6f, 0.5f, 0.04f), mat,
                        Quaternion.Euler(0, 15f, -35f));
                    break;
                case "sword_floating":
                    // Espada: cubo fino + guard
                    Prim(anchor.transform, PrimitiveType.Cube, "Blade", new Vector3(0, 0.5f, 0), new Vector3(0.08f, 0.85f, 0.02f), mat);
                    Prim(anchor.transform, PrimitiveType.Cube, "Guard", new Vector3(0, 0.05f, 0), new Vector3(0.25f, 0.05f, 0.06f), mat);
                    Prim(anchor.transform, PrimitiveType.Cube, "Hilt",  new Vector3(0, -0.10f, 0), new Vector3(0.06f, 0.18f, 0.06f), mat);
                    break;
                default:
                    Prim(anchor.transform, PrimitiveType.Cube, "BackBlob", new Vector3(0, 0.3f, 0), new Vector3(0.6f, 0.4f, 0.06f), mat);
                    break;
            }
        }

        static void BuildAura(GameObject anchor, Material mat, string key)
        {
            // Anel transparente brilhante ao redor do corpo
            var ring = Prim(anchor.transform, PrimitiveType.Cylinder, "AuraRing",
                new Vector3(0, 0, 0), new Vector3(1.2f, 0.05f, 1.2f), mat);
            // Glow sphere semi-transparente em cima
            Prim(anchor.transform, PrimitiveType.Sphere, "AuraGlow",
                new Vector3(0, 0.5f, 0), Vector3.one * 0.4f, mat);
        }

        static void BuildBody(GameObject anchor, Material mat, string key)
        {
            // heart_glow: coração ish (2 spheres + cone)
            if (key == "heart_glow")
            {
                Prim(anchor.transform, PrimitiveType.Sphere, "HeartL", new Vector3(-0.08f, 0.05f, 0.3f), Vector3.one * 0.15f, mat);
                Prim(anchor.transform, PrimitiveType.Sphere, "HeartR", new Vector3(0.08f, 0.05f, 0.3f),  Vector3.one * 0.15f, mat);
                Prim(anchor.transform, PrimitiveType.Sphere, "HeartTip", new Vector3(0, -0.10f, 0.3f),    new Vector3(0.18f, 0.20f, 0.18f), mat);
            }
            else
            {
                BuildBlob(anchor, mat);
            }
        }

        static void BuildBlob(GameObject anchor, Material mat)
        {
            Prim(anchor.transform, PrimitiveType.Sphere, "Blob", Vector3.zero, Vector3.one * 0.3f, mat);
        }
    }
}
