"""Normalized 16-bit positions/UVs and 8-bit tangent basis.
Core glTF supports normalized UVs; normalized byte normals/tangents use
KHR_mesh_quantization, supported by Three's GLTFLoader without extra decoders.
"""
import json, struct
import numpy as np

def pack_glb(path):
    raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0]
    doc=json.loads(raw[20:20+n]);binary=raw[28+n:]
    views=doc['bufferViews'];accessors=doc['accessors']; replacements={}
    decode_scale=2.0;quantized_meshes=set()
    for mesh_index,mesh in enumerate(doc['meshes']):
        for primitive in mesh['primitives']:
            for semantic,ai in primitive['attributes'].items():
                acc=accessors[ai];vi=acc['bufferView'];view=views[vi]
                if acc['componentType']!=5126:continue
                if semantic=='POSITION':dtype=np.dtype('<i2');factor=32767/decode_scale;limit=(-decode_scale,decode_scale);ctype=5122
                elif semantic.startswith('TEXCOORD_'):dtype=np.dtype('<u2'); factor=65535;limit=(0,1);ctype=5123
                elif semantic in ['NORMAL','TANGENT']:dtype=np.dtype('i1');factor=127;limit=(-1,1);ctype=5120
                else:continue
                assert 'byteStride' not in view and acc.get('byteOffset',0)==0
                values=np.frombuffer(binary[view['byteOffset']:view['byteOffset']+view['byteLength']],dtype='<f4')
                if values.min()<limit[0]-.00001 or values.max()>limit[1]+.00001:continue
                encoded=np.rint(np.clip(values,*limit)*factor).astype(dtype)
                replacements[vi]=encoded.tobytes()
                acc['componentType']=ctype;acc['normalized']=True
                acc.pop('min',None);acc.pop('max',None)
                if semantic=='POSITION':
                    quantized_meshes.add(mesh_index)
                    acc['min']=encoded.reshape(-1,3).min(axis=0).astype(int).tolist()
                    acc['max']=encoded.reshape(-1,3).max(axis=0).astype(int).tolist()
    for node in doc['nodes']:
        if node.get('mesh') in quantized_meshes:
            assert 'matrix' not in node
            node['scale']=[float(v*decode_scale) for v in node.get('scale',[1,1,1])]
    packed=bytearray()
    for i,view in enumerate(views):
        while len(packed)%4:packed.append(0)
        value=replacements.get(i,binary[view['byteOffset']:view['byteOffset']+view['byteLength']])
        view['byteOffset']=len(packed);view['byteLength']=len(value);packed.extend(value)
    while len(packed)%4:packed.append(0)
    doc['buffers'][0]['byteLength']=len(packed)
    for key in ['extensionsUsed','extensionsRequired']:
        doc.setdefault(key,[])
        if 'KHR_mesh_quantization' not in doc[key]:doc[key].append('KHR_mesh_quantization')
    for mat in doc['materials']:mat.get('occlusionTexture',{})['strength']=.45
    header=json.dumps(doc,separators=(',',':')).encode()
    header+=b' '*((-len(header))%4)
    result=struct.pack('<III',0x46546c67,2,28+len(header)+len(packed))+struct.pack('<II',len(header),0x4e4f534a)+header+struct.pack('<II',len(packed),0x004e4942)+packed
    path.write_bytes(result)
    return {'before':len(raw),'after':len(result),'positions':'normalized int16, uniform mesh decode scale 2','maximumPositionError':decode_scale/32767/2,'UVs':'normalized uint16','normalTangents':'normalized int8'}
