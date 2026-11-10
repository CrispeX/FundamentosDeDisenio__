"""Genera SVG, PNG y PDF UML. Requiere Pillow y reportlab para las copias de presentación."""
from pathlib import Path
from html import escape
import math
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'revision-2'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 1920, 1080
FONT = Path('C:/Windows/Fonts') if Path('C:/Windows/Fonts').exists() else Path('/usr/share/fonts/truetype/dejavu')
REG = FONT / ('segoeui.ttf' if (FONT/'segoeui.ttf').exists() else 'DejaVuSans.ttf')
BOLD = FONT / ('segoeuib.ttf' if (FONT/'segoeuib.ttf').exists() else 'DejaVuSans-Bold.ttf')
pdfmetrics.registerFont(TTFont('Regular', str(REG)))
pdfmetrics.registerFont(TTFont('Bold', str(BOLD)))
pdf = canvas.Canvas(str(OUT/'Althea_Diagramas_Revision2.pdf'), pagesize=(W,H))
pdf.setTitle('Althea · Diagramas UML corregidos · Review 2')

def color(hexvalue):
    from reportlab.lib.colors import HexColor
    return HexColor(hexvalue)

def text(x,y,value,size=23,bold=False,anchor='start',underline=False):
    assert '\n' not in value
    font=ImageFont.truetype(str(BOLD if bold else REG),size)
    width=draw.textlength(value,font=font)
    px=x if anchor=='start' else x-width/2 if anchor=='middle' else x-width
    draw.text((px,y-size),value,font=font,fill='#222222',stroke_width=0)
    pdf.setFillColor(color('#222222'));pdf.setFont('Bold' if bold else 'Regular',size)
    {'start':pdf.drawString,'middle':pdf.drawCentredString,'end':pdf.drawRightString}[anchor](x,H-y,value)
    svg.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" font-weight="{"bold" if bold else "normal"}"{ " text-decoration=\"underline\"" if underline else ""}>{escape(value)}</text>')
    if underline:
        draw.line((px,y+4,px+width,y+4),fill='#222222',width=1)
        pdf.line(px,H-y-4,px+width,H-y-4)

def line(points,dash=False,arrow=None):
    for a,b in zip(points,points[1:]):
        if dash:
            dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy)
            for k in range(0,int(length),15):
                t,u=k/length,min(k+8,length)/length
                draw.line((a[0]+dx*t,a[1]+dy*t,a[0]+dx*u,a[1]+dy*u),fill='#333333',width=2)
        else:draw.line((*a,*b),fill='#333333',width=2)
        pdf.setStrokeColor(color('#333333'));pdf.setLineWidth(1.7);pdf.setDash(8,7) if dash else pdf.setDash();pdf.line(a[0],H-a[1],b[0],H-b[1]);pdf.setDash()
    svg.append('<polyline points="'+' '.join(f'{x},{y}' for x,y in points)+'" fill="none" stroke="#333" stroke-width="2"'+(' stroke-dasharray="8 7"' if dash else '')+'/>')
    if arrow:
        a,b=points[-2:];angle=math.atan2(b[1]-a[1],b[0]-a[0]);r=13
        p1=(b[0]-r*math.cos(angle-.48),b[1]-r*math.sin(angle-.48));p2=(b[0]-r*math.cos(angle+.48),b[1]-r*math.sin(angle+.48))
        if arrow in ('filled','triangle'):
            fill='#333333' if arrow=='filled' else '#ffffff'
            draw.polygon([b,p1,p2],fill=fill,outline='#333333')
            path=pdf.beginPath();path.moveTo(b[0],H-b[1]);path.lineTo(p1[0],H-p1[1]);path.lineTo(p2[0],H-p2[1]);path.close();pdf.setFillColor(color(fill));pdf.drawPath(path,fill=1)
            svg.append('<polygon points="'+' '.join(f'{x},{y}' for x,y in [b,p1,p2])+f'" fill="{fill}" stroke="#333"/>')
        else:line([p1,b,p2])

def rect(x,y,w,h,fill='#ffffdf'):
    draw.rectangle((x,y,x+w,y+h),fill=fill,outline='#333333',width=2)
    pdf.setFillColor(color(fill));pdf.setStrokeColor(color('#333333'));pdf.rect(x,H-y-h,w,h,fill=1)
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="#333" stroke-width="2"/>')

def composition(x,y,vertical=False):
    pts=[(x,y),(x-9,y+13),(x,y+26),(x+9,y+13)] if vertical else [(x,y),(x+13,y-9),(x+26,y),(x+13,y+9)]
    draw.polygon(pts,fill='#222222');path=pdf.beginPath();path.moveTo(pts[0][0],H-pts[0][1])
    for px,py in pts[1:]:path.lineTo(px,H-py)
    path.close();pdf.setFillColor(color('#222222'));pdf.drawPath(path,fill=1)
    svg.append('<polygon points="'+' '.join(f'{px},{py}' for px,py in pts)+'" fill="#222"/>')

