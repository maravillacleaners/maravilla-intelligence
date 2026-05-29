import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, HRFlowable, Preformatted)
from reportlab.lib.enums import TA_LEFT

OUTPUT = r'C:\Users\Rosan\maravilla-intelligence\cleanup-audit.pdf'

with open(r'C:\Users\Rosan\maravilla-intelligence\cleanup-audit.md', 'r', encoding='utf-8') as f:
    md_lines = f.read().splitlines()

NAVY  = colors.HexColor('#0D1B2A')
BLUE  = colors.HexColor('#1E3A5F')
TEAL  = colors.HexColor('#0D9488')
DGRAY = colors.HexColor('#374151')
GRAY  = colors.HexColor('#6B7280')
LGRAY = colors.HexColor('#F3F4F6')

doc = SimpleDocTemplate(OUTPUT, pagesize=A4,
    leftMargin=1.8*cm, rightMargin=1.8*cm,
    topMargin=2*cm, bottomMargin=2*cm)

styles = getSampleStyleSheet()

def s(name, **kw):
    return ParagraphStyle(name, parent=styles['Normal'], **kw)

h1   = s('H1', fontSize=18, textColor=NAVY,  spaceAfter=8,  spaceBefore=12, fontName='Helvetica-Bold', leading=22)
h2   = s('H2', fontSize=13, textColor=BLUE,  spaceAfter=6,  spaceBefore=10, fontName='Helvetica-Bold', leading=17,
         leftIndent=0, backColor=LGRAY, borderPad=3)
h3   = s('H3', fontSize=10, textColor=TEAL,  spaceAfter=4,  spaceBefore=8,  fontName='Helvetica-Bold', leading=13)
h4   = s('H4', fontSize=9,  textColor=DGRAY, spaceAfter=3,  spaceBefore=6,  fontName='Helvetica-Bold', leading=12)
body = s('Body', fontSize=8, textColor=DGRAY, spaceAfter=3, leading=11)
code = s('Code', fontSize=7, fontName='Courier', textColor=colors.HexColor('#1F2937'),
         backColor=LGRAY, leftIndent=8, rightIndent=8, spaceAfter=6, spaceBefore=4, leading=10)
li   = s('Li', fontSize=8,  textColor=DGRAY, spaceAfter=2, leftIndent=14, leading=11)
li2  = s('Li2', fontSize=8, textColor=DGRAY, spaceAfter=2, leftIndent=28, leading=11)

TH_STYLE = s('TH', fontSize=7, textColor=colors.white, fontName='Helvetica-Bold', leading=9, alignment=TA_LEFT)
TD_STYLE = s('TD', fontSize=7, textColor=DGRAY, leading=9, alignment=TA_LEFT)


def clean(text):
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'\*(.+?)\*',     r'<i>\1</i>', text)
    text = re.sub(r'`(.+?)`',       r'<font name="Courier">\1</font>', text)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    text = re.sub(r'\bKEEP\b',    '<font color="#16A34A"><b>KEEP</b></font>',    text)
    text = re.sub(r'\bDELETE\b',  '<font color="#DC2626"><b>DELETE</b></font>',  text)
    text = re.sub(r'\bARCHIVE\b', '<font color="#D97706"><b>ARCHIVE</b></font>', text)
    text = re.sub(r'\bREVIEW\b',  '<font color="#2563EB"><b>REVIEW</b></font>',  text)
    return text


def parse_table(lines_block):
    rows = []
    for line in lines_block:
        line = line.strip()
        if re.match(r'^\|[-| :]+\|$', line):
            continue
        if not line.startswith('|'):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        rows.append(cells)
    return rows


