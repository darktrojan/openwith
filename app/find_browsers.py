import os


def read_desktop_file(path):
	with open(path, 'r') as desktop_file:
		current_section = None
		name = None
		command = None
		icon = None
		for line in desktop_file:
			if line[0] == '[':
				current_section = line[1:-2]
			if current_section != 'Desktop Entry':
				continue

			if line.startswith('Name='):
				name = line[5:].strip()
			elif line.startswith('Exec='):
				command = line[5:].strip()
			elif line.startswith('Icon='):
				icon = line[5:].strip()

		print [name, command, icon]

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

for p in paths:
	for a in apps:
		fp = os.path.join(p, a) + '.desktop'
		if os.path.exists(fp):
			read_desktop_file(fp)
