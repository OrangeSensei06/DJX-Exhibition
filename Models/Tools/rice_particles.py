"""Executed in the authoring namespace: only complete closed rice kernels.
Surface kernels use 12 triangles; sheltered volume/bottom kernels use 8.
No underlying filler mesh. All grains are joined into the rice ingredient.
"""
particle_counts={'surface':0,'sides':0,'bottom':0,'interior':0}
rice_triangle_count=0

def kernel(center,length,width,angle,category,detail=True,tilt=0):
    global rice_triangle_count
    variant=sum(particle_counts.values())%4
    rotation=Matrix.Rotation(angle,3,'Z') @ Matrix.Rotation(tilt,3,'Y')
    # Actual two pole vertices avoid degenerate tip triangles.
    vs=[];uv=[];fs=[];sides=4
    shoulders=[-.43,.45] if detail and math.hypot(center[0],center[1])<.072 else [0]
    for x in [-1]+shoulders+[1]:
        radius=0 if abs(x)==1 else 1
        count=1 if radius==0 else sides
        for k in range(count):
            a=math.tau*k/sides+.3
            p=Vector((x*length,math.cos(a)*width*radius+(.11+.035*variant)*length*(1-x*x),math.sin(a)*width*.72*radius))
            vs.append(tuple(rotation@p+Vector(center)));uv.append(((x+1)*.5,k/sides if radius else .5))
    for k in range(sides):fs.append((0,1+k,1+(k+1)%sides))
    for j in range(len(shoulders)-1):
        for k in range(sides):
            a=1+j*sides+k;b=1+j*sides+(k+1)%sides;c=a+sides;d=b+sides
            fs.extend([(a,c,b),(b,c,d)])
    last=1+(len(shoulders)-1)*sides;tip=len(vs)-1
    for k in range(sides):fs.append((last+k,tip,last+(k+1)%sides))
    mi=random.choices([0,1,2,3],[.44,.13,.20,.23])[0]
    rice.surface(vs,[tuple(reversed(face)) for face in fs],uv,mi);particle_counts[category]+=1
    rice_triangle_count+=len(fs)

# Tangentially laid surface kernels, staggered by ring with positional/angular
# jitter. Spacing deliberately overlaps the shoulders so holes reveal grains.
for ring_index in range(60):
    radius=.001+ring_index*.0028
    count=max(1,round(math.tau*radius/.0063))
    phase=random.uniform(0,math.tau)
    for k in range(count):
        a=phase+math.tau*k/count+random.uniform(-.15,.15)/max(1,count)
        r=radius+random.uniform(-.0016,.0016);x,y=r*math.cos(a),r*math.sin(a)
        z=rice_height(x,y)+random.uniform(-.0024,.0032)
        kernel((x,y,z),random.uniform(.0052,.0068),random.uniform(.0010,.00145),random.uniform(0,math.tau),'surface',True,random.uniform(-.3,.3))

# Closed grain layers follow the bowl interior on the side and base, making the
# exploded rice ingredient a heap of particles from every viewing direction.
for layer in range(10):
    z=.031+layer*.0124;r=.128+.037*layer/9
    count=round(math.tau*r/.013)
    phase=random.uniform(0,math.tau)
    for k in range(count):
        a=phase+math.tau*k/count
        kernel((r*math.cos(a),r*math.sin(a),z+random.uniform(-.002,.002)),random.uniform(.006,.008),.0026,a+math.pi/2+random.uniform(-.7,.7),'sides',False,random.uniform(-.4,.4))
for k in range(200):
    a=random.uniform(0,math.tau);r=.137*math.sqrt(random.random())
    kernel((r*math.cos(a),r*math.sin(a),.028+max(0,r-.09)*.35),.008,.003,random.uniform(0,math.tau),'bottom',False)

# A genuine interior population: alternating rice layers rather than a flat cap.
for layer in range(5):
    for k in range(100):
        a=random.uniform(0,math.tau);r=.155*math.sqrt(random.random());x,y=r*math.cos(a),r*math.sin(a)
        bottom=.033+max(0,r-.09)*.40
        top=rice_height(x,y)-.003
        z=bottom+(top-bottom)*(layer+.5)/5
        kernel((x,y,z),random.uniform(.009,.014),random.uniform(.003,.0048),random.uniform(0,math.tau),'interior',False,random.uniform(-.6,.6))
print('RICE_PARTICLES',json.dumps(particle_counts),flush=True)
