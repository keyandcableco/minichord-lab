// Replacement silicone "nub" button: a thin flexing web on a foot ring,
// a plunger on top, and a recess underneath for the carbon contact pill.
// Pressing the plunger collapses the web and the pill shorts the two
// interleaved traces on the PCB.
//
// Everything is a guess from photos -- measure the old one with calipers
// and fix the numbers in the "Measure these" block before printing.
//
// part = "button"      the button itself (flexible resin / TPU)
//        "section"     2D cut through the middle, to check the profile
//        "mold_core"   mold bottom half: plate + core for the underside
//        "mold_cavity" mold top half: forms the outside, printed upside down
//        "mold_both"   both mold halves laid out side by side
//
//   openscad -D 'part="mold_cavity"' -o cavity.stl silicone_button.scad

part = "section";

// Print oversized to sanity-check the shape, then go back to 1.
scale_factor = 1;

/* [Measure these] */
flange_od  = 4.0;   // outside diameter of the foot ring that sits on the PCB
foot_w     = 0.45;  // radial width of the foot ring
foot_h     = 0.35;  // height of the foot ring
web_t      = 0.25;  // thickness of the flexing web -- sets how stiff it feels
plunger_d  = 1.9;   // diameter of the nub you press
total_h    = 1.8;   // PCB to top of the nub
web_top_z  = 0.95;  // where the web meets the side of the plunger
travel     = 0.35;  // gap from the pill to the PCB = how far it moves
pill_d     = 1.3;   // carbon pill diameter
pill_depth = 0.15;  // recess for the pill (0 if the pill is cast in flush)

/* [Mold] */
mold_wall   = 3;    // material around the button
mold_floor  = 2;    // plate thickness under the parting line
mold_roof   = 2;    // material above the top of the nub
sprue_d     = 0.8;  // pour/inject hole through the roof, over the nub
vent_d      = 0.4;  // air vents at the edge of the foot ring
pin_d       = 2;    // registration pins
pin_h       = 1.5;
pin_clear   = 0.15; // extra radius on the pin holes

$fn = 96;

foot_ro = flange_od / 2;
foot_ri = foot_ro - foot_w;
plunger_r = plunger_d / 2;
pill_r = pill_d / 2;

// Half cross-section in (r, z), z = 0 on the PCB.
module profile() {
    intersection() {
        union() {
            square([foot_ro, foot_h]);                       // foot ring
            translate([foot_ri, 0]) square([foot_w, foot_h]);
            difference() {                                   // plunger
                translate([0, travel]) square([plunger_r, total_h - travel]);
                translate([0, travel - 0.01]) square([pill_r, pill_depth + 0.01]);
            }
            // The web: a thick line from the inside top of the foot to the
            // side of the plunger. Its round ends sink into both.
            hull() {
                translate([foot_ri + web_t / 2, foot_h - web_t / 2]) circle(d = web_t);
                translate([plunger_r - web_t / 2, web_top_z - web_t / 2]) circle(d = web_t);
            }
        }
        // Keep r >= 0 and drop the foot's inner floor (the core is open there).
        difference() {
            square([foot_ro, total_h]);
            square([foot_ri, travel]);
        }
    }
}

// The air under the button: what the mold core has to fill.
module core_profile() {
    difference() {
        // Bounded by the web's centre line; the profile trims it to the
        // web's underside.
        polygon([[0, 0], [foot_ri, 0],
                 [foot_ri + web_t / 2, foot_h - web_t / 2],
                 [plunger_r - web_t / 2, web_top_z - web_t / 2],
                 [0, web_top_z - web_t / 2]]);
        profile();
    }
}

module button() { rotate_extrude() profile(); }
module core()   { rotate_extrude() core_profile(); }

mold_top = total_h + mold_roof;
// The pins need room outside the button, or the block grows to fit them.
block_w = max(flange_od + 2 * mold_wall, flange_od + 4 * pin_d + 2);
pin_xy = [for (s = [[1, 1], [-1, -1]]) s * (block_w / 2 - pin_d)];

module mold_core() {
    translate([-block_w / 2, -block_w / 2, -mold_floor])
        cube([block_w, block_w, mold_floor]);
    translate([0, 0, -0.01]) core();
    for (p = pin_xy) translate(concat(p, -0.01)) cylinder(d1 = pin_d, d2 = pin_d * 0.7, h = pin_h);
}

module mold_cavity() {
    difference() {
        translate([-block_w / 2, -block_w / 2, 0]) cube([block_w, block_w, mold_top]);
        // Button and core as one solid of revolution, so CGAL never sees
        // their shared faces.
        rotate_extrude() union() { profile(); core_profile(); }
        cylinder(d = sprue_d, h = mold_top + 1);             // sprue over the nub
        for (a = [0, 120, 240]) rotate(a)                    // vents off the foot
            translate([foot_ro - vent_d / 2, 0, 0])
                cylinder(d = vent_d, h = mold_top + 1);
        for (p = pin_xy) translate(concat(p, -0.01))
            cylinder(d1 = pin_d + 2 * pin_clear, d2 = pin_d * 0.7 + 2 * pin_clear,
                     h = pin_h + 0.2);
    }
}

scale(scale_factor) {
    if (part == "button") button();
    else if (part == "section")   // flat cut through the middle
        for (m = [0, 1]) mirror([m, 0]) profile();
    else if (part == "mold_core") mold_core();
    else if (part == "mold_cavity")
        translate([0, 0, mold_top]) rotate([180, 0, 0]) mold_cavity();
    else if (part == "mold_both") {
        translate([-block_w / 2 - 2, 0, mold_floor]) mold_core();
        translate([block_w / 2 + 2, 0, mold_top]) rotate([180, 0, 0]) mold_cavity();
    }
}
