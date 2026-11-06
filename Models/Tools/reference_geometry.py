"""Reference-led handi, full particle rice heap and deliberately composed garnish.
Executes in geometry_source's Mesh/material authoring namespace.
"""
# The supplied image has a plain, deep hammered handi, not a banded shallow tray.
ivory.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.89,.83,.68,1)
whiterice.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.98,.95,.83,1)
saffron.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.93,.51,.012,1)
goldrice.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.96,.77,.22,1)
inside.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.36,.34,.28,1)
bone.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.44,.30,.13,1)
mint.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.018,.16,.025,1)
chicken.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.42
for mat in [ivory,whiterice,saffron,goldrice]:mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.44

vessel=Mesh('Hammered_copper_handi','Vessel',[copper,inside,gold])
profile=[(.0001,.012),(.10,.012),(.139,.016),(.162,.026),(.174,.046),(.179,.073),(.178,.108),(.173,.137),(.171,.150),(.174,.153),(.175,.157),(.172,.159),(.168,.156),(.167,.149),(.169,.136),(.173,.107),(.174,.074),(.168,.049),(.153,.033),(.13,.025),(.09,.024),(.0001,.024)]
lathe(vessel,profile,segments=80)
for i in range(11*80,len(vessel.mi)):vessel.mi[i]=1
# Restrained steel lip and copper rolled edge. No green band or gold striping.
def rim(r,z,t,material=0):
    vessel.tube([(r*math.cos(a),r*math.sin(a),z) for a in np.linspace(0,math.tau,81)],t,material,6)
rim(.1725,.156,.0022,1);rim(.174,.149,.00085,0)
for side in [-1,1]:
    # Actual upright oval loops, with riveted supports below the lip.
    points=[(side*(.182+.026*math.cos(t)),.005,.159+.035*math.sin(t)) for t in np.linspace(0,math.tau,33)]
    vessel.tube(points,.0028,0,7)
    for z in [.127,.143]:vessel.ellipsoid((side*.174,.003,z),(.004,.004,.003),0,8,5)
vessel.build()

rice=Mesh('Basmati_grains','Rice',[ivory,saffron,goldrice,whiterice])
def rice_height(x,y):
    r=math.hypot(x,y)/.166
    # Unequal heaps and shallow serving hollows; never a planar disc.
    return .157+.049*max(0,1-r*r)+.0055*math.sin(x*35+y*19)*math.cos(y*31)+.002*math.sin(x*103-y*77)
exec((BASE/'Tools/rice_particles.py').read_text(),globals())
rice.build()

ch=Mesh('Chicken_on_the_bone','Chicken',[chicken,bone])
def drum(center,angle,length=.078,width=.023):
    rot=Matrix.Rotation(angle,3,'Z') @ Matrix.Rotation(.18,3,'Y')
    # Asymmetric drumstick with tendon, shoulder and collapsed skin folds.
    profiles=[(-.53,.07),(-.47,.11),(-.36,.16),(-.24,.27),(-.10,.63),(.05,.92),(.22,1.0),(.36,.87),(.45,.59),(.49,.11)]
    vs=[];uv=[];fs=[];seg=22
    for j,(x,r) in enumerate(profiles):
        for k in range(seg+1):
            a=k*math.tau/seg
            fold=1+.09*math.sin(a*3+j*.9)+.045*math.sin(a*9-j*1.7)
            # A small longitudinal tendon groove changes the silhouette.
            fold-=.09*math.exp(-((a-2.2)/.20)**2)*math.sin(math.pi*j/9)**2
            p=Vector((x*length,width*r*math.cos(a)*fold,width*r*.77*math.sin(a)*fold+.003*math.sin(j*.4)))
            vs.append(tuple(rot@p+Vector(center)));uv.append((k/seg,j/9))
    for j in range(9):
        for k in range(seg):
            a=j*(seg+1)+k;b=a+seg+1;fs.append((a,a+1,b+1,b))
    fs.extend([tuple(range(seg,-1,-1)),tuple(9*(seg+1)+k for k in range(seg+1))])
    ch.surface(vs,fs,uv)
    for dy in [-.002,.002]:
        tip=rot@Vector((-.53*length,dy,0))+Vector(center)
        ch.ellipsoid(tip,(.004,.0027,.0027),1,8,5,rot)
drum((-.067,-.052,.190),-1.1,.077,.022)
drum((.068,-.040,.193),.7,.082,.024)
drum((.008,.073,.200),2.6,.070,.022)
# One partially buried cut piece, elongated and folded rather than a sphere.
ch.ellipsoid((-.053,.055,.184),(.024,.019,.014),0,20,12,Matrix.Rotation(.6,3,'Z'),.18)
ch.build()

