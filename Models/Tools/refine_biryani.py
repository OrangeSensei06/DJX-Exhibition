"""Blender 5.2: deterministic geometry, Cycles PBR baking, export and QA.
Run: blender --background --python Models/Tools/refine_biryani.py
The preserved geometry_source.py is a local authoring dependency, never executed
as a standalone generator by this pipeline. No network or photograph textures.
"""
from pathlib import Path
import bpy, math, json, struct, hashlib, random, tempfile, sys
import numpy as np
from mathutils import Vector

BASE=Path(__file__).resolve().parents[1]
for folder in ['Textures','Source','Previews','Backup']: (BASE/folder).mkdir(exist_ok=True)
TEX=BASE/'Textures'
TEXTURES=TEX
temporary=BASE/'Source/Temp'
temporary.mkdir(exist_ok=True)
tempfile.tempdir=str(temporary)

def glb_stats(path):
    data=path.read_bytes(); size,kind=struct.unpack_from('<II',data,12)
    j=json.loads(data[20:20+size]); acc=j.get('accessors',[])
    primitives=[p for m in j.get('meshes',[]) for p in m['primitives']]
    return dict(bytes=len(data),triangles=sum(acc[p['indices']]['count']//3 for p in primitives),
        vertices=sum(acc[p['attributes']['POSITION']]['count'] for p in primitives),
        meshes=len(j.get('meshes',[])),primitives=len(primitives),materials=len(j.get('materials',[])),
        images=len(j.get('images',[])),nodes=[{'name':n.get('name'), 'children':n.get('children',[])} for n in j['nodes']])

original=glb_stats(BASE/'Mughal_Times_Biryani.glb')
(BASE/'Source/original_stats.json').write_text(json.dumps(original,indent=2))

# Reuse the useful artisan silhouettes, with bounded geometry and curved grains.
code=(BASE/'Tools/geometry_source.py').read_text()
code=code[:code.index('# One authored 3-second clip')]
start=code.index('ROOT ='); end=code.index('random.seed')
code=code[:start]+code[end:]
start=code.index('def textured('); end=code.index('def solid(')
code=code[:start]+'''def textured(name,colors,roughness=.5,metallic=0,strength=.18,size=512):
    return solid(name,colors[len(colors)//2],roughness,metallic)

'''+code[end:]
code=code.replace('range(6000)','range(2400)').replace('range(2200)','range(180)').replace('range(900)','range(80)')
code=code.replace('range(40)','range(16)').replace('i/40','i/16').replace('segments=128','segments=80')
code=code.replace('12*128','12*80').replace('161','65').replace('seg=40','seg=24').replace('36,22','24,14')
code=code[:code.index('# Brass floral engraving')]+code[code.index('# Two low loop handles'):]
code=code.replace('rows=14','rows=7').replace('range(120)','range(45)')
code=code.replace('mesh.tube(pts,thickness,mat,8)','mesh.tube(pts,thickness,mat,5)')
code=code.replace('on.tube(pts,random.uniform(.0005,.00095),0,5)','on.tube(pts,random.uniform(.0005,.00095),0,4)')
code=code[:code.index('    for t in [.25,.42,.59,.74]:')]+code[code.index('for x,y,z,ang in '):]
code=code.replace('if r<.10 and random.random()<.4: z+=.026','if False: z+=.026')
code=code.replace('segments=80','segments=64').replace('12*80','12*64').replace('65)]','49)]')
code=code.replace('np.linspace(0,math.pi,33)','np.linspace(0,math.pi,25)').replace('vessel.tube(pts,.0032,2,8)','vessel.tube(pts,.0032,2,6)')
code=code.replace('np.linspace(-2.1,2.1,18)','np.linspace(-2.1,2.1,14)').replace('nuts.tube(pts,.0028,0,8)','nuts.tube(pts,.0028,0,6)')
code=code[:code.index('    for k in range(5):\n        t=k*math.tau/5')]+code[code.index('for x,y,a in [(-.077,.081,.3)'):]
code=code.replace('range(35)','range(18)')
# Four organic prototypes share a 16-triangle swept grain topology. The arch
# and unequal shoulder radii distinguish them without cylinder end caps.
needle='''        vs=[]; uvs=[]; fs=[]
        for j in range(rings+1):'''
grain='''        if max(scale)/max(1e-8,min(scale))>3 and seg==6:
            vs=[];uvs=[];fs=[]
            variant=(len(self.v)//16)%4
            for j,x in enumerate([-1,-.42,.45,1]):
                radius=[0,.94,1,0][j]
                for k in range(4):
                    a=k*math.tau/4
                    p=Vector((x*scale[0],radius*scale[1]*math.cos(a)+(.15+.035*variant)*scale[0]*(1-x*x),radius*scale[2]*math.sin(a)))
                    if rot is not None:p=rot@p
                    vs.append(tuple(p+Vector(center)));uvs.append((j/3,k/4))
            for j in range(3):
                for k in range(4):
                    a=j*4+k;b=j*4+(k+1)%4;c=(j+1)*4+k;d=(j+1)*4+(k+1)%4
                    if j==0:fs.append((a,c,d))
                    elif j==2:fs.append((a,c,b))
                    else:fs.extend([(a,c,b),(b,c,d)])
            self.surface(vs,fs,uvs,material)
            return
        vs=[]; uvs=[]; fs=[]
        for j in range(rings+1):'''
code=code.replace(needle,grain)
code=code.replace('.0046*random.uniform(.85,1.2),.00113,.001','.0064*random.uniform(.85,1.2),.00165,.0012')
code=code.replace('random.uniform(-.001,.004)','random.uniform(-.0003,.002)')
# Keep the fill just below the visible grains rather than a smooth overlaid cap.
code=code.replace('(.166,.132),(.154,.142),(.122,.155),(.08,.166),(.0001,.175)',
                  '(.166,.130),(.154,.141),(.122,.153),(.08,.164),(.0001,.173)')
code=code.replace('v=Vector((scale[0]*math.sin(t)*math.cos(a)*k,scale[1]*math.sin(t)*math.sin(a)*k,scale[2]*math.cos(t)*k))',
'''bend = .15*scale[0]*math.sin(t)**2 if max(scale)/max(1e-8,min(scale))>3 else 0
                v=Vector((scale[0]*math.sin(t)*math.cos(a)*k,scale[1]*math.sin(t)*math.sin(a)*k+bend,scale[2]*math.cos(t)*k))''')
# Replace the ENTIRE filled mound and sparse scatter with a three-dimensional
# particle heap. There is deliberately no lathed cap, hidden dome or food slab.
start=code.index('# Covered base retains');end=code.index('rice.build()',start)
particle_code=(BASE/'Tools/rice_particles.py').read_text()
code=code[:start]+particle_code+'\n'+code[end:]
code=code[:code.index('# Wide, squat')]+(BASE/'Tools/reference_geometry.py').read_text()
exec(compile(code,str(BASE/'Tools/geometry_source.py'),'exec'),globals())
assert len(rice.f)==rice_triangle_count
assert all(len(face)==3 for face in rice.f), 'Rice must contain only closed kernel triangles'
(BASE/'Source/rice_particles.json').write_text(json.dumps({'counts':particle_counts,'total':sum(particle_counts.values()),'fillerMeshes':0},indent=2))
root.name='Biryani_Root'
mapping={'Vessel':'bowl','Rice':'rice','Chicken':'protein','Onions':'onions','Herbs':'herbs','WholeSpices':'spices','Saffron':'saffron'}
for old,new in mapping.items(): groups[old].name=new
# Keep cashews a separate mesh within spices for the current reconstruction game.
nuts_object=next(o for o in scene.objects if o.type=='MESH' and o.parent==groups['Nuts'])
nuts_object.name='Cashews_16'; nuts_object.parent=groups['WholeSpices']
bpy.data.objects.remove(groups['Nuts'],do_unlink=True); del groups['Nuts']
meshes=[o for o in scene.objects if o.type=='MESH']
for ob in meshes:
    for v in ob.data.vertices: v.co*=7.25
    ob.data.update()
    ob['source_units']='Scaled to match original exhibition model; glTF Y-up'

# Each source material has one padded reusable tile. Food has 13 tiles, copper 4.
source_mats=list(dict.fromkeys(m for o in meshes for m in o.data.materials))
metal_mats=[copper,inside,gold,enamel]
food_mats=[m for m in source_mats if m not in metal_mats]
sets={'Copper':metal_mats,'Food':food_mats}
scene.render.engine='CYCLES'; scene.cycles.samples=16
scene.render.bake.margin=4; scene.render.bake.use_clear=False
scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True

def new_image(name,noncolor=True):
    im=bpy.data.images.new(name,width=1024,height=1024,alpha=False)
    if noncolor: im.colorspace_settings.name='Non-Color'
    return im

def save_image(im):
    im.filepath_raw=str(TEX/(im.name+'.png'));im.file_format='PNG'; im.save(); im.pack()

def target(mat,im):
    nt=mat.node_tree
    for n in nt.nodes: n.select=False
    node=nt.nodes.get('BAKE_TARGET') or nt.nodes.new('ShaderNodeTexImage')
    node.name='BAKE_TARGET';node.image=im;node.select=True;nt.nodes.active=node

def bake(ob,kind,im):
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    for mat in ob.data.materials: target(mat,im)
    bpy.ops.object.bake(type=kind)

def setup_source(mat,index,grid):
    nt=mat.node_tree;bs=nt.nodes.get('Principled BSDF'); base=tuple(bs.inputs['Base Color'].default_value)
    rough=bs.inputs['Roughness'].default_value;metal=bs.inputs['Metallic'].default_value
    uv=nt.nodes.new('ShaderNodeTexCoord');mapping=nt.nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY_ADD'
    nt.links.new(uv.outputs['UV'],mapping.inputs[0]);mapping.inputs[1].default_value=(grid/0.90,grid/0.90,1)
    mapping.inputs[2].default_value=(-(index%grid+.05)/.90,-(index//grid+.05)/.90,0)
    noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=8 if mat!=chicken else 29
    noise.inputs['Detail'].default_value=4;nt.links.new(mapping.outputs[0],noise.inputs['Vector'])
    ramp=nt.nodes.new('ShaderNodeValToRGB');nt.links.new(noise.outputs['Fac'],ramp.inputs[0])
    factor=.87 if mat in [ivory,whiterice,saffron,goldrice] else (.6 if mat not in [chicken,onion] else .20)
    ramp.color_ramp.elements[0].position=.25;ramp.color_ramp.elements[0].color=(*[c*factor for c in base[:3]],1)
    ramp.color_ramp.elements[1].position=.78;ramp.color_ramp.elements[1].color=(*[min(1,c*1.22) for c in base[:3]],1)
    nt.links.new(ramp.outputs[0],bs.inputs['Base Color'])
    if mat==chicken:
        ramp.color_ramp.elements[0].position=.38;ramp.color_ramp.elements[0].color=(.065,.016,.002,1)
        ramp.color_ramp.elements[1].position=.65;ramp.color_ramp.elements[1].color=(.48,.17,.025,1)
    fine=nt.nodes.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=55;fine.inputs['Detail'].default_value=2
    nt.links.new(mapping.outputs[0],fine.inputs['Vector'])
    bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.28;bump.inputs['Distance'].default_value=.004
    if mat==copper:
        vor=nt.nodes.new('ShaderNodeTexVoronoi');vor.inputs['Scale'].default_value=38;nt.links.new(mapping.outputs[0],vor.inputs['Vector'])
        nt.links.new(vor.outputs['Distance'],bump.inputs['Height']);bump.inputs['Distance'].default_value=.007
    else: nt.links.new(fine.outputs['Fac'],bump.inputs['Height'])
    if mat==mint:
        # A baked leaf vein network, including raised midrib and paired veins.
        yy,xx=np.mgrid[0:1:256j,0:1:256j]
        mid=np.exp(-((yy-.5)/.014)**2)
        branchphase=(xx-np.abs(yy-.5)*.60)*7
        branch=np.exp(-(np.sin(math.pi*branchphase)/.13)**2)
        height=.7*mid+.35*branch
        hi=bpy.data.images.new('Mint vein source',width=256,height=256,alpha=False);hi.colorspace_settings.name='Non-Color'
        hi.pixels.foreach_set(np.dstack([height,height,height,np.ones_like(height)]).astype(np.float32).ravel());hi.pack()
        node=nt.nodes.new('ShaderNodeTexImage');node.image=hi;nt.links.new(mapping.outputs[0],node.inputs[0]);nt.links.new(node.outputs[0],bump.inputs['Height'])
        bump.inputs['Strength'].default_value=.55;bump.inputs['Distance'].default_value=.0015
        tint=nt.nodes.new('ShaderNodeValToRGB');nt.links.new(node.outputs[0],tint.inputs[0])
        tint.color_ramp.elements[0].color=(.007,.085,.011,1);tint.color_ramp.elements[1].color=(.06,.22,.027,1)
        nt.links.new(tint.outputs[0],bs.inputs['Base Color'])
    if mat in [chicken,copper]:
        image=bpy.data.images.load(str(BASE/'Source/Chicken_Copper_Surface_Source.png'),check_existing=True);image.pack()
        coords=nt.nodes.new('ShaderNodeVectorMath');coords.operation='MULTIPLY_ADD';nt.links.new(mapping.outputs[0],coords.inputs[0])
        coords.inputs[1].default_value=(.47,.96,1);coords.inputs[2].default_value=(.015 if mat==chicken else .515,.02,0)
        texture=nt.nodes.new('ShaderNodeTexImage');texture.image=image;nt.links.new(coords.outputs[0],texture.inputs[0])
        adjust=nt.nodes.new('ShaderNodeHueSaturation');adjust.inputs['Saturation'].default_value=1.10;adjust.inputs['Value'].default_value=.38 if mat==chicken else .75
        nt.links.new(texture.outputs[0],adjust.inputs['Color']);nt.links.new(adjust.outputs[0],bs.inputs['Base Color'])
        bw=nt.nodes.new('ShaderNodeRGBToBW');nt.links.new(texture.outputs[0],bw.inputs[0]);nt.links.new(bw.outputs[0],bump.inputs['Height'])
        bump.inputs['Distance'].default_value=.0025 if mat==chicken else .002
        bump.inputs['Strength'].default_value=.35
        if mat==copper:bs.inputs['Metallic'].default_value=.94;metal=.94
    if mat.name=='REMOVED_UNUSED_RICE_FILL':
        # Offline high-detail relief field: overlapping tapered basmati kernels.
        # Color is pigment only; shading comes from the baked tangent normals.
        rng=np.random.default_rng(1707);yy,xx=np.mgrid[0:1:256j,0:1:256j]
        height=np.zeros((256,256));color=np.zeros((256,256,4));color[:]=(.65,.49,.22,1)
        palette=[(.94,.85,.62),(.98,.92,.76),(.95,.62,.10),(.82,.30,.018)]
        for k in range(650):
            x,y=rng.random(2);angle=rng.uniform(0,math.tau);dx=xx-x;dy=yy-y
            u=(dx*math.cos(angle)+dy*math.sin(angle))/rng.uniform(.028,.049)
            w=(-dx*math.sin(angle)+dy*math.cos(angle))/rng.uniform(.006,.010)
            h=np.sqrt(np.maximum(0,1-u*u-w*w))*.045+rng.uniform(0,.02)
            mask=(u*u+w*w<1)&(h>height);height[mask]=h[mask];color[mask,:3]=palette[rng.choice(4,p=[.35,.35,.23,.07])]
        im=bpy.data.images.new('Rice relief source color',width=256,height=256,alpha=True);im.pixels.foreach_set(color.astype(np.float32).ravel());im.pack()
        hi=bpy.data.images.new('Rice relief source height',width=256,height=256,alpha=True);hi.colorspace_settings.name='Non-Color'
        hi.pixels.foreach_set(np.dstack([height,height,height,np.ones_like(height)]).astype(np.float32).ravel());hi.pack()
        for image,socket in [(im,bs.inputs['Base Color']),(hi,bump.inputs['Height'])]:
            node=nt.nodes.new('ShaderNodeTexImage');node.image=image;nt.links.new(mapping.outputs[0],node.inputs[0]);nt.links.new(node.outputs[0],socket)
        bump.inputs['Distance'].default_value=.12;bump.inputs['Strength'].default_value=.8
    nt.links.new(bump.outputs[0],bs.inputs['Normal'])
    rr=nt.nodes.new('ShaderNodeMapRange');rr.inputs['From Min'].default_value=0;rr.inputs['From Max'].default_value=1
    rr.inputs['To Min'].default_value=max(.14,rough-.16);rr.inputs['To Max'].default_value=min(.9,rough+.15)
    nt.links.new(noise.outputs['Fac'],rr.inputs[0]);nt.links.new(rr.outputs[0],bs.inputs['Roughness'])
    return metal

atlases={}
for family,mats in sets.items():
    grid=2 if family=='Copper' else 4
    v=[];f=[];uvs=[]
    for i,mat in enumerate(mats):
        x,y=i%grid,i//grid; idx=len(v)
        v.extend([(x,y,0),(x+1,y,0),(x+1,y+1,0),(x,y+1,0)])
        f.append((idx,idx+1,idx+2,idx+3));uvs.extend([((x+.05)/grid,(y+.05)/grid),((x+.95)/grid,(y+.05)/grid),((x+.95)/grid,(y+.95)/grid),((x+.05)/grid,(y+.95)/grid)])
    data=bpy.data.meshes.new(family+'_BakePatches');data.from_pydata(v,[],f);data.update()
    ob=bpy.data.objects.new(family+'_BakePatches',data);scene.collection.objects.link(ob);ob.location=(20,0,0)
    layer=data.uv_layers.new(name='UVMap')
    metals=[]
    for i,mat in enumerate(mats):
        data.materials.append(mat);data.polygons[i].material_index=i
        for li in data.polygons[i].loop_indices:layer.data[li].uv=uvs[li]
        metals.append(setup_source(mat,i,grid))
    images={suffix:new_image(family+'_'+suffix,suffix!='BaseColor') for suffix in ['BaseColor','Normal','Roughness','Metallic']}
    # Emit the Base Color input itself: DIFFUSE baking attenuates metal albedo
    # by its diffuse energy, incorrectly turning copper almost black.
    for mat in mats:
        nt=mat.node_tree;bs=nt.nodes.get('Principled BSDF');em=nt.nodes.new('ShaderNodeEmission')
        socket=bs.inputs['Base Color']
        if socket.is_linked:nt.links.new(socket.links[0].from_socket,em.inputs[0])
        else:em.inputs[0].default_value=socket.default_value
        nt.links.new(em.outputs[0],nt.nodes.get('Material Output').inputs['Surface'])
    bake(ob,'EMIT',images['BaseColor'])
    for mat in mats:mat.node_tree.links.new(mat.node_tree.nodes['Principled BSDF'].outputs[0],mat.node_tree.nodes['Material Output'].inputs['Surface'])
    bake(ob,'NORMAL',images['Normal']);bake(ob,'ROUGHNESS',images['Roughness'])
    for mat,metal in zip(mats,metals):
        nt=mat.node_tree;out=nt.nodes.get('Material Output');em=nt.nodes.new('ShaderNodeEmission');em.inputs[0].default_value=(metal,metal,metal,1)
        nt.links.new(em.outputs[0],out.inputs['Surface'])
    bake(ob,'EMIT',images['Metallic'])
    # ORM red is neutral; actual assembled contact AO uses a second UV atlas.
    rgba=np.ones((1024*1024,4),dtype=np.float32)
    roughpix=np.empty(1024*1024*4,dtype=np.float32);images['Roughness'].pixels.foreach_get(roughpix)
    metpix=np.empty_like(roughpix);images['Metallic'].pixels.foreach_get(metpix)
    rgba[:,1]=roughpix.reshape(-1,4)[:,0];rgba[:,2]=metpix.reshape(-1,4)[:,0]
    orm=new_image(family+'_ORM');orm.pixels.foreach_set(rgba.ravel());images['ORM']=orm
    for suffix in ['BaseColor','Normal','ORM']:save_image(images[suffix])
    atlases[family]=images
    bpy.data.objects.remove(ob,do_unlink=True)

# Re-map geometry UVs to reusable padded tiles, replacing all source slots.
final_mats={}
for family in sets:
    mat=bpy.data.materials.new(family+'_Baked_PBR');mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');nt=mat.node_tree
    for suffix,socket in [('BaseColor','Base Color'),('Normal','Normal'),('ORM',None)]:
        node=nt.nodes.new('ShaderNodeTexImage');node.image=atlases[family][suffix];node.label=suffix
        if suffix=='Normal':
            nm=nt.nodes.new('ShaderNodeNormalMap');nt.links.new(node.outputs[0],nm.inputs[1]);nt.links.new(nm.outputs[0],bs.inputs[socket])
        elif suffix=='ORM':
            sep=nt.nodes.new('ShaderNodeSeparateColor');nt.links.new(node.outputs[0],sep.inputs[0])
            nt.links.new(sep.outputs['Green'],bs.inputs['Roughness']);nt.links.new(sep.outputs['Blue'],bs.inputs['Metallic'])
        else:nt.links.new(node.outputs[0],bs.inputs[socket])
    if family=='Copper':mat.use_backface_culling=True
    final_mats[family]=mat
for ob in meshes:
    mats=list(ob.data.materials);family='Copper' if ob.parent.name=='bowl' else 'Food';grid=2 if family=='Copper' else 4
    uv=ob.data.uv_layers[0]
    for poly in ob.data.polygons:
        index=sets[family].index(mats[poly.material_index]);x,y=index%grid,index//grid
        for li in poly.loop_indices:
            u,w=uv.data[li].uv;uv.data[li].uv=((x+.05+.90*u)/grid,(y+.05+.90*w)/grid)
        poly.material_index=0
    ob.data.materials.clear();ob.data.materials.append(final_mats[family])

# Bake real inter-ingredient contact AO in an independently packed UV set.
ao=new_image('Contact_AO')
bpy.ops.object.select_all(action='DESELECT')
for ob in meshes:
    ob.select_set(True);ob.data.uv_layers.new(name='ContactUV');ob.data.uv_layers.active_index=1
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.3,island_margin=.003)
bpy.ops.object.mode_set(mode='OBJECT')
for mat in final_mats.values():target(mat,ao)
bpy.ops.object.bake(type='AO');save_image(ao)
# glTF's recognized occlusion socket keeps contact AO outside unlit albedo.
from io_scene_gltf2.blender.com.material_helpers import create_settings_group
ng=create_settings_group('glTF Material Output')
for mat in final_mats.values():
    nt=mat.node_tree;tex=nt.nodes.new('ShaderNodeTexImage');tex.image=ao
    uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='ContactUV';nt.links.new(uv.outputs[0],tex.inputs[0])
    group=nt.nodes.new('ShaderNodeGroup');group.node_tree=ng;nt.links.new(tex.outputs[0],group.inputs['Occlusion'])
for ob in meshes: ob.data.uv_layers.active_index=0
# Explicit triangulation guarantees a stable tangent basis across Blender/Three.
for ob in meshes:
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    mod=ob.modifiers.new('Export triangulation','TRIANGULATE');bpy.ops.object.modifier_apply(modifier=mod.name)

# Export clean assembled geometry only. Shared origins are zero, Blender Z-up.
for g in groups.values():g.location=(0,0,0)
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for ob in meshes+list(groups.values()):ob.select_set(True)
export=BASE/'Biryani_Refined.glb'
bpy.ops.export_scene.gltf(filepath=str(export),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_tangents=True,export_extras=True)
sys.path.insert(0,str(BASE/'Tools'))
from pack_glb import pack_glb
packing=pack_glb(export)
(BASE/'Source/packing.json').write_text(json.dumps(packing,indent=2))
refined=glb_stats(export)
(BASE/'Source/export_stats.json').write_text(json.dumps(refined,indent=2))
print('EXPORTED',json.dumps(refined),flush=True)

# Studio is source-only, no camera/light nodes enter the GLB.
def area(name,pos,energy,color,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,.9))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm key',(-3,-4,6),700,(1,.86,.70),4)
area('Cool fill',(4,-1,4),420,(.72,.84,1),3)
area('Copper edge',(1,4,5),850,(1,.74,.48),3)
area('Broad frontal copper reflection',(-3,-5,1.7),430,(1,.87,.72),3)
world=bpy.data.worlds.new('Navy studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.065,.085,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4;scene.world=world
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.125))
floor=bpy.context.object;floor.name='Studio_floor';fm=bpy.data.materials.new('Studio navy');fm.use_nodes=True;fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.012,.025,.032,1);fm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;floor.data.materials.append(fm)
d=bpy.data.cameras.new('Studio camera');cam=bpy.data.objects.new('Studio camera',d);scene.collection.objects.link(cam);scene.camera=cam
scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.view_settings.view_transform='AgX'
def camera(pos,target,scale):
    cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=scale
