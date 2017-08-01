import os


def read_desktop_file(path):
	with open(path, 'r') as desktop_file:
		current_section = None
		name = None
		command = None
		for line in desktop_file:
			if line[0] == '[':
				current_section = line[1:-2]
			if current_section != 'Desktop Entry':
				continue

			if line.startswith('Name='):
				name = line[5:].strip()
			elif line.startswith('Exec='):
				command = line[5:].strip()

		return {
			'name': name,
			'command': command
		}


def read_registry():
	windir = os.getenv('windir')
	if windir is None:
		return []

	import _winreg

	key = _winreg.OpenKey(_winreg.HKEY_LOCAL_MACHINE, os.path.join('software', 'clients', 'startmenuinternet'))
	count = _winreg.QueryInfoKey(key)[0]

	browsers = []
	while count > 0:
		subkey = _winreg.EnumKey(key, count - 1)
		browsers.append({
			'name': _winreg.QueryValue(key, subkey),
			'command': _winreg.QueryValue(key, os.path.join(subkey, 'shell', 'open', 'command'))
		})
		count -= 1

	if os.path.exists(os.path.join(windir, 'SystemApps', 'Microsoft.MicrosoftEdge_8wekyb3d8bbwe', 'MicrosoftEdge.exe')):
		browsers.append({
			'name': 'Microsoft Edge',
			'command': os.path.join(windir, 'explorer.exe') + ' microsoft-edge:%s'
		})

	return browsers


def do_it():
	if os.getenv('windir') is not None:
		return read_registry()

	apps = [
		'Chrome',
		'Chromium',
		'chromium-browser',
		'firefox',
		'Firefox',
		'Google Chrome',
		'google-chrome',
		'opera',
		'Opera',
		'SeaMonkey',
		'seamonkey',
	]
	paths = [
		os.path.join(os.getenv('HOME'), '.local/share/applications'),
		'/usr/local/share/applications',
		'/usr/share/applications'
	]

	results = []
	for p in paths:
		for a in apps:
			fp = os.path.join(p, a) + '.desktop'
			if os.path.exists(fp):
				results.append(read_desktop_file(fp))
	return results

if __name__ == "__main__":
	for b in do_it():
		print b
