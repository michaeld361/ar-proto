/* =============================================
   McLaren Artura Spider — Hotspot Data
   All 8 interactive hotspots with content
   ============================================= */

export interface HotspotSpec {
  label: string;
  value: string;
}

export interface HotspotData {
  id: string;
  slot: string;
  title: string;
  description: string;
  specs: HotspotSpec[];
  animationNote: string;
}

export const hotspots: HotspotData[] = [
  {
    id: 'hs-doors',
    slot: 'hotspot-doors',
    title: 'Dihedral Doors',
    description:
      'Signature McLaren dihedral door mechanism, engineered for dramatic ingress without compromise. The carbon fibre monocoque hinge system delivers a 20% weight saving over conventional door assemblies while enabling the iconic upward-forward sweep that defines every McLaren.',
    specs: [
      { label: 'Mechanism', value: 'Dihedral' },
      { label: 'Material', value: 'Carbon Fibre' },
      { label: 'Weight Saving', value: '20% vs Conv.' },
      { label: 'Monocoque', value: 'Integrated' },
    ],
    animationNote: 'Door open/close animation on tap',
  },
  {
    id: 'hs-spoiler',
    slot: 'hotspot-spoiler',
    title: 'Active Rear Spoiler',
    description:
      'Electronically deployed rear wing capable of generating up to 100kg of downforce at speed. Three distinct aero modes — Comfort, Sport, and Track — progressively increase the angle of attack, balancing high-speed stability with low-drag efficiency.',
    specs: [
      { label: 'Max Downforce', value: '100kg' },
      { label: 'Aero Modes', value: '3 Positions' },
      { label: 'Deployment', value: 'Electronic' },
      { label: 'Material', value: 'Carbon Fibre' },
    ],
    animationNote: 'Spoiler raises/lowers through positions',
  },
  {
    id: 'hs-wheels',
    slot: 'hotspot-wheels',
    title: 'Forged Alloy Wheels',
    description:
      '10-spoke ultra-lightweight forged alloy design, purpose-engineered to reduce unsprung mass and improve turn-in response. Wrapped in Pirelli P Zero Corsa tyres with an optional carbon-ceramic brake package visible behind the spokes — delivering 1.2g of stopping force.',
    specs: [
      { label: 'Design', value: '10-Spoke Forged' },
      { label: 'Tyres', value: 'P Zero Corsa' },
      { label: 'Brakes', value: 'Carbon Ceramic' },
      { label: 'Max Decel.', value: '1.2g' },
    ],
    animationNote: 'Wheel rotates slowly, brake calliper highlight',
  },
  {
    id: 'hs-mirrors',
    slot: 'hotspot-mirrors',
    title: 'Wing Mirrors',
    description:
      'Aerodynamically sculpted housings designed in CFD to minimise turbulent wake at the A-pillar junction. Integrated LED indicators, heated elements, electrically adjustable with auto-dimming — every surface serves both form and function.',
    specs: [
      { label: 'Shape', value: 'Aero-Sculpted' },
      { label: 'Indicators', value: 'LED Integrated' },
      { label: 'Features', value: 'Heated, Auto-dim' },
      { label: 'Adjustment', value: 'Electric' },
    ],
    animationNote: 'Subtle mirror fold animation',
  },
  {
    id: 'hs-splitter',
    slot: 'hotspot-splitter',
    title: 'Front Splitter',
    description:
      'Active front aero element working in concert with the rear spoiler for balanced downforce across the axles. Carbon fibre construction with a precisely calibrated angle of attack channels airflow underneath the car, feeding the rear diffuser.',
    specs: [
      { label: 'Type', value: 'Active Aero' },
      { label: 'Material', value: 'Carbon Fibre' },
      { label: 'Balance', value: 'Front-Rear Linked' },
      { label: 'Airflow', value: 'Underbody Fed' },
    ],
    animationNote: 'Airflow visualisation overlay',
  },
  {
    id: 'hs-exhaust',
    slot: 'hotspot-exhaust',
    title: 'Exhaust System',
    description:
      'Twin-exit exhaust with active valves, seamlessly integrated into the rear diffuser for optimised airflow extraction. The valve system modulates exhaust note across drive modes — hushed refinement in Comfort, visceral bark in Track.',
    specs: [
      { label: 'Layout', value: 'Twin Exit' },
      { label: 'Valves', value: 'Active' },
      { label: 'Integration', value: 'Diffuser-Mounted' },
      { label: 'Sound', value: 'Mode-Variable' },
    ],
    animationNote: 'Valve open animation with subtle audio cue',
  },
  {
    id: 'hs-headlights',
    slot: 'hotspot-headlights',
    title: 'Adaptive LED Headlights',
    description:
      'Adaptive LED headlights featuring the McLaren signature blade daytime running light. Cornering light function anticipates steering input to illuminate the apex. The DRL sequence — a sweeping ignition pattern — is unmistakably McLaren.',
    specs: [
      { label: 'Type', value: 'Adaptive LED' },
      { label: 'DRL', value: 'Blade Signature' },
      { label: 'Cornering', value: 'Predictive' },
      { label: 'Sequence', value: 'Sweep Ignition' },
    ],
    animationNote: 'DRL sequence ignition animation',
  },
  {
    id: 'hs-engine',
    slot: 'hotspot-engine',
    title: 'Hybrid Powertrain',
    description:
      '4.0-litre twin-turbocharged V8 hybrid powertrain producing a combined 700PS. The axial-flux E-motor provides instant torque fill, eliminating turbo lag and delivering relentless acceleration. The rear glass reveals the beating heart of the Artura Spider.',
    specs: [
      { label: 'Engine', value: '4.0L Twin-Turbo V8' },
      { label: 'Combined', value: '700PS' },
      { label: 'E-Motor', value: 'Axial-Flux' },
      { label: 'Torque Fill', value: 'Instant' },
    ],
    animationNote: 'Glass fades to transparent, engine components labelled',
  },
];