def render(name):
    scene.render.filepath=str(BASE/'Previews'/name);bpy.ops.render.render(write_still=True)
camera((3.7,-5.5,4.2),(0,0,.85),3.9)
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'Source/Biryani_Refined.blend'))
render('After.png')
camera((2.6,-3.8,4),(0,0,1.1),2.6);render('Closeup.png')
camera((-3.7,4.5,2.7),(0,0,.85),3.9);render('Rear.png')
for name,offset in zip(['bowl','rice','saffron','protein','onions','herbs','spices'],[0,.9,1.5,2.1,2.7,3.3,3.9]):
    bpy.data.objects[name].location.z=offset
camera((5,-8,6.3),(0,0,2.7),7);scene.render.resolution_y=1400;render('Exploded_View.png')
for g in groups.values():g.location=(0,0,0)
scene.render.resolution_y=1000;camera((3.7,-5.5,4.2),(0,0,.85),3.9)
for ob in meshes:ob.hide_render=True
prior=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(BASE/'Mughal_Times_Biryani.glb'))
imported=set(scene.objects)-prior
render('Before.png')
for ob in imported:bpy.data.objects.remove(ob,do_unlink=True)
for ob in meshes:ob.hide_render=False

# Reimport actual binary, assert embedded maps, accessible groups and transforms.
prior=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(export));imported=set(scene.objects)-prior
required=['bowl','rice','saffron','protein','onions','herbs','spices']
names={o.name.split('.')[0]:o for o in imported}
assert all(n in names for n in required),names.keys()
assert refined['triangles']<=75000,refined
assert refined['materials']<=5
data=export.read_bytes();j=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
assert all('bufferView' in image and 'uri' not in image for image in j['images'])
assert all('normalTexture' in m and 'occlusionTexture' in m and 'metallicRoughnessTexture' in m['pbrMetallicRoughness'] for m in j['materials'])
for name,off in zip(required,[0,.9,1.5,2.1,2.7,3.3,3.9]):
    assert names[name].location.length<1e-6
    names[name].location.z=off;assert abs(names[name].location.z-off)<1e-5
qa={'blender':bpy.app.version_string,'reimport':True,'embeddedTextures':True,'groups':required,'offsetsTested':[0,.9,1.5,2.1,2.7,3.3,3.9], 'original':original,'refined':refined,'sourceSHA256':hashlib.sha256((BASE/'Mughal_Times_Biryani.glb').read_bytes()).hexdigest()}
(BASE/'Source/validation.json').write_text(json.dumps(qa,indent=2))
print('REFINEMENT_COMPLETE',flush=True)
