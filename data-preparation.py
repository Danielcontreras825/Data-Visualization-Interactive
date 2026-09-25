import argparse
import csv
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('source', nargs='?', default=str(ROOT / '311_Service_Requests_from_2025.csv'))
SOURCE = Path(parser.parse_args().source)
DATES = ['09/15/2025', '09/16/2025', '09/17/2025', '09/18/2025', '09/19/2025']
BOROUGHS = ['Bronx', 'Brooklyn', 'Manhattan', 'Queens', 'Staten Island']
PROBLEMS = ['Noise - Residential', 'Noise - Street/Sidewalk', 'HEAT/HOT WATER', 'Rodent']
counts = Counter()
included = excluded = 0
with SOURCE.open(newline='', encoding='utf-8-sig') as stream:
    for row in csv.DictReader(stream):
        problem = row['Problem (formerly Complaint Type)'].strip()
        borough = row['Borough'].strip().title()
        date = row['Created Date'][:10]
        if problem not in PROBLEMS or borough not in BOROUGHS or date not in DATES:
            excluded += 1
            continue
        try:
            created = datetime.strptime(row['Created Date'], '%m/%d/%Y %I:%M:%S %p')
        except ValueError:
            excluded += 1
            continue
        counts[problem, borough, date] += 1
        counts[problem, borough, date, created.hour] += 1
        included += 1
output = {
    'dates': DATES,
    'days': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    'boroughs': BOROUGHS,
    'problems': PROBLEMS,
    'counts': {problem: {borough: [counts[problem, borough, date] for date in DATES]
                          for borough in BOROUGHS} for problem in PROBLEMS},
    'hourly': {problem: {borough: [[counts[problem, borough, date, hour] for hour in range(24)]
                                      for date in DATES] for borough in BOROUGHS} for problem in PROBLEMS},
    'included': included,
    'excluded': excluded,
}
(ROOT / 'data.json').write_text(json.dumps(output, separators=(',', ':')), encoding='utf-8')
print(f'Prepared {included:,} requests; excluded {excluded:,} rows.')
