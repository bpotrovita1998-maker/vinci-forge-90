import { useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Cuboid, Settings, Box, Cylinder, Hexagon, Smartphone, Grip, Coffee, Cog } from 'lucide-react';

interface CADTemplate {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: string;
  prompt: string;
  description: string;
  specifications: string[];
}

const cadTemplates: CADTemplate[] = [
  {
    id: 'spur-gear',
    name: 'Spur Gear',
    icon: <Settings className="w-5 h-5" />,
    category: 'Power Transmission',
    prompt: 'Industrial spur gear with 20 teeth, 50mm outer diameter, 10mm bore diameter, 8mm face width, 20-degree pressure angle, module 2.5, involute tooth profile. Precision-machined steel gear suitable for mechanical power transmission. Clean geometry, symmetrical design, engineering-grade CAD model with accurate tooth spacing and profile.',
    description: 'Standard spur gear for power transmission',
    specifications: [
      '20 teeth',
      '50mm OD',
      '10mm bore',
      '20° pressure angle'
    ]
  },
  {
    id: 'l-bracket',
    name: 'L-Bracket',
    icon: <Box className="w-5 h-5" />,
    category: 'Structural',
    prompt: 'Precision L-shaped mounting bracket, 100mm x 100mm legs, 10mm thickness, 4x M8 mounting holes with 12mm countersink. 90-degree angle, radiused internal corner (R5mm), chamfered edges (2mm x 45°). Anodized aluminum 6061-T6 construction. Engineering CAD model with precise dimensions, clean topology, suitable for CNC machining and 3D printing.',
    description: 'Right-angle mounting bracket with holes',
    specifications: [
      '100mm x 100mm',
      '10mm thick',
      '4x M8 holes',
      'R5mm fillet'
    ]
  },
  {
    id: 'shaft',
    name: 'Precision Shaft',
    icon: <Cylinder className="w-5 h-5" />,
    category: 'Power Transmission',
    prompt: 'Precision cylindrical shaft, 200mm length, 25mm diameter (h6 tolerance), with 30mm length keyway slot (8mm wide x 4mm deep) positioned 40mm from one end. Both ends have chamfered edges (2mm x 45°). One end features M12 threaded hole, 20mm deep. Hardened steel AISI 4140. Engineering CAD model with precise tolerances, clean cylindrical geometry, suitable for bearing mounting and torque transmission.',
    description: 'Cylindrical shaft with keyway',
    specifications: [
      '200mm length',
      '25mm Ø (h6)',
      'Keyway 8x4mm',
      'M12 thread'
    ]
  },
  {
    id: 'housing',
    name: 'Bearing Housing',
    icon: <Hexagon className="w-5 h-5" />,
    category: 'Enclosure',
    prompt: 'Cylindrical bearing housing, 80mm outer diameter, 52mm bore for bearing seat (H7 tolerance), 60mm height, wall thickness 8mm. Four M10 mounting holes on 100mm bolt circle diameter. Top face with oil port (M6 thread). Split-line design at midpoint. Cast iron GG-20 construction. Engineering CAD model with precise bearing seat dimensions, mounting pattern, clean geometry suitable for CNC machining.',
    description: 'Housing for standard bearings',
    specifications: [
      '80mm OD',
      '52mm bore (H7)',
      '4x M10 holes',
      '100mm BCD'
    ]
  },
  {
    id: 'flange',
    name: 'Pipe Flange',
    icon: <Cuboid className="w-5 h-5" />,
    category: 'Connections',
    prompt: 'ANSI Class 150 pipe flange, DN50 (2-inch nominal), 165mm outer diameter, 60.3mm inner diameter, 16mm thickness. Four M16 bolt holes on 125mm bolt circle diameter. Raised face design with 2mm height, 88mm diameter sealing surface. Smooth bore, radiused transitions. Carbon steel A105 construction. Engineering CAD model with ANSI B16.5 standard dimensions, precise bolt pattern, suitable for industrial piping systems.',
    description: 'Standard ANSI pipe flange',
    specifications: [
      'DN50 (2")',
      'Class 150',
      '4x M16 bolts',
      'Raised face'
    ]
  },
  {
    id: 'bushing',
    name: 'Split Bushing',
    icon: <Cylinder className="w-5 h-5" />,
    category: 'Power Transmission',
    prompt: 'Split taper bushing, 50mm outer diameter, 25mm inner diameter (H7 tolerance), 40mm length, split design with 5mm gap, 30-degree taper on outer surface. Two M8 clamping screws positioned 180 degrees apart. Keyway slot 8mm wide x 4mm deep. Phosphor bronze C93200 construction. Engineering CAD model with precise taper angle, split geometry, tight tolerances for shaft mounting applications.',
    description: 'Taper bushing with split design',
    specifications: [
      '50mm OD',
      '25mm ID (H7)',
      '30° taper',
      '2x M8 screws'
    ]
  },
  {
    id: 'phone-stand',
    name: 'Phone Stand',
    icon: <Smartphone className="w-5 h-5" />,
    category: '3D Printable',
    prompt: '3D-printable phone stand for modern smartphone, fits phones up to 85mm wide and 10mm thick, 60-degree viewing angle. Lower lip 8mm high to prevent sliding, cable slot cutout for charging access. Stable base design, no-support printing geometry. PLA material, 2mm minimum wall thickness. Clean, solid geometry with smooth surfaces, modern ergonomic design suitable for desk use.',
    description: '3D-printable desk phone holder',
    specifications: [
      'Up to 85mm wide',
      '60° viewing angle',
      'Cable slot',
      '2mm walls'
    ]
  },
  {
    id: 'shelf-bracket',
    name: 'Shelf Bracket',
    icon: <Box className="w-5 h-5" />,
    category: 'Structural',
    prompt: 'Metal wall-mounted L-bracket for 800x250x20mm wooden shelf. L-shape with diagonal support, 230mm top arm, 220mm wall arm. 3x mounting holes on wall side, 2x holes on shelf side, 6mm diameter countersunk for wood screws. Steel construction 3-4mm thick, suitable for laser cutting or bending. Rated 25kg total load capacity. Modern clean design with rounded edges, no decoration.',
    description: 'Wall-mounted shelf support bracket',
    specifications: [
      '230mm x 220mm',
      '3-4mm steel',
      '25kg capacity',
      '5 mounting holes'
    ]
  },
  {
    id: 'lamp-arm',
    name: 'Desk Lamp Arm',
    icon: <Cog className="w-5 h-5" />,
    category: 'Mechanical',
    prompt: 'Adjustable desk lamp arm mechanical structure, two 250mm arm segments with pivot joint connection, through-bolt and washers. Desk clamp base for 10-40mm thick edges. Top mounting plate 50x50mm with 4x M4 holes for lamp head attachment. Friction washers for position holding. Rectangular hollow sections 20x10mm, 2mm wall thickness. Minimal modern design with smooth fillets, clean geometry suitable for fabrication.',
    description: 'Adjustable articulating arm',
    specifications: [
      '2x 250mm arms',
      'Pivot joints',
      'Desk clamp base',
      '50x50mm mount'
    ]
  },
  {
    id: 'enclosure',
    name: 'Electronics Box',
    icon: <Box className="w-5 h-5" />,
    category: 'Enclosure',
    prompt: 'Two-part plastic electronics enclosure, 90x60x25mm internal space. Bottom box with snap-fit lid, 2-3mm wall thickness. 4x internal bosses with M3 screw holes for 70x40mm PCB mounting. Ventilation slots on long side, 20x10mm USB opening on opposite side. Rounded corners, comfortable handheld ergonomics. Simple smooth exterior suitable for injection molding or 3D printing. Engineering CAD model with precise fitment.',
    description: 'Project enclosure with PCB mounts',
    specifications: [
      '90x60x25mm',
      'Snap-fit lid',
      '4x PCB mounts',
      'Vent slots'
    ]
  },
  {
    id: 'gear-pair',
    name: 'Gear Pair',
    icon: <Settings className="w-5 h-5" />,
    category: 'Power Transmission',
    prompt: 'Parametric spur gear pair designed to mesh, module 2mm, 20° pressure angle. Gear 1: 20 teeth with 6mm shaft hub and keyway. Gear 2: 40 teeth with 8mm shaft hub and keyway. Both include M3 setscrew through holes for shaft locking. Assembled view showing correct center distance meshing. Clean involute tooth geometry suitable for 3D printing or CNC machining. Engineering CAD model with precise tooth profiles.',
    description: 'Meshing spur gear assembly',
    specifications: [
      '20T & 40T',
      'Module 2mm',
      '20° pressure',
      'M3 setscrews'
    ]
  },
  {
    id: 'hinge',
    name: 'Box Hinge',
    icon: <Hexagon className="w-5 h-5" />,
    category: 'Connections',
    prompt: 'Metal folding hinge for wooden storage box, 12mm wall thickness compatibility, 110-degree opening angle. 50mm leaf length each side, 20mm width, 4mm pin diameter full length. 2x countersunk holes per leaf, 4mm diameter for wood screws. Flush-mounting design when closed. Simple robust stamped sheet metal construction, 1.5-2mm thickness. Engineering CAD model with precise pivot geometry and screw placement.',
    description: 'Folding hinge for wood boxes',
    specifications: [
      '50mm leaves',
      '110° opening',
      '4mm pin',
      '1.5-2mm metal'
    ]
  },
  {
    id: 'coffee-table',
    name: 'Coffee Table',
    icon: <Coffee className="w-5 h-5" />,
    category: 'Assembly',
    prompt: 'Minimalist coffee table assembly, 900x450mm rectangular top 25mm thick. Four square tube legs 30x30mm, 400mm tall, inset 50mm from corners. Simple bolt brackets attaching legs to underside of tabletop. Wooden top, steel legs and brackets. Include mounting holes and fasteners for flat-pack assembly and disassembly. Modern minimalist design with clean lines, suitable for residential furniture. Engineering CAD assembly model.',
    description: 'Modern flat-pack coffee table',
    specifications: [
      '900x450mm',
      '400mm height',
      'Wood & steel',
      'Bolt assembly'
    ]
  },
  {
    id: 'controller-grip',
    name: 'Controller Grip',
    icon: <Grip className="w-5 h-5" />,
    category: '3D Printable',
    prompt: 'Ergonomic game controller grip right-hand half, average adult hand fit. Gentle palm swell with three-finger indentations on front surface. Top flat interface plane 60x40mm for electronics mounting. Hollow interior 2mm wall thickness for material efficiency. Suitable for 3D printing and rubber overmolding. Smooth organic surfaces with generous fillets for comfortable hand contact. Modern ergonomic industrial design CAD model.',
    description: 'Ergonomic gaming grip shell',
    specifications: [
      'Right hand',
      '2mm walls',
      '60x40mm mount',
      'Overmold ready'
    ]
  }
];

