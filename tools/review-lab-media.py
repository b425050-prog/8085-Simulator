from pathlib import Path
import sys, subprocess, re, json, math
sys.path.insert(0,str(Path(__file__).resolve().parent/'media-deps'))
from PIL import Image, ImageOps, ImageDraw, ImageFont
import imageio_ffmpeg
root=Path(__file__).resolve().parent.parent
folder=root/'references/lab'; ffmpeg=imageio_ffmpeg.get_ffmpeg_exe(); records=[]
for n,video in enumerate(sorted((folder/'videos').glob('*.mp4')),1):
    info=subprocess.run([ffmpeg,'-i',str(video)],capture_output=True,text=True).stderr
    m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',info)
    duration=int(m[1])*3600+int(m[2])*60+float(m[3])
    out=folder/'frames'/f'video-{n}'; out.mkdir(parents=True,exist_ok=True)
    subprocess.run([ffmpeg,'-y','-i',str(video),'-vf','fps=1,scale=960:-2','-q:v','3',str(out/'frame-%04d.jpg')],capture_output=True,check=True)
    frames=sorted(out.glob('frame-*.jpg')); records.append({'video':video.name,'seconds':duration,'frames':len(frames),'audio':'Audio:' in info})
    # Every second is retained. Overview sheets use every third second.
    chosen=frames[::3]
    for page in range(math.ceil(len(chosen)/12)):
        subset=chosen[page*12:(page+1)*12]; sheet=Image.new('RGB',(1440,4*300),(25,28,30)); draw=ImageDraw.Draw(sheet)
        for i,frame in enumerate(subset):
            tile=ImageOps.contain(Image.open(frame),(472,270)); x=i%3*480;y=i//3*300
            sheet.paste(tile,(x+(472-tile.width)//2,y+22)); second=int(frame.stem.split('-')[1])-1
            draw.text((x+8,y+4),f'Video {n} | {second:03d} seconds | {frame.name}',fill='white')
        sheet.save(folder/'frames'/f'video-{n}-overview-{page+1}.jpg',quality=88)
    print(records[-1])
(folder/'media-inventory.json').write_text(json.dumps(records,indent=2),encoding='utf-8')
