"""Original, deterministic Blender asset. Run with Blender --background --python this_file.

No reference photographs are embedded. Geometry, PBR maps and steam are authored here.
Dimensions are metres. Blender Z becomes glTF Y. Ingredient group origins share the
vessel centre; runtime manipulation should target these parent groups.
"""
from pathlib import Path
import bpy, math, random, json, shutil
import numpy as np
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/blender/biryani'
RUNTIME = ROOT / 'public/models/biryani'
PREVIEW = ROOT / 'assets/previews/biryani'
TEXTURES = SOURCE / 'textures'
for p in (SOURCE, RUNTIME, PREVIEW, TEXTURES, ROOT / 'public/textures/steam'):
    p.mkdir(parents=True, exist_ok=True)
random.seed(1707)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.fps = 30
scene.frame_start, scene.frame_end = 1, 91

def noise(n, frequency, seed):
    rng = np.random.default_rng(seed)
    grid = rng.random((frequency+1, frequency+1))
    a = np.linspace(0, frequency, n, endpoint=False)
    ix = a.astype(int); t = a-ix; t = t*t*(3-2*t)
    return ((1-t[:,None])*((1-t[None,:])*grid[ix[:,None],ix[None,:]] + t[None,:]*grid[ix[:,None],ix[None,:]+1])
          + t[:,None]*((1-t[None,:])*grid[ix[:,None]+1,ix[None,:]] + t[None,:]*grid[ix[:,None]+1,ix[None,:]+1]))

def image_file(name, rgba, folder=TEXTURES, noncolor=False):
    h,w = rgba.shape[:2]
    img = bpy.data.images.new(name, width=w, height=h, alpha=True)
    if noncolor: img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(np.asarray(rgba, dtype=np.float32).ravel())
    img.filepath_raw = str(folder / (name+'.png')); img.file_format = 'PNG'; img.save()
    img.pack()
    return img

def textured(name, colors, roughness=.5, metallic=0, strength=.18, size=512):
    a = noise(size, 7, 5); b = noise(size, 38, 8); c = noise(size, 112, 12)
    field = np.clip(.53*a+.32*b+.15*c, 0, 1)
    rgb = np.zeros((size,size,3))
    stops = np.linspace(.15,.85,len(colors))
    for i in range(3): rgb[:,:,i] = np.interp(field, stops, [x[i] for x in colors])
    rgba = np.dstack((rgb,np.ones((size,size))))
    col = image_file(name+'_basecolor',rgba)
    # A real tangent-space normal map, rather than unsupported procedural nodes.
    h = .65*b+.35*c
    gy,gx = np.gradient(h)
    normal = np.dstack((-gx*strength*36,-gy*strength*36,np.ones_like(h)))
    normal /= np.linalg.norm(normal,axis=2,keepdims=True)
    norm = image_file(name+'_normal',np.dstack((normal*.5+.5,np.ones_like(h))),noncolor=True)
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    nt=mat.node_tree; bs=nt.nodes.get('Principled BSDF')
    bs.inputs['Roughness'].default_value=roughness; bs.inputs['Metallic'].default_value=metallic
    tex=nt.nodes.new('ShaderNodeTexImage'); tex.image=col
    nt.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    tex=nt.nodes.new('ShaderNodeTexImage'); tex.image=norm
    nm=nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value=.45
    nt.links.new(tex.outputs['Color'],nm.inputs['Color']); nt.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    return mat

