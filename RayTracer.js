/* A skeleton of this file was written by Duncan Levear in Spring 2023 for CS3333 at Boston College */
import {Vector3, vectorSum, vectorDifference, vectorScaled} from './Vector3.js'

export class RayTracer {
    constructor(sceneInfo, image) {
        this.scene = sceneInfo;
        this.image = image;
        // clear image all white
        for (let i = 0; i < image.data.length; i++) {
            image.data[i] = 255;
        }
    }

    putPixel(row, col, r, g, b) {
        /*
        Update one pixel in the image array. (r,g,b) are 0-255 color values.
        */
        if (Math.round(row) != row) {
            console.error("Cannot put pixel in fractional row");
            return;
        }
        if (Math.round(col) != col) {
            console.error("Cannot put pixel in fractional col");
            return;
        }
        if (row < 0 || row >= this.image.height) {
            return;
        }
        if (col < 0 || col >= this.image.width) {
            return;
        }

        const index = 4 * (this.image.width * row + col);
        this.image.data[index + 0] = Math.round(r);
        this.image.data[index + 1] = Math.round(g);
        this.image.data[index + 2] = Math.round(b);
        this.image.data[index + 3] = 255;
    }

    render() {
        console.log(this.scene)
        // assume image is 200x200
        // 1. For Each Pixel
        for (let row=0; row < this.image.height; row++) { 
            for (let col=0; col < this.image.width; col++) {
    
                // 4. If there is a hit, return color of struck object

                const ray = this.pixelToRay(row, col);
                const color = this.traceRay(ray);

                this.putPixel(row, col, color[0], color[1], color[2]); 
                
            }
        }
    }
    
       setupCamera(e, eyeOut, up) {

        let w = vectorScaled(eyeOut, -1);
        let u = up.crossProduct(w);
        let v = w.crossProduct(u);
        u.normalize();
        v.normalize();
        w.normalize();

        return [e, u, v, w];
    }


    pixelToRay(row, col) {

        // Return parameters for setting up camera

        let [e, u, v, w] = this.setupCamera(this.scene.v3_eye, this.scene.v3_eyeOut, this.scene.v3_up);

        const start = e; // camera pt
        const squareHeight = (this.scene.f_imageplaneHeight / this.scene.i_height);
        const squareWidth = (this.scene.f_imageplaneWidth / this.scene.i_width);
        const height = this.scene.f_imageplaneHeight;
        const width = this.scene.f_imageplaneWidth;
        const distance = this.scene.f_imageplaneDistance;

        let topleft = new Vector3(e);

        topleft.increaseByMultiple(w, -distance);
        topleft.increaseByMultiple(v, height / 2);
        topleft.increaseByMultiple(u, -width / 2);

        //        firstPixel = topLeft - (squareHeight/2)*v + (squareWidth/2)*u; 

        let firstPixel = new Vector3(topleft);
        firstPixel.increaseByMultiple(v, -squareHeight / 2);
        firstPixel.increaseByMultiple(u, squareWidth / 2);

        //        const B = firstPixel - row*squareHeight*v + col*squareWidth*u;

        let B = new Vector3(firstPixel);

        B.increaseByMultiple(v, -row * squareHeight);
        B.increaseByMultiple(u, col * squareWidth);

        // find DIRECTION not second point 
        const dir = vectorDifference(B, start);
        return new Ray(start, dir);


    }
    
    traceRay(ray) {
        /*
        Determine the color of the given ray based on this.scene.
        */
        
        const hits = ray.allHits(this.scene.a_geometries);
        
        if (hits[0] === undefined || hits[0] === null) {
            return [0,0,0];
        }
        
        let min = hits[0];
        
        for (const hit of hits) {
            if (hit.t < min.t) {
                min = hit;
            }
        }
        
        return this.getColor(min);
        
    }
    
    getColor(record) {
        /*
        Determine the color that results from the given HitRecord.
        */
        
        const finalColor = [0, 0, 0];
        const lights = this.scene.a_lights;
        
        for (const l of lights) {
            const colorLight = this.whatLight(record, l);
            finalColor[0] += colorLight[0];
            finalColor[1] += colorLight[1];
            finalColor[2] += colorLight[2];
        }
        
        return finalColor;
    }
    
