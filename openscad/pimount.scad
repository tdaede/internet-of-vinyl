$fs = 0.01;

h=6;

module standoff(h) {
    difference() {
        cylinder(d=6,h=h);
        cylinder(d=3,h=h);
    }
}

translate([0,0,0]) standoff(h);
translate([49,0,0]) standoff(h);
translate([0,58,0]) standoff(h);
translate([49,58,0]) standoff(h);
translate([-3,-3,0]) difference() {
    cube([49+3*2,58+3*2,1]);
    translate([6,6,0]) cube([49-3*2,58-3*2,2]);
}