def solid(name, color, roughness=.45, metallic=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF'); b.inputs['Base Color'].default_value=(*color,1)
    b.inputs['Roughness'].default_value=roughness; b.inputs['Metallic'].default_value=metallic
    return m

copper=textured('Hand_beaten_copper',[(.19,.054,.024),(.39,.14,.058),(.55,.26,.12)],.29,.82,.10)
gold=solid('Warm_brass_inlay',(.59,.36,.105),.24,.8)
inside=solid('Seasoned_tin_interior',(.26,.22,.16),.38,.65)
enamel=solid('Deep_jade_enamel',(.012,.047,.036),.26,.4)
ivory=textured('Basmati_ivory',[(.77,.65,.40),(.96,.87,.65),(1,.96,.81)],.48,0,.08,256)
saffron=solid('Basmati_saffron',(.78,.24,.008),.49)
goldrice=solid('Basmati_golden',(.9,.48,.065),.49)
whiterice=solid('Basmati_pearl',(.98,.93,.79),.48)
chicken=textured('Saffron_roasted_chicken',[(.095,.023,.006),(.32,.092,.017),(.63,.27,.042),(.88,.49,.12)],.53,0,.32,1024)
bone=solid('Drumstick_bone',(.78,.67,.47),.58)
onion=textured('Birista_caramel',[(.065,.018,.005),(.22,.063,.012),(.46,.20,.041)],.48,0,.17,256)
mint=textured('Fresh_mint',[(.013,.052,.011),(.035,.19,.029),(.12,.34,.055)],.56,0,.16,256)
vein=solid('Leaf_veins',(.17,.30,.049),.6)
cashew=textured('Toasted_cashew',[(.34,.16,.041),(.71,.45,.17),(.89,.73,.42)],.48,0,.1,256)
spice=solid('Whole_spice_bark',(.17,.052,.015),.7)
cardamom=solid('Green_cardamom',(.23,.28,.063),.7)
thread=solid('Saffron_threads',(.44,.044,.009),.58)

root=bpy.data.objects.new('RoyalBiryani',None); scene.collection.objects.link(root)
groups={}
for name,label in [('Vessel','Copper handi'),('Rice','Saffron basmati'),('Chicken','Roasted chicken'),('Onions','Fried onions'),('Herbs','Mint and coriander'),('Nuts','Toasted cashews'),('WholeSpices','Whole spices'),('Saffron','Saffron threads')]:
    ob=bpy.data.objects.new(name,None); scene.collection.objects.link(ob); ob.parent=root
    ob['ingredient']=label; ob['interactive']=True; groups[name]=ob

class Mesh:
    def __init__(self,name,group,mats): self.name=name; self.group=group; self.mats=mats; self.v=[]; self.f=[]; self.uv=[]; self.mi=[]
    def surface(self, vertices, faces, uvs, material=0):
        start=len(self.v); self.v.extend(vertices)
        for f in faces:
            self.f.append(tuple(start+i for i in f)); self.uv.append([uvs[i] for i in f]); self.mi.append(material)
    def ellipsoid(self,center,scale,material=0,seg=10,rings=6,rot=None,warp=0):
        vs=[]; uvs=[]; fs=[]
        for j in range(rings+1):
            t=math.pi*j/rings
            for i in range(seg+1):
                a=2*math.pi*i/seg
                k=1+warp*(.5*math.sin(a*3+t*5)+.3*math.cos(a*7-t*3)+.2*math.sin(t*11+a))
                v=Vector((scale[0]*math.sin(t)*math.cos(a)*k,scale[1]*math.sin(t)*math.sin(a)*k,scale[2]*math.cos(t)*k))
                if rot is not None: v=rot @ v
                vs.append(tuple(v+Vector(center))); uvs.append((i/seg,j/rings))
        for j in range(rings):
            for i in range(seg):
                a=j*(seg+1)+i; b=a+seg+1
                if j!=0: fs.append((a,b,a+1))
                if j!=rings-1: fs.append((a+1,b,b+1))
        self.surface(vs,fs,uvs,material)
    def tube(self,points,radius,material=0,sides=6):
        vs=[]; uv=[]; fs=[]
        for j,p in enumerate(points):
            tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(j-1,0)])
            tangent.normalize(); n=tangent.cross(Vector((0,0,1)))
            if n.length<.01: n=tangent.cross(Vector((0,1,0)))
            n.normalize(); b=tangent.cross(n)
            r=radius*(.65+.35*math.sin(math.pi*(j+.4)/(len(points))))
            for i in range(sides):
                a=2*math.pi*i/sides
                vs.append(tuple(Vector(p)+r*(math.cos(a)*n+math.sin(a)*b))); uv.append((i/sides,j/max(1,len(points)-1)))
        for j in range(len(points)-1):
            for i in range(sides):
                a=j*sides+i; b=j*sides+(i+1)%sides
                fs.append((a,b,b+sides,a+sides))
        fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+i for i in range(sides))])
        self.surface(vs,fs,uv,material)
    def build(self):
        m=bpy.data.meshes.new(self.name); m.from_pydata(self.v,[],self.f); m.update()
        ob=bpy.data.objects.new(self.name,m); scene.collection.objects.link(ob); ob.parent=groups[self.group]
        for mat in self.mats: m.materials.append(mat)
        layer=m.uv_layers.new(name='UVMap')
        for poly,uv,mi in zip(m.polygons,self.uv,self.mi):
            poly.material_index=mi; poly.use_smooth=True
            for li,co in zip(poly.loop_indices,uv): layer.data[li].uv=co
        return ob