# Crisp, wide ribbons gathered into a central birista nest, with stray curls.
on=Mesh('Caramelized_onion_ribbons','Onions',[onion])
for i in range(95):
    a=random.uniform(0,math.tau);r=random.uniform(.005,.061) if i<70 else random.uniform(.06,.15)
    x,y=r*math.cos(a),r*math.sin(a);z=rice_height(x,y)+.004
    if i<70:z+=random.uniform(.003,.015)
    direction=random.uniform(0,math.tau);radius=random.uniform(.006,.017);arc=random.uniform(2,5.8)
    pts=[];uv=[];faces=[];steps=11
    width=random.uniform(.0008,.0018)
    for j,t in enumerate(np.linspace(0,arc,steps)):
        u=radius*math.cos(t);v=radius*math.sin(t)
        h=z+.0025*math.sin(t*1.4+i)+.001*math.cos(t*3)
        for sign in [-1,1]:
            rr=radius+sign*width*(.6+.4*math.sin(math.pi*j/(steps-1)))
            u,v=rr*math.cos(t),rr*math.sin(t)
            pts.append((x+u*math.cos(direction)-v*math.sin(direction),y+u*math.sin(direction)+v*math.cos(direction),h+sign*.0003*math.sin(t*2)))
            uv.append((j/(steps-1),(sign+1)/2))
    for j in range(steps-1):a=j*2;faces.append((a,a+1,a+3,a+2))
    on.surface(pts,faces,uv)
on.build()

herbs=Mesh('Mint_sprig_and_coriander','Herbs',[mint,vein])
def leaf(center,length,width,angle,tilt):
    rot=Matrix.Rotation(angle,3,'Z') @ Matrix.Rotation(tilt,3,'Y');vs=[];uv=[];faces=[];rows=12
    for j in range(rows+1):
        t=j/rows;w=width*math.sin(math.pi*t)**.8*(1+.09*math.sin(t*math.pi*22))
        for k in range(5):
            side=(k-2)/2
            p=Vector((t*length,side*w,.0035*math.sin(math.pi*t)-.002*abs(side)*math.sin(math.pi*t)))
            vs.append(tuple(rot@p+Vector(center)));uv.append((t,k/4))
    for j in range(rows):
        for k in range(4):a=j*5+k;faces.append((a,a+5,a+6,a+1))
    herbs.surface(vs,faces,uv)
    herbs.tube([tuple(rot@Vector((t*length,0,.0037*math.sin(math.pi*t)))+Vector(center)) for t in np.linspace(0,1,8)],.00015,1,3)
for a,l,w,tilt in [(-.2,.034,.012,-.25),(1.45,.039,.013,-.12),(3.1,.033,.012,-.18),(4.5,.030,.011,.10)]:
    leaf((.005,.010,.224),l,w,a,tilt)
for x,y,a in [(-.12,-.04,.5),(.11,.055,2.4),(-.07,.105,-1),(.03,-.122,1.8)]:
    leaf((x,y,rice_height(x,y)+.005),.018,.007,a,.1)
herbs.build()

nuts=Mesh('Toasted_cashew_halves','Nuts',[cashew])
for x,y,angle in [(-.115,.025,.5),(.100,-.09,2),(-.02,-.12,-.8),(.018,.12,1.5),(.127,.009,-.7),(-.09,-.10,2.3),(.035,-.06,2.3)]:
    rot=Matrix.Rotation(angle,3,'Z');z=rice_height(x,y)+.004
    points=[tuple(Vector((x,y,z))+rot@Vector((.008*math.cos(t),.006*math.sin(t),.001*math.cos(t)))) for t in np.linspace(-2.1,2.1,14)]
    nuts.tube(points,.0027,0,6)
nuts.build()

sp=Mesh('Whole_spices_and_raisins','WholeSpices',[spice,cardamom])
for i in range(9):
    a=random.uniform(0,math.tau);r=random.uniform(.055,.148);x,y=r*math.cos(a),r*math.sin(a);z=rice_height(x,y)+.003
    sp.ellipsoid((x,y,z),(.0038,.0027,.0022),0,8,5,Matrix.Rotation(a,3,'Z'),.18)
for x,y,a in [(-.132,-.018,.6),(.067,.115,-.7),(.127,.061,1.7)]:
    sp.ellipsoid((x,y,rice_height(x,y)+.003),(.005,.0028,.0024),1,10,6,Matrix.Rotation(a,3,'Z'),.09)
for x,y,a in [(-.09,.08,.3),(.08,-.10,1.2)]:
    z=rice_height(x,y)+.003
    sp.tube([(x+math.cos(a)*u,y+math.sin(a)*u,z) for u in np.linspace(-.013,.013,6)],.0017,0,6)
sp.build()
sf=Mesh('Saffron_filaments','Saffron',[thread])
for i in range(16):
    a=random.uniform(0,math.tau);r=random.uniform(.04,.14);x,y=r*math.cos(a),r*math.sin(a);z=rice_height(x,y)+.003
    sf.tube([(x+t*.010,y+.0015*math.sin(t*4+i),z+.0005*math.sin(t*3)) for t in np.linspace(-.5,.5,7)],.00013,0,3)
sf.build()