def box(x,y,w,h,title,stereo=None,lines=(),under=False):
    rect(x,y,w,h)
    yy=y+31
    if stereo:text(x+w/2,yy,stereo,20,anchor='middle');yy+=29
    text(x+w/2,yy,title,24,True,'middle',under)
    if lines:
        line([(x,yy+17),(x+w,yy+17)])
        for i,t in enumerate(lines):text(x+15,yy+48+i*29,t,21)

def begin(name,title):
    global svg,im,draw,current
    current=name;im=Image.new('RGB',(W,H),'white');draw=ImageDraw.Draw(im)
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><g font-family="Segoe UI,DejaVu Sans,Arial,sans-serif">']
    rect(25,25,W-50,H-50,'#ffffff');rect(25,25,min(1800,len(title)*18+60),59,'#f1f1f1');text(45,65,title,29,True)

def finish():
    svg.append('</g></svg>');(OUT/(current+'.svg')).write_text('\n'.join(svg),encoding='utf-8')
    im.save(OUT/(current+'.png'));pdf.showPage()

begin('01_clases','class Althea :: Dominio y clasificadores de interacción')
classes=[
 ('Cliente', ['id: entero','nombre, correo, teléfono'],['crear()','modificar()']),
 ('Solicitud',['id, clienteId: entero','estado: EstadoSolicitud'],['crear()','modificarPerfil()']),
 ('PerfilViaje',['destino, fechas','servicio, presupuesto, intereses'],['validarViaje()','guardarPerfil()']),
 ('Viajero',['nombre, documento','tipo: Adulto | Niño'],['validarDatos()']),
 ('Cotización',['total: dinero','estado: EstadoCotización'],['modificar()','resolver()']),
 ('Reserva',['id, solicitudId, asientos','fechas, políticas, total'],['crear()','cancelar()']),
 ('Pago',['reservaId, monto, referencia','estado: Registrado | Anulado'],['registrarPago()','anularPago()']),
 ('Recomendador',['catálogo: Destino[]','modo: IA | local'],['recomendar(perfil)','sugerenciasLocales()']),
 ('InterfazAsesor',['«boundary»','public/js/*.js'],['iniciarReserva()','formularioPago()']),
 ('ServicioReservas',['«control»','reservas.service.js'],['vistaPrevia(datos)','crear(datos) / modificar(id, datos)']),
 ('GestionComercial',['«control»','gestion.service.js'],['registrarPago(datos)','anularPago(id)']),
 ('AlmacenDatos',['«control»','models/db.js'],['load() / save()','nextId(tabla)'])]
