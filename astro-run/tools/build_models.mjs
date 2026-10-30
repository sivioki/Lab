// Baut die 3D-Modelle für Astro Run aus dem Quaternius "Ultimate Space Kit" (CC0).
// Aufruf (im Ordner mit installiertem @gltf-transform/core, @gltf-transform/functions und meshoptimizer):
//   node build_models.mjs <pfad/zum/ultimate-space-kit> <ausgabeordner>
// Ergebnis: char_*.glb (je ein Astronaut), alien.glb (Verfolger) und props.glb (Landschaft, eine Szene je Objekt).
import { NodeIO, Document, VertexLayout } from '@gltf-transform/core';
import { prune, dedup, resample, mergeDocuments, unpartition, weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import path from 'node:path';

const [src, out] = process.argv.slice(2);
// getrennte Vertex-Puffer: das Spiel fügt Landschaftsteile selbst zusammen
const io = new NodeIO().setVertexLayout(VertexLayout.SEPARATE);

const CHAR_ANIMS = ['Run', 'Jump', 'Jump_Idle', 'Jump_Land', 'Duck', 'Death', 'HitReact', 'Idle', 'Wave'];
const ALIEN_ANIMS = ['Run', 'Punch', 'Idle'];
const CHARS = { rae: 'Astronaut_RaeTheRedPanda', finn: 'Astronaut_FinnTheFrog', barbara: 'Astronaut_BarbaraTheBee', fernando: 'Astronaut_FernandoTheFlamingo' };
const PROPS = [
  'Environment/Base_Large', 'Environment/GeodesicDome', 'Environment/SolarPanel_Ground', 'Environment/Roof_Radar',
  'Environment/House_Cylinder', 'Environment/Building_L', 'Environment/Roof_Antenna',
  'Environment/Rock_1', 'Environment/Rock_2', 'Environment/Rock_3', 'Environment/Rock_4',
  'Environment/Rock_Large_1', 'Environment/Rock_Large_2', 'Environment/Rock_Large_3',
  'Environment/Tree_Lava_1', 'Environment/Tree_Lava_2', 'Environment/Tree_Lava_3',
  'Environment/Tree_Light_1', 'Environment/Tree_Light_2', 'Environment/Tree_Spiral_1', 'Environment/Tree_Spiral_2', 'Environment/Tree_Spiral_3',
  'Environment/Tree_Swirl_1', 'Environment/Tree_Swirl_2', 'Environment/Tree_Blob_3',
  'Environment/Tree_Floating_1', 'Environment/Tree_Floating_2', 'Environment/Tree_Floating_3', 'Environment/Tree_Spikes_1', 'Environment/Tree_Spikes_2',
  'Environment/Bush_1', 'Environment/Bush_2', 'Environment/Bush_3', 'Environment/Plant_1', 'Environment/Plant_2', 'Environment/Plant_3',
  'Environment/Grass_1', 'Environment/Grass_3',
  'Vehicles/Rover_1', 'Vehicles/Rover_Round', 'Vehicles/Spaceship_RaeTheRedPanda',
  'Items/Pickup_Thunder',
];
const file = rel => path.join(src, rel.split('/')[0], 'GLTF', rel.split('/')[1] + '.gltf');

async function character(name, keep, outName, dropNodes = []) {
  const doc = await io.read(file('Characters/' + name));
  const root = doc.getRoot();
  for (const a of root.listAnimations()) if (!keep.includes(a.getName())) a.dispose();
  for (const n of root.listNodes()) if (dropNodes.includes(n.getName())) n.dispose();
  await doc.transform(resample(), prune(), dedup());
  await io.write(path.join(out, outName), doc);
}

for (const [id, name] of Object.entries(CHARS)) await character(name, CHAR_ANIMS, `char_${id}.glb`, ['Pistol']);
await character('Enemy_Large', ALIEN_ANIMS, 'alien.glb');

// Landschaft: alle Objekte in ein Dokument, eine benannte Szene je Objekt, gemeinsame Textur
const props = new Document();
for (const rel of PROPS) {
  const d = await io.read(file(rel));
  for (const s of d.getRoot().listScenes()) s.setName(rel.split('/')[1]);
  mergeDocuments(props, d);
}
// Deko wird meist aus der Ferne gesehen: Netze vereinfachen, das spart rund die Hälfte
await MeshoptSimplifier.ready;
await props.transform(unpartition(), dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.004 }), prune({ keepLeaves: true }));
await io.write(path.join(out, 'props.glb'), props);
console.log('fertig');
