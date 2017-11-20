from __future__ import print_function

import os
import sys
import json
import struct
import subprocess

VERSION = '7.0.3'

try:
	sys.stdin.buffer

	# Python 3.x version
	# Read a message from stdin and decode it.
	def getMessage():
		rawLength = sys.stdin.buffer.read(4)
		if len(rawLength) == 0:
			sys.exit(0)
		messageLength = struct.unpack('@I', rawLength)[0]
		message = sys.stdin.buffer.read(messageLength).decode('utf-8')
		return json.loads(message)

	# Send an encoded message to stdout
	def sendMessage(messageContent):
		encodedContent = json.dumps(messageContent).encode('utf-8')
		encodedLength = struct.pack('@I', len(encodedContent))

		sys.stdout.buffer.write(encodedLength)
		sys.stdout.buffer.write(encodedContent)
		sys.stdout.buffer.flush()

except AttributeError:
	# Python 2.x version (if sys.stdin.buffer is not defined)
	# Read a message from stdin and decode it.
	def getMessage():
		rawLength = sys.stdin.read(4)
		if len(rawLength) == 0:
			sys.exit(0)
		messageLength = struct.unpack('@I', rawLength)[0]
		message = sys.stdin.read(messageLength)
		return json.loads(message)

	# Send an encoded message to stdout
	def sendMessage(messageContent):
		encodedContent = json.dumps(messageContent)
		encodedLength = struct.pack('@I', len(encodedContent))

		sys.stdout.write(encodedLength)
		sys.stdout.write(encodedContent)
		sys.stdout.flush()


def install():
	import sys
	try:
		import winreg as _winreg
	except:
		import _winreg

	this_file = os.path.realpath(__file__)
	install_path = os.path.dirname(this_file)

	manifest = {
		'name': 'open_with',
		'description': 'Open With native host',
		'path': this_file,
		'type': 'stdio',
	}

	manifest['path'] = filename = os.path.join(install_path, 'open_with.bat')
	with open(filename, 'w') as file:
		file.write('@echo off\r\ncall "%s" "%s" %%1 %%2\r\n' % (sys.executable, this_file))

	registry_locations = {
		'chrome': os.path.join('Software', 'Google', 'Chrome', 'NativeMessagingHosts'),
		'firefox': os.path.join('Software', 'Mozilla', 'NativeMessagingHosts'),
	}

	for browser, registry_location in registry_locations.items():
		browser_manifest = manifest.copy()
		if browser == 'firefox':
			browser_manifest['allowed_extensions'] = ['openwith@darktrojan.net']
		else:
			browser_manifest['allowed_origins'] = ['chrome-extension://cogjlncmljjnjpbgppagklanlcbchlno/']

		filename = os.path.join(install_path, 'open_with_%s.json' % browser)
		with open(filename, 'w') as file:
			file.write(
				json.dumps(browser_manifest, indent=2, separators=(',', ': '), sort_keys=True).replace('  ', '\t') + '\n'
			)

		key = _winreg.CreateKey(_winreg.HKEY_CURRENT_USER, registry_location)
		_winreg.SetValue(key, 'open_with', _winreg.REG_SZ, filename)


def find_browsers():
	try:
		import winreg as _winreg
	except:
		import _winreg

	windir = os.getenv('windir')
	key = _winreg.OpenKey(_winreg.HKEY_LOCAL_MACHINE, os.path.join('Software', 'Clients', 'StartMenuInternet'))
	count = _winreg.QueryInfoKey(key)[0]

	browsers = []
	while count > 0:
		subkey = _winreg.EnumKey(key, count - 1)
		try:
			browsers.append({
				'name': _winreg.QueryValue(key, subkey),
				'command': _winreg.QueryValue(key, os.path.join(subkey, 'shell', 'open', 'command'))
			})
		except:
			pass
		count -= 1

	if os.path.exists(os.path.join(windir, 'SystemApps', 'Microsoft.MicrosoftEdge_8wekyb3d8bbwe', 'MicrosoftEdge.exe')):
		browsers.append({
			'name': 'Microsoft Edge',
			'command': os.path.join(windir, 'explorer.exe') + ' "microsoft-edge:%s "'
		})

	return browsers


def listen():
	receivedMessage = getMessage()
	if receivedMessage == 'ping':
		sendMessage({
			'version': VERSION,
			'file': os.path.realpath(__file__)
		})
	elif receivedMessage == 'find':
		sendMessage(find_browsers())
	else:
		for k, v in os.environ.items():
			if k.startswith('MOZ_'):
				try:
					os.unsetenv(k)
				except:
					os.environ[k] = ''

		CREATE_BREAKAWAY_FROM_JOB = 0x01000000
		CREATE_NEW_CONSOLE = 0x00000010
		subprocess.Popen(receivedMessage, creationflags=CREATE_BREAKAWAY_FROM_JOB | CREATE_NEW_CONSOLE)
		sendMessage(None)

if __name__ == '__main__':
	if len(sys.argv) == 2:
		if sys.argv[1] == 'install':
			install()
			sys.exit(0)
		elif sys.argv[1] == 'find_browsers':
			print(find_browsers())
			sys.exit(0)

	if 'openwith@darktrojan.net' in sys.argv or 'chrome-extension://cogjlncmljjnjpbgppagklanlcbchlno/' in sys.argv:
		listen()
		sys.exit(0)

	print('Open With native helper, version %s.' % VERSION)