for i,(name,attrs,methods) in enumerate(classes):
    x=55+i%4*465;y=[135,445,755][i//4]
    box(x,y,410,225,name,lines=attrs)
    line([(x,y+144),(x+410,y+144)])
    for j,t in enumerate(methods):text(x+15,y+176+j*29,'+ '+t,20)
# Associations are orthogonal and multiplicities remain at their endpoints.
line([(465,230),(520,230)]);text(472,213,'1',19);text(487,256,'0..*',18)
line([(930,230),(985,230)]);text(941,213,'1',19);text(958,256,'1',19)
composition(930,230)
line([(700,360),(700,397),(1660,397),(1660,360)]);text(715,384,'1',20);text(1675,384,'1..30',20)
composition(700,360,True)
line([(520,320),(490,320),(490,390),(260,390),(260,445)]);text(490,300,'1',19);text(275,432,'0..*',19)
line([(725,360),(725,445)]);text(740,382,'1',20);text(740,431,'0..*',19)
line([(465,550),(520,550)]);text(470,530,'0..1',17);text(485,579,'0..1',17)
line([(930,550),(985,550)]);text(941,530,'1',19);text(946,579,'0..*',18)
line([(465,874),(520,874)],dash=True,arrow='open')
line([(260,980),(260,1010),(1190,1010),(1190,980)],dash=True,arrow='open')
line([(725,980),(725,1030),(1660,1030),(1660,980)],dash=True,arrow='open')
line([(1395,874),(1450,874)],dash=True,arrow='open')
line([(725,755),(725,670)],dash=True,arrow='open')
line([(1190,755),(1190,670)],dash=True,arrow='open')
finish()

def lifeline(x,label,start=145,end=1000):
    box(x-160,start,320,76,label,under=label!='Asesor');line([(x,start+76),(x,end)],dash=True)

def message(a,b,y,label,kind='call',label_x=None):
    line([(a,y),(b,y)],dash=kind in ('reply','create'),arrow='filled' if kind=='call' else 'open')
    text((a+b)/2 if label_x is None else label_x,y-12,label,21,anchor='middle')

def activation(x,y,h):rect(x-9,y,18,h,'#ffffff')

begin('02_secuencia_reserva','sd Althea :: Confirmar reserva directa')
xs=[200,555,950,1345,1710]
for x,label in zip(xs[:4],['Asesor','pantalla:InterfazAsesor','servicio:ServicioReservas','db:AlmacenDatos']):lifeline(x,label)
message(200,555,265,'1: revisar selección')
activation(555,265,205);message(555,950,315,'1.1: vistaPrevia(datos)');activation(950,315,125)
message(950,1345,355,'1.1.1: load()');message(1345,950,400,'perfil e inventario','reply');message(950,555,450,'resumen y token','reply');message(555,200,490,'vista previa','reply')
message(200,555,545,'2: confirmar');activation(555,545,435);message(555,950,590,'2.1: crear(datos)');activation(950,590,345)
message(950,1345,635,'2.1.1: load()');message(1345,950,680,'estado vigente','reply')
text(690,728,'[token vigente, políticas aceptadas y cupos libres]',19)
lifeline(1710,'reserva:Reserva',760);message(950,1550,798,'2.1.2: «create» Reserva',kind='create')
message(950,1345,855,'2.1.3: save()');message(1345,950,900,'persistencia completada','reply');message(950,555,945,'reserva confirmada','reply');message(555,200,995,'mostrar confirmación','reply')
finish()

begin('03_secuencia_abono','sd Althea :: Registrar abono recibido')
for x,label in zip(xs[:4],['Asesor','pantalla:InterfazAsesor','gestion:GestionComercial','db:AlmacenDatos']):lifeline(x,label)
message(200,555,275,'1: registrar abono');activation(555,275,655)
message(555,950,340,'1.1: registrarPago(datos)');activation(950,340,535)
message(950,1345,415,'1.1.1: load()');message(1345,950,480,'reserva, pagos y saldo','reply')
text(690,545,'[reserva activa, 0 < monto ≤ saldo y referencia única]',19)
lifeline(1710,'pago:Pago',600);message(950,1550,638,'1.1.2: «create» Pago',kind='create')
message(950,1345,715,'1.1.3: save()');message(1345,950,780,'persistencia completada','reply');message(950,555,865,'recibo y saldo recalculado','reply');message(555,200,945,'mostrar recibo','reply')
finish()

def actor_comercial(x,y):
    green='#00ad83'
    draw.ellipse((x-20,y-20,x+20,y+20),fill='white',outline=green,width=3)
    pdf.setStrokeColor(color(green));pdf.setLineWidth(2.3);pdf.circle(x,H-y,20,stroke=1,fill=0)
    svg.append(f'<circle cx="{x}" cy="{y}" r="20" fill="white" stroke="{green}" stroke-width="3"/>')
    paths=[[(x,y+20),(x,y+113)],[(x-40,y+53),(x+40,y+53)],[(x,y+113),(x-37,y+163)],[(x,y+113),(x+37,y+163)]]
    for points in paths:
        draw.line(points,fill=green,width=3)
        pdf.setStrokeColor(color(green));pdf.setLineWidth(2.3)
        for a,b in zip(points,points[1:]):pdf.line(a[0],H-a[1],b[0],H-b[1])
        svg.append('<polyline points="'+' '.join(f'{px},{py}' for px,py in points)+f'" fill="none" stroke="{green}" stroke-width="3"/>')
    text(x,y+205,'Asesor',24,anchor='middle')
    text(x,y+234,'comercial',24,anchor='middle')

def communication(name,title,control,operation,entity,precondition):
    begin(name,title)
    text(70,133,precondition,23)
    actor_comercial(205,397);box(530,420,380,100,'pantalla:InterfazAsesor',under=True)
    box(1100,420,400,100,control,under=True);box(1430,200,400,100,entity,under=True);box(1430,780,400,100,'db:AlmacenDatos',under=True)
    line([(245,450),(530,450)],arrow='filled');text(437,412,'1: confirmar',21,anchor='middle')
    line([(530,500),(205,500)],dash=True,arrow='open');text(437,555,'retorno: resultado',19,anchor='middle')
    line([(910,450),(1100,450)],arrow='filled');text(1005,365,'1.1: '+operation,21,anchor='middle')
    line([(1100,500),(910,500)],dash=True,arrow='open');text(1005,555,'retorno: resultado',19,anchor='middle')
    line([(1300,420),(1300,250),(1430,250)],dash=True,arrow='open');text(1245,185,'1.1.2: «create» '+entity.split(':')[1],22)
    line([(1300,520),(1300,830),(1430,830)],arrow='filled');text(950,668,'1.1.1: load()',22);text(950,713,'1.1.3: save()',22)
    line([(1430,865),(1340,865),(1340,535)],dash=True,arrow='open');text(1370,945,'retorno: datos / persistencia',21)
    finish()

communication('04_comunicacion_reserva','communication Althea :: Confirmar reserva directa','servicio:ServicioReservas','crear(datos)','reserva:Reserva','Precondición: vista previa vigente y políticas aceptadas; confirmar vuelve a validar disponibilidad.')
communication('05_comunicacion_abono','communication Althea :: Registrar abono recibido','gestion:GestionComercial','registrarPago(datos)','pago:Pago','Precondición: reserva activa con total; monto positivo hasta el saldo y referencia de pago única.')

begin('06_despliegue','deployment Althea :: Nodos, artefactos y servicios externos')
def device(x,y,w,h,label,stereo='«device»'):
    line([(x,y),(x+16,y-16),(x+w+16,y-16),(x+w+16,y+h-16),(x+w,y+h)])
    line([(x+w,y),(x+w+16,y-16)])
    rect(x,y,w,h,'#f8f8f8');text(x+w/2,y+37,stereo,21,anchor='middle');text(x+w/2,y+72,label,26,True,'middle')
device(65,190,440,660,'Equipo del asesor')
box(95,300,380,140,'Navegador web','«executionEnvironment»')
box(95,650,380,120,'public/index.html + js/css','«artifact»')
line([(285,650),(285,440)],dash=True,arrow='open');text(305,560,'«deploy»',21)
device(660,190,530,660,'Host local o Codespace','«node»')
box(690,300,470,140,'Node.js ≥ 18','«executionEnvironment»')
box(690,650,470,140,'server.js + src/','«artifact»',lines=['servicios y adaptador de datos'])
line([(920,650),(920,440)],dash=True,arrow='open');text(940,555,'«deploy»',21)
device(1390,190,450,280,'Supabase autorizado','«node»')
box(1420,300,390,130,'PostgreSQL / RPC privada','«executionEnvironment»')
device(1390,660,450,250,'OpenAI (opcional)','«node»')
box(1420,760,390,110,'Responses API','«executionEnvironment»')
line([(505,365),(660,365)]);text(585,300,'HTTP(S)',22,anchor='middle')
line([(1190,365),(1390,365)]);text(1290,300,'HTTPS / RPC',21,anchor='middle')
line([(1190,810),(1390,810)]);text(1290,750,'HTTPS',22,anchor='middle')
text(1390,522,'[ALTHEA_STORAGE=supabase]',20)
text(1390,965,'[OPENAI_API_KEY configurada]',20)
text(70,965,'En local: HTTP y archivo JSON si se configura ALTHEA_STORAGE=json.',24)
finish()

begin('07_componentes','component Althea :: Contratos y relaciones de implementación')
box(65,220,430,145,'Interfaz del asesor','«component»',lines=['public/js/*.js'])
box(755,220,430,145,'API y servicios','«component»',lines=['src/routes + services'])
box(1425,220,430,145,'Persistencia','«component»',lines=['models/db.js + supabase.js'])
box(540,220,175,125,'HTTP JSON','«interface»')
line([(495,285),(540,285)],dash=True,arrow='open')
line([(755,285),(715,285)],dash=True,arrow='triangle')
box(1230,220,150,125,'Snapshot','«interface»')
line([(1185,285),(1230,285)],dash=True,arrow='open')
line([(1425,285),(1380,285)],dash=True,arrow='triangle')
box(755,650,430,145,'Recomendador','«component»',lines=['recomendaciones.service.js'])
box(790,450,360,115,'Recomendar perfil','«interface»')
line([(970,365),(970,450)],dash=True,arrow='open')
line([(970,650),(970,565)],dash=True,arrow='triangle')
box(1425,650,430,145,'OpenAI Responses','«component»',lines=['integración opcional HTTPS'])
line([(1185,720),(1425,720)],dash=True,arrow='open');text(1305,682,'«use» [con clave]',21,anchor='middle')
box(65,650,430,145,'Catálogo de destinos','«artifact»',lines=['src/data/destinos.json'])
line([(755,720),(495,720)],dash=True,arrow='open');text(620,682,'«use» respaldo',21,anchor='middle')
box(65,890,430,110,'public/','«artifact»');line([(65,945),(40,945),(40,290),(65,290)],dash=True,arrow='open');text(95,545,'«manifest»',21)
box(1425,890,430,110,'src/models/','«artifact»');line([(1855,945),(1880,945),(1880,290),(1855,290)],dash=True,arrow='open');text(1660,545,'«manifest»',21)
text(755,935,'Flecha abierta: dependencia de uso.',23)
text(755,980,'Triángulo vacío: realización del contrato.',23)
finish()
pdf.save()
print('Generados 7 diagramas, SVG/PNG y PDF en '+str(OUT))
