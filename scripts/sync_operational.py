#!/usr/bin/env python3
"""Publish reviewed operational evidence into the browser's CSV and vocabulary.

Edit data/operational-evidence.json deliberately, then run this and the validator.
This script does not infer scientific classifications or fetch external sources.
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIELDS = ['dataset_size', 'software_maturity', 'compute_demand', 'validation_evidence']
audit = json.loads((ROOT/'data/operational-evidence.json').read_text())
profiles = {p['method_id']:p for p in audit['profiles']}
with (ROOT/'data/integration_methods_library.csv').open(newline='') as f:
    reader = csv.DictReader(f)
    headers, rows = list(reader.fieldnames), list(reader)
assert len(profiles) == len(audit['profiles'])
assert set(profiles) == {r['method_id'] for r in rows}, 'Every included method needs an assessment'
schema = json.loads((ROOT/'data/schema.json').read_text())
definitions = [
    ('dataset_size','Dataset size',True,
     'Reported example size, with observation unit and workflow in each card. Atlas bands: <1,000; 1,000–99,999; ≥100,000. Includes labelled demos, simulations and pretraining; these are not minimum data requirements or capacity limits.',
     [('small','Small · fewer than 1,000'),('medium','Medium · 1,000–99,999'),('large','Large · 100,000 or more')]),
    ('software_maturity','Software maturity',False,
     'Evidence of reusable software: early research code; developing documented setup/use; mature package with documentation, tests and releases or registry checks. Does not certify installation, maintenance or scientific validity.',
     [('early','Early'),('developing','Developing'),('mature','Mature')]),
    ('compute_demand','Compute demand',True,
     'Hardware used or recommended for a documented example: limited CPU/ordinary computer; moderate single GPU/workstation; high HPC or large memory. Read workflow and memory details: this is not a minimum requirement or runtime ranking.',
     [('limited','Limited · CPU / ordinary computer'),('moderate','Moderate · GPU / workstation'),('high','High · HPC / large memory')]),
    ('validation_evidence','Validation evidence',True,
     'Internal: author-led evaluation. Independent: a separate team actually evaluated the method. Prospective: a locked model tested on subsequently accrued observations/outcomes. Retrospective use of clinical-trial data is not prospective validation.',
     [('internal','Internal / author-led'),('independent','Independent evaluation'),('prospective','Prospective evaluation')]),
]
schema['version'] = audit['schema_version']
position = next(i for i,f in enumerate(schema['fields']) if f['id'] in FIELDS)
schema['fields'] = [f for f in schema['fields'] if f['id'] not in FIELDS]
new_fields = [dict(id=key,label=label,group='Practical considerations',help=help_text,multiple=multiple,
    options=[dict(value=v,label=l) for v,l in options]+[dict(value='not-assessed',label='Not established')])
    for key,label,multiple,help_text,options in definitions]
schema['fields'][position:position] = new_fields
(ROOT/'data/schema.json').write_text(json.dumps(schema,ensure_ascii=False,indent=2)+'\n')
for key in FIELDS:
    for column in [key,key+'_notes',key+'_sources']:
        if column not in headers:headers.append(column)
if 'operational_checked_on' not in headers:headers.append('operational_checked_on')
for row in rows:
    profile=profiles[row['method_id']]
    row['schema_version']=schema['version']
    component_labels={o['value']:o['label'] for f in schema['fields'] if f['id']=='methodological_components' for o in f['options']}
    row['method_family']=';'.join(component_labels[v] for v in row['methodological_components'].split(';'))
    row['application_tasks']=row['integration_effects']
    row['operational_checked_on']=profile['checked_on']
    for key in FIELDS:
        row[key]=';'.join(profile[key]['values'])
        row[key+'_notes']=profile[key]['note']
        row[key+'_sources']=';'.join(profile[key]['sources'])
    if 'independent' in profile['validation_evidence']['values']:
        row['independent_benchmark']='verified'
        if not row['benchmark_source']:row['benchmark_source']=profile['validation_evidence']['sources'][1]
    if row['method_id']=='medhive':row['code_availability']='not-found'
    if row['method_id']=='convirt':row['code_availability']='public-documentation'
with (ROOT/'data/integration_methods_library.csv').open('w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=headers,lineterminator='\n');w.writeheader();w.writerows(rows)
classification_path = ROOT/'data/classification-audit.json'
classification = json.loads(classification_path.read_text())
rows_by_id = {row['method_id']: row for row in rows}
for profile in classification['profiles']:
    row = rows_by_id[profile['method_id']]
    for field in profile['current_profile']:
        profile['current_profile'][field] = row[field]
classification_path.write_text(json.dumps(classification,ensure_ascii=False,indent=2)+'\n')
print(f'Synchronized {len(rows)} operational profiles and {len(schema["fields"])} controlled fields.')