def lathe(mesh,profile,mat=0,segments=128):
    v=[]; uv=[]; f=[]
    for j,(r,z) in enumerate(profile):
        for i in range(segments+1):
            a=2*math.pi*i/segments; v.append((r*math.cos(a),r*math.sin(a),z)); uv.append((i/segments,j/(len(profile)-1)))
    for j in range(len(profile)-1):
        for i in range(segments):
            a=j*(segments+1)+i; b=a+segments+1; f.append((a,a+1,b+1,b))
    mesh.surface(v,f,uv,mat)

def ring(mesh,r,z,thickness,mat=0):
    pts=[(r*math.cos(t),r*math.sin(t),z) for t in np.linspace(0,2*math.pi,161)]
    mesh.tube(pts,thickness,mat,8)

# Wide, squat double-wall handi, real interior and underside; no intersecting lid.
vessel=Mesh('Handi_body','Vessel',[copper,inside,gold,enamel])
profile=[(.0001,.019),(.105,.019),(.132,.023),(.153,.036),(.171,.057),(.181,.080),(.182,.098),(.177,.117),(.175,.125),(.180,.129),(.181,.134),(.178,.138),(.173,.137),(.171,.131),(.169,.121),(.169,.112),(.173,.096),(.172,.081),(.164,.060),(.149,.042),(.125,.032),(.09,.030),(.0001,.030)]
lathe(vessel,profile)
# Interior faces use the tin material.
for i in range(12*128,len(vessel.mi)): vessel.mi[i]=1
for r,z,t in [(.178,.136,.0023),(.178,.128,.0012),(.18,.109,.0008),(.179,.104,.00065),(.154,.037,.0012),(.132,.023,.0014)]: ring(vessel,r,z,t,2)
ring(vessel,.18,.114,.0020,3)
# Brass floral engraving follows the vessel wall; intentionally fine and restrained.
for i in range(40):
    a=2*math.pi*i/40
    for sign in (-1,1):
        pts=[]
        for t in np.linspace(0,math.pi*2,17):
            angle=a+sign*.015*math.sin(t); z=.073+.009*math.cos(t)
            r=.181-.003*abs((z-.083)/.025)
            pts.append((r*math.cos(angle),r*math.sin(angle),z))
        vessel.tube(pts,.00046,2,4)
    vessel.ellipsoid((.181*math.cos(a),.181*math.sin(a),.073),(.0009,.0009,.0009),2,6,4)
# Two low loop handles, royal serving vessel rather than cooking pot.
for side in (-1,1):
    pts=[(side*(.176+.033*math.sin(t)),.036*math.cos(t),.102-.013*math.sin(t)) for t in np.linspace(0,math.pi,33)]
    vessel.tube(pts,.0032,2,8)
vessel.build()

rice=Mesh('Basmati_grains','Rice',[ivory,saffron,goldrice,whiterice])
def rice_height(x,y):
    r=math.hypot(x,y)/.167
    return .142+.038*max(0,1-r*r)+.003*math.sin(x*62)*math.cos(y*51)