    whatLight(record, light) {
        
        const lightPosition = light.v3_position;
        const shadowRay = new Ray(record.pt, vectorDifference(lightPosition, record.pt));
        const lightIntensity = light.f_intensity;
        const normal = record.normal;
        
        const hits = shadowRay.allHits(this.scene.a_geometries);
        
        for (const h of hits) {
            if (h.t != undefined && h.t > 0.001 && h.t < 1) {
                return [0,0,0];
            }
        }
        
        const diffuse = this.diffuse(record, light, lightPosition, normal);
        const highlight = this.highlight(record, light, lightPosition, normal);
        
        const color = [(diffuse[0] + highlight[0])*lightIntensity, (diffuse[1] + highlight[1])*lightIntensity, (diffuse[2] + highlight[2])*lightIntensity];
        
        return color;
    }
    
    diffuse(record, light, position, normal) {
        
        const toLight = vectorDifference(position, record.pt).normalize();
        const m = normal.dotProduct(toLight);
        
        if (m < 0) {
            return [0,0,0];
        }
        
        const color = [record.struckGeometry.j_material.v3_diffuse.x,
                      record.struckGeometry.j_material.v3_diffuse.y,
                      record.struckGeometry.j_material.v3_diffuse.z];
        
        return [color[0]* m *255, color[1] * m *255, color[2] * m *255];
        
    }
    
    highlight(record, light, position, normal) {
        
        const pow = record.struckGeometry.j_material.f_specularity * 3.1;
        
        if (pow < 0) {
            return [0,0,0];
        }
        
        const start = record.ray.start;
        const toEye = vectorDifference(start, record.pt);
        const toLight = vectorDifference(position, record.pt);
        
        const h = vectorSum(toEye, toLight).normalize();
        let specularAlignment = normal.dotProduct(h);
        specularAlignment = Math.pow(specularAlignment, pow);
        
        return [255 * specularAlignment, 255 * specularAlignment, 255 * specularAlignment];
    }
}

class Ray {
    constructor(start, dir) {
        this.start = start;
        this.dir = dir;
    }

    tToPt(t) {
        const ret = new Vector3(this.start).increaseByMultiple(this.dir, t);
        return ret;
    }
    
    allHits(geometries) {
        let ret = [];
        for (const g of geometries) {
            const record = this.hit(g);
            if (record.length === undefined) {
                console.error("Return type of hit() should be an array.");
            }
            ret = ret.concat(record);
        }
//        console.log("ret", ret);
//        console.log("hit", ret[0]);
        return ret;
    }
    
    hit(g) {
        if (g.s_type === 'sphere') {
            return this.hitSphere(g);
        }
        else if (g.s_type === 'sheet') {
            return this.hitSheet(g);
        }
        else if (g.s_type === 'box') {
            return this.hitBox(g);
        }
        else {
            console.error("Shape of type " + g.s_type + " is not supported");
        }
    }
    
    hitSheet(g) {
        /*
        Compute the intersection between the ray (this) and the given geometry g, a sheet.
        Return an instance of the HitRecord class.
        */
        // aliases for shorter typing
        const pt0 = g.v3_pt0;
        const pt1 = g.v3_pt1;
        const pt2 = g.v3_pt2;
        // compute d, normal, edge1, edge2 once only, to save time
        if (g.edge1 === undefined) {
            g.edge1 = vectorDifference(pt0, pt1);
            g.edge2 = vectorDifference(pt2, pt1);

            // edge1 and edge2 assumed to be orthogonal
            const unit1 = vectorDifference(pt0, pt1).normalize();
            const unit2 = vectorDifference(pt2, pt1).normalize();
            if (Math.abs(unit1.dotProduct(unit2)) > 0.01) {
                console.error(`Edges ${edge1} and ${edge2} are not orthogonal`);
            }

            // assume pts listed in ccw order, e.g. [1, 0, 0], [0,0,0], [0, 1, 0]
            g.normal = unit2.crossProduct(unit1);
            g.normal.normalize();

            // ray-plane intersection
            g.d = g.normal.dotProduct(pt1);
        }
        // t = (<normal, g.pt1> - <e,n>)/<v,n> ==> e=this.start, v=this.dir
        const t = (g.d - g.normal.dotProduct(this.start))/g.normal.dotProduct(this.dir);
        const pt = this.tToPt(t);
        // check if pt is within sheet
        let alpha = vectorDifference(pt,pt1).dotProduct(g.edge1);
        alpha /= g.edge1.dotProduct(g.edge1);
        let beta = vectorDifference(pt,pt1).dotProduct(g.edge2);
        beta /= g.edge2.dotProduct(g.edge2);

        if (alpha < 0 || alpha > 1 || beta < 0 || beta > 1) {
            // hit doesn't count
            return [];
        }
        return [new HitRecord(this, t, pt, g, g.normal)];
    }

