#!/usr/bin/env python
from __future__ import print_function

import os
import sys
import json
import struct
import subprocess

VERSION = '7.0'

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
	home_path = os.getenv('HOME')

	manifest = {
		'name': 'open_with',
		'description': 'Open With native host',
		'path': os.path.realpath(__file__),
		'type': 'stdio',
	}
	locations = {
		'chrome': os.path.join(home_path, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts'),
		'chromium': os.path.join(home_path, 'Library', 'Application Support', 'Chromium', 'NativeMessagingHosts'),
		'firefox': os.path.join(home_path, 'Library', 'Application Support', 'Mozilla', 'NativeMessagingHosts'),
	}
	filename = 'open_with.json'

	for browser, location in locations.items():
		if os.path.exists(os.path.dirname(location)):
			if not os.path.exists(location):
				os.mkdir(location)

			browser_manifest = manifest.copy()
			if browser == 'firefox':
				browser_manifest['allowed_extensions'] = ['openwith@darktrojan.net']
			else:
				browser_manifest['allowed_origins'] = ['chrome-extension://cogjlncmljjnjpbgppagklanlcbchlno/']

			with open(os.path.join(location, filename), 'w') as file:
				file.write(
					json.dumps(browser_manifest, indent=2, separators=(',', ': '), sort_keys=True).replace('  ', '\t') + '\n'
				)


def find_browsers():
	apps = [
		'Chrome',
		'Chromium',
		'Firefox',
		'Google Chrome',
		'Opera',
		'Safari',
		'SeaMonkey',
	]
	paths = [
		os.path.join(os.getenv('HOME'), 'Applications'),
		'/Applications',
	]

	results = []
	for p in paths:
		for a in apps:
			fp = os.path.join(p, a) + '.app'
			if os.path.exists(fp):
				results.append({
					'name': a,
					'command': '"%s.app"' % os.path.join(p, a)
				})
	return results


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

		devnull = open(os.devnull, 'w')
		if receivedMessage[0].endswith('.app'):
			command = ['/usr/bin/open', '-a'] + receivedMessage
		else:
			command = receivedMessage
		subprocess.Popen(command, stdout=devnull, stderr=devnull)
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
