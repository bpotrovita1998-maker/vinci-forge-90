import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Cuboid, Settings, Box, Cylinder, Hexagon } from 'lucide-react';

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
  }
];

interface CADTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
}

export default function CADTemplates({ onSelectTemplate }: CADTemplatesProps) {
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
        {cadTemplates.map((template) => (
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