    hitSphere(g) {
        /*
        Compute the intersection between the ray (this) and the given geometry g, a sphere.
        Return an instance of the HitRecord class.
        */
        // TODO
        const q = new Vector3(g.v3_center);
        const radius = g.f_radius;
        const v = this.dir;
        const u = vectorDifference(this.start, q);

        const a = v.dotProduct(v);
        const b = 2 * u.dotProduct(v);
        const c = u.dotProduct(u) - radius * radius;

        //        console.log("V: ", v);

        const dis = (b * b) - 4 * a * c;
        //        console.log("dis", dis)

        if (dis < 0) {

            return [];
        }
        
        const t0 = (-b - Math.sqrt(dis)) / (2 * a);
        const t1 = (-b + Math.sqrt(dis)) / (2 * a);
        
        let t = t0;
        
        if (t0 > 10**(-10) && t1 > 10**(-10)) {
            t = Math.min(t0, t1);
        } else if (t0 > 10**(-10)) {
            t = t0;
        } else if (t1 > 10**(-10)) {
            t = t1;
        }
        const pt = this.tToPt(t);
        
        g.normal = vectorDifference(pt, q);
        g.normal.normalize();
        
        return [new HitRecord(this, t, pt, g, g.normal)];

        
    }

    hitBox(g) {
        /*
        Compute the intersection between the ray (this) and the given geometry g, a box.
        Return an instance of the HitRecord class.
        */

        const minPt = g.v3_minPt;
        const xStep = new Vector3(g.v3_dim.x, 0, 0);
        const yStep = new Vector3(0, g.v3_dim.y, 0);
        const zStep = new Vector3(0, 0, g.v3_dim.z);
        const face1 = {
            j_material: g.j_material,
            s_type: "box",
            v3_pt0: new Vector3(minPt).increaseBy(zStep).increaseBy(yStep),
            v3_pt1: new Vector3(minPt).increaseBy(zStep),
            v3_pt2: new Vector3(minPt).increaseBy(zStep).increaseBy(xStep),
        };
        const face2 = {
            j_material: g.j_material,
            s_type: "box",
            v3_pt0: new Vector3(minPt),
            v3_pt1: new Vector3(minPt).increaseBy(zStep),
            v3_pt2: new Vector3(minPt).increaseBy(zStep).increaseBy(yStep),
        };
        const face3 = {
            j_material: g.j_material,
            s_type: "box",
            v3_pt0: new Vector3(minPt).increaseBy(xStep),
            v3_pt1: new Vector3(minPt),
            v3_pt2: new Vector3(minPt).increaseBy(yStep),
        };
        const face4 = {
            j_material: g.j_material,
            s_type: "box",
            v3_pt0: new Vector3(minPt).increaseBy(zStep).increaseBy(xStep),
            v3_pt1: new Vector3(minPt).increaseBy(xStep),
            v3_pt2: new Vector3(minPt).increaseBy(xStep).increaseBy(yStep),
        };
        const face5 = {
            j_material: g.j_material,
            s_type: "box",
            v3_pt0: new Vector3(minPt).increaseBy(yStep).increaseBy(xStep),
            v3_pt1: new Vector3(minPt).increaseBy(yStep),
            v3_pt2: new Vector3(minPt).increaseBy(zStep).increaseBy(yStep),
        };
        const face6 = {
            j_material: g.j_material,
            s_type: "box",
            v3_pt0: new Vector3(minPt).increaseBy(zStep),
            v3_pt1: new Vector3(minPt),
            v3_pt2: new Vector3(minPt).increaseBy(xStep)
        };
      
        let faces = [face1, face2, face3, face4, face5, face6];
    
        let hits = [];
        for (const face of faces){
            hits.push(this.hitSheet(face));
        }
        
        hits = hits.map((item) => Array.isArray(item) ? item[0] : item);
        hits = hits.filter((item) => item !== undefined);
        return hits;
    }
}

class HitRecord {
    constructor(ray, t, pt, struckGeometry, normal) {
        this.ray = ray; // ray that was involved
        this.t = t; // t-value of intersection along ray
        this.pt = pt; // vector3, point where the ray hit
        this.struckGeometry = struckGeometry; // object that was hit
        this.normal = normal; // normal vector of struckGeometry at pt
    }
}