# Covered base retains a solid heap when viewed from underneath in exploded mode.
lathe(rice,[(.0001,.06),(.09,.059),(.143,.079),(.165,.115),(.166,.132),(.154,.142),(.122,.155),(.08,.166),(.0001,.175)],2,96)
# Long slender separate grain geometry, joined by material into one runtime mesh.
for i in range(6000):
    a=random.uniform(0,2*math.pi); r=.166*math.sqrt(random.random()); x,y=r*math.cos(a),r*math.sin(a)
    z=rice_height(x,y)+random.uniform(-.001,.004)
    rot=Matrix.Rotation(random.uniform(0,2*math.pi),3,'Z') @ Matrix.Rotation(random.uniform(-.45,.45),3,'Y')
    mi=random.choices([0,1,2,3],[.30,.27,.28,.15])[0]
    rice.ellipsoid((x,y,z),(.0046*random.uniform(.85,1.2),.00113,.001),mi,seg=6,rings=4,rot=rot)
# Peripheral grains hide the smooth skirt of the mound.
for i in range(2200):
    a=random.uniform(0,2*math.pi); z=random.uniform(.085,.145)
    r=.149+.020*(z-.085)/.06+random.uniform(-.0015,.0015)
    rot=Matrix.Rotation(a+random.uniform(-1.7,1.7),3,'Z') @ Matrix.Rotation(random.uniform(-1,1),3,'Y')
    rice.ellipsoid((r*math.cos(a),r*math.sin(a),z),(.0043,.0011,.001),random.choice([0,0,1,2,3]),6,4,rot)
for i in range(900):
    a=random.uniform(0,math.tau); r=.139*math.sqrt(random.random())
    z=.059+max(0,r-.09)*.38
    rice.ellipsoid((r*math.cos(a),r*math.sin(a),z),(.0043,.0011,.001),random.choice([0,0,1,2,3]),6,4,Matrix.Rotation(a+random.uniform(-2,2),3,'Z'))
rice.build()

ch=Mesh('Roasted_chicken_pieces','Chicken',[chicken,bone])
def drumstick(center,angle,scale=1):
    # Bone-to-thigh contour with an asymmetric meaty bulb, not a tapered cone.
    direction=Matrix.Rotation(angle,3,'Z') @ Matrix.Rotation(-.13,3,'Y')
    profile=[(-.047,.003),(-.041,.004),(-.030,.006),(-.022,.010),(-.012,.019),(.002,.026),(.017,.030),(.030,.027),(.039,.018),(.042,.004)]
    vs=[]; uv=[]; fs=[]; seg=40
    for j,(x,r) in enumerate(profile):
        for k in range(seg+1):
            a=k/seg*2*math.pi
            ripple=1+.06*math.sin(5*a+j*.8)+.025*math.sin(13*a-j)
            v=Vector((x,r*math.cos(a)*ripple,r*.77*math.sin(a)*ripple))
            vs.append(tuple(direction @ (v*scale)+Vector(center))); uv.append((k/seg,j/(len(profile)-1)))
    for j in range(len(profile)-1):
        for k in range(seg):
            a=j*(seg+1)+k; b=a+seg+1; fs.append((a,a+1,b+1,b))
    fs.extend([tuple(range(seg,-1,-1)),tuple((len(profile)-1)*(seg+1)+k for k in range(seg+1))])
    ch.surface(vs,fs,uv,0)
    for dy in [-.003,.003]:
        p=direction @ Vector((-.047,dy,0))*scale+Vector(center)
        ch.ellipsoid(p,(.007*scale,.004*scale,.004*scale),1,16,10,rot=direction)
drumstick((-.059,-.047,.179),-.7,1.08)
drumstick((.048,.047,.183),2.3,1.12)
for xyz,scale,angle in [((.069,-.051,.173),(.035,.026,.023),.4),((-.064,.059,.173),(.029,.024,.020),1.7),((.005,-.003,.180),(.031,.024,.024),-.9)]:
    ch.ellipsoid(xyz,scale,0,36,22,Matrix.Rotation(angle,3,'Z'),.12)
ch.build()

