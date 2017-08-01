import json, os, sys, _winreg

location = os.path.dirname(os.path.realpath(__file__))

filename = os.path.join(location, 'ping_pong.bat')

with open(filename, 'w') as file:
	file.write('@echo off\ncall "%s" "%s"\n' % (sys.executable, os.path.join(location, 'ping_pong.py')))

manifest = {
	'name': 'ping_pong',
	'description': 'Example host for native messaging',
	'path': filename,
	'type': 'stdio',
	'allowed_extensions': ['newopenwith@darktrojan.net'],
}

registry_locations = {
	'chrome': os.path.join('Software', 'Google', 'Chrome', 'NativeMessagingHosts'),
	'firefox': os.path.join('Software', 'Mozilla', 'NativeMessagingHosts'),
}
filename = os.path.join(location, 'ping_pong.json')

with open(filename, 'w') as file:
	file.write(
		json.dumps(manifest, indent=2, separators=(',', ': '), sort_keys=True).replace('  ', '\t') + '\n'
	)

for browser, registry_location in registry_locations.iteritems():
	try:
		_winreg.OpenKey(_winreg.HKEY_CURRENT_USER, os.path.dirname(registry_location))
		key = _winreg.CreateKey(_winreg.HKEY_CURRENT_USER, registry_location)
		_winreg.SetValue(key, 'ping_pong', _winreg.REG_SZ, filename)
	except WindowsError:
		pass