interface CADTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
}

export default function CADTemplates({ onSelectTemplate }: CADTemplatesProps) {
  const [showAll, setShowAll] = useState(false);
  const displayedTemplates = showAll ? cadTemplates : cadTemplates.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Cuboid className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">CAD Templates</h3>
        <Badge variant="outline" className="bg-accent/20 text-accent border-0 ml-auto">
          Engineering Ready
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Select a template to auto-fill engineering specifications for common mechanical parts
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayedTemplates.map((template) => (
          <Card 
            key={template.id}
            className="glass border-border/30 p-4 hover:border-accent/30 transition-all cursor-pointer group"
            onClick={() => onSelectTemplate(template.prompt)}
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm mb-0.5">
                    {template.name}
                  </h4>
                  <Badge variant="outline" className="glass border-border/30 text-xs">
                    {template.category}
                  </Badge>
                </div>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {template.description}
              </p>

              <div className="space-y-1">
                {template.specifications.map((spec, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-accent" />
                    <span>{spec}</span>
                  </div>
                ))}
              </div>

              <Button 
                size="sm" 
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTemplate(template.prompt);
                }}
              >
                Use Template
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {cadTemplates.length > 6 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="glass border-border/30 hover:border-accent/30"
          >
            {showAll ? 'Show Less' : `Show ${cadTemplates.length - 6} More Templates`}
          </Button>
        </div>
      )}

      <div className="p-3 rounded-lg border border-accent/20 bg-accent/5 text-xs text-muted-foreground">
        <p className="font-medium mb-1 text-foreground">💡 Engineering Tip:</p>
        <p>
          Templates include standard dimensions, tolerances (H7, h6), and materials. 
          You can modify the generated prompt before generating to customize specifications.
        </p>
      </div>
    </div>
  );
}