def make_table(rows):
    if not rows:
        return None
    n_cols = max(len(r) for r in rows)
    rows = [r + [''] * (n_cols - len(r)) for r in rows]

    page_w = A4[0] - 3.6 * cm

    # Heuristic column widths based on header names
    headers = [h.upper() for h in rows[0]] if rows else []
    # Give ID col less space
    col_ws = []
    for h in headers:
        if 'ID' in h:
            col_ws.append(0.12)
        elif 'REASON' in h or 'NOTES' in h or 'ISSUE' in h or 'NAME' in h and n_cols <= 3:
            col_ws.append(0.35)
        else:
            col_ws.append(1.0 / n_cols)
    total = sum(col_ws)
    col_widths = [w / total * page_w for w in col_ws]

    data = []
    for ri, row in enumerate(rows):
        if ri == 0:
            cells = [Paragraph(clean(c), TH_STYLE) for c in row]
        else:
            cells = [Paragraph(clean(c), TD_STYLE) for c in row]
        data.append(cells)

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',   (0, 0), (-1, 0),  BLUE),
        ('ROWBACKGROUNDS',(0,1), (-1,-1),  [colors.white, LGRAY]),
        ('GRID',         (0, 0), (-1,-1),  0.3, colors.HexColor('#D1D5DB')),
        ('VALIGN',       (0, 0), (-1,-1),  'TOP'),
        ('LEFTPADDING',  (0, 0), (-1,-1),  4),
        ('RIGHTPADDING', (0, 0), (-1,-1),  4),
        ('TOPPADDING',   (0, 0), (-1,-1),  3),
        ('BOTTOMPADDING',(0, 0), (-1,-1),  3),
    ]))
    return t


story = []
i = 0
in_code = False
code_buf = []

while i < len(md_lines):
    line = md_lines[i]

    # Code block
    if line.strip().startswith('```'):
        if in_code:
            in_code = False
            story.append(Preformatted('\n'.join(code_buf), code))
            code_buf = []
        else:
            in_code = True
        i += 1
        continue
    if in_code:
        code_buf.append(line)
        i += 1
        continue

    # Table
    if line.strip().startswith('|'):
        table_buf = [line]
        j = i + 1
        while j < len(md_lines) and md_lines[j].strip().startswith('|'):
            table_buf.append(md_lines[j])
            j += 1
        rows = parse_table(table_buf)
        t = make_table(rows)
        if t:
            story.append(Spacer(1, 4))
            story.append(t)
            story.append(Spacer(1, 6))
        i = j
        continue

    # HR
    if re.match(r'^---+\s*$', line):
        story.append(HRFlowable(width='100%', thickness=0.5, color=GRAY,
                                spaceAfter=6, spaceBefore=6))
        i += 1
        continue

    # Headers
    m = re.match(r'^(#{1,4})\s+(.*)', line)
    if m:
        level = len(m.group(1))
        text = clean(m.group(2))
        st = [h1, h2, h3, h4][min(level - 1, 3)]
        story.append(Paragraph(text, st))
        i += 1
        continue

    # Checkbox list item
    m_cb = re.match(r'^\s*-\s+\[([ x])\]\s+(.*)', line)
    if m_cb:
        done = m_cb.group(1) == 'x'
        box = '[x]' if done else '[ ]'
        text = clean(m_cb.group(2))
        story.append(Paragraph(f'{box} {text}', li))
        i += 1
        continue

    # List items
    m_li = re.match(r'^(\s*)([-*+]|\d+\.)\s+(.*)', line)
    if m_li:
        indent = len(m_li.group(1))
        marker = m_li.group(2)
        text = clean(m_li.group(3))
        if marker[0].isdigit():
            label = marker
        else:
            label = '•'
        sty = li2 if indent >= 4 else li
        story.append(Paragraph(f'{label} {text}', sty))
        i += 1
        continue

    # Blank line
    if not line.strip():
        story.append(Spacer(1, 4))
        i += 1
        continue

    # Normal paragraph
    story.append(Paragraph(clean(line), body))
    i += 1

doc.build(story)
print(f'PDF generated: {OUTPUT}')
