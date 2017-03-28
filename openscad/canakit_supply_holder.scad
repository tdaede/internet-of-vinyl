slop = 0.1;

h = 28.7;

$fs = 0.01;

module standoff(h) {
    difference() {
        cylinder(d=6,h=h);
        cylinder(d=4,h=h+1);
    }
}

module standoff2(h) {
    difference() {
        cylinder(d=6,h=h);
        cylinder(d=4,h=h+1);
    }
}

difference() {
    union() {
        translate([5,-1.5,0]) standoff(h+1);
        translate([70,-1.5,0]) standoff(h+1);
        translate([5,43,0]) standoff(h+1);
        translate([70,43,0]) standoff(h+1);
        cube([73.38+1.2,40.35+1.2,28.7+1]);
    }
    translate([0.6,0.6,1]) {
        cube([73.38,40.35,h+slop]);
        translate([8.00,40.35,3.40]) cube([30.46+slop*2,10,22.49+slop*2+10]);
        translate([73,33.5,29.45/2]) rotate([0,90,0])  cylinder(d=14,h=10);
        translate([73,29.5,29.45/2]) cube([14,8,14]);
    }
    translate([6,6,-1]) cube([73.38-10,40.35-10,10]);
}

/*
difference() {
    union() {
        translate([5,-1.5,0]) standoff(1);
        translate([70,-1.5,0]) standoff(1);
        translate([5,43,0]) standoff(1);
        translate([70,43,0]) standoff(1);
        cube([73.38+1.2,40.55+1.2,1]);
    }
    translate([0.6,0.6,1]) {
        cube([73.38,40.55,h+slop]);
        translate([8.00,40.55,3.40]) cube([30.46+slop*2,10,22.49+slop*2+10]);
        translate([73,33,29.45/2]) rotate([0,90,0])  cylinder(d=13,h=10);
    }
    translate([6,6,-1]) cube([73.38-10,40.55-10,10]);
}
*/