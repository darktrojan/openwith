#!/usr/bin/python
import json, os.path, sys

with open(os.path.join(os.path.dirname(os.path.realpath(__file__)), 'args.json'), 'w') as f:
	json.dump(sys.argv, f, indent=4, separators=(',', ': '))