on=Mesh('Birista_curls','Onions',[onion])
for i in range(120):
    a=random.uniform(0,math.tau); r=.155*math.sqrt(random.random()); x,y=r*math.cos(a),r*math.sin(a)
    z=rice_height(x,y)+.004
    # Most curls sit on rice; a few crown the meat.
    if r<.10 and random.random()<.4: z+=.026
    ang=random.uniform(0,math.tau); length=random.uniform(.012,.030)
    pts=[]
    for t in np.linspace(0,1,10):
        u=(t-.5)*length; v=.0035*math.sin(t*5)+.002*math.sin(t*9)
        pts.append((x+u*math.cos(ang)-v*math.sin(ang),y+u*math.sin(ang)+v*math.cos(ang),z+.0025*math.sin(t*4)))
    on.tube(pts,random.uniform(.0005,.00095),0,5)
on.build()

herbs=Mesh('Mint_and_coriander_leaves','Herbs',[mint,vein])
def leaf(center,length,width,angle,tilt):
    rot=Matrix.Rotation(angle,3,'Z') @ Matrix.Rotation(tilt,3,'X')
    vs=[];uv=[];fs=[];rows=14
    for j in range(rows+1):
        t=j/rows; w=width*(math.sin(math.pi*t)**.85)*(1+.12*math.sin(t*math.pi*14))
        for k in range(5):
            side=k/2-1
            p=Vector(((t-.32)*length,side*w,.0018*math.sin(math.pi*t)-.0015*abs(side)*math.sin(math.pi*t)))
            vs.append(tuple(Vector(center)+rot@p));uv.append((t,k/4))
    for j in range(rows):
        for k in range(4):
            a=j*5+k;fs.append((a,a+5,a+6,a+1))
    herbs.surface(vs,fs,uv)
    def transform(p): return tuple(Vector(center)+rot@Vector(p))
    herbs.tube([transform(((t-.32)*length,0,.0003+.0018*math.sin(math.pi*t))) for t in np.linspace(0,1,12)],.00018,1,4)
    for t in [.25,.42,.59,.74]:
        for side in [-1,1]:
            herbs.tube([transform(((t-.32)*length,0,.0018*math.sin(math.pi*t)+.0004)),transform(((t+.10-.32)*length,side*width*math.sin(math.pi*t)*.73,.0005))],.00010,1,3)
for x,y,z,ang in [(-.105,-.084,.166,.4),(.105,.055,.166,2),(-.078,.101,.164,3.2),(.02,-.115,.162,.7),(.055,.108,.166,2.7),(-.018,.03,.208,-.9),(.121,-.045,.160,1.8)]:
    for i in range(3): leaf((x+i*.003,y+i*.002,z+i*.0007),random.uniform(.020,.028),random.uniform(.006,.009),ang+i*1.9,random.uniform(-.35,.35))
herb_obj=herbs.build()
herb_obj.data.materials[0].use_backface_culling=False

nuts=Mesh('Toasted_cashew_halves','Nuts',[cashew])
for x,y,angle in [(-.119,.025,.5),(.106,-.093,2),(-.02,-.117,-.8),(.015,.119,1.5),(.129,.009,-.7),(-.09,-.104,2.3),(.014,.048,2.3),(-.038,.100,-.5)]:
    z=rice_height(x,y)+.005; rot=Matrix.Rotation(angle,3,'Z')
    pts=[tuple(Vector((x,y,z))+rot@Vector((.008*math.cos(t),.006*math.sin(t),.001*math.cos(t)))) for t in np.linspace(-2.1,2.1,18)]
    nuts.tube(pts,.0028,0,8)
nuts.build()

sp=Mesh('Cardamom_cinnamon_cloves','WholeSpices',[spice,cardamom])
for x,y,a in [(-.133,-.018,.6),(.067,.115,-.7),(.127,.061,1.7)]:
    z=rice_height(x,y)+.004; rot=Matrix.Rotation(a,3,'Z')
    sp.ellipsoid((x,y,z),(.006,.0032,.0028),1,14,8,rot,.07)
    for k in range(5):
        t=k*math.tau/5
        pts=[tuple(Vector((x,y,z))+rot@Vector((.0055*u,.0033*math.sqrt(max(0,1-u*u))*math.cos(t),.0029*math.sqrt(max(0,1-u*u))*math.sin(t)))) for u in np.linspace(-.9,.9,12)]
        sp.tube(pts,.00016,0,3)
