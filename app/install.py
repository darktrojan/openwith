import json, os

manifest = {
	'name': 'ping_pong',
	'description': 'Example host for native messaging',
	'path': os.path.join(os.path.dirname(os.path.realpath(__file__)), 'ping_pong.py'),
	'type': 'stdio',
}

locations = {
	'chrome': os.path.join(os.getenv('HOME'), '.config', 'google-chrome', 'NativeMessagingHosts'),
	'chromium': os.path.join(os.getenv('HOME'), '.config', 'chromium', 'NativeMessagingHosts'),
	'firefox': os.path.join(os.getenv('HOME'), '.mozilla', 'native-messaging-hosts'),
}
filename = 'ping_pong.json'

for browser, location in locations.iteritems():
	if os.path.exists(os.path.dirname(location)):
		if not os.path.exists(location):
			os.mkdir(location)

		browser_manifest = manifest.copy()
		if browser == 'firefox':
			browser_manifest['allowed_extensions'] = ['newopenwith@darktrojan.net']
		else:
			browser_manifest['allowed_origins'] = ['chrome-extension://eboojgmpoadapdemnbhjnnlnnnoijefc/']

		with open(os.path.join(location, filename), 'w') as file:
			file.write(
				json.dumps(browser_manifest, indent=2, separators=(',', ': '), sort_keys=True).replace('  ', '\t') + '\n'
			)