for x,y,a in [(-.077,.081,.3),(.077,-.100,1.2)]:
    z=rice_height(x,y)+.004
    for i in range(4):
        pts=[(x+math.cos(a)*u,y+math.sin(a)*u+i*.0007,z+.0007*math.sin(u*250+i)) for u in np.linspace(-.014,.014,9)]
        sp.tube(pts,.0011,0,5)
# Star anise: one small open eight-pointed star.
x,y=-.115,.071;z=rice_height(x,y)+.004
for i in range(8):
    a=i*math.tau/8; pts=[]
    for t in np.linspace(0,math.tau,12):
        r=.004*(1-math.cos(t));side=.0011*math.sin(t)
        pts.append((x+r*math.cos(a)-side*math.sin(a),y+r*math.sin(a)+side*math.cos(a),z+.001*math.sin(t/2)))
    sp.tube(pts,.00065,0,5)
sp.build()

sf=Mesh('Saffron_filaments','Saffron',[thread])
for i in range(35):
    a=random.uniform(0,math.tau);r=random.uniform(.035,.145);x,y=r*math.cos(a),r*math.sin(a);z=rice_height(x,y)+.004
    sf.tube([(x+t*.009,y+.0014*math.sin(t*5+i),z+.0004*math.cos(t*4)) for t in np.linspace(-.5,.5,9)],.00013,0,4)
sf.build()

# One authored 3-second clip; parent tracks preserve ingredient internals.
# Runtime can also set these offsets directly with a normalized separation value.
offsets={'Vessel':0,'Rice':.105,'Chicken':.225,'Onions':.33,'WholeSpices':.425,'Nuts':.50,'Herbs':.59,'Saffron':.675}
for name,ob in groups.items():
    ob['explodeOffsetY']=offsets[name]; ob['restPosition']=[0.,0.,0.]
    ob.location=(0,0,0); ob.keyframe_insert(data_path='location',frame=1,group='Ingredient separation')
    ob.location.z=offsets[name]; ob.keyframe_insert(data_path='location',frame=91,group='Ingredient separation')
scene.frame_set(1)

# Independent RGBA steam cards and a deterministic 4x4 flipbook, with clear padding.
# These are procedural water-vapour sprites, not opaque planes inside the GLB.
def steam_field(n,phase):
    y,x=np.mgrid[0:1:complex(n),-1:1:complex(n)]
    envelope=(np.sin(np.pi*y)**1.3)*(1-np.exp(-y*18))*np.exp(-y*1.1)
    alpha=np.zeros((n,n))
    turbulence=noise(n,18,72)+.45*noise(n,48,91)
    for i in range(4):
        centre=.14*math.sin(phase+i*1.7)+(.11+.22*y)*np.sin(y*11+phase+i*1.8)
        width=.045+.17*y
        ribbon=np.exp(-((x-centre-(i-1.5)*.11)/width)**2*2)
        alpha+=ribbon*envelope*(.22+.16*np.sin(y*13+phase+i))
    alpha=np.clip(alpha*(.35+.65*turbulence),0,.64)
    # Bottom/top fade and transparent perimeter prevent billboard rectangles.
    alpha*=np.minimum(1,y*16)*np.minimum(1,(1-y)*10)*np.clip((1-np.abs(x))*5,0,1)
    # Image pixel row zero is the bottom in Blender; all PNGs have upward wisps.
    return np.dstack((np.full_like(alpha,.94),np.full_like(alpha,.96),np.ones_like(alpha),alpha))
steamdir=ROOT/'public/textures/steam'
for i in range(3): image_file('steam_wisp_'+str(i+1),steam_field(512,i*1.8),steamdir)
atlas=np.zeros((1024,1024,4))
for row in range(4):
    for col in range(4):
        # Serialized frame order is top-left to bottom-right after PNG save.
        atlas[(3-row)*256:(4-row)*256,col*256:(col+1)*256]=steam_field(256,(row*4+col)*math.tau/16)
image_file('steam_flipbook_4x4',atlas,steamdir)

bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for ob in scene.objects:
    if ob.parent in list(groups.values()) or ob in groups.values(): ob.select_set(True)
scene['asset_notes']='Original royal chicken biryani; named ingredient parents; metres; separate steam sprites.'
scene['animation_notes']='RoyalBiryani_Explode: frame 1 assembled, frame 91 separated at 30fps.'
bpy.ops.export_scene.gltf(filepath=str(RUNTIME/'royal_biryani.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_extras=True,export_yup=True,export_cameras=False,export_lights=False)
shutil.copy2(RUNTIME/'royal_biryani.glb',ROOT/'assets/models/biryani/royal_biryani.glb')

# Studio is source-only. It is explicitly excluded from the runtime GLB.
studio=bpy.data.collections.new('STUDIO_source_only');scene.collection.children.link(studio)
def to_studio(ob):
    for c in list(ob.users_collection): c.objects.unlink(ob)
    studio.objects.link(ob)

floor=solid('Studio_warm_charcoal',(.019,.024,.023),.73)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.016))
ob=bpy.context.object;ob.name='Studio_floor';ob.data.materials.append(floor);to_studio(ob)
def area(name,location,energy,color,size,target=(0,0,.12)):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;data.color=color
    ob=bpy.data.objects.new(name,data);studio.objects.link(ob);ob.location=location
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
area('Warm_large_key',(-.40,-.38,.72),10,(1,.89,.76),.48)
area('Cool_fill',(.45,-.1,.40),4,(.80,.88,1),.4)
area('Golden_edge',(.06,.42,.55),10,(1,.79,.53),.30)
world=bpy.data.worlds.new('Studio_world');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.08,.11,.10,1);world.node_tree.nodes['Background'].inputs[1].default_value=.25;scene.world=world
data=bpy.data.cameras.new('Asset_camera');cam=bpy.data.objects.new('Asset_camera',data);studio.objects.link(cam);scene.camera=cam
def camera_at(pos,target,scale):
    cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=scale;data.lens=50
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
camera_at((.45,-.67,.54),(0,0,.11),.59)
scene.render.resolution_x=1500;scene.render.resolution_y=1250
scene.render.filepath=str(PREVIEW/'assembled.png')

meshes=[ob for ob in scene.objects if ob.type=='MESH' and ob.parent in groups.values()]
triangles=sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in meshes)
manifest={'asset':'RoyalBiryani','version':1,'file':'royal_biryani.glb','units':'metres','upAxis':'Y','sourceUpAxis':'Z','groups':[{'name':n,'label':o['ingredient'],'restPosition':[0,0,0],'explodeOffset':[0,offsets[n],0]} for n,o in groups.items()],'triangles':triangles,'meshCount':len(meshes),'animation':{'name':'Scene','durationSeconds':3,'assembledTime':0,'explodedTime':3},'steam':{'wispFiles':['/textures/steam/steam_wisp_'+str(i)+'.png' for i in range(1,4)],'flipbook':'/textures/steam/steam_flipbook_4x4.png','columns':4,'rows':4,'frames':16,'frameOrder':'top-left, row-major','suggestedFPS':8,'alpha':'straight','colorSpace':'sRGB','blend':'normal transparent','depthWrite':False,'anchor':'bottom centre','suggestedWorldHeight':.18}}
(RUNTIME/'manifest.json').write_text(json.dumps(manifest,indent=2))
(SOURCE/'manifest.json').write_text(json.dumps(manifest,indent=2))
# Save an assembled editable scene before rendering, including packed PBR images.
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'royal_biryani.blend'))
print('ASSET_STATS',json.dumps({'triangles':triangles,'meshes':len(meshes),'glbBytes':(RUNTIME/'royal_biryani.glb').stat().st_size}),flush=True)
bpy.ops.render.render(write_still=True)
scene.frame_set(91)
camera_at((.68,-1.10,.73),(0,0,.43),1.15)
scene.render.resolution_x=1200;scene.render.resolution_y=1700
scene.render.filepath=str(PREVIEW/'exploded.png')
bpy.ops.render.render(write_still=True)
scene.frame_set(1)
camera_at((.45,-.67,.54),(0,0,.11),.59)
scene.render.resolution_x=1500;scene.render.resolution_y=1250
scene.render.filepath=str(PREVIEW/'assembled.png')
print('BIRYANI_COMPLETE',flush=True)
